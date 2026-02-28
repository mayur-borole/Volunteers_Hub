import express from 'express';
import {
  createFeedback,
  getEventFeedback,
  getMyFeedback,
  updateFeedback,
  deleteFeedback,
  flagFeedback,
  getAllFeedback,
  getFeedbackStats
} from '../controllers/feedbackController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { createFeedbackValidation, mongoIdValidation } from '../middlewares/validator.js';
import { feedbackLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Public routes
router.get('/event/:eventId', mongoIdValidation, getEventFeedback);

// Volunteer routes
router.post('/', protect, authorize('volunteer'), feedbackLimiter, createFeedbackValidation, createFeedback);
router.get('/my-feedback', protect, authorize('volunteer'), getMyFeedback);
router.put('/:id', protect, authorize('volunteer'), mongoIdValidation, updateFeedback);
router.delete('/:id', protect, authorize('volunteer', 'admin'), mongoIdValidation, deleteFeedback);

// Admin routes
router.get('/admin/all', protect, authorize('admin'), getAllFeedback);
router.get('/stats', protect, authorize('admin'), getFeedbackStats);
router.patch('/:id/flag', protect, authorize('admin'), mongoIdValidation, flagFeedback);

export default router;
