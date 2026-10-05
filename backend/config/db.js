const mongoose = require('mongoose');
const dns = require('dns');

// Force Google DNS to resolve MongoDB SRV records
// (bypasses network/hotspot DNS that may block SRV queries)
dns.setServers(['8.8.8.8', '8.8.4.4']);

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
