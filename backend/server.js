const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables reliably regardless of working directory
dotenv.config({ path: path.join(__dirname, '.env') });

// Connect to MongoDB (non-fatal during startup/development)
if (process.env.MONGO_URI) {
  connectDB().catch((err) => {
    console.warn('Warning: MongoDB not connected -', err.message);
    console.warn('Server will continue running without database.');
  });
}

const os = require('os');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const uploadsDirectory = isServerless
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDirectory));

// Normalize incoming path when running under Vercel serverless rewrites
app.use((req, res, next) => {
  const matchedPath =
    req.headers['x-matched-path'] ||
    req.headers['x-vercel-matched-path'] ||
    req.headers['x-forwarded-url'] ||
    req.headers['x-original-url'];
  const entrypointPaths = ['/server.js', '/backend/server.js', '/api/index.js', '/api/index', '/api'];
  if (matchedPath && !entrypointPaths.includes(matchedPath)) {
    req.url = matchedPath;
  } else if (entrypointPaths.includes(req.url)) {
    req.url = '/';
  }
  next();
});

// Health check endpoints (instant response, no DB dependency)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ParkMe API is running' });
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'ParkMe API is running' });
});

// Fallback for Vercel rewrite artifacts targeting server.js or api/index.js directly
app.all(['/server.js', '/backend/server.js', '/api/index.js', '/api/index'], (req, res) => {
  res.json({ status: 'ok', message: 'ParkMe API is running' });
});

// Ensure database connection for serverless requests
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1 && process.env.MONGO_URI) {
    try {
      await connectDB();
    } catch (err) {
      console.warn('Database connection warning in request middleware:', err.message);
    }
  }
  next();
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/parking-lots', require('./routes/parkingLotRoutes'));
app.use('/api/parking-lots/:lotId/spaces', require('./routes/parkingSpaceRoutes'));
app.use('/api/parking-spaces', require('./routes/parkingSpaceRoutes'));
app.use('/api/reservations', require('./routes/reservationRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/leave-requests', require('./routes/leaveRequestRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/walk-in', require('./routes/walkInRoutes'));

// Centralised error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
