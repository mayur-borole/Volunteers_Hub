# GATHA Full Stack Setup Guide

Complete guide to run the frontend and backend together.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB running locally or MongoDB Atlas account
- Git

### 1. Backend Setup

Navigate to the backend directory:
```powershell
cd backend
```

Install dependencies:
```powershell
npm install
```

Configure environment variables:
- Copy `.env.example` to `.env`
- Update MongoDB URI and other settings

Start the backend server:
```powershell
npm run dev
```

Backend will run on **http://localhost:5000**

### 2. Frontend Setup

Open a new terminal and navigate to the frontend root:
```powershell
cd c:\Users\mayur\OneDrive\Desktop\gathaproject\volun-link-main\volun-link-main
```

Install dependencies (if not already done):
```powershell
npm install
```

The `.env` file is already configured with:
```
VITE_API_URL=http://localhost:5000/api
```

Start the frontend dev server:
```powershell
npm run dev
```

Frontend will run on **http://localhost:8080**

## 📝 Test Accounts

### Admin Account
- Email: `admin@gatha.com`
- Password: `admin123`
- Role: Admin (full access)

### Test User
- Email: `test@test.com`
- Password: `test123`
- Role: Volunteer

## 🔑 Key Features Now Working

### Authentication
- ✅ User registration with role selection (volunteer/organizer/admin)
- ✅ User login with JWT tokens
- ✅ Automatic token refresh
- ✅ Protected routes
- ✅ Persistent sessions

### API Integration
- ✅ All backend endpoints connected
- ✅ Real-time error handling with toast notifications
- ✅ Loading states
- ✅ Token management with auto-refresh

### Real-time Features (Ready)
- Socket.io configured for:
  - Live notifications
  - Event updates
  - User presence

## 🛠️ Development Workflow

### Running Both Servers
You need **two terminal windows**:

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd c:\Users\mayur\OneDrive\Desktop\gathaproject\volun-link-main\volun-link-main
npm run dev
```

### Testing the Integration

1. Open browser to `http://localhost:8080`
2. Click "Sign Up" or "Login"
3. Register a new account or use test credentials
4. You should see Dashboard after successful login
5. Check browser DevTools → Network tab to see API calls

### API Testing (PowerShell)

Test backend health:
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET
```

Test registration:
```powershell
$body = @{
    name = "New User"
    email = "newuser@example.com"
    password = "password123"
    role = "volunteer"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $body -ContentType "application/json"
```

## 📁 Project Structure

```
volun-link-main/
├── backend/                    # Backend server
│   ├── server.js              # Main entry point
│   ├── models/                # Database models
│   ├── controllers/           # Business logic
│   ├── routes/                # API routes
│   ├── middlewares/           # Auth, validation, etc.
│   └── services/              # Utilities
│
├── src/                       # Frontend code
│   ├── components/            # React components
│   ├── context/              
│   │   └── AuthContext.tsx   # ✅ Now using real API
│   ├── pages/                # Page components
│   ├── services/             # ✅ API service layer
│   │   ├── authService.ts
│   │   ├── eventService.ts
│   │   ├── feedbackService.ts
│   │   ├── analyticsService.ts
│   │   ├── userService.ts
│   │   └── notificationService.ts
│   └── lib/
│       └── api.ts            # ✅ Axios config with interceptors
└── .env                       # Frontend environment variables
```

## 🔧 Configuration Files

### Frontend `.env`
```env
VITE_API_URL=http://localhost:5000/api
```

### Backend `.env`
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/gatha
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
NODE_ENV=development
```

## 🐛 Troubleshooting

### Frontend can't connect to backend
- Ensure backend is running on port 5000
- Check `.env` file has correct `VITE_API_URL`
- Restart frontend dev server after changing `.env`

### CORS errors
- Backend already configured with CORS for `http://localhost:8080`
- Check backend console for CORS warnings

### Login/Register not working
- Open browser DevTools → Console tab
- Check Network tab for failed requests
- Verify backend server is running
- Check backend console for errors

### MongoDB connection issues
- Ensure MongoDB is running: `mongod`
- Check `MONGODB_URI` in backend `.env`
- Try MongoDB Atlas if local connection fails

## 🔐 Security Notes

- JWT tokens stored in localStorage
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Passwords hashed with bcrypt
- Protected API routes require authentication

## 📊 API Endpoints Summary

### Authentication (`/api/auth`)
- POST `/register` - Create new account
- POST `/login` - Login
- POST `/logout` - Logout
- POST `/refresh-token` - Refresh access token
- GET `/me` - Get current user
- PUT `/update-password` - Change password

### Events (`/api/events`)
- GET `/` - List all events (with filters)
- POST `/` - Create event (organizer/admin)
- GET `/:id` - Get event details
- PUT `/:id` - Update event
- DELETE `/:id` - Delete event
- POST `/:id/register` - Register for event
- POST `/:id/cancel` - Cancel registration

### Feedback (`/api/feedback`)
- POST `/` - Submit feedback
- GET `/event/:eventId` - Get event feedback
- PUT `/:id` - Update feedback
- DELETE `/:id` - Delete feedback

### Analytics (`/api/analytics`)
- GET `/admin/stats` - Admin statistics
- GET `/organizer/stats` - Organizer statistics
- GET `/volunteer/stats` - Volunteer statistics

### Users (`/api/users`)
- GET `/profile` - Get own profile
- PUT `/profile` - Update profile
- GET `/` - List users (admin)
- GET `/:id` - Get user by ID

### Notifications (`/api/notifications`)
- GET `/` - Get user notifications
- PUT `/:id/read` - Mark as read
- PUT `/read-all` - Mark all as read
- DELETE `/:id` - Delete notification

## ✅ Integration Checklist

- [x] Backend server running
- [x] Frontend dev server running
- [x] Environment variables configured
- [x] API service layer created
- [x] AuthContext connected to real API
- [x] Login/Register pages updated
- [x] Toast notifications for errors/success
- [ ] Socket.io client connection (next step)
- [ ] Update Dashboard to fetch real data
- [ ] Update Events page to use eventService
- [ ] Add loading skeletons

## 🎯 Next Steps

1. **Test the authentication flow**
   - Register new user
   - Login with credentials
   - Check token storage in DevTools

2. **Update Event components**
   - Use `eventService` instead of dummy data
   - Add loading states
   - Handle errors gracefully

3. **Setup Socket.io client**
   - Install socket.io-client
   - Create socket connection hook
   - Connect to real-time notifications

4. **Enhance UI/UX**
   - Add loading skeletons
   - Better error messages
   - Success confirmations

## 📞 Support

For issues or questions:
1. Check backend console for errors
2. Check frontend browser console
3. Verify environment variables
4. Ensure both servers are running

Happy coding! 🚀
