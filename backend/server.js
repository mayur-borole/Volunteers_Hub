import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import passport from './config/passport.js';
import connectDatabase from './config/database.js';
import { configureCloudinary } from './config/cloudinary.js';
import errorHandler from './middlewares/errorHandler.js';
import requestLogger from './middlewares/logger.js';
import { apiLimiter } from './middlewares/rateLimiter.js';
import { initializeSocket } from './sockets/socketManager.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Create HTTP server
const server = createServer(app);

// Initialize Socket.io
initializeSocket(server);

// Connect to database
connectDatabase();

// Configure Cloudinary (optional)
configureCloudinary();

// ========== MIDDLEWARE ==========

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration - allow multiple origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration (for passport)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'helpinghands-session-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Custom request logger
app.use(requestLogger);

// Rate limiting
app.use('/api', apiLimiter);

// ========== ROUTES ==========

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Helping Hands Backend Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve uploaded certificates and other static assets
app.use('/uploads', express.static('uploads'));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/chat', chatRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🚀 Welcome to Helping Hands Community Service Management System API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      events: '/api/events',
      feedback: '/api/feedback',
      analytics: '/api/analytics',
      messages: '/api/messages',
      notifications: '/api/notifications',
      chat: '/api/chat'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler (must be last)
app.use(errorHandler);

// ========== SERVER START ==========

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 HELPING HANDS BACKEND SERVER');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📍 Server running on: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Socket.io: Enabled`);
  console.log(`🔐 CORS Origins: ${allowedOrigins.join(', ')}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('📡 API Endpoints:');
  console.log(`   • Auth:          http://localhost:${PORT}/api/auth`);
  console.log(`   • Users:         http://localhost:${PORT}/api/users`);
  console.log(`   • Events:        http://localhost:${PORT}/api/events`);
  console.log(`   • Feedback:      http://localhost:${PORT}/api/feedback`);
  console.log(`   • Analytics:     http://localhost:${PORT}/api/analytics`);
  console.log(`   • Notifications: http://localhost:${PORT}/api/notifications`);
  console.log('');
  console.log('✅ Server ready to accept requests');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

export default app;
