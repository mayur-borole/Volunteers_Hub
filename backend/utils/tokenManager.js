import jwt from 'jsonwebtoken';

// Generate JWT Access Token
export const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
};

// Generate JWT Refresh Token
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

// Verify Refresh Token
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
};

// Send token response (helper)
export const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Remove sensitive data
  const userResponse = user.toJSON ? user.toJSON() : user;
  delete userResponse.password;
  delete userResponse.refreshToken;

  res.status(statusCode).json({
    success: true,
    message,
    accessToken,
    refreshToken,
    user: userResponse
  });
};
