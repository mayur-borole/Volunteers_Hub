import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Log from '../models/Log.js';
import Notification from '../models/Notification.js';
import connectDatabase from '../config/database.js';

// Load environment variables
dotenv.config();

// Cleanup old data
const cleanupDatabase = async () => {
  try {
    await connectDatabase();

    console.log('🧹 Starting database cleanup...');

    // Delete logs older than 90 days
    await Log.cleanupOldLogs();
    console.log('✅ Old logs deleted');

    // Delete old read notifications (older than 30 days)
    await Notification.deleteOldNotifications(30);
    console.log('✅ Old notifications deleted');

    console.log('✅ Database cleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  }
};

// Run the script
cleanupDatabase();
