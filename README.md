# EventFlow - Smart Event Coordination Web Platform

EventFlow is a modern, full-stack college event coordination platform built to replace scattered WhatsApp groups, spreadsheets, and paper lists with a single centralized platform.

---

## ⚡ Tech Stack & Architecture

- **Frontend**: React 18 + Vite, Tailwind CSS, React Router v6, Lucide Icons, Recharts, QRCode.react, jsPDF, Socket.io-client.
- **Backend**: Node.js + Express REST API, Prisma ORM + PostgreSQL database, JWT with role-based access control (`STUDENT`, `ORGANIZER`, `ADMIN`), Socket.io server.
- **AI Assistant ("Ask EventFlow")**: Integrated Google Gemini API (`@google/generative-ai`), reading key from environment (`GEMINI_API_KEY`) with real-time database context awareness.

---

## 🔑 Demo Login Credentials

All accounts use the password: `demo123`

| Role | Email | Name | Department |
| :--- | :--- | :--- | :--- |
| **Organizer** (Main focus) | `organizer@demo.com` | Prof. Sarah Connor | Electronics & Communication |
| **Student** | `student@demo.com` | Alex Johnson | Computer Science & Engineering |
| **Admin** | `admin@demo.com` | Dr. Michael Scott | Computer Science & Engineering |

---

## 🚀 Quick Start Instructions

1. **Install Root & Sub-package Dependencies**:
   ```bash
   npm run install:all
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` in `server/` to `server/.env` and set your PostgreSQL `DATABASE_URL`:
   ```bash
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/eventflow?schema=public"
   ```

3. **Initialize Database & Seed Realistic Data**:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. **Start Full-Stack Development Servers**:
   ```bash
   npm run dev
   ```
   - **Frontend App**: `http://localhost:5173`
   - **Backend API**: `http://localhost:5000`

---

## 🛠️ Modules & Features

### 1. Organizer Module (Primary Focus)
- **Create & Manage Events**: Custom registration field builder (T-shirt size, GitHub link), status workflow (`Draft` > `Pending` > `Approved` > `Live` > `Completed`).
- **Schedule & Conflict Detection Engine**: Calendar and day-wise timeline. Server-side & client-side room double-booking conflict detector.
- **Live QR Scanner**: Live check-in scanner with WebSocket real-time progress counter ("142 of 200 checked in").
- **Announcements**: Pinned and urgent updates targeted to all students, specific event attendees, waitlisted candidates, or volunteers.
- **Volunteers Management**: Roster & shift assignment tracking.
- **Kanban Task Board**: Interactive To Do / In Progress / Done columns with assignee and deadline.
- **Budget Tracker**: Planned vs Actual spending per event, financial variance calculator, and expense logger.
- **Registrations Manager**: Search, filter, approve/reject, and export registrations to CSV format.

### 2. Student Module
- **Event Discovery**: Search and filter by category, department, or date.
- **Registration & Auto-Waitlist**: Individual or team entries with capacity checking.
- **Digital QR Pass**: Interactive downloadable QR ticket for checked-in & confirmed attendees.
- **Attendance & PDF Certificates**: Download official PDF certificates for completed/attended events.
- **Campus Leaderboard**: Student & Department rankings based on event participation points.

### 3. Admin Module
- **Analytics & Governance**: System fill rate, no-show rate, department-wise split, and category distribution charts via Recharts.
- **One-Click Post-Event PDF Report**: Auto-generated formal PDF report summarizing event stats, attendee metrics, and financials.
- **User Management**: Change user roles dynamically (`STUDENT`, `ORGANIZER`, `ADMIN`).
- **Venues & System Settings**: Manage campus venues, room capacities, facilities specifications.

### 4. "Ask EventFlow" AI Assistant
- Floating chat widget visible on every page.
- Queries live database context to answer queries like *"Where is the coding contest?"* or *"How many seats left in HackVerse?"*.
- Drafts custom event announcements from bullet points for Organizers.

---

## 📁 Directory Structure

```
SIMATS/
├── client/                     # React Vite Frontend
│   ├── src/
│   │   ├── components/        # Navbar, Sidebar, Toast, AIChatWidget
│   │   ├── context/           # AuthContext, ThemeContext, SocketContext
│   │   ├── pages/
│   │   │   ├── student/       # DiscoverEvents, MyRegistrations, Leaderboard
│   │   │   ├── organizer/     # OrganizerDashboard, EventsManager, ScheduleCalendar,
│   │   │   │                  # RegistrationsManager, QRScannerPage, AnnouncementsManager,
│   │   │   │                  # VolunteersManager, TaskKanban, BudgetTracker
│   │   │   └── admin/         # AdminDashboard, UserManagement, SettingsPage
│   │   ├── App.jsx            # Router and Protected Role Wrappers
│   │   └── main.jsx
│   └── package.json
├── server/                     # Express & Prisma Backend
│   ├── prisma/
│   │   ├── schema.prisma      # Database Schema
│   │   └── seed.js            # Realistic Seed Data (50 Users, 12 Events, 207 Regs)
│   ├── src/
│   │   ├── middleware/        # JWT Auth & Role Verification
│   │   ├── routes/            # REST Endpoints (auth, events, registrations, ai, etc.)
│   │   ├── index.js           # Server Entry Point with Socket.io
│   │   └── prisma.js
│   ├── .env                   # Server Environment Config (GEMINI_API_KEY)
│   └── package.json
├── README.md
└── package.json                # Root Launcher
```
