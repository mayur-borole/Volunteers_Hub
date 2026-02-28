# GATHA Backend - Community Service Management System

## 🚀 Complete Backend API for Volunteer Management Platform

### Tech Stack
- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication
- Socket.io (Real-time)
- Nodemailer (Email)
- Cloudinary (Image uploads)

---

## 📦 Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configurations

# Start development server
npm run dev

# Start production server
npm start
```

---

## 🔐 Authentication Flow

- JWT Access Token (15min expiry)
- Refresh Token (7 days expiry)
- Role-based access: volunteer, organizer, admin
- Secure password hashing with bcrypt

---

## 📡 API Endpoints

### Auth Routes
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- POST `/api/auth/refresh` - Refresh access token
- POST `/api/auth/logout` - Logout user
- GET `/api/auth/me` - Get current user

### User Routes
- GET `/api/users/profile` - Get user profile
- PUT `/api/users/profile` - Update profile
- GET `/api/users` - Get all users (Admin)
- PATCH `/api/users/block/:id` - Block user (Admin)
- DELETE `/api/users/:id` - Delete user (Admin)

### Event Routes
- POST `/api/events` - Create event (Organizer)
- GET `/api/events` - Get all events (with filters)
- GET `/api/events/:id` - Get single event
- PUT `/api/events/:id` - Update event (Organizer)
- DELETE `/api/events/:id` - Delete event
- POST `/api/events/:id/register` - Register for event (Volunteer)
- POST `/api/events/:id/cancel` - Cancel registration

### Feedback Routes
- POST `/api/feedback` - Submit feedback
- GET `/api/feedback/event/:eventId` - Get event feedback

### Analytics Routes
- GET `/api/analytics/volunteer` - Volunteer stats
- GET `/api/analytics/organizer` - Organizer stats
- GET `/api/analytics/admin` - Admin dashboard stats

---

## 🗄️ Database Models

### User
- name, email, password (hashed)
- role: volunteer | organizer | admin
- skills, interests, availability
- isBlocked flag

### Event
- title, description, location, date
- startTime, endTime, instructionsForVolunteers, maxVolunteers
- organizer, volunteers array
- approved status, averageRating

### Feedback
- event, volunteer
- rating (1-5), comment
- Unique constraint: one feedback per volunteer per event

### Notification
- user, message, type, isRead
- Created on registration/approval/updates

---

## 🔔 Real-time Features (Socket.io)

- Volunteer registration notifications
- Event approval notifications
- Event update broadcasts
- Online user tracking

---

## 🛡️ Security Features

- Helmet middleware
- CORS configuration
- Rate limiting
- Input validation & sanitization
- NoSQL injection prevention
- Password hashing
- JWT token security

---

## 📊 Query Features

- Search by title/location/skills
- Date filtering
- Pagination & sorting
- MongoDB aggregation for analytics

---

## 🚀 Production Ready

- Environment-based configuration
- Error handling middleware
- Request logging (Morgan)
- MongoDB Atlas support
- Scalable architecture

---

## 👨‍💻 Developer: Mayur (GATHA Project)
