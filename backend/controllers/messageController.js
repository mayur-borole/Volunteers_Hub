import Message from '../models/Message.js';
import Event from '../models/Event.js';
import Notification from '../models/Notification.js';
import { getIO, getRecipientSocketId, sendNotificationToUser } from '../sockets/socketManager.js';

// @desc Send a message
// @route POST /api/messages/send
// @access Private
export const sendMessage = async (req, res) => {
  try {
    const { eventId, recipientId, content } = req.body;
    const senderId = req.user._id;

    // Validate event exists
    const event = await Event.findById(eventId).populate('organizer', '_id role');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Role-based authorization & allowed pairs
    const isOrganizer = event.organizer && event.organizer._id.toString() === senderId.toString();
    const isVolunteer = req.user.role === 'volunteer';

    if (!isOrganizer && !isVolunteer && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to message for this event' });
    }

    if (isOrganizer) {
      const registration = event.registrations?.find(
        (r) => r.volunteerId.toString() === recipientId.toString()
      );
      if (!registration) {
        return res.status(400).json({ message: 'Recipient is not registered for this event' });
      }
    }

    if (isVolunteer && recipientId.toString() !== event.organizer._id.toString()) {
      return res.status(403).json({ message: 'Volunteers can only message the organizer for this event' });
    }

    // Create message
    const message = await Message.create({
      event: eventId,
      sender: senderId,
      recipient: recipientId,
      content: content.trim(),
    });

    // Populate sender and recipient details
    await message.populate('sender', 'name email avatar');
    await message.populate('recipient', 'name email avatar');

    // Create notification for recipient
    const notification = await Notification.create({
      user: recipientId,
      type: 'message',
      message: `${req.user.name} sent you a message about "${event.title}"`,
      relatedEvent: eventId,
      relatedUser: senderId,
      actionUrl: `/events/${eventId}`
    });

    // Send real-time notification via Socket.IO
    const io = getIO();
    const recipientSocketId = getRecipientSocketId(recipientId.toString());
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('newNotification', notification);
      io.to(recipientSocketId).emit('newMessage', message);
    }

    // Echo to sender (other tabs/devices) so threads stay in sync
    const senderSocketId = getRecipientSocketId(senderId.toString());
    if (senderSocketId) {
      io.to(senderSocketId).emit('newMessage', message);
    }

    // Also emit through user room helper to keep NotificationBell in sync even if socket id changes
    sendNotificationToUser(recipientId, notification);

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc Get all messages for an event between two users
// @route GET /api/messages/conversation/:eventId/:userId
// @access Private
export const getConversation = async (req, res) => {
  try {
    const { eventId, userId } = req.params;
    const currentUserId = req.user._id;

    // Validate event exists
    const event = await Event.findById(eventId).populate('organizer', '_id');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const isOrganizer = event.organizer && event.organizer._id.toString() === currentUserId.toString();
    const isVolunteer = currentUserId.toString() === userId.toString() || req.user.role === 'volunteer';

    if (!isOrganizer && !isVolunteer && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this conversation' });
    }

    // Get messages between current user and specified user for this event
    const messages = await Message.find({
      event: eventId,
      $or: [
        { sender: currentUserId, recipient: userId },
        { sender: userId, recipient: currentUserId },
      ],
    })
      .populate('sender', 'name email avatar')
      .populate('recipient', 'name email avatar')
      .sort({ createdAt: 1 });

    // Mark messages sent to current user as read
    await Message.updateMany(
      {
        event: eventId,
        sender: userId,
        recipient: currentUserId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    res.json(messages);
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc Get all messages for an event (for organizers)
// @route GET /api/messages/event/:eventId
// @access Private
export const getEventMessages = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;

    // Validate event exists and user is organizer
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizer.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get all messages for this event
    const messages = await Message.find({ event: eventId })
      .populate('sender', 'name email avatar')
      .populate('recipient', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json(messages);
  } catch (error) {
    console.error('Get event messages error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc Mark message as read
// @route PUT /api/messages/:id/read
// @access Private
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only recipient can mark as read
    if (message.recipient.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    message.isRead = true;
    message.readAt = new Date();
    await message.save();

    res.json(message);
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc Delete a message
// @route DELETE /api/messages/:id
// @access Private
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only sender can delete their message
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await message.deleteOne();
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc Get unread message count
// @route GET /api/messages/unread/count
// @access Private
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const count = await Message.countDocuments({
      recipient: userId,
      isRead: false,
    });

    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
