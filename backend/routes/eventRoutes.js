import express from 'express';
import {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  registerForEvent,
  cancelRegistration,
  approveEventRegistration,
  rejectEventRegistration,
  removeEventRegistration,
  approveEvent,
  rejectEvent,
  getMyEvents,
  getRegisteredEvents,
  getAppliedEvents,
  getEventVolunteers,
  completeEvent,
  updateAttendance,
  getCompletedEventsForVolunteer,
  finalizeAttendance,
  rateVolunteerOnEvent,
  submitVolunteerFeedback,
  generateCertificate
} from '../controllers/eventController.js';
import { protect, authorize, optionalAuth } from '../middlewares/auth.js';
import {
  createEventValidation,
  updateEventValidation,
  mongoIdValidation,
  eventQueryValidation
} from '../middlewares/validator.js';
import { eventCreationLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Public/Optional auth routes
router.get('/', optionalAuth, eventQueryValidation, getAllEvents);

// User event routes (all authenticated users)
router.get('/user/registered', protect, getRegisteredEvents);
router.get('/applied', protect, getAppliedEvents);
router.get('/completed', protect, authorize('volunteer'), getCompletedEventsForVolunteer);
router.get('/completed-for-volunteer', protect, authorize('volunteer'), getCompletedEventsForVolunteer);
router.get('/user/my-events', protect, authorize('organizer', 'admin'), getMyEvents);
router.get('/:id/volunteers', protect, authorize('organizer', 'admin'), mongoIdValidation, getEventVolunteers);

// Public event details
router.get('/:id', mongoIdValidation, getEventById);

// Volunteer routes
router.post('/:id/register', protect, mongoIdValidation, registerForEvent);
router.post('/:id/cancel', protect, mongoIdValidation, cancelRegistration);
router.put('/:id/complete', protect, authorize('organizer', 'admin'), mongoIdValidation, completeEvent);
router.put('/:id/attendance', protect, authorize('organizer', 'admin'), mongoIdValidation, updateAttendance);
router.post('/:id/attendance/finalize', protect, authorize('organizer', 'admin'), mongoIdValidation, finalizeAttendance);
router.post('/:id/rate-volunteer', protect, authorize('organizer', 'admin'), mongoIdValidation, rateVolunteerOnEvent);
router.post('/:eventId/certificate/:volunteerId', protect, authorize('organizer', 'admin'), mongoIdValidation, generateCertificate);
router.post('/:eventId/volunteer-feedback', protect, authorize('volunteer'), mongoIdValidation, submitVolunteerFeedback);
router.patch('/:id/registrations/:volunteerId/approve', protect, authorize('organizer', 'admin'), mongoIdValidation, approveEventRegistration);
router.patch('/:id/registrations/:volunteerId/reject', protect, authorize('organizer', 'admin'), mongoIdValidation, rejectEventRegistration);
router.delete('/:id/registrations/:volunteerId', protect, authorize('organizer', 'admin'), mongoIdValidation, removeEventRegistration);

// Organizer routes
router.post('/', protect, authorize('organizer', 'admin'), eventCreationLimiter, createEventValidation, createEvent);
router.put('/:id', protect, authorize('organizer', 'admin'), mongoIdValidation, updateEventValidation, updateEvent);
router.delete('/:id', protect, authorize('organizer', 'admin'), mongoIdValidation, deleteEvent);

// Admin routes
router.patch('/:id/approve', protect, authorize('admin'), mongoIdValidation, approveEvent);
router.patch('/:id/reject', protect, authorize('admin'), mongoIdValidation, rejectEvent);

export default router;
