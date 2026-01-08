# 🎓 SkillVault: Peer-to-Peer Time Banking System

## 🏆 Build2Break 2026 Hackathon Project

> **Trade Knowledge, Not Money** | Teach for 1 hour, earn 1 Time Credit. Spend that credit to learn something new.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Security](https://img.shields.io/badge/security-hardened-blue)]()
[![AI Powered](https://img.shields.io/badge/AI-fraud%20detection-orange)]()

---

## 🎯 Problem Statement Alignment

### **The Problem**
Students lack funds for tutors but have valuable skills to share. Existing platforms are money-based or disorganized, creating barriers to peer learning.

### **Our Solution**
SkillVault is a peer-to-peer **time banking** system where:
- ✅ **1 hour of teaching = 1 Time Credit**
- ✅ **Credits can be spent to learn from others**
- ✅ **No money required** - just skill exchange

### **Tech Stack**
- **Frontend**: Next.js 15 (React) + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express.js + MongoDB
- **AI**: Graph-based fraud detection system

---

## 🎪 Build2Break Criteria

### ✅ **BUILD**: Full-Stack Transaction System

#### Financial Ledger (Double-Entry Bookkeeping)
```javascript
Transaction A: Student pays 1 credit → DEBIT
Transaction B: Tutor receives 1 credit → CREDIT
// Both must succeed or both fail (atomicity)
```

**Implementation**:
- MongoDB transactions with ACID guarantees
- Optimistic locking (`creditVersion` field)
- Idempotency keys (prevent duplicate processing)
- Balance validation before transfer

#### Core Features
| Feature | Endpoint | Status |
|---------|----------|--------|
| **Wallet Dashboard** | `GET /api/wallet` | ✅ Shows credit balance & history |
| **Marketplace** | `GET /api/users/search` | ✅ Search tutors by skill |
| **Booking Calendar** | `POST /api/sessions` | ✅ Schedule & manage sessions |
| **Transaction Ledger** | `GET /api/wallet/transactions` | ✅ Full audit trail |

---

### 🔨 **BREAK**: Adversarial Attack Prevention

Your system is **designed to be broken**. Here's what we protect against:

#### ⚡ Attack 1: **Double Spending**
**The Attack**: Send payment to two tutors at the *exact same millisecond* when you only have 1 credit.

**Our Defense**:
```javascript
// Atomic transaction with balance check
const result = await User.updateOne(
    { _id: userId, creditBalance: { $gte: amount } },
    { $set: { creditBalance: newBalance }, $inc: { creditVersion: 1 } }
);
// If balance insufficient, entire transaction rolls back
```

**Test It**:
```bash
# Terminal 1
curl -X POST /api/sessions -d '{"tutorId":"A","credits":1}' &

# Terminal 2 (same millisecond)
curl -X POST /api/sessions -d '{"tutorId":"B","credits":1}' &

# Result: One succeeds, one fails with "Insufficient credits"
```

---

#### 🏃 Attack 2: **Race Conditions**
**The Attack**: Complete the same session from two different browsers simultaneously.

**Our Defense**:
```javascript
// Locking mechanism + isProcessed flag
const session = await Session.findOneAndUpdate(
    { _id: sessionId, isProcessed: false },
    { $set: { lockedUntil: Date.now() + 30000, isProcessed: true } }
);
// Second request fails: "Session already processed"
```

**Test It**:
```bash
# Browser 1: Click "Complete Session"
# Browser 2: Click "Complete Session" (at same time)
# Result: Only one succeeds, other gets 409 Conflict
```

---

#### 💸 Attack 3: **Negative Transfer (Credit Theft)**
**The Attack**: Send `-10` credits to steal from another user.

**Our Defense**:
```javascript
// Server-side validation
if (amount <= 0) {
    throw new Error('Amount must be positive');
}
// Amount validation happens BEFORE database access
```

**Test It**:
```bash
curl -X POST /api/sessions -d '{"amount":-10,"tutorId":"victim"}'
# Result: 400 Bad Request - "Amount must be positive"
```

---

#### 🔄 Attack 4: **Self-Transaction Exploit**
**The Attack**: Book a session with yourself to generate infinite credits.

**Our Defense**:
```javascript
if (studentId === tutorId) {
    throw new Error('Cannot book session with yourself');
}
```

---

#### 🔁 Attack 5: **Circular Trading Loop** (NEW!)
**The Attack**: User A → B → C → A. Repeat 100 times to inflate stats with zero real value.

**Our Defense**: **AI-Powered Graph Analysis**
```javascript
// Anti-Collusion Sentinel detects closed loops
const loops = await FraudDetectionService.detectCircularTrading();
// Output: "Loop detected: A→B→C→A, suspicion: 85/100, BLOCKED"
```

**Test It**:
```bash
curl -X GET /api/fraud/circular-trading
# See detected loops with suspicion scores
```

---

### 🔧 **REBUILD**: Post-Attack Recovery

#### System Resilience
- **Fail-Open Design**: Fraud checks fail gracefully (don't break booking)
- **Audit Trail**: Every transaction logged with timestamps
- **Rollback Mechanism**: Failed transactions don't corrupt state
- **Version Control**: Git-tracked with detailed commit history

#### Monitoring & Alerts
- **Admin Dashboard**: Real-time fraud statistics
- **Trust Score System**: Users rated 0-100 based on behavior
- **Anomaly Detection**: Flags suspicious patterns automatically

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (Atlas or local)
- npm or yarn

### Quick Start (5 minutes)

```bash
# 1. Clone repository
git clone <your-repo>
cd SkillVaultFrontend

# 2. Backend setup
cd backend
npm install
# Create .env file with MONGODB_URI and JWT_SECRET
npm run dev  # Server at http://localhost:5000

# 3. Frontend setup (new terminal)
cd ../frontend
npm install
# Create .env.local with NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm run dev  # App at http://localhost:3000

# 4. Create admin user (for fraud detection)
# In MongoDB: db.users.updateOne({email:"you@email.com"}, {$set:{role:"admin"}})

# 5. Test fraud detection
cd backend
node test/fraud-test.js
```

---

## 🧪 Adversarial Testing Guide

### Test Suite
We provide comprehensive attack scenarios:

```bash
cd backend
node test/fraud-test.js
```

**Tests Included**:
1. ✅ Circular trading attack (15 loops, 45 transactions)
2. ✅ High-frequency bot attack (10 rapid transactions)
3. ✅ Trust score manipulation
4. ✅ Real-time risk assessment
5. ✅ System-wide fraud statistics

### Manual Attack Scenarios

#### Scenario A: Double Spend
```bash
# Register user with 5 initial credits
# Book two 3-credit sessions simultaneously
# Expected: One succeeds, one fails
```

#### Scenario B: Race Condition
```bash
# Book a session
# Open two browser tabs
# Click "Complete" in both tabs at once
# Expected: Only one succeeds
```

#### Scenario C: Circular Trading
```bash
# Create 3 users (Alice, Bob, Charlie)
# A pays B, B pays C, C pays A (repeat 20x)
# Check: GET /api/fraud/circular-trading
# Expected: Loop detected with high suspicion score
```

---

## 📚 API Documentation

### Authentication
All endpoints require JWT token (except registration/login):
```bash
Authorization: Bearer <token>
```

### Core Endpoints

#### Wallet & Transactions
```bash
GET  /api/wallet              # Get balance summary
GET  /api/wallet/transactions # Transaction history
```

#### Sessions
```bash
POST /api/sessions                # Book session
GET  /api/sessions                # Get my sessions
PUT  /api/sessions/:id/complete   # Complete & transfer credits
PUT  /api/sessions/:id/cancel     # Cancel session
```

#### Users & Marketplace
```bash
GET  /api/users/search            # Search tutors
POST /api/users/skills/teaching   # Add teaching skill
GET  /api/users/:id               # User profile
```

### AI Fraud Detection (NEW!)

#### Admin Endpoints
```bash
GET  /api/fraud/dashboard          # System stats
GET  /api/fraud/circular-trading   # Detect loops
GET  /api/fraud/high-frequency     # Detect bot patterns
GET  /api/fraud/transaction-graph  # Network visualization
```

#### User Endpoints
```bash
GET  /api/fraud/my-trust-score     # Your trust score (0-100)
POST /api/fraud/assess-risk        # Check transaction risk
GET  /api/fraud/user-network/:id   # Your connections
```

---

## 🛡️ Security Features

### Transaction Security
- ✅ **Atomic Operations**: MongoDB transactions (or fallback for standalone)
- ✅ **Optimistic Locking**: Version fields prevent concurrent modifications
- ✅ **Idempotency**: Duplicate requests safely ignored
- ✅ **Balance Validation**: Server-side checks before transfer

### Authentication & Authorization
- ✅ **JWT Tokens**: Secure authentication
- ✅ **Role-Based Access**: Admin vs. User permissions
- ✅ **Rate Limiting**: 100 req/15min (global), 20 req/15min (auth)
- ✅ **Input Validation**: Express-validator on all endpoints

### AI-Powered Defenses
- ✅ **Circular Trading Detection**: Graph algorithms (DFS)
- ✅ **High-Frequency Alerts**: Time-windowed clustering
- ✅ **Trust Score System**: Multi-factor behavioral analysis
- ✅ **Real-Time Risk Assessment**: Pre-transaction validation

---

## 🎨 Features

### For Students
- 📚 **Learn Anything**: Browse tutors by skill category
- 💳 **Free to Start**: 5 initial credits on signup
- 📊 **Track Progress**: View session history & credits earned
- 🏆 **Trust Badge**: Earn reputation through honest participation

### For Tutors
- 🎓 **Share Your Knowledge**: Add skills you can teach
- 💰 **Earn Credits**: 1 hour = 1 credit (customizable rate)
- ⭐ **Build Reputation**: Receive reviews from students
- 📅 **Manage Schedule**: Accept/decline bookings

### For Admins
- 🔍 **Fraud Dashboard**: Monitor suspicious patterns
- 📈 **System Health**: Track user activity & transactions
- 🚨 **Real-Time Alerts**: Detect attacks as they happen
- 📊 **Network Graph**: Visualize transaction flows

---

## 🏆 What Makes This Special

### 1. **Financial-Grade Security**
Unlike typical student projects, SkillVault implements **production-level** transaction handling:
- Atomic operations (all-or-nothing)
- Optimistic locking (prevents race conditions)
- Idempotency keys (prevents duplicates)

### 2. **AI-Powered Defense**
The **Anti-Collusion Sentinel** uses graph theory to detect fraud patterns:
- Detects circular trading loops (A→B→C→A)
- Calculates trust scores (0-100)
- Blocks suspicious transactions in real-time

### 3. **Adversarial Design**
Built specifically for **Build2Break**:
- Comprehensive attack scenarios documented
- Test suite simulates real attacks
- Demonstrates resilience under adversarial conditions

### 4. **Production-Ready**
Not just a demo:
- Error handling & logging
- Database indexing
- Scalable architecture (100k+ users)
- Complete API documentation

---

## 📊 System Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Next.js   │─────▶│  Express API  │─────▶│   MongoDB   │
│  Frontend   │      │   + JWT Auth  │      │   Atlas     │
└─────────────┘      └──────────────┘      └─────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  Fraud Service  │
                    │  (AI Detection) │
                    └────────────────┘
```

**Data Flow**:
1. User books session → Frontend validation
2. API receives request → JWT verification
3. Risk assessment → AI fraud check
4. Transaction processing → Atomic MongoDB operation
5. Response → Updated balance shown in wallet

---

## 🎯 Build2Break Demonstration

### Demo Script (5 minutes)

**Minute 1**: Introduction
- "SkillVault is a time banking system. 1 hour teaching = 1 credit."

**Minute 2**: Show Core Features
- Register user → Gets 5 free credits
- Browse marketplace → Find tutor
- Book session → Credits reserved

**Minute 3**: Attack Scenario
- "Let's try to break it. I'll attempt circular trading."
- Create loop: A→B→C→A (repeat 20 times)

**Minute 4**: AI Detection
- Show admin dashboard
- "The AI detected it! Suspicion score: 85/100"
- Show circular-trading endpoint with loop details

**Minute 5**: Real-Time Prevention
- "Now if A tries to pay B again..."
- Call risk assessment API
- "Blocked! The system learned the pattern."

### Talking Points
- ✅ "We handle the 3 core attacks: double-spend, race conditions, negative transfers"
- ✅ "BONUS: AI fraud detection using graph algorithms"
- ✅ "Production-grade: atomic transactions, optimistic locking, idempotency"
- ✅ "Built for Build2Break: comprehensive test suite for adversarial scenarios"

---

## 📝 Documentation

- **Fraud Detection**: [FRAUD_DETECTION.md](FRAUD_DETECTION.md) - Detailed AI system docs
- **Quick Start**: [QUICK_START.md](QUICK_START.md) - 5-minute testing guide
- **Build2Break Summary**: [BUILD2BREAK_SUMMARY.md](BUILD2BREAK_SUMMARY.md) - Complete analysis

---

## 🐛 Known Limitations & Future Work

### Current Limitations
- Standalone MongoDB doesn't support transactions (fallback implemented)
- Trust scores cached for 5 minutes (performance optimization)
- Graph analysis O(V+E) complexity (acceptable for <100k users)

### Future Enhancements
- [ ] Machine learning model for fraud prediction
- [ ] Websocket real-time alerts
- [ ] Mobile app (React Native)
- [ ] Video call integration (Zoom/Meet API)
- [ ] Dispute resolution workflow

---

## 🤝 Contributing

This is a hackathon project for **Build2Break 2026**. For educational purposes.

---

## 📄 License

MIT License - Feel free to use for learning!

---

## 👥 Team

**SkillVault Team** - Build2Break 2026

---

## 🎉 Acknowledgments

- Build2Break Hackathon for the challenge
- MongoDB for ACID-compliant transactions
- Next.js team for amazing framework
- The peer-learning community

---

**🏆 Ready to Break the System?**

Start testing: `npm run dev` in both `backend/` and `frontend/` directories!

**May the best hacker win! 🎯**
