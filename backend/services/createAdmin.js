import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import connectDatabase from '../config/database.js';

// Load environment variables
dotenv.config();

// Create admin user
const createAdmin = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('⚠️ Admin user already exists');
      console.log('Email:', existingAdmin.email);
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@helpinghands.com',
      password: 'admin123',
      role: 'admin',
      skills: [],
      interests: []
    });

    console.log('✅ Admin user created successfully!');
    console.log('=====================================');
    console.log('Email:', admin.email);
    console.log('Password: admin123');
    console.log('=====================================');
    console.log('⚠️ Please change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
};

// Run the script
createAdmin();
