import Log from '../models/Log.js';

// Request logger middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Capture original res.json
  const originalJson = res.json.bind(res);

  res.json = function (data) {
    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Log the request
    const logData = {
      user: req.user ? req.user._id : null,
      action: `${req.method} ${req.originalUrl}`,
      method: req.method,
      endpoint: req.originalUrl,
      statusCode: res.statusCode,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      responseTime
    };

    // Only log errors or important actions
    if (res.statusCode >= 400 || req.method !== 'GET') {
      Log.create(logData).catch(err => {
        console.error('Failed to create log:', err);
      });
    }

    // Call original json method
    return originalJson(data);
  };

  next();
};

export default requestLogger;
