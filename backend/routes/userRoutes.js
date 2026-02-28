import express from 'express';
import {
  getProfile,
  updateProfile,
  getAllUsers,
  getUserById,
  toggleBlockUser,
  deleteUser,
  getVolunteersBySkills,
  getUserStats,
  getMyCertificates,
  deleteMyCertificate,
} from '../controllers/userController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { updateProfileValidation, mongoIdValidation } from '../middlewares/validator.js';

const router = express.Router();

// User routes (protected)
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfileValidation, updateProfile);
router.get('/my-certificates', protect, getMyCertificates);
router.delete('/my-certificates/:certificateId', protect, deleteMyCertificate);

// Organizer routes
router.get('/volunteers/by-skills', protect, authorize('organizer', 'admin'), getVolunteersBySkills);

// Admin routes
router.get('/stats', protect, authorize('admin'), getUserStats);
router.get('/', protect, authorize('admin'), getAllUsers);
router.get('/:id', protect, authorize('admin'), mongoIdValidation, getUserById);
router.patch('/block/:id', protect, authorize('admin'), mongoIdValidation, toggleBlockUser);
router.delete('/:id', protect, authorize('admin'), mongoIdValidation, deleteUser);

export default router;
