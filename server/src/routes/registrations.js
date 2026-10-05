const express = require('express');
const prisma = require('../prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Student Register for Event
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { eventId, registrationType, teamName, teamMembers, customResponses } = req.body;
    const userId = req.user.id;

    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required.' });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    // Check if user is already registered
    const existing = await prisma.registration.findFirst({
      where: { eventId, userId, status: { not: 'CANCELLED' } },
    });

    if (existing) {
      return res.status(400).json({ message: 'You are already registered for this event.' });
    }

    // Capacity Check
    const confirmedCount = await prisma.registration.count({
      where: { eventId, status: 'CONFIRMED' },
    });

    const isWaitlist = confirmedCount >= event.capacity;
    const status = isWaitlist ? 'WAITLIST' : 'CONFIRMED';

    const qrCode = `EF-${eventId.substring(0, 4)}-${userId.substring(0, 4)}-${Date.now().toString().slice(-4)}`;

    const registration = await prisma.registration.create({
      data: {
        eventId,
        userId,
        registrationType: registrationType || 'INDIVIDUAL',
        teamName: teamName || null,
        teamMembers: teamMembers ? JSON.stringify(teamMembers) : null,
        customResponses: customResponses ? JSON.stringify(customResponses) : null,
        status,
        qrTicketCode: qrCode,
      },
      include: {
        event: { include: { venue: true } },
        user: { select: { name: true, email: true, department: true, studentId: true } },
      },
    });

    // Notify via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit(`event:${eventId}:registration`, {
        registrationId: registration.id,
        status,
        confirmedCount: isWaitlist ? confirmedCount : confirmedCount + 1,
      });
      io.emit('registration:created', registration);
      io.emit('stats:updated');
    }

    res.status(201).json({
      message: isWaitlist
        ? 'Capacity reached! You have been placed on the auto-waitlist.'
        : 'Registration confirmed! QR Ticket generated.',
      registration,
      isWaitlist,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Failed to register for event.' });
  }
});

// GET My Registrations (For Student)
router.get('/my-registrations', authenticateToken, async (req, res) => {
  try {
    const registrations = await prisma.registration.findMany({
      where: { userId: req.user.id },
      include: {
        event: {
          include: {
            venue: true,
            organizer: { select: { name: true, email: true, department: true } },
          },
        },
      },
      orderBy: { registeredAt: 'desc' },
    });
    res.json(registrations);
  } catch (error) {
    console.error('Get my registrations error:', error);
    res.status(500).json({ message: 'Failed to fetch registrations.' });
  }
});

// GET Event Registrations (For Organizer / Admin)
router.get('/event/:eventId', authenticateToken, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  try {
    const { eventId } = req.params;
    const { search, status, code } = req.query;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, accessCode: true, organizerId: true },
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    // Secure Code Check: Organizers MUST supply the valid access code
    if (req.user.role === 'ORGANIZER') {
      const providedCode = req.headers['x-event-access-code'] || code;
      const isMatch = providedCode && event.accessCode && providedCode.trim().toUpperCase() === event.accessCode.trim().toUpperCase();
      if (!isMatch) {
        return res.status(403).json({
          locked: true,
          message: 'This event is secured. Enter the valid Event Access Code to view registrations.',
        });
      }
    }

    const where = { eventId };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { studentId: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const registrations = await prisma.registration.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, department: true, studentId: true, avatar: true } },
      },
      orderBy: { registeredAt: 'desc' },
    });

    res.json(registrations);
  } catch (error) {
    console.error('Get event registrations error:', error);
    res.status(500).json({ message: 'Failed to fetch event registrations.' });
  }
});

// Update Registration Status (Approve / Reject / Waitlist)
router.put('/:id/status', authenticateToken, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // CONFIRMED, WAITLIST, CANCELLED

    if (!['CONFIRMED', 'WAITLIST', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const updated = await prisma.registration.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { name: true, email: true } },
        event: { select: { id: true, title: true } },
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit(`event:${updated.eventId}:registration`, { registrationId: id, status });
    }

    res.json(updated);
  } catch (error) {
    console.error('Update registration status error:', error);
    res.status(500).json({ message: 'Failed to update registration status.' });
  }
});

// Live Check-in Scanner Endpoint (QR Ticket Scan)
router.post('/check-in', authenticateToken, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  try {
    const { qrTicketCode, eventId } = req.body;

    if (!qrTicketCode) {
      return res.status(400).json({ message: 'QR Ticket code is required.' });
    }

    const registration = await prisma.registration.findFirst({
      where: {
        qrTicketCode,
        ...(eventId && { eventId }),
      },
      include: {
        user: { select: { id: true, name: true, email: true, department: true, studentId: true, avatar: true } },
        event: { select: { id: true, title: true, capacity: true, pointsValue: true, accessCode: true } },
      },
    });

    if (!registration) {
      return res.status(404).json({ message: 'Invalid or unrecognised QR ticket.' });
    }

    // Secure Code Check for Organizer scanning
    if (req.user.role === 'ORGANIZER') {
      const providedCode = req.headers['x-event-access-code'] || req.body.accessCode;
      const isMatch = providedCode && registration.event.accessCode && providedCode.trim().toUpperCase() === registration.event.accessCode.trim().toUpperCase();
      if (!isMatch) {
        return res.status(403).json({
          locked: true,
          message: 'Scanner Locked: Valid Event Access Code is required to check in attendees.',
        });
      }
    }

    if (registration.status !== 'CONFIRMED') {
      return res.status(400).json({ message: `Cannot check in. Registration status is ${registration.status}.` });
    }

    if (registration.checkedIn) {
      return res.status(400).json({
        message: `Already checked in at ${new Date(registration.checkedInAt).toLocaleTimeString()}!`,
        alreadyCheckedIn: true,
        registration,
      });
    }

    // Perform Check-in
    const checkedInAt = new Date();
    const updated = await prisma.registration.update({
      where: { id: registration.id },
      data: {
        checkedIn: true,
        checkedInAt,
      },
      include: {
        user: { select: { id: true, name: true, email: true, department: true, studentId: true, avatar: true } },
        event: true,
      },
    });

    // Award Points
    await prisma.points.create({
      data: {
        userId: registration.user.id,
        eventId: registration.event.id,
        pointsEarned: registration.event.pointsValue || 10,
        awardedAt: checkedInAt,
      },
    });

    // Calculate updated live stats
    const totalCheckedIn = await prisma.registration.count({
      where: { eventId: registration.eventId, checkedIn: true },
    });
    const totalConfirmed = await prisma.registration.count({
      where: { eventId: registration.eventId, status: 'CONFIRMED' },
    });

    // Real-time WebSocket emission to update Organizer QR counter page & all dashboards
    const io = req.app.get('io');
    if (io) {
      io.emit(`event:${registration.eventId}:checkin`, {
        checkedInCount: totalCheckedIn,
        confirmedCount: totalConfirmed,
        capacity: registration.event.capacity,
        lastScannedUser: registration.user,
        timestamp: checkedInAt,
      });
      io.emit('registration:checkin', {
        eventId: registration.eventId,
        userId: registration.user.id,
        user: registration.user,
      });
      io.emit('points:awarded', {
        userId: registration.user.id,
        department: registration.user.department,
        points: registration.event.pointsValue || 10,
      });
      io.emit('stats:updated');
    }

    res.json({
      message: `Successfully checked in ${registration.user.name}!`,
      registration: updated,
      stats: {
        checkedInCount: totalCheckedIn,
        confirmedCount: totalConfirmed,
        capacity: registration.event.capacity,
      },
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ message: 'Failed to process check-in.' });
  }
});

module.exports = router;
