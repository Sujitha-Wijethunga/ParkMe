const mongoose = require('mongoose');
const dns = require('dns');

// Force Google DNS to resolve MongoDB SRV records
// (bypasses network/hotspot DNS that may block SRV queries)
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
