import express from 'express';
import {
  getVolunteerStats,
  getOrganizerStats,
  getAdminStats,
  getPlatformOverview,
  getOrganizerEventAnalytics
} from '../controllers/analyticsController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = express.Router();

// Public route
router.get('/overview', getPlatformOverview);

// Protected routes by role
router.get('/volunteer', protect, authorize('volunteer'), getVolunteerStats);
router.get('/organizer', protect, authorize('organizer'), getOrganizerStats);
router.get('/organizer/:eventId', protect, authorize('organizer', 'admin'), getOrganizerEventAnalytics);
router.get('/admin', protect, authorize('admin'), getAdminStats);

export default router;
