import express from 'express';
import passport from '../config/passport.js';
import {
  register,
  login,
  refreshAccessToken,
  logout,
  getMe,
  updatePassword,
  googleCallback
} from '../controllers/authController.js';
import { protect } from '../middlewares/auth.js';
import {
  registerValidation,
  loginValidation
} from '../middlewares/validator.js';
import { authLimiter, registerLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Public routes
router.post('/register', registerLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.post('/refresh', refreshAccessToken);

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/login?error=auth_failed`
  }),
  googleCallback
);

// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/update-password', protect, updatePassword);

export default router;
