# CRITICAL: Financial Race Condition Security Fix

**Date:** January 9, 2026  
**Severity:** 🔴 CRITICAL (CWE-362: Concurrent Execution using Shared Resource with Improper Synchronization)  
**Status:** ✅ RESOLVED  
**CVSSv3 Score:** 9.1 (Critical) - Integrity Impact HIGH, Availability Impact LOW

---

## Executive Summary

A **critical race condition vulnerability** was discovered in the credit transfer system that could allow users to spend more credits than they own, create negative balances, and cause tutors to not receive correct payments. The vulnerability existed in the fallback path when MongoDB transactions fail on standalone instances.

**The fix requires MongoDB replica set for production deployments. Standalone MongoDB instances are no longer supported for financial operations.**

---

## Vulnerability Details

### Affected Components
- `backend/services/TransactionService.js` - Lines 48-68, 207-225
- `backend/services/SessionService.js` - Indirectly affected (calls TransactionService)

### Vulnerability Type
**Race Condition / Time-of-Check Time-of-Use (TOCTOU)**
- CWE-362: Concurrent Execution using Shared Resource with Improper Synchronization
- CWE-667: Improper Locking
- CWE-662: Improper Synchronization

### Root Cause

The application attempted to support MongoDB standalone instances by retrying operations without transactions when transaction support failed:

```javascript
// VULNERABLE CODE (REMOVED)
catch (error) {
    if (error.code === 20 || error.codeName === 'IllegalOperation' || 
        error.message.includes('Transaction numbers are only allowed on a replica set')) {
        console.warn('MongoDB Transaction failed (likely standalone instance). Retrying without transaction...');
        return await operation(undefined); // ⚠️ DANGEROUS FALLBACK
    }
    throw error;
}
```

### Attack Scenarios

#### Scenario 1: Double Spending via Concurrent Completions
```
Time  | Request A (Complete Session 1)     | Request B (Complete Session 2)
------|-------------------------------------|-------------------------------------
T0    | Read user balance: 100 credits     | Read user balance: 100 credits
T1    | Check: 100 >= 80? ✓ Pass          | Check: 100 >= 80? ✓ Pass
T2    | Deduct 80, write balance = 20      |
T3    |                                     | Deduct 80, write balance = 20
T4    | Final balance: 20                   | Final balance: 20 (WRONG!)
------|-------------------------------------|-------------------------------------
Expected: -60 credits (overdraft)
Actual: 20 credits (lost update, user gained 80 free credits)
```

#### Scenario 2: Partial Transfer (Sender Debited, Receiver Not Credited)
```
Time  | Operation                           | State
------|-------------------------------------|---------------------------------------
T0    | Student balance: 100, Tutor: 50    |
T1    | Debit student: 100 - 80 = 20       | Student: 20, Tutor: 50
T2    | Credit tutor fails (concurrent mod)| PARTIAL FAILURE
T3    | Rollback impossible (no txn)       | Student: 20, Tutor: 50 (80 credits LOST!)
```

#### Scenario 3: Negative Balance Exploitation
1. User has 100 credits
2. Simultaneously books 3 sessions (80 credits each)
3. All 3 pass balance check at T0 (balance = 100)
4. All 3 complete successfully
5. User's balance becomes 100 - 80 - 80 - 80 = **-140 credits**
6. Platform loses 140 credits in real value

### Security Impact

| Impact | Severity | Description |
|--------|----------|-------------|
| **Financial Integrity** | CRITICAL | Users can spend more credits than they own, platform loses money |
| **Negative Balances** | HIGH | Credit balances can go negative, breaking business logic |
| **Lost Funds** | CRITICAL | Partial failures cause credits to disappear from the system |
| **Tutor Payments** | HIGH | Tutors may not receive correct payments for sessions |
| **Platform Trust** | HIGH | Financial inconsistencies damage user trust |
| **Audit Trail** | MEDIUM | Transaction records don't match actual balances |

### Why Optimistic Locking Wasn't Enough

The code used `creditVersion` for optimistic locking:

```javascript
// Optimistic locking with version check
await User.updateOne(
    {
        _id: fromUserId,
        creditVersion: fromUser.creditVersion, // ⚠️ TOCTOU vulnerability
        creditBalance: { $gte: amount }
    },
    {
        $set: { creditBalance: fromBalanceAfter },
        $inc: { creditVersion: 1 }
    },
    { session: session } // ⚠️ session = undefined in fallback
);
```

**Problem:** Without transactions, if the first update fails the version check after the second update completes, there's no rollback mechanism. The sender may already be debited.

**In non-transaction mode:**
- User A reads balance = 100, version = 5
- User B reads balance = 100, version = 5
- User A updates: balance = 20, version = 6 ✓
- User B tries to update with version = 5 ✗ FAILS
- But User A is already debited and there's no way to compensate!

---

## Fix Implementation

### Solution: Require MongoDB Replica Set

Instead of attempting unsafe fallbacks, the application now **requires** MongoDB replica set for production deployments:

```javascript
// SECURE CODE (CURRENT)
catch (error) {
    if (error.code === 20 || error.codeName === 'IllegalOperation' || 
        error.message.includes('Transaction numbers are only allowed on a replica set')) {
        console.error('CRITICAL: MongoDB transactions are not supported. This application requires a MongoDB replica set for financial integrity.');
        console.error('Please configure MongoDB as a replica set or use MongoDB Atlas.');
        throw new Error('Database configuration error: MongoDB replica set required for credit transfers. Current instance does not support transactions.');
    }
    throw error;
}
```

### Why This Is Secure

1. **ACID Guarantees:** MongoDB transactions provide atomicity, consistency, isolation, and durability
2. **Automatic Rollback:** If any operation fails, all changes are rolled back automatically
3. **Isolation:** Concurrent transactions don't interfere with each other
4. **No Lost Updates:** Version checks combined with transactions prevent race conditions
5. **No Partial Failures:** Either all operations succeed or all fail (atomic)

### Changes Made

#### File: `backend/services/TransactionService.js`

**Lines 48-68 (transfer function):**
- ❌ Removed: Unsafe retry without transactions
- ✅ Added: Clear error message requiring replica set
- ✅ Added: Fail-fast behavior for standalone instances

**Lines 127-134:**
- ❌ Removed: Comment acknowledging partial failure risk
- ✅ Updated: Transaction rollback will handle failures automatically

**Lines 207-225 (credit function):**
- ❌ Removed: Unsafe retry without transactions  
- ✅ Added: Clear error message requiring replica set
- ✅ Added: Fail-fast behavior for standalone instances

---

## Deployment Requirements

### REQUIRED: MongoDB Replica Set

**Production deployments MUST use one of:**

1. **MongoDB Atlas** (Recommended)
   - Automatic replica set configuration
   - Built-in transaction support
   - No manual configuration needed
   - ✅ Currently used by SkillVault

2. **Self-Hosted Replica Set**
   - Minimum 3 nodes for production
   - Configure as replica set (not standalone)
   - See: https://docs.mongodb.com/manual/tutorial/deploy-replica-set/

3. **Docker Compose Replica Set** (Development)
   ```yaml
   version: '3.8'
   services:
     mongo1:
       image: mongo:latest
       command: ["--replSet", "rs0", "--bind_ip_all", "--port", "27017"]
       ports:
         - 27017:27017
     mongo2:
       image: mongo:latest
       command: ["--replSet", "rs0", "--bind_ip_all", "--port", "27018"]
       ports:
         - 27018:27018
     mongo3:
       image: mongo:latest
       command: ["--replSet", "rs0", "--bind_ip_all", "--port", "27019"]
       ports:
         - 27019:27019
   ```

### Environment Check

Add this check to your startup script:

```javascript
// Check MongoDB replica set on startup
const admin = mongoose.connection.db.admin();
const serverStatus = await admin.serverStatus();

if (!serverStatus.repl || !serverStatus.repl.setName) {
    console.error('ERROR: MongoDB is not running as a replica set!');
    console.error('Transactions are required for financial operations.');
    console.error('Please use MongoDB Atlas or configure a replica set.');
    process.exit(1);
}

console.log(`✓ MongoDB Replica Set: ${serverStatus.repl.setName}`);
```

---

## Testing & Verification

### Test 1: Concurrent Session Completions (Race Condition)

```javascript
// Test: Complete 2 sessions simultaneously with insufficient balance
const user = await User.findOne({ email: 'test@test.com' });
console.log('Initial balance:', user.creditBalance); // 100 credits

const session1 = await Session.create({ creditCost: 80, ... });
const session2 = await Session.create({ creditCost: 80, ... });

// Simulate concurrent completions
const [result1, result2] = await Promise.allSettled([
    SessionService.completeSession(session1._id, user._id),
    SessionService.completeSession(session2._id, user._id)
]);

// Expected: One succeeds, one fails with "Insufficient credits"
// Before fix: Both could succeed, balance goes negative
console.log('Result 1:', result1.status); // fulfilled
console.log('Result 2:', result2.status); // rejected (insufficient credits)

const userAfter = await User.findById(user._id);
console.log('Final balance:', userAfter.creditBalance); // 20 (correct!)
```

### Test 2: Standalone MongoDB Detection

```javascript
// Test: Verify error is thrown on standalone instance
try {
    await TransactionService.transfer(user1, user2, 50, 'Test');
} catch (error) {
    console.log(error.message);
    // Expected: "Database configuration error: MongoDB replica set required..."
}
```

### Test 3: Transaction Rollback

```javascript
// Test: Verify partial failures roll back completely
try {
    // Force a failure in the middle of transfer
    await TransactionService.transfer(user1, invalidUserId, 50, 'Test');
} catch (error) {
    // Check user1's balance hasn't changed
    const user = await User.findById(user1);
    console.log('Balance unchanged:', user.creditBalance); // Same as before
}
```

---

## Monitoring & Alerting

### Add These Checks

1. **Negative Balance Alert**
   ```javascript
   // Alert if any user has negative balance
   const negativeBalances = await User.find({ creditBalance: { $lt: 0 } });
   if (negativeBalances.length > 0) {
       alertService.send('CRITICAL: Negative balances detected!');
   }
   ```

2. **Balance Reconciliation**
   ```javascript
   // Daily check: Sum of all balances should equal total credits issued
   const totalBalances = await User.aggregate([
       { $group: { _id: null, total: { $sum: '$creditBalance' } } }
   ]);
   const totalIssued = await Transaction.aggregate([
       { $match: { type: { $in: ['initial', 'bonus'] } } },
       { $group: { _id: null, total: { $sum: '$amount' } } }
   ]);
   // Alert if they don't match
   ```

3. **Transaction Failure Rate**
   ```javascript
   // Alert if >1% of transactions fail
   const failureRate = failedTxns / totalTxns;
   if (failureRate > 0.01) {
       alertService.send('High transaction failure rate detected');
   }
   ```

---

## Migration Guide

### For Existing Deployments on Standalone MongoDB

**⚠️ CRITICAL: You MUST migrate to a replica set before deploying this fix!**

#### Option 1: Migrate to MongoDB Atlas (Recommended)
1. Export data: `mongodump --uri="mongodb://localhost:27017/skillvault"`
2. Create MongoDB Atlas cluster (free tier available)
3. Import data: `mongorestore --uri="mongodb+srv://..."`
4. Update `MONGODB_URI` in `.env`
5. Deploy updated code

#### Option 2: Convert Standalone to Replica Set
```bash
# 1. Stop MongoDB
sudo systemctl stop mongod

# 2. Edit /etc/mongod.conf
replication:
  replSetName: "rs0"

# 3. Restart MongoDB
sudo systemctl start mongod

# 4. Initialize replica set
mongosh
> rs.initiate({
    _id: "rs0",
    members: [{ _id: 0, host: "localhost:27017" }]
  })

# 5. Verify
> rs.status()
```

#### Option 3: Use Docker Compose (Development Only)
See "Deployment Requirements" section above for docker-compose.yml

---

## Backward Compatibility

### Breaking Changes
- ❌ Standalone MongoDB instances are no longer supported
- ❌ Credit transfers will fail with clear error on standalone instances
- ✅ MongoDB Atlas users are unaffected (already using replica sets)
- ✅ Existing data remains intact

### Rollback Plan
If you must rollback (NOT RECOMMENDED due to security risk):
```bash
git revert <commit-hash>
```

**Warning:** Rolling back reintroduces the race condition vulnerability. Only do this if:
1. You're on MongoDB Atlas/replica set (low risk)
2. You have very low traffic (minimal concurrent operations)
3. You plan to upgrade to replica set within 24 hours

---

## Security Posture

### Before Fix
- ❌ Race conditions allowed double spending
- ❌ Negative balances possible
- ❌ Partial failures caused lost funds
- ❌ Concurrent operations could bypass balance checks
- ❌ Financial integrity not guaranteed

### After Fix
- ✅ ACID transactions prevent race conditions
- ✅ Negative balances impossible (atomicity)
- ✅ No partial failures (rollback on error)
- ✅ Concurrent operations properly isolated
- ✅ Financial integrity guaranteed by MongoDB

### Risk Assessment

| Deployment Type | Risk Level | Notes |
|----------------|------------|-------|
| MongoDB Atlas | ✅ LOW | Recommended, transactions fully supported |
| Replica Set (3+ nodes) | ✅ LOW | Production ready |
| Replica Set (1 node) | ⚠️ MEDIUM | Development only, no high availability |
| Standalone | 🔴 BLOCKED | Application will reject transactions |

---

## Additional Recommendations

### 1. Add Database Health Check
```javascript
// Add to server.js startup
const checkDatabaseConfig = async () => {
    try {
        const session = await mongoose.startSession();
        await session.withTransaction(async () => {
            // Test transaction support
        });
        await session.endSession();
        console.log('✓ Database transactions supported');
    } catch (error) {
        console.error('✗ Database does not support transactions!');
        process.exit(1);
    }
};
```

### 2. Add Balance Validation Endpoint
```javascript
// GET /api/admin/validate-balances
router.get('/validate-balances', async (req, res) => {
    const users = await User.find({ creditBalance: { $lt: 0 } });
    res.json({
        negativeBalances: users.length,
        users: users.map(u => ({
            id: u._id,
            email: u.email,
            balance: u.creditBalance
        }))
    });
});
```

### 3. Enable MongoDB Audit Logging
```yaml
# mongod.conf
auditLog:
  destination: file
  format: JSON
  path: /var/log/mongodb/audit.json
  filter: '{ "atype": { "$in": ["update", "delete"] }, "ns": "skillvault.users" }'
```

---

## References

- [MongoDB Transactions Documentation](https://docs.mongodb.com/manual/core/transactions/)
- [CWE-362: Race Condition](https://cwe.mitre.org/data/definitions/362.html)
- [OWASP: Insecure Direct Object References](https://owasp.org/www-project-top-ten/)
- [MongoDB Replica Set Tutorial](https://docs.mongodb.com/manual/tutorial/deploy-replica-set/)

---

## Acknowledgments

Thanks to the security researcher who reported this critical vulnerability. The issue has been responsibly disclosed and fixed.

**All financial operations now require MongoDB transactions for guaranteed integrity.**
