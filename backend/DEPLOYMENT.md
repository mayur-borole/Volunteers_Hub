# 🚀 GATHA Backend - Deployment Guide

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- npm or yarn

---

## 🔧 Installation Steps

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your configurations
# IMPORTANT: Update these values:
# - MONGODB_URI (your MongoDB connection string)
# - JWT_SECRET (use a strong random string)
# - JWT_REFRESH_SECRET (use another strong random string)
# - FRONTEND_URL (your frontend URL)
```

### 3. Start MongoDB
```bash
# If using local MongoDB
mongod

# OR use MongoDB Atlas (cloud)
# Just update MONGODB_URI in .env with your Atlas connection string
```

### 4. Create Admin User
```bash
npm run create-admin
```

This will create an admin account:
- Email: `admin@gatha.com`
- Password: `admin123`

**⚠️ Change this password immediately after first login!**

### 5. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start at `http://localhost:5000`

---

## 📡 API Endpoints Overview

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/profile` - Get profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users` - Get all users (Admin)
- `PATCH /api/users/block/:id` - Block/unblock user (Admin)

### Events
- `GET /api/events` - Get all events (with filters)
- `POST /api/events` - Create event (Organizer)
- `GET /api/events/:id` - Get single event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `POST /api/events/:id/register` - Register for event (Volunteer)
- `POST /api/events/:id/cancel` - Cancel registration
- `PATCH /api/events/:id/approve` - Approve event (Admin)

### Feedback
- `POST /api/feedback` - Submit feedback
- `GET /api/feedback/event/:eventId` - Get event feedback
- `GET /api/feedback/my-feedback` - Get my feedback

### Analytics
- `GET /api/analytics/volunteer` - Volunteer dashboard stats
- `GET /api/analytics/organizer` - Organizer dashboard stats
- `GET /api/analytics/admin` - Admin dashboard stats
- `GET /api/analytics/overview` - Public platform overview

### Notifications
- `GET /api/notifications` - Get notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PATCH /api/notifications/mark-all-read` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

---

## 🔌 Socket.io Integration

### Client Connection Example
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: yourJWTToken
  }
});

socket.on('connected', (data) => {
  console.log('Connected to notification server');
});

socket.on('newNotification', (notification) => {
  console.log('New notification:', notification);
  // Update UI with notification
});
```

---

## 🧪 Testing the API

### Using cURL
```bash
# Register a user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"test123","role":"volunteer"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Using Thunder Client / Postman
1. Import the `API_TESTING.md` file as reference
2. Set base URL to `http://localhost:5000/api`
3. After login, copy the access token
4. Add token to Authorization header: `Bearer <token>`

---

## 🛠 Maintenance Scripts

### Create Admin User
```bash
node services/createAdmin.js
```

### Database Cleanup
```bash
node services/cleanupDatabase.js
```
Removes old logs (>90 days) and read notifications (>30 days)

---

## 📊 Database Collections

The following collections will be created automatically:
- `users` - User accounts
- `events` - Community events
- `feedbacks` - Event ratings and reviews
- `notifications` - User notifications
- `logs` - System logs

---

## 🔐 Security Features

✅ JWT-based authentication (access + refresh tokens)
✅ Password hashing with bcrypt
✅ Role-based access control (volunteer, organizer, admin)
✅ Rate limiting on all endpoints
✅ Helmet.js security headers
✅ CORS configuration
✅ Input validation and sanitization
✅ MongoDB injection prevention

---

## 🌐 Production Deployment

### MongoDB Atlas Setup
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<generate-strong-secret>
JWT_REFRESH_SECRET=<generate-strong-secret>
FRONTEND_URL=https://your-frontend-domain.com
```

### Deploy to Services

**Heroku:**
```bash
git init
heroku create gatha-backend
heroku config:set NODE_ENV=production
git push heroku main
```

**Railway / Render:**
1. Connect your GitHub repo
2. Set environment variables
3. Deploy

**VPS (Ubuntu):**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Start server
pm2 start server.js --name gatha-backend
pm2 startup
pm2 save
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :5000
kill -9 <PID>
```

### MongoDB Connection Failed
- Check if MongoDB is running
- Verify MONGODB_URI in .env
- Check network connectivity for Atlas
- Whitelist your IP in Atlas

### CORS Errors
- Update FRONTEND_URL in .env
- Ensure frontend URL matches exactly (no trailing slash)

---

## 📝 Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment mode | development |
| PORT | Server port | 5000 |
| MONGODB_URI | MongoDB connection | mongodb://localhost:27017/gatha-db |
| JWT_SECRET | JWT signing secret | (required) |
| JWT_EXPIRE | Access token expiry | 15m |
| JWT_REFRESH_SECRET | Refresh token secret | (required) |
| JWT_REFRESH_EXPIRE | Refresh token expiry | 7d |
| FRONTEND_URL | Frontend origin for CORS | http://localhost:8080 |
| EMAIL_SERVICE | Email service provider | gmail |
| EMAIL_USER | Email username | (optional) |
| EMAIL_PASSWORD | Email password | (optional) |

---

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Socket.io Documentation](https://socket.io/docs/)
- [JWT Documentation](https://jwt.io/)

---

## 🆘 Support

For issues or questions:
- Check the API_TESTING.md file
- Review error logs in console
- Verify all environment variables are set

---

## ✅ Quick Start Checklist

- [ ] Install dependencies (`npm install`)
- [ ] Configure `.env` file
- [ ] Start MongoDB
- [ ] Create admin user (`npm run create-admin`)
- [ ] Start server (`npm run dev`)
- [ ] Test health endpoint (`http://localhost:5000/health`)
- [ ] Test login with admin credentials
- [ ] Connect frontend to backend

---

**🎉 Your GATHA backend is now ready to use!**
