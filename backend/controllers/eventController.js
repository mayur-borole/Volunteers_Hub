import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import Event from '../models/Event.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import asyncHandler from '../utils/asyncHandler.js';
import APIFeatures from '../utils/apiFeatures.js';
import { sendEmail, emailTemplates } from '../utils/emailService.js';
import { getIO, sendNotificationToUser } from '../sockets/socketManager.js';

const normalizeObjectId = (value) => value?.toString?.() || String(value);

const getRegistrationByVolunteer = (event, volunteerId) => {
  const volunteerIdStr = normalizeObjectId(volunteerId);
  return event.registrations.find(
    (registration) => {
      const regVolunteerId = registration?.volunteerId?._id || registration?.volunteerId;
      return normalizeObjectId(regVolunteerId) === volunteerIdStr;
    }
  );
};

const emitRegistrationUpdate = (userIds, payload) => {
  try {
    const io = getIO();
    userIds
      .filter(Boolean)
      .forEach((userId) => {
        io.to(normalizeObjectId(userId)).emit('registrationUpdated', payload);
      });
  } catch (error) {
    console.error('Failed to emit registration update:', error.message);
  }
};

const HOURS_MULTIPLIER = 10; // impactScore = hours * 10

// Accepts time strings like "14:30" or "2:30 PM" and
// combines them with the provided event date to produce
// a proper Date object for storage and calculations.
const parseTimeStringToDate = (baseDate, timeString) => {
  if (!baseDate || !timeString) return null;

  const eventDate = new Date(baseDate);
  if (!Number.isFinite(eventDate.getTime())) return null;

  const trimmed = String(timeString).trim();
  if (!trimmed) return null;

  // Matches:
  //  - 14:30
  //  - 2:30 PM / 2:30 pm
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3];

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  // If AM/PM is provided, convert to 24-hour.
  if (ampm) {
    const upper = ampm.toUpperCase();
    // For AM/PM, hours must be 1-12
    if (hours < 1 || hours > 12) return null;
    if (upper === 'AM') {
      if (hours === 12) hours = 0; // 12:xx AM -> 00:xx
    } else if (upper === 'PM') {
      if (hours !== 12) hours += 12; // 1-11 PM -> 13-23
    }
  }

  // If AM/PM not provided, treat as 24-hour input from <input type="time">.
  if (!ampm && (hours < 0 || hours > 23)) return null;

  eventDate.setHours(hours, minutes, 0, 0);
  return eventDate;
};

const computeEventDurationHours = (event) => {
  if (!event) return 0;

  // Event schema stores startTime/endTime as Date,
  // but older or malformed data may be strings. We handle both.
  const start = event.startTime ? new Date(event.startTime).getTime() : NaN;
  const end = event.endTime ? new Date(event.endTime).getTime() : NaN;

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  const diffMs = end - start;
  return diffMs / 1000 / 60 / 60;
};

const createRealtimeNotification = async ({
  userId,
  message,
  type,
  relatedEvent,
  relatedUser,
  actionUrl,
  priority = 'medium'
}) => {
  const notification = await Notification.create({
    user: userId,
    message,
    type,
    relatedEvent,
    relatedUser,
    actionUrl,
    priority
  });

  const fullNotification = await Notification.findById(notification._id)
    .populate('relatedEvent', 'title date')
    .populate('relatedUser', 'name');

  sendNotificationToUser(userId, fullNotification || notification);
  return fullNotification || notification;
};

// @desc    Create new event
// @route   POST /api/events
// @access  Private/Organizer
export const createEvent = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    location,
    coordinates,
    address,
    googleMapsLink,
    date,
    startTime,
    endTime,
    registrationDeadline,
    instructionsForVolunteers,
    maxVolunteers,
    category,
    imageUrl,
    images,
    notes
  } = req.body;

  const normalizedImageUrl = typeof imageUrl === 'string' ? imageUrl : '';

  // Normalize time strings (e.g. "14:00" or "2:00 PM") into Date objects
  const normalizedStartTime = parseTimeStringToDate(date, startTime) || undefined;
  const normalizedEndTime = parseTimeStringToDate(date, endTime) || undefined;

  // Create event with organizer
  const event = await Event.create({
    title,
    description,
    location,
    coordinates,
    address,
    googleMapsLink,
    date,
    startTime: normalizedStartTime,
    endTime: normalizedEndTime,
    registrationDeadline,
    instructionsForVolunteers: instructionsForVolunteers || '',
    maxVolunteers,
    category,
    images: Array.isArray(images) ? images : [],
    imageUrl: normalizedImageUrl,
    notes,
    organizer: req.user._id,
    approved: true  // Auto-approve events so they appear immediately on Events page
  });

  // Populate organizer details
  await event.populate('organizer', 'name email');

  res.status(201).json({
    success: true,
    message: 'Event created successfully and is now visible to volunteers!',
    event
  });
});

// @desc    Get all events (with filters)
// @route   GET /api/events
// @access  Public
export const getAllEvents = asyncHandler(async (req, res) => {
  // Build query (exclude soft-deleted events by default)
  let query = Event.find({ isDeleted: { $ne: true } });
  const now = new Date();

  // Apply filters
  const { location, date, category, status, approved, organizer } = req.query;

  // Filter by location
  if (location) {
    query = query.find({ location: { $regex: location, $options: 'i' } });
  }

  // Filter by date
  if (date) {
    const searchDate = new Date(date);
    const nextDay = new Date(searchDate);
    nextDay.setDate(nextDay.getDate() + 1);
    query = query.find({
      date: { $gte: searchDate, $lt: nextDay }
    });
  }

  // Filter by category
  if (category) {
    query = query.find({ category });
  }

  // Filter by status
  if (status) {
    query = query.find({ status });
  }

  // Filter by approved status (default: show only approved for non-admins)
  if (req.user && req.user.role === 'admin') {
    if (approved !== undefined) {
      query = query.find({ approved: approved === 'true' });
    }
  } else if (req.user && req.user.role === 'organizer') {
    // Organizers see their own events + approved events
    query = query.find({
      $or: [{ approved: true }, { organizer: req.user._id }]
    });
  } else {
    // Public and volunteers see only approved events
    query = query.find({ approved: true, status: 'upcoming', date: { $gte: now } });
  }

  // Ensure upcoming feed never includes expired events
  if (status === 'upcoming') {
    query = query.find({ date: { $gte: now } });
  }

  // Filter by organizer
  if (organizer) {
    query = query.find({ organizer });
  }

  // Apply search if provided
  if (req.query.search) {
    query = query.find({
      $or: [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ]
    });
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // Sorting
  const sortBy = req.query.sort || '-createdAt';
  query = query.sort(sortBy);

  // Execute query with pagination
  const events = await query
    .skip(skip)
    .limit(limit)
    .populate('organizer', 'name email')
    .populate('volunteers', 'name email skills');

  // Get total count
  const total = await Event.countDocuments(query.getFilter());

  res.status(200).json({
    success: true,
    count: events.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    events
  });
});

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
export const getEventById = asyncHandler(async (req, res) => {
  const event = await Event.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
    .populate('organizer', 'name email phone')
    .populate('volunteers', 'name email skills interests')
    .populate('registrations.volunteerId', 'name email phone');

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  res.status(200).json({
    success: true,
    event
  });
});

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private/Organizer (own events) or Admin
export const updateEvent = asyncHandler(async (req, res) => {
  let event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  // Check ownership (organizer can only update their own events)
  if (
    req.user.role !== 'admin' &&
    event.organizer.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this event'
    });
  }

  // Update event
  const allowedUpdates = [
    'title',
    'description',
    'location',
    'coordinates',
    'address',
    'googleMapsLink',
    'date',
    'startTime',
    'endTime',
    'registrationDeadline',
    'instructionsForVolunteers',
    'maxVolunteers',
    'category',
    'images',
    'imageUrl',
    'notes',
    'status'
  ];

  const updates = {};
  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  // If date or time fields are being updated, normalize time strings
  // like "14:00" or "2:00 PM" into Date objects combined with the
  // event date (existing or updated).
  if (updates.date || updates.startTime || updates.endTime) {
    const effectiveDate = updates.date || event.date;
    if (updates.startTime) {
      const normalizedStartTime = parseTimeStringToDate(effectiveDate, updates.startTime);
      if (normalizedStartTime) {
        updates.startTime = normalizedStartTime;
      } else {
        delete updates.startTime;
      }
    }
    if (updates.endTime) {
      const normalizedEndTime = parseTimeStringToDate(effectiveDate, updates.endTime);
      if (normalizedEndTime) {
        updates.endTime = normalizedEndTime;
      } else {
        delete updates.endTime;
      }
    }
  }

  event = await Event.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true
  }).populate('organizer', 'name email');

  // Notify registered volunteers about the update
  if (event.volunteers.length > 0) {
    const volunteerUsers = await User.find({ _id: { $in: event.volunteers } });

    // Create notifications
    const notifications = volunteerUsers.map(volunteer => ({
      user: volunteer._id,
      message: `Event "${event.title}" has been updated`,
      type: 'update',
      relatedEvent: event._id
    }));

    await Notification.insertMany(notifications);

    // Send emails (optional)
    volunteerUsers.forEach(volunteer => {
      sendEmail({
        to: volunteer.email,
        subject: `Event Update: ${event.title}`,
        html: `<p>Hi ${volunteer.name},</p><p>The event <strong>${event.title}</strong> has been updated. Please check the details.</p>`
      });
    });
  }

  res.status(200).json({
    success: true,
    message: 'Event updated successfully',
    event
  });
});

// @desc    Soft delete event (keep historical data)
// @route   DELETE /api/events/:id
// @access  Private/Organizer (own events) or Admin
export const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  // Check ownership
  if (
    req.user.role !== 'admin' &&
    event.organizer.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this event'
    });
  }

  // Notify volunteers if event is deleted
  if (event.volunteers.length > 0) {
    const volunteerUsers = await User.find({ _id: { $in: event.volunteers } });

    // Create notifications
    const notifications = volunteerUsers.map(volunteer => ({
      user: volunteer._id,
      message: `Event "${event.title}" has been cancelled`,
      type: 'cancellation',
      relatedEvent: event._id
    }));

    await Notification.insertMany(notifications);

    // Send cancellation emails
    const emailContent = emailTemplates.eventCancellation;
    volunteerUsers.forEach(volunteer => {
      sendEmail({
        to: volunteer.email,
        ...emailContent(volunteer.name, event.title)
      });
    });
  }

  // Soft delete: mark as deleted but keep document for history & certificates
  event.isDeleted = true;
  await event.save();

  // Notify organizer and volunteers that event was deleted/hidden
  const io = getIO();
  const payload = {
    eventId: normalizeObjectId(event._id),
  };

  io.to(normalizeObjectId(event.organizer)).emit('eventDeleted', payload);
  (event.volunteers || []).forEach((volId) => {
    io.to(normalizeObjectId(volId)).emit('eventDeleted', payload);
  });

  res.status(200).json({
    success: true,
    message: 'Event deleted successfully'
  });
});

// @desc    Register for event
// @route   POST /api/events/:id/register
// @access  Private/Volunteer
export const registerForEvent = asyncHandler(async (req, res) => {
  if (req.user.role !== 'volunteer') {
    return res.status(403).json({
      success: false,
      message: 'Only volunteers can register for events'
    });
  }

  const event = await Event.findById(req.params.id).populate('organizer', 'name email');

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  // Check if event is approved
  if (!event.approved) {
    return res.status(400).json({
      success: false,
      message: 'This event is not yet approved'
    });
  }

  // Check if event is upcoming
  if (event.status !== 'upcoming') {
    return res.status(400).json({
      success: false,
      message: 'Cannot register for this event'
    });
  }

  // Check if event date has passed
  if (event.date < new Date()) {
    return res.status(400).json({
      success: false,
      message: 'Cannot register for an expired event'
    });
  }

  const { name, age, gender, phone } = req.body;

  if (!name || !age || !gender || !phone) {
    return res.status(400).json({
      success: false,
      message: 'Name, age, gender, and phone are required to apply'
    });
  }

  const existingRegistration = getRegistrationByVolunteer(event, req.user._id);

  if (existingRegistration?.status === 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Your application is already pending organizer approval'
    });
  }

  if (existingRegistration?.status === 'approved') {
    return res.status(400).json({
      success: false,
      message: 'You are already approved for this event'
    });
  }

  if (existingRegistration?.status === 'rejected') {
    existingRegistration.name = name;
    existingRegistration.age = age;
    existingRegistration.gender = gender;
    existingRegistration.phone = phone;
    existingRegistration.status = 'pending';
    existingRegistration.reviewedAt = null;
    existingRegistration.rejectionReason = '';
    existingRegistration.createdAt = new Date();
  } else if (existingRegistration?.status === 'cancelled') {
    existingRegistration.name = name;
    existingRegistration.age = age;
    existingRegistration.gender = gender;
    existingRegistration.phone = phone;
    existingRegistration.status = 'pending';
    existingRegistration.reviewedAt = null;
    existingRegistration.rejectionReason = '';
    existingRegistration.cancellationReason = '';
    existingRegistration.createdAt = new Date();
  } else {
    event.registrations.push({
      volunteerId: req.user._id,
      name,
      age,
      gender,
      phone,
      status: 'pending'
    });
  }

  await event.save();

  // Create notification for organizer
  await createRealtimeNotification({
    userId: event.organizer._id,
    message: `New volunteer request for ${event.title}: ${name}, Age ${age}, Gender ${gender}, Phone ${phone}`,
    type: 'registration',
    relatedEvent: event._id,
    relatedUser: req.user._id,
    actionUrl: `/dashboard?tab=created&eventId=${event._id}`
  });

  emitRegistrationUpdate([event.organizer._id, req.user._id], {
    eventId: normalizeObjectId(event._id),
    volunteerId: normalizeObjectId(req.user._id),
    status: 'pending',
    source: 'application-submitted',
    eventTitle: event.title
  });

  // Send email to volunteer
  await sendEmail({
    to: req.user.email,
    subject: `Application submitted: ${event.title}`,
    html: `<p>Hi ${req.user.name},</p><p>Your application for <strong>${event.title}</strong> has been submitted and is currently <strong>pending organizer approval</strong>.</p><p>You'll be notified once the organizer reviews your request.</p>`
  });

  // Send email to organizer
  const organizerEmail = emailTemplates.volunteerRegistrationToOrganizer(event.organizer.name, req.user.name, event.title);
  await sendEmail({
    to: event.organizer.email,
    ...organizerEmail
  });

  res.status(200).json({
    success: true,
    message: 'Application submitted successfully and is pending approval',
    event
  });
});

// @desc    Cancel event registration
// @route   POST /api/events/:id/cancel
// @access  Private/Volunteer
export const cancelRegistration = asyncHandler(async (req, res) => {
  if (req.user.role !== 'volunteer') {
    return res.status(403).json({
      success: false,
      message: 'Only volunteers can cancel applications or leave events'
    });
  }

  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  const registration = getRegistrationByVolunteer(event, req.user._id);

  if (!registration) {
    return res.status(400).json({
      success: false,
      message: 'You have not applied for this event'
    });
  }

  const cancellationReason = (req.body?.reason || '').trim();

  if (!cancellationReason) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a reason before cancelling application or leaving event'
    });
  }

  if (cancellationReason.length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Cancellation reason must be at least 10 characters'
    });
  }

  if (registration.status === 'cancelled') {
    return res.status(400).json({
      success: false,
      message: 'This registration is already cancelled'
    });
  }

  if (registration.status === 'rejected') {
    return res.status(400).json({
      success: false,
      message: 'Rejected registrations cannot be cancelled'
    });
  }

  // Prevent cancellation after event completion or certificate generation
  if (event.status === 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Event already completed. You cannot cancel your registration after the event is completed.'
    });
  }

  if (registration.certificateGenerated) {
    return res.status(400).json({
      success: false,
      message: 'Certificate already generated. You cannot cancel your registration after receiving a certificate.'
    });
  }

  const wasApprovedRegistration = registration.status === 'approved';

  if (wasApprovedRegistration) {
    event.removeVolunteer(req.user._id);
  }

  registration.status = 'cancelled';
  registration.cancellationReason = cancellationReason;
  registration.reviewedAt = new Date();

  await event.save();

  // Create notification for organizer
  await createRealtimeNotification({
    userId: event.organizer,
    message:
      registration.status === 'approved'
        ? `${req.user.name} left your event "${event.title}". Reason: ${cancellationReason}`
        : `${req.user.name} cancelled application for "${event.title}". Reason: ${cancellationReason}`,
    type: 'cancellation',
    relatedEvent: event._id,
    relatedUser: req.user._id,
    actionUrl: `/dashboard?tab=created&eventId=${event._id}`
  });

  emitRegistrationUpdate([event.organizer, req.user._id], {
    eventId: normalizeObjectId(event._id),
    volunteerId: normalizeObjectId(req.user._id),
    status: 'cancelled',
    source: 'volunteer-cancelled',
    eventTitle: event.title
  });

  res.status(200).json({
    success: true,
    message: wasApprovedRegistration
      ? 'You have left the event successfully'
      : 'Application cancelled successfully'
  });
});

// @desc    Approve volunteer registration
// @route   PATCH /api/events/:id/registrations/:volunteerId/approve
// @access  Private/Organizer (own events) or Admin
export const approveEventRegistration = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).populate('organizer', 'name email');

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  if (
    req.user.role !== 'admin' &&
    normalizeObjectId(event.organizer._id || event.organizer) !== normalizeObjectId(req.user._id)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to manage registrations for this event'
    });
  }

  const registration = getRegistrationByVolunteer(event, req.params.volunteerId);

  if (!registration) {
    return res.status(404).json({
      success: false,
      message: 'Registration not found'
    });
  }

  if (registration.status === 'approved') {
    return res.status(400).json({
      success: false,
      message: 'Registration is already approved'
    });
  }

  if (registration.status === 'cancelled') {
    return res.status(400).json({
      success: false,
      message: 'Cancelled registrations cannot be approved'
    });
  }

  if (event.approvedVolunteers.length >= event.maxVolunteers) {
    return res.status(400).json({
      success: false,
      message: 'Cannot approve registration because event is full'
    });
  }

  registration.status = 'approved';
  registration.reviewedAt = new Date();
  registration.rejectionReason = '';
  event.addVolunteer(registration.volunteerId);
  await event.save();

  const volunteerUser = await User.findById(registration.volunteerId);

  if (volunteerUser) {
    await createRealtimeNotification({
      userId: volunteerUser._id,
      message: 'Your application has been approved. You can now join the event.',
      type: 'approval',
      relatedEvent: event._id,
      relatedUser: req.user._id,
      actionUrl: `/events/${event._id}`
    });

    emitRegistrationUpdate([volunteerUser._id, event.organizer._id || event.organizer], {
      eventId: normalizeObjectId(event._id),
      volunteerId: normalizeObjectId(volunteerUser._id),
      status: 'approved',
      source: 'organizer-approved',
      eventTitle: event.title
    });

    await sendEmail({
      to: volunteerUser.email,
      subject: `Application approved: ${event.title}`,
      html: `<p>Hi ${volunteerUser.name},</p><p>Your application for <strong>${event.title}</strong> has been approved.</p><p>You're now officially registered for the event.</p>`
    });
  }

  res.status(200).json({
    success: true,
    message: 'Registration approved successfully'
  });
});

// @desc    Reject volunteer registration
// @route   PATCH /api/events/:id/registrations/:volunteerId/reject
// @access  Private/Organizer (own events) or Admin
export const rejectEventRegistration = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).populate('organizer', 'name email');

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  if (
    req.user.role !== 'admin' &&
    normalizeObjectId(event.organizer._id || event.organizer) !== normalizeObjectId(req.user._id)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to manage registrations for this event'
    });
  }

  const registration = getRegistrationByVolunteer(event, req.params.volunteerId);

  if (!registration) {
    return res.status(404).json({
      success: false,
      message: 'Registration not found'
    });
  }

  if (registration.status === 'rejected') {
    return res.status(400).json({
      success: false,
      message: 'Registration is already rejected'
    });
  }

  if (registration.status === 'cancelled') {
    return res.status(400).json({
      success: false,
      message: 'Cancelled registrations cannot be rejected'
    });
  }

  registration.status = 'rejected';
  registration.reviewedAt = new Date();
  registration.rejectionReason = req.body?.reason || '';
  event.removeVolunteer(registration.volunteerId);
  await event.save();

  const volunteerUser = await User.findById(registration.volunteerId);

  if (volunteerUser) {
    await createRealtimeNotification({
      userId: volunteerUser._id,
      message: `Your application was not approved.${registration.rejectionReason ? ` Reason: ${registration.rejectionReason}` : ''}`,
      type: 'system',
      relatedEvent: event._id,
      relatedUser: req.user._id,
      actionUrl: `/events/${event._id}`
    });

    emitRegistrationUpdate([volunteerUser._id, event.organizer._id || event.organizer], {
      eventId: normalizeObjectId(event._id),
      volunteerId: normalizeObjectId(volunteerUser._id),
      status: 'rejected',
      source: 'organizer-rejected',
      eventTitle: event.title
    });

    await sendEmail({
      to: volunteerUser.email,
      subject: `Application update: ${event.title}`,
      html: `<p>Hi ${volunteerUser.name},</p><p>Your application for <strong>${event.title}</strong> was not approved.</p>${registration.rejectionReason ? `<p><strong>Reason:</strong> ${registration.rejectionReason}</p>` : ''}`
    });
  }

  res.status(200).json({
    success: true,
    message: 'Registration rejected successfully'
  });
});

// @desc    Remove volunteer registration
// @route   DELETE /api/events/:id/registrations/:volunteerId
// @access  Private/Organizer (own events) or Admin
export const removeEventRegistration = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  if (
    req.user.role !== 'admin' &&
    normalizeObjectId(event.organizer) !== normalizeObjectId(req.user._id)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to manage registrations for this event'
    });
  }

  const registration = getRegistrationByVolunteer(event, req.params.volunteerId);

  if (!registration) {
    return res.status(404).json({
      success: false,
      message: 'Registration not found'
    });
  }

  // Prevent removal after event completion or certificate generation
  if (event.status === 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Event already completed. Registrations cannot be removed after the event is completed.'
    });
  }

  if (registration.certificateGenerated) {
    return res.status(400).json({
      success: false,
      message: 'Certificate already generated. Registration cannot be removed after certificate generation.'
    });
  }

  let removedStatus = 'removed';

  if (registration.status === 'approved') {
    event.removeVolunteer(registration.volunteerId);
    registration.status = 'rejected';
    registration.reviewedAt = new Date();
    registration.rejectionReason = 'Removed by organizer';
    removedStatus = 'rejected';
  } else {
    event.registrations = event.registrations.filter(
      (item) => normalizeObjectId(item.volunteerId) !== normalizeObjectId(req.params.volunteerId)
    );
  }

  await event.save();

  await createRealtimeNotification({
    userId: registration.volunteerId,
    message: `Your registration for "${event.title}" was removed by the organizer`,
    type: 'system',
    relatedEvent: event._id,
    relatedUser: req.user._id,
    actionUrl: `/events/${event._id}`
  });

  emitRegistrationUpdate([registration.volunteerId, event.organizer], {
    eventId: normalizeObjectId(event._id),
    volunteerId: normalizeObjectId(registration.volunteerId),
    status: removedStatus,
    source: 'organizer-removed',
    eventTitle: event.title
  });

  res.status(200).json({
    success: true,
    message: 'Registration removed successfully'
  });
});

// @desc    Approve event (Admin only)
// @route   PATCH /api/events/:id/approve
// @access  Private/Admin
export const approveEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).populate('organizer', 'name email');

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  event.approved = true;
  await event.save();

  // Notify organizer
  await Notification.create({
    user: event.organizer._id,
    message: `Your event "${event.title}" has been approved`,
    type: 'approval',
    relatedEvent: event._id
  });

  // Send approval email
  const emailContent = emailTemplates.eventApproval(event.organizer.name, event.title);
  await sendEmail({
    to: event.organizer.email,
    ...emailContent
  });

  res.status(200).json({
    success: true,
    message: 'Event approved successfully',
    event
  });
});

// @desc    Reject event (Admin only)
// @route   PATCH /api/events/:id/reject
// @access  Private/Admin
export const rejectEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).populate('organizer', 'name email');

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  const { reason } = req.body;

  // Notify organizer
  await Notification.create({
    user: event.organizer._id,
    message: `Your event "${event.title}" was not approved. ${reason || ''}`,
    type: 'system',
    relatedEvent: event._id
  });

  // Send rejection email
  await sendEmail({
    to: event.organizer.email,
    subject: `Event Not Approved: ${event.title}`,
    html: `<p>Hi ${event.organizer.name},</p><p>Your event <strong>${event.title}</strong> was not approved.</p>${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}<p>Best regards,<br/>Helping Hands Team</p>`
  });

  // Delete the event
  await event.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Event rejected and deleted'
  });
});

// @desc    Mark event as completed
// @route   PUT /api/events/:id/complete
// @access  Private/Organizer/Admin
export const completeEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).populate('organizer', 'name');

  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  if (
    req.user.role !== 'admin' &&
    normalizeObjectId(event.organizer._id || event.organizer) !== normalizeObjectId(req.user._id)
  ) {
    return res.status(403).json({ success: false, message: 'Not authorized to complete this event' });
  }

  if (event.status === 'completed') {
    return res.status(400).json({ success: false, message: 'Event is already marked as completed' });
  }

  event.status = 'completed';
  await event.save();

  const io = getIO();
  const payload = {
    eventId: normalizeObjectId(event._id),
    status: 'completed'
  };

  // Notify organizer and volunteers in real time
  io.to(normalizeObjectId(event.organizer._id || event.organizer)).emit('eventCompleted', payload);
  (event.volunteers || []).forEach((volId) => {
    io.to(normalizeObjectId(volId)).emit('eventCompleted', payload);
  });

  res.status(200).json({
    success: true,
    message: 'Event marked as completed',
    event
  });
});

// @desc    Get my events (for organizers)
// @route   GET /api/events/my-events
// @access  Private/Organizer
export const getMyEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({ organizer: req.user._id, isDeleted: { $ne: true } })
    .sort('-createdAt')
    .populate('volunteers', 'name email skills')
    .populate('registrations.volunteerId', 'name email phone');

  res.status(200).json({
    success: true,
    count: events.length,
    events
  });
});

// @desc    Get events a volunteer has applied to (shows all statuses)
// @route   GET /api/events/applied
// @access  Private/Volunteer
export const getAppliedEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({ 'registrations.volunteerId': req.user._id, isDeleted: { $ne: true } })
    .sort('-date')
    .populate('organizer', 'name email phone')
    .populate('registrations.volunteerId', 'name email phone');

  const transformedEvents = events
    .map((event) => {
      const registration = getRegistrationByVolunteer(event, req.user._id);

      if (!registration) {
        return null;
      }

      return {
        ...event.toObject(),
        myRegistration: registration
      };
    })
    .filter(Boolean);

  res.status(200).json({
    success: true,
    count: transformedEvents.length,
    events: transformedEvents
  });
});

// @desc    Get registered events (for volunteers)
// @route   GET /api/events/registered
// @access  Private/Volunteer
export const getRegisteredEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({ 'registrations.volunteerId': req.user._id, isDeleted: { $ne: true } })
    .sort('date')
    .populate('organizer', 'name email phone')
    .populate('registrations.volunteerId', 'name email phone');

  const transformedEvents = events
    .map((event) => {
      const registration = getRegistrationByVolunteer(event, req.user._id);

      if (!registration) {
        return null;
      }

      return {
        ...event.toObject(),
        myRegistration: registration
      };
    })
    .filter(Boolean);

  res.status(200).json({
    success: true,
    count: transformedEvents.length,
    events: transformedEvents
  });
});

// @desc    Update attendance for a volunteer on an event
// @route   PUT /api/events/:id/attendance
// @access  Private/Organizer/Admin
export const updateAttendance = asyncHandler(async (req, res) => {
  const { volunteerId, present, workDuration } = req.body || {};

  if (!volunteerId || typeof present !== 'boolean') {
    return res.status(400).json({ success: false, message: 'volunteerId and present flag are required' });
  }

  const event = await Event.findById(req.params.id).populate('organizer', 'name');

  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  if (
    req.user.role !== 'admin' &&
    normalizeObjectId(event.organizer._id || event.organizer) !== normalizeObjectId(req.user._id)
  ) {
    return res.status(403).json({ success: false, message: 'Not authorized to update attendance for this event' });
  }

  if (event.status !== 'completed') {
    return res.status(400).json({ success: false, message: 'Attendance can only be marked after the event is completed' });
  }

  if (event.attendanceLocked) {
    return res.status(400).json({ success: false, message: 'Attendance has already been finalized for this event' });
  }

  const registration = event.registrations.find(
    (reg) => normalizeObjectId(reg.volunteerId) === normalizeObjectId(volunteerId) && reg.status === 'approved'
  );

  if (!registration) {
    return res.status(400).json({ success: false, message: 'Attendance can only be marked for approved volunteers' });
  }

  if (present && (!workDuration || typeof workDuration !== 'string' || !workDuration.trim())) {
    return res.status(400).json({ success: false, message: 'Please provide workDuration description when marking present' });
  }

  // Update per-registration attendance fields
  registration.present = !!present;
  registration.attendanceMarkedAt = present ? new Date() : null;
  registration.workDuration = present ? workDuration.trim() : '';

  // Maintain legacy attendance array for compatibility with existing queries
  const attendanceEntry = event.attendance.find(
    (a) => normalizeObjectId(a.volunteerId) === normalizeObjectId(volunteerId)
  );

  if (attendanceEntry) {
    attendanceEntry.present = !!present;
  } else {
    event.attendance.push({ volunteerId, present: !!present });
  }

  await event.save();

  const io = getIO();
  const payload = {
    eventId: normalizeObjectId(event._id),
    volunteerId: normalizeObjectId(volunteerId),
    present: !!present,
    workDuration: registration.workDuration,
  };

  io.to(normalizeObjectId(volunteerId)).emit('attendanceUpdated', payload);
  io.to(normalizeObjectId(event.organizer._id || event.organizer)).emit('attendanceUpdated', payload);

  res.status(200).json({
    success: true,
    message: 'Attendance updated successfully',
    event,
  });
});

// Helper to parse numeric hours from a free‑form workDuration string
const parseHoursFromWorkDuration = (workDuration) => {
  if (!workDuration || typeof workDuration !== 'string') return 0;
  const match = workDuration.match(/([0-9]+(\.[0-9]+)?)/);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

// @desc    Get completed events for a volunteer (with attendance, rating, certificate info)
// @route   GET /api/events/completed
// @access  Private/Volunteer
export const getCompletedEventsForVolunteer = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Look for completed events where the user has a registration.
  // We'll filter on presence in code using the registration data rather than
  // relying solely on the legacy attendance array.
  const events = await Event.find({
    status: 'completed',
    'registrations.volunteerId': userId,
    isDeleted: { $ne: true },
  })
    .sort('-date')
    .populate('organizer', 'name email phone');

  const user = await User.findById(userId);
  const certificates = Array.isArray(user?.certificates) ? user.certificates : [];

  const transformed = events
    .map((event) => {
      const eventObj = event.toObject();
      const registration = getRegistrationByVolunteer(eventObj, userId);
      // Only keep events where the volunteer was marked present
      if (!registration || !registration.present) return null;

      const certEntry = certificates.find((c) =>
        normalizeObjectId(c.event) === normalizeObjectId(event._id)
      );

      return {
        ...eventObj,
        myRegistration: {
          status: registration.status,
          cancellationReason: registration.cancellationReason || '',
          rejectionReason: registration.rejectionReason || '',
          present: registration.present || false,
          attendanceMarkedAt: registration.attendanceMarkedAt || null,
          workDuration: registration.workDuration || '',
          certificateGenerated: !!registration.certificateGenerated,
          organizerRating: registration.organizerRating || null,
          volunteerFeedback: registration.volunteerFeedback || '',
          volunteerRatingForEvent: registration.volunteerRatingForEvent || null,
          certificateUrl: certEntry?.url || null,
        },
      };
    })
    .filter(Boolean);

  res.status(200).json({
    success: true,
    count: transformed.length,
    events: transformed,
  });
});

// @desc    Finalize attendance and generate certificates for all present volunteers
// @route   POST /api/events/:id/attendance/finalize
// @access  Private/Organizer/Admin
export const finalizeAttendance = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate('organizer', 'name')
    .populate('registrations.volunteerId', 'name email');

  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  if (
    req.user.role !== 'admin' &&
    normalizeObjectId(event.organizer._id || event.organizer) !== normalizeObjectId(req.user._id)
  ) {
    return res.status(403).json({ success: false, message: 'Not authorized to finalize attendance for this event' });
  }

  if (event.status !== 'completed') {
    event.status = 'completed';
  }

  if (event.attendanceLocked) {
    return res.status(400).json({ success: false, message: 'Attendance is already finalized for this event' });
  }

  let totalHoursForEvent = 0;

  for (const registration of event.registrations || []) {
    if (registration.status !== 'approved' || !registration.present) continue;

    const volunteerId = registration.volunteerId?._id || registration.volunteerId;
    if (!volunteerId) continue;

    const volunteerUser = await User.findById(volunteerId);
    if (!volunteerUser) continue;

    let hours = parseHoursFromWorkDuration(registration.workDuration);
    if (hours <= 0) {
      // Fallback to computed event duration if no valid hours were provided
      hours = computeEventDurationHours(event) || 0;
    }

    if (hours > 0) {
      totalHoursForEvent += hours;
      volunteerUser.totalVolunteerHours = Math.max(0, (volunteerUser.totalVolunteerHours || 0) + hours);
      const impactDelta = hours * HOURS_MULTIPLIER;
      volunteerUser.impactScore = Math.max(0, (volunteerUser.impactScore || 0) + impactDelta);
    }

    volunteerUser.completedEventsCount = Math.max(0, (volunteerUser.completedEventsCount || 0) + 1);

    const certificatesDir = path.resolve('uploads', 'certificates');
    if (!fs.existsSync(certificatesDir)) {
      fs.mkdirSync(certificatesDir, { recursive: true });
    }

    const filename = `certificate_${event._id}_${volunteerUser._id}.pdf`;
    const filePath = path.join(certificatesDir, filename);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    const organizationName = 'Helping Hands Community Platform';
    const volunteerName = registration.name || volunteerUser.name;
    const workHours = hours > 0 ? hours : parseHoursFromWorkDuration(registration.workDuration);
    const hoursText = `${(workHours > 0 ? workHours : 0).toFixed(2)} hours`;
    const issuedDate = new Date().toLocaleDateString();

    // Simple clean certificate layout
    doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).stroke('#cbd5e1');

    doc
      .font('Times-Bold')
      .fontSize(34)
      .fillColor('#0f172a')
      .text('Certificate of Participation', { align: 'center' });

    doc.moveDown(1.5);

    doc
      .font('Helvetica')
      .fontSize(14)
      .fillColor('#1e293b')
      .text('This is to certify that', { align: 'center' });

    doc.moveDown(0.6);

    doc
      .font('Times-Bold')
      .fontSize(24)
      .fillColor('#0f172a')
      .text(volunteerName, { align: 'center' });

    doc.moveDown(1);

    doc
      .font('Helvetica')
      .fontSize(14)
      .fillColor('#1e293b')
      .text(
        `has successfully participated in "${event.title}" organized by ${organizationName} and contributed ${hoursText} of community service.`,
        {
          align: 'center',
        }
      );

    doc.moveDown(4);

    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#334155')
      .text(`Date: ${issuedDate}`, 60, doc.page.height - 150, { align: 'left' });

    doc
      .moveTo(doc.page.width - 240, doc.page.height - 165)
      .lineTo(doc.page.width - 60, doc.page.height - 165)
      .stroke('#94a3b8');

    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#334155')
      .text('Organizer Signature', doc.page.width - 240, doc.page.height - 155, {
        align: 'left',
      });

    doc.end();

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    const relativePath = `/uploads/certificates/${filename}`;

    if (!Array.isArray(volunteerUser.certificates)) {
      volunteerUser.certificates = [];
    }

    const alreadyExists = volunteerUser.certificates.some((cert) =>
      normalizeObjectId(cert.event) === normalizeObjectId(event._id)
    );

    if (!alreadyExists) {
      const certEntry = {
        // Keep both legacy and API-friendly keys for compatibility
        event: event._id,
        eventId: event._id,
        eventTitle: event.title,
        eventName: event.title,
        url: relativePath,
        certificateURL: relativePath,
        workDuration: hoursText,
        workTime: hoursText,
        issuedAt: new Date(),
      };

      // Include organizer rating if available
      if (typeof registration.organizerRating === 'number') {
        certEntry.rating = registration.organizerRating;
      }

      volunteerUser.certificates.push(certEntry);
    }

    registration.certificateGenerated = true;

    await volunteerUser.save();

    const io = getIO();
    const payload = {
      eventId: normalizeObjectId(event._id),
      volunteerId: normalizeObjectId(volunteerUser._id),
      url: relativePath,
    };

    // Backwards compat: emit both old and new event names
    io.to(normalizeObjectId(volunteerUser._id)).emit('certificateReady', payload);
    io.to(normalizeObjectId(volunteerUser._id)).emit('certificateGenerated', payload);
    if (typeof registration.organizerRating === 'number') {
      io.to(normalizeObjectId(volunteerUser._id)).emit('ratingUpdated', {
        eventId: normalizeObjectId(event._id),
        volunteerId: normalizeObjectId(volunteerUser._id),
        rating: registration.organizerRating,
        eventTitle: event.title,
      });
    }
  }

  event.attendanceLocked = true;
  if (totalHoursForEvent > 0) {
    event.totalVolunteerHours = Math.max(0, (event.totalVolunteerHours || 0) + totalHoursForEvent);
  }

  await event.save();

  res.status(200).json({
    success: true,
    message: 'Attendance finalized and certificates generated successfully',
    event,
  });
});

// @desc    Rate a volunteer for an event (organizer -> volunteer)
// @route   POST /api/events/:id/rate-volunteer
// @access  Private/Organizer/Admin
export const rateVolunteerOnEvent = asyncHandler(async (req, res) => {
  const { volunteerId, rating } = req.body || {};

  if (!volunteerId || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: 'volunteerId and rating (1-5) are required' });
  }

  const event = await Event.findById(req.params.id).populate('organizer', 'name');

  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  if (
    req.user.role !== 'admin' &&
    normalizeObjectId(event.organizer._id || event.organizer) !== normalizeObjectId(req.user._id)
  ) {
    return res.status(403).json({ success: false, message: 'Not authorized to rate volunteers for this event' });
  }

  if (event.status !== 'completed') {
    return res.status(400).json({ success: false, message: 'You can only rate volunteers after the event is completed' });
  }

  const registration = event.registrations.find(
    (reg) => normalizeObjectId(reg.volunteerId) === normalizeObjectId(volunteerId)
  );

  if (!registration || !registration.present) {
    return res.status(400).json({ success: false, message: 'Only present volunteers can be rated' });
  }

  registration.organizerRating = rating;
  await event.save();

  // Also update the rating in the volunteer's certificate if it already exists
  const volunteerUser = await User.findById(volunteerId);
  if (volunteerUser && Array.isArray(volunteerUser.certificates)) {
    const certIndex = volunteerUser.certificates.findIndex(
      (cert) => normalizeObjectId(cert.event) === normalizeObjectId(event._id)
    );
    if (certIndex >= 0) {
      volunteerUser.certificates[certIndex].rating = rating;
      await volunteerUser.save();
    }
  }

  const io = getIO();
  const payload = {
    eventId: normalizeObjectId(event._id),
    volunteerId: normalizeObjectId(volunteerId),
    rating,
    eventTitle: event.title,
  };

  // Emit both event names for compatibility
  io.to(normalizeObjectId(volunteerId)).emit('volunteerRated', payload);
  io.to(normalizeObjectId(volunteerId)).emit('ratingUpdated', payload);

  res.status(200).json({
    success: true,
    message: 'Volunteer rated successfully',
    event,
  });
});

// @desc    Submit volunteer feedback for an event (volunteer -> organizer)
// @route   POST /api/events/:eventId/volunteer-feedback
// @access  Private/Volunteer
export const submitVolunteerFeedback = asyncHandler(async (req, res) => {
  const { rating, feedback } = req.body || {};
  const eventId = req.params.eventId;

  if (!eventId) {
    return res.status(400).json({ success: false, message: 'eventId is required' });
  }

  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: 'Rating between 1 and 5 is required' });
  }

  const event = await Event.findById(eventId).populate('organizer', 'name');

  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  if (event.status !== 'completed') {
    return res.status(400).json({ success: false, message: 'Feedback can only be submitted after the event is completed' });
  }

  if (!event.attendanceLocked) {
    return res.status(400).json({ success: false, message: 'Feedback can only be submitted after attendance is finalized' });
  }

  const registration = getRegistrationByVolunteer(event, req.user._id);

  if (!registration || !registration.present) {
    return res.status(400).json({ success: false, message: 'Only present volunteers can submit feedback' });
  }

  if (typeof registration.volunteerRatingForEvent === 'number' || (registration.volunteerFeedback || '').trim()) {
    return res.status(400).json({ success: false, message: 'Feedback already submitted for this event' });
  }

  registration.volunteerRatingForEvent = rating;
  registration.volunteerFeedback = (feedback || '').trim();
  await event.save();

  const io = getIO();
  const payload = {
    eventId: normalizeObjectId(event._id),
    volunteerId: normalizeObjectId(req.user._id),
    rating,
    feedback: registration.volunteerFeedback,
    eventTitle: event.title,
  };

  io.to(normalizeObjectId(event.organizer._id || event.organizer)).emit('feedbackSubmitted', payload);
  io.to(normalizeObjectId(req.user._id)).emit('feedbackSubmitted', payload);

  res.status(201).json({
    success: true,
    message: 'Feedback submitted successfully',
    data: {
      eventId: normalizeObjectId(event._id),
      volunteerRatingForEvent: registration.volunteerRatingForEvent,
      volunteerFeedback: registration.volunteerFeedback,
    },
  });
});

// @desc    Get populated volunteers for an event (organizer/admin)
// @route   GET /api/events/:id/volunteers
// @access  Private/Organizer/Admin
export const getEventVolunteers = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate('registrations.volunteerId', 'name email phone role profileImage')
    .populate('approvedVolunteers', 'name email phone role profileImage')
    .populate('volunteers', 'name email phone role profileImage');

  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  if (
    req.user.role !== 'admin' &&
    normalizeObjectId(event.organizer) !== normalizeObjectId(req.user._id)
  ) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  res.status(200).json({
    success: true,
    eventId: event._id,
    volunteers: event.volunteers,
    approvedVolunteers: event.approvedVolunteers,
    registrations: event.registrations,
  });
});

// @desc    Generate participation certificate for a volunteer
// @route   POST /api/events/:eventId/certificate/:volunteerId
// @access  Private/Organizer/Admin
export const generateCertificate = asyncHandler(async (req, res) => {
  const { eventId, volunteerId } = { eventId: req.params.eventId, volunteerId: req.params.volunteerId };
  const { hoursOverride } = req.body || {};

  const event = await Event.findById(eventId).populate('organizer', 'name').populate('registrations.volunteerId', 'name email');

  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  if (
    req.user.role !== 'admin' &&
    normalizeObjectId(event.organizer._id || event.organizer) !== normalizeObjectId(req.user._id)
  ) {
    return res.status(403).json({ success: false, message: 'Not authorized to generate certificates for this event' });
  }

  if (event.status !== 'completed') {
    return res.status(400).json({ success: false, message: 'Certificates are only available for completed events' });
  }

  const attendanceEntry = event.attendance.find(
    (a) => normalizeObjectId(a.volunteerId) === normalizeObjectId(volunteerId) && a.present
  );

  if (!attendanceEntry) {
    return res.status(400).json({ success: false, message: 'Certificate can only be generated for volunteers marked as present' });
  }

  const registration = event.registrations.find(
    (reg) => normalizeObjectId(reg.volunteerId) === normalizeObjectId(volunteerId)
  );

  const volunteerUser = await User.findById(volunteerId);

  if (!volunteerUser || !registration) {
    return res.status(404).json({ success: false, message: 'Volunteer not found for this event' });
  }

  // Allow organizer to override hours manually for the certificate text
  const hoursForEvent = typeof hoursOverride === 'number' && hoursOverride > 0
    ? hoursOverride
    : parseHoursFromWorkDuration(registration.workDuration) || computeEventDurationHours(event);

  const certificatesDir = path.resolve('uploads', 'certificates');
  if (!fs.existsSync(certificatesDir)) {
    fs.mkdirSync(certificatesDir, { recursive: true });
  }

  const filename = `certificate_${event._id}_${volunteerUser._id}.pdf`;
  const filePath = path.join(certificatesDir, filename);

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  const organizationName = 'Helping Hands Community Platform';
  const volunteerName = registration.name || volunteerUser.name;
  const hoursText = `${(hoursForEvent > 0 ? hoursForEvent : 0).toFixed(2)} hours`;
  const issuedDate = new Date().toLocaleDateString();

  // Simple clean certificate layout
  doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).stroke('#cbd5e1');

  doc
    .font('Times-Bold')
    .fontSize(34)
    .fillColor('#0f172a')
    .text('Certificate of Participation', { align: 'center' });

  doc.moveDown(1.5);

  doc
    .font('Helvetica')
    .fontSize(14)
    .fillColor('#1e293b')
    .text('This is to certify that', { align: 'center' });

  doc.moveDown(0.6);

  doc
    .font('Times-Bold')
    .fontSize(24)
    .fillColor('#0f172a')
    .text(volunteerName, { align: 'center' });

  doc.moveDown(1);

  doc
    .font('Helvetica')
    .fontSize(14)
    .fillColor('#1e293b')
    .text(
      `has successfully participated in "${event.title}" organized by ${organizationName} and contributed ${hoursText} of community service.`,
      {
        align: 'center',
      }
    );

  doc.moveDown(4);

  doc
    .font('Helvetica')
    .fontSize(11)
    .fillColor('#334155')
    .text(`Date: ${issuedDate}`, 60, doc.page.height - 150, { align: 'left' });

  doc
    .moveTo(doc.page.width - 240, doc.page.height - 165)
    .lineTo(doc.page.width - 60, doc.page.height - 165)
    .stroke('#94a3b8');

  doc
    .font('Helvetica')
    .fontSize(11)
    .fillColor('#334155')
    .text('Organizer Signature', doc.page.width - 240, doc.page.height - 155, {
      align: 'left',
    });

  doc.end();

  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

  const relativePath = `/uploads/certificates/${filename}`;

  if (!Array.isArray(volunteerUser.certificates)) {
    volunteerUser.certificates = [];
  }

  const alreadyExists = volunteerUser.certificates.some((cert) =>
    normalizeObjectId(cert.event) === normalizeObjectId(event._id)
  );

  if (!alreadyExists) {
    volunteerUser.certificates.push({
      event: event._id,
      eventId: event._id,
      eventTitle: event.title,
      eventName: event.title,
      url: relativePath,
      certificateURL: relativePath,
      workDuration:
        typeof hoursForEvent === 'number' && hoursForEvent > 0
          ? `${hoursForEvent.toFixed(2)} hours`
          : '0.00 hours',
      workTime:
        typeof hoursForEvent === 'number' && hoursForEvent > 0
          ? `${hoursForEvent.toFixed(2)} hours`
          : '0.00 hours',
      issuedAt: new Date(),
    });
    await volunteerUser.save();
  }

  const io = getIO();
  const payload = {
    eventId: normalizeObjectId(event._id),
    volunteerId: normalizeObjectId(volunteerUser._id),
    url: relativePath,
  };

  io.to(normalizeObjectId(volunteerUser._id)).emit('certificateReady', payload);

  res.status(201).json({
    success: true,
    message: 'Certificate generated successfully',
    url: relativePath,
  });
});
