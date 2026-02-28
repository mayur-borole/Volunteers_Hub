import Event from '../models/Event.js';
import User from '../models/User.js';
import Feedback from '../models/Feedback.js';
import Notification from '../models/Notification.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Get volunteer statistics
// @route   GET /api/analytics/volunteer
// @access  Private/Volunteer
export const getVolunteerStats = asyncHandler(async (req, res) => {
  const volunteerId = req.user._id;
  const user = await User.findById(volunteerId);

  // Total events participated (completed) – prefer user metric, fall back to event scan
  let totalParticipated = user?.completedEventsCount || 0;
  if (!totalParticipated) {
    totalParticipated = await Event.countDocuments({
      status: 'completed',
      'registrations.volunteerId': volunteerId,
      'registrations.present': true,
    });
  }

  // Upcoming events (where volunteer has an approved or pending registration)
  const upcomingEvents = await Event.countDocuments({
    status: 'upcoming',
    'registrations.volunteerId': volunteerId,
  });

  // Total registered events
  const totalRegistered = await Event.countDocuments({
    'registrations.volunteerId': volunteerId,
  });

  // Hours volunteered – use tracked user metric if available
  const hoursVolunteered = user?.totalVolunteerHours || 0;

  // Feedback given – count events where this volunteer left feedback
  const feedbackGiven = await Event.countDocuments({
    'registrations.volunteerId': volunteerId,
    'registrations.volunteerFeedback': { $exists: true, $ne: '' },
  });

  // Events by category
  const eventsByCategory = await Event.aggregate([
    {
      $match: {
        status: 'completed',
        'registrations.volunteerId': volunteerId,
        'registrations.present': true,
      }
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  // Recent events
  const recentEvents = await Event.find({
    'registrations.volunteerId': volunteerId,
  })
    .sort('-date')
    .limit(5)
    .populate('organizer', 'name')
    .select('title date location status');

  // Impact score (based on participation)
  const impactScore = user?.impactScore ?? (totalParticipated * 10 + feedbackGiven * 5);

  res.status(200).json({
    success: true,
    stats: {
      totalParticipated,
      upcomingEvents,
      totalRegistered,
      hoursVolunteered,
      feedbackGiven,
      impactScore,
      eventsByCategory,
      recentEvents
    }
  });
});

// @desc    Get organizer statistics
// @route   GET /api/analytics/organizer
// @access  Private/Organizer
export const getOrganizerStats = asyncHandler(async (req, res) => {
  const organizerId = req.user._id;

  // Total events created
  const totalEventsCreated = await Event.countDocuments({
    organizer: organizerId
  });

  // Approved events
  const approvedEvents = await Event.countDocuments({
    organizer: organizerId,
    approved: true
  });

  // Pending approval
  const pendingApproval = await Event.countDocuments({
    organizer: organizerId,
    approved: false
  });

  // Total registrations across all events
  const registrationsResult = await Event.aggregate([
    {
      $match: { organizer: organizerId }
    },
    {
      $group: {
        _id: null,
        totalRegistrations: { $sum: '$totalRegistrations' }
      }
    }
  ]);

  const totalRegistrations = registrationsResult.length > 0 
    ? registrationsResult[0].totalRegistrations 
    : 0;

  // Average rating of events
  const avgRatingResult = await Event.aggregate([
    {
      $match: {
        organizer: organizerId,
        totalRatings: { $gt: 0 }
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$averageRating' }
      }
    }
  ]);

  const averageEventRating = avgRatingResult.length > 0 
    ? Math.round(avgRatingResult[0].averageRating * 10) / 10 
    : 0;

  // Total feedback received
  const totalFeedback = await Event.aggregate([
    {
      $match: { organizer: organizerId }
    },
    {
      $group: {
        _id: null,
        totalFeedback: { $sum: '$totalRatings' }
      }
    }
  ]);

  const feedbackCount = totalFeedback.length > 0 ? totalFeedback[0].totalFeedback : 0;

  // Attendance rate (assuming completed events had full participation)
  const completedEvents = await Event.countDocuments({
    organizer: organizerId,
    status: 'completed'
  });

  const attendanceRate = totalRegistrations > 0 
    ? Math.round((completedEvents / totalEventsCreated) * 100) 
    : 0;

  // Events by status
  const eventsByStatus = await Event.aggregate([
    {
      $match: { organizer: organizerId }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Recent events
  const recentEvents = await Event.find({
    organizer: organizerId
  })
    .sort('-createdAt')
    .limit(5)
    .select('title date status approved totalRegistrations averageRating');

  // Top performing events (by rating)
  const topEvents = await Event.find({
    organizer: organizerId,
    totalRatings: { $gt: 0 }
  })
    .sort('-averageRating')
    .limit(3)
    .select('title averageRating totalRatings date');

  res.status(200).json({
    success: true,
    stats: {
      totalEventsCreated,
      approvedEvents,
      pendingApproval,
      totalRegistrations,
      averageEventRating,
      feedbackCount,
      attendanceRate,
      eventsByStatus,
      recentEvents,
      topEvents
    }
  });
});

// @desc    Get organizer analytics for a specific event
// @route   GET /api/analytics/organizer/:eventId
// @access  Private/Organizer/Admin
export const getOrganizerEventAnalytics = asyncHandler(async (req, res) => {
  const eventId = req.params.eventId;

  const event = await Event.findById(eventId);

  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  if (
    req.user.role !== 'admin' &&
    event.organizer.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({ success: false, message: 'Not authorized to view analytics for this event' });
  }

  const presentCount = (event.attendance || []).filter((a) => a.present).length;
  const hoursPerVolunteer = event.totalVolunteerHours && presentCount > 0
    ? event.totalVolunteerHours / presentCount
    : computeEventDurationHours ? computeEventDurationHours(event) : 0;
  const totalHours = event.totalVolunteerHours || (presentCount * hoursPerVolunteer);
  const totalImpact = totalHours * 10;

  res.status(200).json({
    success: true,
    analytics: {
      eventId: event._id,
      totalVolunteersAttended: presentCount,
      totalVolunteerHours: totalHours,
      totalImpactScore: totalImpact,
    },
  });
});

// @desc    Get admin dashboard statistics
// @route   GET /api/analytics/admin
// @access  Private/Admin
export const getAdminStats = asyncHandler(async (req, res) => {
  // User statistics
  const totalUsers = await User.countDocuments();
  const totalVolunteers = await User.countDocuments({ role: 'volunteer' });
  const totalOrganizers = await User.countDocuments({ role: 'organizer' });
  const blockedUsers = await User.countDocuments({ isBlocked: true });

  // Event statistics
  const totalEvents = await Event.countDocuments();
  const approvedEvents = await Event.countDocuments({ approved: true });
  const pendingEvents = await Event.countDocuments({ approved: false });
  const activeEvents = await Event.countDocuments({ status: 'upcoming', approved: true });
  const completedEvents = await Event.countDocuments({ status: 'completed' });

  // Total registrations
  const totalRegistrationsResult = await Event.aggregate([
    {
      $group: {
        _id: null,
        totalRegistrations: { $sum: '$totalRegistrations' }
      }
    }
  ]);

  const totalRegistrations = totalRegistrationsResult.length > 0 
    ? totalRegistrationsResult[0].totalRegistrations 
    : 0;

  // Feedback statistics
  const totalFeedbackCount = await Feedback.countDocuments();
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

  const platformAverageRating = avgRatingResult.length > 0 
    ? Math.round(avgRatingResult[0].averageRating * 10) / 10 
    : 0;

  // Notifications
  const totalNotifications = await Notification.countDocuments();
  const unreadNotifications = await Notification.countDocuments({ isRead: false });

  // Growth metrics (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const newUsers = await User.countDocuments({
    createdAt: { $gte: thirtyDaysAgo }
  });

  const newEvents = await Event.countDocuments({
    createdAt: { $gte: thirtyDaysAgo }
  });

  // Events by category
  const eventsByCategory = await Event.aggregate([
    {
      $match: { approved: true }
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  // Events by status
  const eventsByStatus = await Event.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Top locations
  const topLocations = await Event.aggregate([
    {
      $match: { approved: true }
    },
    {
      $group: {
        _id: '$location',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 5
    }
  ]);

  // Most active organizers
  const topOrganizers = await Event.aggregate([
    {
      $group: {
        _id: '$organizer',
        eventsCreated: { $sum: 1 },
        totalRegistrations: { $sum: '$totalRegistrations' }
      }
    },
    {
      $sort: { eventsCreated: -1 }
    },
    {
      $limit: 5
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'organizer'
      }
    },
    {
      $unwind: '$organizer'
    },
    {
      $project: {
        name: '$organizer.name',
        email: '$organizer.email',
        eventsCreated: 1,
        totalRegistrations: 1
      }
    }
  ]);

  // Most active volunteers
  const topVolunteers = await Event.aggregate([
    {
      $match: { status: 'completed' }
    },
    {
      $unwind: '$volunteers'
    },
    {
      $group: {
        _id: '$volunteers',
        eventsParticipated: { $sum: 1 }
      }
    },
    {
      $sort: { eventsParticipated: -1 }
    },
    {
      $limit: 5
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'volunteer'
      }
    },
    {
      $unwind: '$volunteer'
    },
    {
      $project: {
        name: '$volunteer.name',
        email: '$volunteer.email',
        eventsParticipated: 1
      }
    }
  ]);

  // Recent activity
  const recentEvents = await Event.find()
    .sort('-createdAt')
    .limit(10)
    .populate('organizer', 'name')
    .select('title status approved createdAt');

  res.status(200).json({
    success: true,
    stats: {
      users: {
        totalUsers,
        totalVolunteers,
        totalOrganizers,
        blockedUsers,
        newUsers
      },
      events: {
        totalEvents,
        approvedEvents,
        pendingEvents,
        activeEvents,
        completedEvents,
        newEvents,
        totalRegistrations
      },
      feedback: {
        totalFeedbackCount,
        flaggedFeedback,
        platformAverageRating
      },
      notifications: {
        totalNotifications,
        unreadNotifications
      },
      insights: {
        eventsByCategory,
        eventsByStatus,
        topLocations,
        topOrganizers,
        topVolunteers
      },
      recentActivity: recentEvents
    }
  });
});

// @desc    Get platform overview (public stats)
// @route   GET /api/analytics/overview
// @access  Public
export const getPlatformOverview = asyncHandler(async (req, res) => {
  const totalEvents = await Event.countDocuments({ approved: true });
  const totalVolunteers = await User.countDocuments({ role: 'volunteer' });
  const totalOrganizers = await User.countDocuments({ role: 'organizer' });
  
  const totalRegistrationsResult = await Event.aggregate([
    {
      $match: { approved: true }
    },
    {
      $group: {
        _id: null,
        totalRegistrations: { $sum: '$totalRegistrations' }
      }
    }
  ]);

  const totalImpact = totalRegistrationsResult.length > 0 
    ? totalRegistrationsResult[0].totalRegistrations * 4 
    : 0; // Hours of service

  res.status(200).json({
    success: true,
    overview: {
      totalEvents,
      totalVolunteers,
      totalOrganizers,
      hoursOfService: totalImpact
    }
  });
});
