# ParkMe 🚗

A mobile application for finding and reserving parking spaces, built as a university group assignment.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Mobile Frontend | React Native · Expo · TypeScript |
| Backend API | Node.js · Express 5 |
| Database | MongoDB Atlas · Mongoose 9 |
| Authentication | JWT · bcryptjs |
| Version Control | GitHub |

---

## Project Structure

```
ParkMe/
├── frontend/                   # React Native Expo application
│   ├── assets/                 # App icons, splash images
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── screens/
│   │   │   ├── driver/         # Driver-facing screens
│   │   │   └── staff/          # Staff-facing screens
│   │   ├── navigation/         # Navigation configuration
│   │   ├── services/           # API service functions
│   │   ├── hooks/              # Custom React hooks
│   │   ├── constants/          # App-wide constants
│   │   └── utils/              # Utility functions
│   ├── App.tsx                 # Root component
│   ├── index.ts                # Expo entry point
│   ├── app.json                # Expo configuration
│   ├── package.json            # Frontend dependencies
│   └── tsconfig.json           # TypeScript configuration
│
├── backend/                    # Express API server
│   ├── config/
│   │   └── db.js               # MongoDB connection
│   ├── controllers/            # Route handler logic
│   ├── middleware/             # Auth, authorize, error, validate
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # Express route definitions
│   ├── .env.example            # Required environment variables template
│   ├── server.js               # Express entry point
│   └── package.json            # Backend dependencies
│
├── .gitignore
├── AGENTS.md
└── README.md
```

---

## Prerequisites

- **Node.js** v18 or higher — https://nodejs.org
- **npm** v9 or higher (comes with Node.js)
- **Expo CLI** — installed automatically via `npx`
- **Expo Go** app on your phone (iOS or Android) — https://expo.dev/go
- **MongoDB Atlas** account — https://cloud.mongodb.com
- **Git** — https://git-scm.com

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Sujitha-Wijethunga/ParkMe.git
cd ParkMe
```

### 2. Switch to the develop branch

```bash
git checkout develop
git pull origin develop
```

---

## Frontend Setup

### Install dependencies

```bash
cd frontend
npm install
```

### Start the Expo development server

```bash
npx expo start
```

### Open on your phone with Expo Go

1. Install **Expo Go** on your phone from the App Store or Google Play.
2. Run `npx expo start` from the `frontend/` directory.
3. Scan the QR code shown in the terminal with your phone camera (iOS) or the Expo Go app (Android).

### Expo tunnel mode (if local network fails)

If your phone and computer are not on the same Wi-Fi network, use tunnel mode:

```bash
npx expo start --tunnel
```

> This routes traffic through Expo's servers. Requires `@expo/ngrok` — Expo will prompt to install it automatically.

---

## Backend Setup

### Install dependencies

```bash
cd backend
npm install
```

### Configure environment variables

```bash
cp .env.example .env
```

Open `backend/.env` and fill in:

```
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_strong_secret_key
```

> ⚠️ Never commit `.env`. It is listed in `.gitignore`.

### Start the Express server

**Development (auto-restart on file changes):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

### Test the health endpoint

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{ "status": "ok", "message": "ParkMe API is running" }
```

---

## GitHub Collaboration Rules

### Branch strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready releases only |
| `develop` | Shared integration branch — all PRs target this |
| `feature/*` | New features |
| `fix/*` | Bug fixes |
| `chore/*` | Maintenance, refactoring, config |

### Workflow for every task

```bash
# 1. Always start from an up-to-date develop
git checkout develop
git pull origin develop

# 2. Create a branch for your specific task
git checkout -b feature/your-feature-name

# 3. Make small, focused commits
git add <files>
git commit -m "feat: describe what you did"

# 4. Push your branch
git push -u origin feature/your-feature-name

# 5. Open a Pull Request on GitHub
#    Base: develop  ←  Compare: feature/your-feature-name
```

### Rules

- ✅ **Every team member must use a separate branch for each small, independently reviewable task.**
- ✅ **Pull requests must target `develop`, never `main`.**
- ✅ Never push directly to `main` or `develop`.
- ✅ All PRs require at least one review before merging.
- ✅ Never commit `.env` files, passwords or API keys.
- ✅ Keep commits small and focused — one logical change per commit.
- ✅ Write clear commit messages: `feat:`, `fix:`, `chore:`, `docs:`.

---

## API Endpoints Reference

| Group | Base Path |
|---|---|
| Authentication | `/api/auth` |
| Users (admin) | `/api/users` |
| Parking Lots | `/api/parking-lots` |
| Parking Spaces | `/api/parking-lots/:lotId/spaces` |
| Reservations | `/api/reservations` |
| Payments | `/api/payments` |
| Health | `/api/health` |

---

## Team

University group assignment — ParkMe.
