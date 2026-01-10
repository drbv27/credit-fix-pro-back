const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const conn = await mongoose.connect(mongoURI, {
      // Mongoose 6+ no longer needs these options, they're defaults:
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    console.log(`✓ MongoDB Connected: ${conn.connection.host}`);
    console.log(`✓ Database: ${conn.connection.name}`);

    return conn;
  } catch (error) {
    console.error(`✗ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('→ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error(`→ Mongoose connection error: ${err}`);
});

mongoose.connection.on('disconnected', () => {
  console.log('→ Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('→ Mongoose connection closed through app termination');
  process.exit(0);
});

module.exports = connectDB;
