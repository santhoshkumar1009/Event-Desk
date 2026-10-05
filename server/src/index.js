const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const eventsRoutes = require('./routes/events');
const venuesRoutes = require('./routes/venues');
const registrationsRoutes = require('./routes/registrations');
const announcementsRoutes = require('./routes/announcements');
const volunteersRoutes = require('./routes/volunteers');
const tasksRoutes = require('./routes/tasks');
const expensesRoutes = require('./routes/expenses');
const usersRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const feedbackRoutes = require('./routes/feedback');
const submissionsRoutes = require('./routes/submissions');
const lostItemsRoutes = require('./routes/lost-items');
const teamsRoutes = require('./routes/teams');
const supportRoutes = require('./routes/support');

const app = express();
const server = http.createServer(app);

// Trust reverse proxy for deployment on Render / Cloud
app.set('trust proxy', 1);

// Flexible CORS configuration supporting FRONTEND_URL and local dev
const rawFrontendUrl = process.env.FRONTEND_URL;
let corsOrigin = '*';
if (rawFrontendUrl && rawFrontendUrl.trim() !== '' && rawFrontendUrl.trim() !== '*') {
  const allowedOrigins = rawFrontendUrl.split(',').map((url) => url.trim().replace(/\/$/, ''));
  corsOrigin = (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalizedOrigin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    // Allow localhost during development
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, true);
  };
}

const corsOptions = {
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Socket.io setup for real-time live check-in, announcements & registrations
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('⚡ Socket client connected:', socket.id);

  socket.on('join_event', (eventId) => {
    socket.join(`event_${eventId}`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket client disconnected:', socket.id);
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/venues', venuesRoutes);
app.use('/api/registrations', registrationsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/volunteers', volunteersRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/lost-items', lostItemsRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/support', supportRoutes);

// Root and Health check endpoints
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    service: 'EventFlow Backend API',
    uptime: process.uptime(),
    healthEndpoint: '/api/health',
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'EventFlow REST API is operational' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 EventFlow Server listening on port ${PORT}`);
});
