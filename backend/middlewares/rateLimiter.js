import rateLimit from 'express-rate-limit';

// General API rate limiter — allows 50+ concurrent users
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window per IP
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth limiter — 100 login attempts per 15 min per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes.'
  }
});

// Registration limiter — 50 registrations per hour per IP
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 registrations per hour per IP
  message: {
    success: false,
    message: 'Too many accounts created from this IP, please try again after an hour.'
  }
});

// Limiter for feedback submission
export const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // 200 feedback submissions per hour
  message: {
    success: false,
    message: 'Too many feedback submissions, please try again later.'
  }
});

// Limiter for event creation
export const eventCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 events per hour
  message: {
    success: false,
    message: 'Too many events created, please try again later.'
  }
});
