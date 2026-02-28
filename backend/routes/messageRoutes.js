import express from 'express';
import { protect } from '../middlewares/auth.js';
import {
  sendMessage,
  getConversation,
  getEventMessages,
  markAsRead,
  deleteMessage,
  getUnreadCount,
} from '../controllers/messageController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Send a message
router.post('/send', sendMessage);

// Get conversation between two users for an event
router.get('/conversation/:eventId/:userId', getConversation);

// Get all messages for an event (organizers only)
router.get('/event/:eventId', getEventMessages);

// Mark message as read
router.put('/:id/read', markAsRead);

// Delete a message
router.delete('/:id', deleteMessage);

// Get unread message count
router.get('/unread/count', getUnreadCount);

export default router;
