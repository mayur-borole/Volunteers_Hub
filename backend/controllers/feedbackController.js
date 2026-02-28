import Feedback from '../models/Feedback.js';
import Event from '../models/Event.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Create feedback
// @route   POST /api/feedback
// @access  Private/Volunteer
export const createFeedback = asyncHandler(async (req, res) => {
  const { event, rating, comment } = req.body;

  // Check if event exists
  const eventDoc = await Event.findById(event);

  if (!eventDoc) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  // Check if event is completed
  if (eventDoc.status !== 'completed') {
    return res.status(400).json({
      success: false,
      message: 'You can only give feedback for completed events'
    });
  }

  // Check if volunteer participated in the event
  if (!eventDoc.volunteers.includes(req.user._id)) {
    return res.status(403).json({
      success: false,
      message: 'You can only give feedback for events you participated in'
    });
  }

  // Check if feedback already exists
  const existingFeedback = await Feedback.findOne({
    event,
    volunteer: req.user._id
  });

  if (existingFeedback) {
    return res.status(400).json({
      success: false,
      message: 'You have already submitted feedback for this event'
    });
  }

  // Create feedback
  const feedback = await Feedback.create({
    event,
    volunteer: req.user._id,
    rating,
    comment
  });

  // Populate volunteer details
  await feedback.populate('volunteer', 'name profileImage');
  await feedback.populate('event', 'title');

  res.status(201).json({
    success: true,
    message: 'Feedback submitted successfully',
    feedback
  });
});

// @desc    Get feedback for an event
// @route   GET /api/feedback/event/:eventId
// @access  Public
export const getEventFeedback = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  // Check if event exists
  const event = await Event.findById(eventId);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  // Get all feedback for the event (only approved and not flagged)
  const feedbacks = await Feedback.find({
    event: eventId,
    isApproved: true,
    flaggedAsInappropriate: false
  })
    .populate('volunteer', 'name profileImage')
    .sort('-createdAt');

  // Calculate rating distribution
  const ratingDistribution = await Feedback.aggregate([
    {
      $match: {
        event: event._id,
        isApproved: true,
        flaggedAsInappropriate: false
      }
    },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: -1 }
    }
  ]);

  res.status(200).json({
    success: true,
    count: feedbacks.length,
    averageRating: event.averageRating,
    totalRatings: event.totalRatings,
    ratingDistribution,
    feedbacks
  });
});

// @desc    Get my feedback (volunteer)
// @route   GET /api/feedback/my-feedback
// @access  Private/Volunteer
export const getMyFeedback = asyncHandler(async (req, res) => {
  const feedbacks = await Feedback.find({ volunteer: req.user._id })
    .populate('event', 'title date location')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: feedbacks.length,
    feedbacks
  });
});

// @desc    Update feedback
// @route   PUT /api/feedback/:id
// @access  Private/Volunteer (own feedback)
export const updateFeedback = asyncHandler(async (req, res) => {
  let feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    return res.status(404).json({
      success: false,
      message: 'Feedback not found'
    });
  }

  // Check ownership
  if (feedback.volunteer.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this feedback'
    });
  }

  const { rating, comment } = req.body;

  feedback.rating = rating || feedback.rating;
  feedback.comment = comment || feedback.comment;

  await feedback.save();

  await feedback.populate('volunteer', 'name profileImage');
  await feedback.populate('event', 'title');

  res.status(200).json({
    success: true,
    message: 'Feedback updated successfully',
    feedback
  });
});

// @desc    Delete feedback
// @route   DELETE /api/feedback/:id
// @access  Private/Volunteer (own feedback) or Admin
export const deleteFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    return res.status(404).json({
      success: false,
      message: 'Feedback not found'
    });
  }

  // Check ownership or admin
  if (
    req.user.role !== 'admin' &&
    feedback.volunteer.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this feedback'
    });
  }

  await feedback.deleteOne();

  // Recalculate event rating
  await Feedback.calculateAverageRating(feedback.event);

  res.status(200).json({
    success: true,
    message: 'Feedback deleted successfully'
  });
});

// @desc    Flag feedback as inappropriate (Admin only)
// @route   PATCH /api/feedback/:id/flag
// @access  Private/Admin
export const flagFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    return res.status(404).json({
      success: false,
      message: 'Feedback not found'
    });
  }

  feedback.flaggedAsInappropriate = !feedback.flaggedAsInappropriate;
  await feedback.save();

  // Recalculate event rating
  await Feedback.calculateAverageRating(feedback.event);

  res.status(200).json({
    success: true,
    message: `Feedback ${feedback.flaggedAsInappropriate ? 'flagged' : 'unflagged'} successfully`,
    feedback
  });
});

// @desc    Get all feedback (Admin only)
// @route   GET /api/feedback/admin/all
// @access  Private/Admin
export const getAllFeedback = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const feedbacks = await Feedback.find()
    .populate('volunteer', 'name email')
    .populate('event', 'title')
    .sort('-createdAt')
    .skip(skip)
    .limit(limit);

  const total = await Feedback.countDocuments();

  res.status(200).json({
    success: true,
    count: feedbacks.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    feedbacks
  });
});

// @desc    Get feedback statistics
// @route   GET /api/feedback/stats
// @access  Private/Admin
export const getFeedbackStats = asyncHandler(async (req, res) => {
  const totalFeedback = await Feedback.countDocuments();
  const flaggedFeedback = await Feedback.countDocuments({ flaggedAsInappropriate: true });

  // Average rating across all events
  const avgRatingResult = await Feedback.aggregate([
    {
      $match: {
        isApproved: true,
        flaggedAsInappropriate: false
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' }
      }
    }
  ]);

  const averageRating = avgRatingResult.length > 0 
    ? Math.round(avgRatingResult[0].averageRating * 10) / 10 
    : 0;

  // Rating distribution
  const ratingDistribution = await Feedback.aggregate([
    {
      $match: {
        isApproved: true,
        flaggedAsInappropriate: false
      }
    },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  res.status(200).json({
    success: true,
    stats: {
      totalFeedback,
      flaggedFeedback,
      averageRating,
      ratingDistribution
    }
  });
});
