import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
  createNotification,
  getNotificationSettings
} from '../controllers/notificationController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { mongoIdValidation } from '../middlewares/validator.js';

const router = express.Router();

// User routes
router.get('/', protect, getNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.get('/settings', protect, getNotificationSettings);
router.patch('/mark-all-read', protect, markAllAsRead);
router.delete('/delete-read', protect, deleteReadNotifications);
router.patch('/:id/read', protect, mongoIdValidation, markAsRead);
router.delete('/:id', protect, mongoIdValidation, deleteNotification);

// Admin routes
router.post('/', protect, authorize('admin'), createNotification);

export default router;
