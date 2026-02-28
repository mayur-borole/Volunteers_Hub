import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import APIFeatures from '../utils/apiFeatures.js';

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  res.status(200).json({
    success: true,
    user
  });
});

// @desc    Get my certificates with event and rating info
// @route   GET /api/users/my-certificates
// @access  Private/Volunteer
export const getMyCertificates = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const certificateEntries = Array.isArray(user.certificates) ? user.certificates : [];

  const certificates = certificateEntries.map((cert) => {
    const eventId = cert.eventId || cert.event || null;
    const eventName = cert.eventName || cert.eventTitle || 'Event';
    const certificateURL = cert.certificateURL || cert.url || '';
    const workTime = cert.workTime || cert.workDuration || '';
    const organizerRating = typeof cert.rating === 'number' ? cert.rating : null;

    return {
      certificateId: cert._id,
      eventId,
      eventName,
      workTime,
      organizerRating,
      certificateURL,
      issuedAt: cert.issuedAt,
      volunteerRatingForEvent: null,
      volunteerFeedback: '',
    };
  });

  res.status(200).json({
    success: true,
    certificates,
  });
});

// @desc    Delete one of my certificates (volunteer)
// @route   DELETE /api/users/my-certificates/:certificateId
// @access  Private/Volunteer
export const deleteMyCertificate = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const { certificateId } = req.params;

  if (!certificateId) {
    return res.status(400).json({ success: false, message: 'Certificate ID is required' });
  }

  const originalLength = Array.isArray(user.certificates) ? user.certificates.length : 0;

  user.certificates = (user.certificates || []).filter(
    (cert) => cert._id.toString() !== certificateId.toString()
  );

  if (user.certificates.length === originalLength) {
    return res.status(404).json({ success: false, message: 'Certificate not found' });
  }

  await user.save();

  res.status(200).json({ success: true, message: 'Certificate removed successfully' });
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = asyncHandler(async (req, res) => {
  const allowedUpdates = [
    'name',
    'phone',
    'bio',
    'skills',
    'interests',
    'availability',
    'profileImage'
  ];

  const updates = {};
  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updates,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    user
  });
});

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
export const getAllUsers = asyncHandler(async (req, res) => {
  // Build query
  const features = new APIFeatures(User.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const users = await features.query;

  // Get total count for pagination
  const total = await User.countDocuments();

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    users
  });
});

// @desc    Get single user (Admin only)
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Get user's event participation stats
  let stats = {};
  if (user.role === 'volunteer') {
    const participatedEvents = await Event.countDocuments({
      volunteers: user._id,
      status: 'completed'
    });
    const upcomingEvents = await Event.countDocuments({
      volunteers: user._id,
      status: 'upcoming'
    });
    stats = { participatedEvents, upcomingEvents };
  } else if (user.role === 'organizer') {
    const totalEvents = await Event.countDocuments({ organizer: user._id });
    const approvedEvents = await Event.countDocuments({
      organizer: user._id,
      approved: true
    });
    stats = { totalEvents, approvedEvents };
  }

  res.status(200).json({
    success: true,
    user,
    stats
  });
});

// @desc    Block/Unblock user (Admin only)
// @route   PATCH /api/users/block/:id
// @access  Private/Admin
export const toggleBlockUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Prevent blocking admin
  if (user.role === 'admin') {
    return res.status(400).json({
      success: false,
      message: 'Cannot block admin users'
    });
  }

  // Toggle block status
  user.isBlocked = !user.isBlocked;
  await user.save();

  res.status(200).json({
    success: true,
    message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`,
    user
  });
});

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Prevent deleting admin
  if (user.role === 'admin') {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete admin users'
    });
  }

  // If organizer, handle their events
  if (user.role === 'organizer') {
    await Event.updateMany(
      { organizer: user._id },
      { status: 'cancelled' }
    );
  }

  // If volunteer, remove from event registrations
  if (user.role === 'volunteer') {
    await Event.updateMany(
      { volunteers: user._id },
      { $pull: { volunteers: user._id } }
    );
  }

  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});

// @desc    Get volunteers by skills (for organizers)
// @route   GET /api/users/volunteers/by-skills
// @access  Private/Organizer
export const getVolunteersBySkills = asyncHandler(async (req, res) => {
  const { skills } = req.query;

  if (!skills) {
    return res.status(400).json({
      success: false,
      message: 'Please provide skills to search'
    });
  }

  const skillsArray = skills.split(',').map(s => s.trim());

  const volunteers = await User.find({
    role: 'volunteer',
    isBlocked: false,
    skills: { $in: skillsArray }
  }).select('name email skills interests availability');

  res.status(200).json({
    success: true,
    count: volunteers.length,
    volunteers
  });
});

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private/Admin
export const getUserStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const volunteers = await User.countDocuments({ role: 'volunteer' });
  const organizers = await User.countDocuments({ role: 'organizer' });
  const admins = await User.countDocuments({ role: 'admin' });
  const blockedUsers = await User.countDocuments({ isBlocked: true });

  // Users registered in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentUsers = await User.countDocuments({
    createdAt: { $gte: thirtyDaysAgo }
  });

  res.status(200).json({
    success: true,
    stats: {
      totalUsers,
      volunteers,
      organizers,
      admins,
      blockedUsers,
      recentUsers
    }
  });
});
