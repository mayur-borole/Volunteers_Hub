import Notification from '../models/Notification.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendNotificationToUser } from '../sockets/socketManager.js';

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const notifications = await Notification.find({ user: req.user._id })
    .sort('-createdAt')
    .skip(skip)
    .limit(limit)
    .populate('relatedEvent', 'title date')
    .populate('relatedUser', 'name');

  const total = await Notification.countDocuments({ user: req.user._id });
  const unreadCount = await Notification.countDocuments({
    user: req.user._id,
    isRead: false
  });

  res.status(200).json({
    success: true,
    count: notifications.length,
    total,
    unreadCount,
    page,
    pages: Math.ceil(total / limit),
    notifications
  });
});

// @desc    Get unread notifications count
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.getUnreadCount(req.user._id);

  res.status(200).json({
    success: true,
    unreadCount
  });
});

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found'
    });
  }

  // Check ownership
  if (notification.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized'
    });
  }

  notification.isRead = true;
  await notification.save();

  res.status(200).json({
    success: true,
    message: 'Notification marked as read',
    notification
  });
});

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/mark-all-read
// @access  Private
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.markAllAsRead(req.user._id);

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read'
  });
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found'
    });
  }

  // Check ownership
  if (notification.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized'
    });
  }

  await notification.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Notification deleted'
  });
});

// @desc    Delete all read notifications
// @route   DELETE /api/notifications/delete-read
// @access  Private
export const deleteReadNotifications = asyncHandler(async (req, res) => {
  const result = await Notification.deleteMany({
    user: req.user._id,
    isRead: true
  });

  res.status(200).json({
    success: true,
    message: `${result.deletedCount} notifications deleted`
  });
});

// @desc    Create notification (Admin/System use)
// @route   POST /api/notifications
// @access  Private/Admin
export const createNotification = asyncHandler(async (req, res) => {
  const { userId, message, type, relatedEvent, priority } = req.body;

  const notification = await Notification.create({
    user: userId,
    message,
    type: type || 'system',
    relatedEvent,
    priority: priority || 'medium'
  });

  // Send real-time notification
  sendNotificationToUser(userId, notification);

  res.status(201).json({
    success: true,
    message: 'Notification created',
    notification
  });
});

// @desc    Get notification settings (placeholder for future)
// @route   GET /api/notifications/settings
// @access  Private
export const getNotificationSettings = asyncHandler(async (req, res) => {
  // This is a placeholder for notification preferences
  // Can be extended to store user preferences in User model
  
  res.status(200).json({
    success: true,
    settings: {
      emailNotifications: true,
      pushNotifications: true,
      eventUpdates: true,
      registrationNotifications: true,
      feedbackNotifications: true
    }
  });
});
