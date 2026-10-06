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

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoints (instant response, no DB dependency)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ParkMe API is running' });
});

app.get('/', (req, res) => {
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
app.use('/api/reservations', require('./routes/reservationRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/leave-requests', require('./routes/leaveRequestRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Centralised error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
