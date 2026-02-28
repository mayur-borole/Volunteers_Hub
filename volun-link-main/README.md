# VolunLink Frontend

Frontend application for VolunLink (Helping Hands), a full-stack volunteer and organizer platform.

## What this app includes

- Role-based experience for Volunteer, Organizer, and Admin
- Event creation/editing with:
	- Date and 12-hour start/end time (AM/PM)
	- Registration deadline
	- Instructions for volunteers
	- Multi-image upload
- Event details with enhanced cards, timeline info, map support, and registration workflow
- Organizer attendance flow:
	- Mark attendance
	- Finalize attendance
	- Generate certificates
- Volunteer completion flow:
	- See completed events
	- Download certificates
	- Submit rating and feedback
- Realtime updates (Socket.io) for key actions (attendance/certificate/rating/feedback/notifications)
- Responsive dashboard with polished UI and animated interactions

## Tech stack

- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Framer Motion
- Formik + Yup
- React Router
- Socket.io Client
- Axios

## Project structure

```text
volun-link-main/
├── src/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── layouts/
│   ├── lib/
│   ├── pages/
│   ├── services/
│   └── utils/
├── public/
├── package.json
└── vite.config.ts
```

## Prerequisites

- Node.js 18+
- npm 9+
- Backend running on `http://localhost:5000`

## Setup

From this folder (`volun-link-main/`):

```bash
npm install
```

## Scripts

- `npm run dev` → Starts backend + frontend together (via concurrently)
- `npm run dev:frontend` → Starts only frontend Vite dev server
- `npm run dev:backend` → Starts backend from `../backend`
- `npm run dev:only` → Starts only frontend Vite dev server
- `npm run build` → Production build
- `npm run preview` → Preview production build
- `npm run lint` → ESLint

## Environment

Use `.env` in this folder as needed for frontend runtime configuration.

Backend environment is configured separately in `../backend/.env`.

## Core user flows

### Organizer

1. Create event with date/time/location/instructions
2. Approve volunteer registrations
3. Mark attendance
4. Finalize attendance
5. Generate certificates and review ratings/feedback

### Volunteer

1. Browse and apply for events
2. Participate and wait for attendance finalization
3. Receive certificate in dashboard
4. Submit event rating and feedback

## Notes on current implementation

- Required Skills field has been removed from event creation/edit/details.
- Instructions for Volunteers is now available across create/edit/details.
- Event time is handled in 12-hour AM/PM format in forms and display.
- Certificate data is surfaced through profile/dashboard paths with realtime refresh.
- Dashboard UI and key modals are updated with minimal professional styling and subtle animations.

## Related docs

- Fullstack root guide: `../README.md`
- Backend docs: `../backend/README.md`
- API testing: `../backend/API_TESTING.md`
- Google OAuth setup: `GOOGLE_OAUTH_SETUP.md`
- Map navigation guide: `MAP_NAVIGATION_GUIDE.md`

## Run from workspace root (recommended)

From the parent folder (`../`), you can run both apps with one command:

```bash
npm run dev
```

Frontend default URL: `http://localhost:5173`
Backend default URL: `http://localhost:5000`

