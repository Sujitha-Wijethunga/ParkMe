const mongoose = require('mongoose');
const dns = require('dns');

// If standard system DNS fails to resolve SRV records on some networks, fallback will be used


let cachedPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (cachedPromise) {
    return cachedPromise;
  }

  if (!process.env.MONGO_URI) {
    console.warn('Warning: MONGO_URI environment variable is not defined.');
    return null;
  }

  try {
    cachedPromise = mongoose.connect(process.env.MONGO_URI).then((conn) => {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    }).catch((err) => {
      cachedPromise = null;
      throw err;
    });

    return await cachedPromise;
  } catch (error) {
    cachedPromise = null;
    console.error(`Error: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
