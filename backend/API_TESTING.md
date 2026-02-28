# API Testing Guide

## Base URL
```
http://localhost:5000/api
```

## Authentication Endpoints

### Register
```bash
POST /auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "volunteer"
}
```

### Login
```bash
POST /auth/login
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Get Current User
```bash
GET /auth/me
Headers: Authorization: Bearer <token>
```

---

## Event Endpoints

### Get All Events
```bash
GET /events?location=Pune&date=2026-03-01&page=1&limit=10
```

### Create Event (Organizer)
```bash
POST /events
Headers: Authorization: Bearer <token>
{
  "title": "Beach Cleanup Drive",
  "description": "Join us for cleaning the beach",
  "location": "Pune",
  "date": "2026-03-15",
  "startTime": "10:30 AM",
  "endTime": "01:30 PM",
  "instructionsForVolunteers": "Wear comfortable clothes, report 15 minutes early, and bring a water bottle.",
  "maxVolunteers": 50,
  "category": "environment"
}
```

### Register for Event (Volunteer)
```bash
POST /events/:id/register
Headers: Authorization: Bearer <token>
```

---

## Feedback Endpoints

### Submit Feedback
```bash
POST /feedback
Headers: Authorization: Bearer <token>
{
  "event": "<eventId>",
  "rating": 5,
  "comment": "Great event! Well organized."
}
```

### Get Event Feedback
```bash
GET /feedback/event/:eventId
```

---

## Analytics Endpoints

### Volunteer Stats
```bash
GET /analytics/volunteer
Headers: Authorization: Bearer <token>
```

### Organizer Stats
```bash
GET /analytics/organizer
Headers: Authorization: Bearer <token>
```

### Admin Stats
```bash
GET /analytics/admin
Headers: Authorization: Bearer <token>
```

---

## Testing with Thunder Client / Postman

1. Import the environment variables
2. Set BASE_URL to http://localhost:5000/api
3. After login, save the token
4. Use the token in Authorization header for protected routes

---

## Socket.io Testing

### Connect to WebSocket
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});

socket.on('connected', (data) => {
  console.log('Connected:', data);
});

socket.on('newNotification', (notification) => {
  console.log('New notification:', notification);
});
```

---

## Admin Default Credentials

After running `node services/createAdmin.js`:

```
Email: admin@gatha.com
Password: admin123
```

**⚠️ Change password after first login!**
