import { body, param, query, validationResult } from 'express-validator';

// Validation error handler
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
};

// Auth validation rules
export const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2-100 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  
  body('role')
    .optional()
    .isIn(['volunteer', 'organizer', 'admin']).withMessage('Invalid role'),
  
  validate
];

export const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
  
  validate
];

// Event validation rules
export const createEventValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 5, max: 200 }).withMessage('Title must be between 5-200 characters'),
  
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 20, max: 2000 }).withMessage('Description must be between 20-2000 characters'),
  
  body('location')
    .trim()
    .notEmpty().withMessage('Location is required'),
  
  body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Event date must be in the future');
      }
      return true;
    }),
  
  body('maxVolunteers')
    .notEmpty().withMessage('Max volunteers is required')
    .isInt({ min: 1, max: 1000 }).withMessage('Max volunteers must be between 1-1000'),

  body('startTime')
    .notEmpty().withMessage('Start time is required')
    .matches(/^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i)
    .withMessage('Start time must be in 12-hour format (e.g., 10:30 AM)'),

  body('endTime')
    .notEmpty().withMessage('End time is required')
    .matches(/^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i)
    .withMessage('End time must be in 12-hour format (e.g., 02:45 PM)'),
  
  body('instructionsForVolunteers')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Instructions cannot exceed 2000 characters'),
  
  body('category')
    .optional()
    .isIn(['education', 'healthcare', 'environment', 'social welfare', 'disaster relief', 'other'])
    .withMessage('Invalid category'),
  
  validate
];

export const updateEventValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 }).withMessage('Title must be between 5-200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 20, max: 2000 }).withMessage('Description must be between 20-2000 characters'),
  
  body('date')
    .optional()
    .isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Event date must be in the future');
      }
      return true;
    }),
  
  body('maxVolunteers')
    .optional()
    .isInt({ min: 1, max: 1000 }).withMessage('Max volunteers must be between 1-1000'),

  body('startTime')
    .optional()
    .matches(/^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i)
    .withMessage('Start time must be in 12-hour format (e.g., 10:30 AM)'),

  body('endTime')
    .optional()
    .matches(/^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i)
    .withMessage('End time must be in 12-hour format (e.g., 02:45 PM)'),

  body('instructionsForVolunteers')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Instructions cannot exceed 2000 characters'),
  
  validate
];

// Feedback validation rules
export const createFeedbackValidation = [
  body('event')
    .notEmpty().withMessage('Event ID is required')
    .isMongoId().withMessage('Invalid event ID'),
  
  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1-5'),
  
  body('comment')
    .trim()
    .notEmpty().withMessage('Comment is required')
    .isLength({ min: 10, max: 1000 }).withMessage('Comment must be between 10-1000 characters'),
  
  validate
];

// User profile validation
export const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2-100 characters'),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
  
  body('skills')
    .optional()
    .isArray().withMessage('Skills must be an array'),
  
  body('interests')
    .optional()
    .isArray().withMessage('Interests must be an array'),
  
  body('availability')
    .optional()
    .isIn(['weekdays', 'weekends', 'both', 'flexible']).withMessage('Invalid availability'),
  
  validate
];

// MongoDB ID validation
export const mongoIdValidation = [
  param('id')
    .isMongoId().withMessage('Invalid ID format'),
  
  validate
];

// Query validation for events
export const eventQueryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
  
  query('sort')
    .optional()
    .isIn(['date', '-date', 'createdAt', '-createdAt', 'title', '-title'])
    .withMessage('Invalid sort field'),
  
  validate
];
