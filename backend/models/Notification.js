import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required']
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters']
    },
    type: {
      type: String,
      enum: {
        values: ['registration', 'approval', 'update', 'cancellation', 'reminder', 'feedback', 'system', 'message'],
        message: 'Invalid notification type'
      },
      required: true
    },
    relatedEvent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    },
    relatedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isRead: {
      type: Boolean,
      default: false
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    actionUrl: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient queries
notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ createdAt: -1 });

// Compound index for user notifications sorted by read status and date
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

// Static method to create notification
notificationSchema.statics.createNotification = async function (data) {
  try {
    const notification = await this.create(data);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Static method to mark all as read for a user
notificationSchema.statics.markAllAsRead = async function (userId) {
  return await this.updateMany(
    { user: userId, isRead: false },
    { isRead: true }
  );
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function (userId) {
  return await this.countDocuments({ user: userId, isRead: false });
};

// Static method to delete old notifications (cleanup)
notificationSchema.statics.deleteOldNotifications = async function (daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isRead: true
  });
};

// Auto-delete old read notifications (optional)
// Run this periodically with a cron job
notificationSchema.statics.cleanupOldNotifications = async function () {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  await this.deleteMany({
    isRead: true,
    createdAt: { $lt: thirtyDaysAgo }
  });
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
