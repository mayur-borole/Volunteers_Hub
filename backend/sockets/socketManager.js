import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Store active socket connections
const userSockets = new Map(); // userId -> socketId
const socketUsers = new Map(); // socketId -> userId

let io;

// Initialize Socket.io
export const initializeSocket = (server) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean);
  
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      if (user.isBlocked) {
        return next(new Error('Authentication error: User is blocked'));
      }

      // Attach user to socket
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    
    console.log(`✅ User connected: ${socket.user.name} (${userId})`);

    // Store user's socket connection
    userSockets.set(userId, socket.id);
    socketUsers.set(socket.id, userId);

    // Join user to their own room
    socket.join(userId);

    // Send online status to user
    socket.emit('connected', {
      message: 'Connected to notification server',
      userId: userId
    });

    // Broadcast online users count (optional)
    io.emit('onlineUsers', {
      count: userSockets.size
    });

    // Handle custom events
    socket.on('markNotificationRead', async (notificationId) => {
      // Handle notification read status
      console.log(`Notification ${notificationId} marked as read by ${userId}`);
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`❌ User disconnected: ${socket.user.name} (${reason})`);
      
      // Remove from maps
      userSockets.delete(userId);
      socketUsers.delete(socket.id);

      // Broadcast updated online count
      io.emit('onlineUsers', {
        count: userSockets.size
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('🔌 Socket.io initialized');
  return io;
};

// Get Socket.io instance
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Send notification to specific user
export const sendNotificationToUser = (userId, notification) => {
  try {
    const io = getIO();
    const userIdStr = userId.toString();
    
    // Send to user's room
    io.to(userIdStr).emit('newNotification', notification);
    
    console.log(`📤 Notification sent to user ${userIdStr}`);
    return true;
  } catch (error) {
    console.error('Error sending notification:', error.message);
    return false;
  }
};

// Send notification to multiple users
export const sendNotificationToUsers = (userIds, notification) => {
  try {
    const io = getIO();
    
    userIds.forEach(userId => {
      const userIdStr = userId.toString();
      io.to(userIdStr).emit('newNotification', notification);
    });
    
    console.log(`📤 Notification sent to ${userIds.length} users`);
    return true;
  } catch (error) {
    console.error('Error sending notifications:', error.message);
    return false;
  }
};

// Broadcast to all connected users
export const broadcastNotification = (notification) => {
  try {
    const io = getIO();
    io.emit('broadcast', notification);
    console.log('📢 Broadcast notification sent');
    return true;
  } catch (error) {
    console.error('Error broadcasting notification:', error.message);
    return false;
  }
};

// Check if user is online
export const isUserOnline = (userId) => {
  return userSockets.has(userId.toString());
};

// Get online users count
export const getOnlineUsersCount = () => {
  return userSockets.size;
};

// Get all online user IDs
export const getOnlineUsers = () => {
  return Array.from(userSockets.keys());
};

// Get socket ID for a specific user
export const getRecipientSocketId = (userId) => {
  return userSockets.get(userId.toString());
};
