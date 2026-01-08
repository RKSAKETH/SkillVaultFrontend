# 🎓 SkillVault

> A Peer-to-Peer Time Banking System for Skill Sharing

SkillVault is a full-stack web application that enables users to teach and learn skills from each other using a credit-based time banking system. Users can offer their expertise, book learning sessions, and engage in real-time video calls, all while managing their credit balance in a secure and seamless environment.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Running the Application](#running-the-application)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Database Models](#-database-models)
- [WebSocket Events](#-websocket-events)
- [Key Features Explained](#-key-features-explained)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### Core Functionality
- 🔐 **User Authentication & Authorization** - JWT-based secure authentication
- 💰 **Credit-Based System** - Time banking with credit transactions
- 📚 **Skill Marketplace** - Search and discover tutors by skills, categories, and proficiency
- 📅 **Session Management** - Book, confirm, cancel, and complete learning sessions
- 🎥 **Real-Time Video Calls** - WebRTC-based peer-to-peer video conferencing
- 💬 **Live Transcription** - AI-powered real-time transcription using Google Gemini
- ⭐ **Rating & Review System** - Rate completed sessions and build reputation
- 📊 **Wallet & Transaction History** - Track credit balance and transaction history
- 👤 **User Profiles** - Manage teaching skills, learning interests, and bio

### Technical Features
- ⚡ **Optimistic Locking** - Prevents race conditions in credit transactions
- 🔒 **Session Locking** - Ensures atomic session state changes
- 🌐 **Real-Time Communication** - Socket.IO for WebRTC signaling
- 🛡️ **Security** - Rate limiting, helmet protection, input validation
- 📱 **Responsive Design** - Mobile-friendly UI with Tailwind CSS
- 🎨 **Modern UI/UX** - Clean, intuitive interface with loading states

---

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 15 (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: Custom component library (Button, Card, Modal, etc.)
- **Icons**: Lucide React
- **Real-Time**: Socket.IO Client
- **WebRTC**: Native WebRTC APIs
- **State Management**: React Context API

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: JavaScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **Real-Time**: Socket.IO
- **Security**: Helmet, bcryptjs, express-rate-limit
- **Validation**: Express Validator
- **AI/ML**: Google Generative AI (Gemini)
- **File Upload**: Multer

### DevOps & Tools
- **Development**: Nodemon (backend), Next.js Fast Refresh (frontend)
- **Environment**: dotenv
- **Logging**: Morgan
- **Testing**: Manual testing environment with socket-test.html

---

## 🏗 Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Next.js UI  │  │  Socket.IO   │  │   WebRTC     │     │
│  │   (React)    │  │    Client    │  │  Connection  │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          │ HTTP/REST        │ WebSocket        │ P2P Media
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼─────────────┐
│                    Express.js Server                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │     API      │  │  Socket.IO   │  │   Signaling  │     │
│  │   Routes     │  │    Server    │  │    Handler   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘     │
│         │                  │                                │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────────────┐     │
│  │ Controllers  │  │   Services   │  │  Middleware  │     │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘     │
│         │                  │                                │
│         └──────────────────┘                                │
│                    │                                        │
│            ┌───────▼────────┐                               │
│            │   Mongoose     │                               │
│            │     Models     │                               │
│            └───────┬────────┘                               │
└────────────────────┼────────────────────────────────────────┘
                     │
          ┌──────────▼───────────┐
          │    MongoDB Atlas     │
          │   (Cloud Database)   │
          └──────────────────────┘
```

### Data Flow

1. **Authentication Flow**
   - User registers/logs in → API validates → JWT token generated → Token stored in localStorage
   - Subsequent requests include JWT in Authorization header
   - Backend middleware verifies token and attaches user to request

2. **Session Booking Flow**
   - Student searches tutors → Selects skill & books session → Credits reserved (not transferred)
   - Tutor confirms → Session status: pending → confirmed
   - Call starts → Session status: confirmed → in_progress
   - Session ends → Credits transferred → Session status: completed

3. **Video Call Flow**
   - User joins room → Socket.IO connection established → Session validated
   - WebRTC offer/answer/ICE candidates exchanged via Socket.IO
   - Peer-to-peer media connection established (no server relay)
   - Audio transcription sent to backend → Gemini API processes → Transcript returned

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MongoDB Atlas account (or local MongoDB)
- Google Gemini API key (for transcription feature)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SkillVaultFrontend
   ```

2. **Install dependencies**
   ```bash
   # Install both frontend and backend dependencies
   npm install
   
   # Or install separately
   cd backend && npm install
   cd ../frontend && npm install
   ```

### Environment Setup

#### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=<appname>

# JWT Configuration
JWT_SECRET=your_secure_secret_key_here
JWT_EXPIRE=7d

# Server Configuration
NODE_ENV=development
PORT=5000

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Google Gemini API Key (for transcription)
GEMINI_API_KEY=your_gemini_api_key_here
```

#### Frontend Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### Running the Application

#### Development Mode

**Option 1: Run both servers separately**

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**Option 2: Run from workspace root**

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- WebSocket: ws://localhost:5000

#### Production Mode

```bash
# Build frontend
cd frontend
npm run build
npm start

# Start backend
cd backend
npm start
```

---

## 📁 Project Structure

```
SkillVaultFrontend/
├── backend/                      # Backend server
│   ├── config/                   # Configuration files
│   │   ├── constants.js         # App constants (session statuses, transaction types)
│   │   └── database.js          # MongoDB connection setup
│   ├── controllers/              # Route controllers
│   │   ├── authController.js    # Authentication logic
│   │   ├── sessionController.js # Session management
│   │   ├── userController.js    # User & marketplace logic
│   │   ├── walletController.js  # Wallet & transactions
│   │   └── transcriptionController.js # AI transcription
│   ├── middleware/               # Express middleware
│   │   ├── auth.js              # JWT authentication
│   │   ├── errorHandler.js      # Global error handling
│   │   └── validate.js          # Input validation
│   ├── models/                   # Mongoose schemas
│   │   ├── User.js              # User model with credit balance
│   │   ├── Session.js           # Session bookings
│   │   └── Transaction.js       # Credit transactions
│   ├── routes/                   # API routes
│   │   ├── authRoutes.js        # /api/auth/*
│   │   ├── userRoutes.js        # /api/users/*
│   │   ├── sessionRoutes.js     # /api/sessions/*
│   │   ├── walletRoutes.js      # /api/wallet/*
│   │   └── transcriptionRoutes.js # /api/transcription/*
│   ├── services/                 # Business logic
│   │   ├── SessionService.js    # Session operations with transactions
│   │   ├── TransactionService.js # Credit transfers
│   │   └── VideoRoomService.js  # Video room management
│   ├── public/                   # Static files
│   │   └── socket-test.html     # WebSocket testing page
│   ├── server.js                 # Express app & Socket.IO setup
│   ├── socketHandlers.js         # WebRTC signaling handlers
│   └── package.json
│
├── frontend/                     # Next.js frontend
│   ├── src/
│   │   ├── app/                  # App Router pages
│   │   │   ├── (auth)/          # Auth pages (login, register)
│   │   │   ├── (protected)/     # Protected pages
│   │   │   │   ├── dashboard/   # User dashboard
│   │   │   │   ├── marketplace/ # Tutor search
│   │   │   │   ├── profile/     # User profile management
│   │   │   │   ├── sessions/    # Session list & video call
│   │   │   │   └── wallet/      # Wallet & transactions
│   │   │   ├── layout.tsx       # Root layout
│   │   │   └── page.tsx         # Landing page
│   │   ├── components/           # React components
│   │   │   ├── dashboard/       # Dashboard widgets
│   │   │   ├── layout/          # Navbar, etc.
│   │   │   ├── marketplace/     # Tutor cards, booking modal
│   │   │   ├── sessions/        # Session cards
│   │   │   ├── ui/              # Reusable UI components
│   │   │   └── videocall/       # Video call interface
│   │   ├── context/             # React Context
│   │   │   ├── AuthContext.tsx  # Authentication state
│   │   │   └── SocketContext.tsx # Socket.IO connection
│   │   ├── hooks/               # Custom React hooks
│   │   │   └── useSecureRecording.ts # Audio recording
│   │   ├── lib/                 # Utilities
│   │   │   ├── api.ts           # API client
│   │   │   ├── useWebRTC.ts     # WebRTC hook
│   │   │   └── utils.ts         # Helper functions
│   │   └── types/               # TypeScript types
│   │       └── index.ts         # All type definitions
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
└── package.json                  # Workspace root
```

---

## 📡 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { /* User object */ },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Update Profile
```http
PUT /api/auth/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Jane",
  "bio": "Passionate educator"
}
```

### User/Marketplace Endpoints

#### Search Tutors
```http
GET /api/users/search?skill=React&category=Programming&page=1&limit=20
```

**Query Parameters:**
- `skill` - Skill name to search for
- `category` - Skill category
- `proficiency` - Proficiency level
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)
- `sortBy` - Sort field (rating, hourlyRate)

#### Get User Profile
```http
GET /api/users/:userId
```

#### Add Teaching Skill
```http
POST /api/users/skills/teaching
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "React",
  "category": "Programming",
  "proficiency": "Expert",
  "description": "Teaching React for 5 years",
  "hourlyRate": 2
}
```

#### Remove Teaching Skill
```http
DELETE /api/users/skills/teaching/:skillId
Authorization: Bearer <token>
```

### Session Endpoints

#### Book Session
```http
POST /api/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "tutorId": "60d5f484f8d8e82f8c8b4567",
  "skillName": "React",
  "skillCategory": "Programming",
  "scheduledAt": "2026-01-15T14:00:00Z",
  "duration": 60,
  "notes": "Want to learn hooks",
  "meetingType": "video"
}
```

#### Get User Sessions
```http
GET /api/sessions?role=student&status=confirmed&upcoming=true
Authorization: Bearer <token>
```

**Query Parameters:**
- `role` - Filter by role (student/tutor)
- `status` - Session status
- `upcoming` - Show only upcoming sessions (true/false)
- `page` - Page number
- `limit` - Results per page

#### Confirm Session (Tutor)
```http
PUT /api/sessions/:sessionId/confirm
Authorization: Bearer <token>
```

#### Complete Session
```http
PUT /api/sessions/:sessionId/complete
Authorization: Bearer <token>
```

#### Cancel Session
```http
PUT /api/sessions/:sessionId/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Schedule conflict"
}
```

#### Add Review
```http
POST /api/sessions/:sessionId/review
Authorization: Bearer <token>
Content-Type: application/json

{
  "rating": 5,
  "comment": "Great session!"
}
```

### Wallet Endpoints

#### Get Wallet Summary
```http
GET /api/wallet
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 10.5,
    "totalEarned": 15.0,
    "totalSpent": 4.5,
    "transactionCounts": {
      "credit": { "total": 15.0, "count": 3 },
      "debit": { "total": 4.5, "count": 2 }
    }
  }
}
```

#### Get Transaction History
```http
GET /api/wallet/transactions?page=1&limit=20&type=credit
Authorization: Bearer <token>
```

### Transcription Endpoints

#### Transcribe Audio
```http
POST /api/transcription/transcribe
Authorization: Bearer <token>
Content-Type: application/json

{
  "audioData": "base64_encoded_audio_data",
  "mimeType": "audio/webm"
}
```

---

## 🗄 Database Models

### User Model
```javascript
{
  email: String (unique, required),
  password: String (hashed, required),
  firstName: String (required),
  lastName: String (required),
  avatar: String,
  bio: String,
  creditBalance: Number (default: 0),
  creditVersion: Number (for optimistic locking),
  teachingSkills: [{
    name: String,
    category: String,
    proficiency: String,
    description: String,
    hourlyRate: Number (1-5 credits/hour)
  }],
  learningInterests: [{
    name: String,
    category: String
  }],
  stats: {
    totalSessionsTaught: Number,
    totalSessionsLearned: Number,
    totalHoursTaught: Number,
    totalHoursLearned: Number,
    averageRating: Number,
    totalRatings: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Session Model
```javascript
{
  tutor: ObjectId (ref: User),
  student: ObjectId (ref: User),
  skill: {
    name: String,
    category: String
  },
  scheduledAt: Date,
  duration: Number (minutes, 30-180),
  creditCost: Number,
  status: String (pending, confirmed, in_progress, completed, cancelled),
  version: Number (for optimistic locking),
  notes: String,
  meetingDetails: {
    type: String (video, in-person, chat),
    link: String,
    location: String
  },
  review: {
    rating: Number (1-5),
    comment: String,
    createdAt: Date
  },
  cancellation: {
    cancelledBy: ObjectId,
    reason: String,
    cancelledAt: Date,
    refunded: Boolean
  },
  statusHistory: [{
    status: String,
    changedAt: Date,
    changedBy: ObjectId,
    reason: String
  }],
  lockedUntil: Date (for preventing race conditions),
  createdAt: Date,
  updatedAt: Date
}
```

### Transaction Model
```javascript
{
  transactionId: String (UUID, unique),
  user: ObjectId (ref: User),
  counterparty: ObjectId (ref: User),
  session: ObjectId (ref: Session),
  type: String (credit, debit, initial, refund, bonus),
  amount: Number (positive),
  balanceBefore: Number,
  balanceAfter: Number,
  status: String (pending, completed, failed, reversed),
  description: String,
  metadata: Map,
  pairedTransaction: ObjectId (ref: Transaction),
  idempotencyKey: String (for duplicate prevention),
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔌 WebSocket Events

### Client → Server Events

#### join-room
```javascript
socket.emit('join-room', {
  sessionId: '60d5f484f8d8e82f8c8b4567'
}, (response) => {
  console.log(response); // { success: true, roomId, isInitiator, ... }
});
```

#### offer (WebRTC)
```javascript
socket.emit('offer', {
  sdp: peerConnection.localDescription
});
```

#### answer (WebRTC)
```javascript
socket.emit('answer', {
  sdp: peerConnection.localDescription
});
```

#### ice-candidate (WebRTC)
```javascript
socket.emit('ice-candidate', {
  candidate: event.candidate
});
```

#### leave-room
```javascript
socket.emit('leave-room');
```

### Server → Client Events

#### user-joined
```javascript
socket.on('user-joined', (data) => {
  console.log('User joined:', data.userId, data.role);
});
```

#### offer (WebRTC)
```javascript
socket.on('offer', async (data) => {
  await peerConnection.setRemoteDescription(data.sdp);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('answer', { sdp: answer });
});
```

#### answer (WebRTC)
```javascript
socket.on('answer', async (data) => {
  await peerConnection.setRemoteDescription(data.sdp);
});
```

#### ice-candidate (WebRTC)
```javascript
socket.on('ice-candidate', async (data) => {
  await peerConnection.addIceCandidate(data.candidate);
});
```

#### user-left
```javascript
socket.on('user-left', (data) => {
  console.log('User left:', data.userId);
  // Clean up peer connection
});
```

#### session-ended
```javascript
socket.on('session-ended', (data) => {
  console.log('Session ended:', data.reason);
  // Redirect to session list
});
```

---

## 🎯 Key Features Explained

### 1. Credit-Based Time Banking

SkillVault uses a credit system where:
- New users start with **5 free credits**
- Each tutor sets an hourly rate (1-5 credits/hour)
- Credits are **reserved** when booking, **transferred** when completing
- Credits are **refunded** when cancelling (if not yet confirmed)

**Transaction Flow:**
1. **Booking**: Credits remain with student but session is reserved
2. **Confirmation**: Session locked, credits still with student
3. **Completion**: Credits transferred from student to tutor
4. **Cancellation**: No credits transferred (they were never taken)

### 2. Optimistic Locking

To prevent race conditions in concurrent operations:

**Credit Operations:**
- Uses `creditVersion` field on User model
- Increment version on each credit change
- Reject if version mismatch (someone else modified it)

**Session Operations:**
- Uses `lockedUntil` field on Session model
- Lock for 30 seconds during status changes
- Reject if already locked by another request

### 3. WebRTC Video Calls

**Perfect Negotiation Pattern:**
- One peer is "polite", one is "impolite"
- Polite peer always accepts offers
- Prevents glare state in simultaneous offers

**Signaling Server:**
- Socket.IO broadcasts WebRTC messages to room
- No server-side media processing (peer-to-peer)
- Automatic session timeout based on scheduled duration

### 4. AI-Powered Transcription

**Google Gemini Integration:**
- Records audio in chunks during video call
- Sends base64-encoded audio to backend
- Backend forwards to Gemini API with prompt
- Returns formatted transcript in real-time

### 5. Session State Machine

```
PENDING → CONFIRMED → IN_PROGRESS → COMPLETED
    ↓         ↓             ↓
    → CANCELLED ← ← ← ← ← ← ← (can cancel at any point)
```

**State Transitions:**
- `PENDING`: Student booked, waiting for tutor confirmation
- `CONFIRMED`: Tutor confirmed, credits reserved
- `IN_PROGRESS`: Video call started
- `COMPLETED`: Session ended, credits transferred
- `CANCELLED`: Cancelled by either party, no credits transferred

---

## 🔒 Security Features

1. **Authentication**: JWT tokens with 7-day expiry
2. **Password Hashing**: bcrypt with salt rounds
3. **Rate Limiting**: 
   - 100 requests/15min for general API
   - 20 requests/15min for auth endpoints
4. **Input Validation**: Express Validator on all inputs
5. **XSS Protection**: Helmet middleware
6. **CORS**: Configured for specific origins only
7. **MongoDB Injection**: Mongoose sanitization
8. **Optimistic Locking**: Prevents race conditions

---

## 🧪 Testing

### Manual API Testing

Use tools like Postman or curl:

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### WebSocket Testing

Open `http://localhost:5000/socket-test.html` in your browser to test Socket.IO connections.

---

## 🐛 Troubleshooting

### Common Issues

**1. MongoDB Connection Error**
```
Error: The `uri` parameter to `openUri()` must be a string, got "undefined"
```
**Solution**: Ensure `.env` file exists in `backend/` directory with `MONGODB_URI` set.

**2. Port Already in Use**
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution**: Kill the process using the port or change `PORT` in `.env`.

**3. CORS Error in Browser**
```
Access to fetch at 'http://localhost:5000/api/auth/login' from origin 'http://localhost:3000' has been blocked by CORS policy
```
**Solution**: Verify `FRONTEND_URL` in backend `.env` matches your frontend URL.

**4. WebRTC Connection Failed**
```
ICE failed, see about:webrtc for more details
```
**Solution**: Check firewall settings and ensure both peers can reach each other.

---

## 📝 Environment Variables Reference

### Backend (.env)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MONGODB_URI` | MongoDB connection string | ✅ | - |
| `JWT_SECRET` | Secret key for JWT signing | ✅ | - |
| `JWT_EXPIRE` | JWT token expiry time | ❌ | 7d |
| `NODE_ENV` | Environment (development/production) | ❌ | development |
| `PORT` | Server port | ❌ | 5000 |
| `FRONTEND_URL` | Frontend URL for CORS | ❌ | http://localhost:3000 |
| `GEMINI_API_KEY` | Google Gemini API key | ✅ (for transcription) | - |

### Frontend (.env.local)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | ✅ | http://localhost:5000/api |
| `NEXT_PUBLIC_SOCKET_URL` | WebSocket server URL | ✅ | http://localhost:5000 |

---

## 🎨 UI Components

The app includes a custom component library:

- **Button**: Primary, secondary, outline, ghost variants
- **Card**: Container with consistent styling
- **Input**: Form inputs with error states
- **Select**: Dropdown selection
- **Modal**: Overlay dialogs
- **Avatar**: User profile pictures with fallback initials
- **Badge**: Status indicators with color variants

All components are built with Tailwind CSS and support dark mode.

---

## 🚧 Future Enhancements

- [ ] Email notifications for session bookings
- [ ] In-app messaging between users
- [ ] Calendar integration (Google Calendar, Outlook)
- [ ] Advanced search filters (availability, price range)
- [ ] Session recordings and playback
- [ ] Payment gateway integration for buying credits
- [ ] Mobile apps (React Native)
- [ ] Admin dashboard for platform management
- [ ] Report and dispute system
- [ ] Gamification (badges, achievements)

---

## 👥 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- MongoDB for the flexible database
- Socket.IO for real-time communication
- WebRTC for peer-to-peer video calls
- Google for the Gemini API
- Lucide for the beautiful icons

---

## 📞 Support

For questions or issues, please open an issue on GitHub or contact the maintainers.

---

**Built with ❤️ by the SkillVault Team**
