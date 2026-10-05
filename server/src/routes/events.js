const express = require('express');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const { authenticateToken, requireRole, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Helper: Conflict Detection function
async function checkVenueConflict(venueId, startDate, endDate, excludeEventId = null) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const conflictingEvents = await prisma.event.findMany({
    where: {
      venueId,
      id: excludeEventId ? { not: excludeEventId } : undefined,
      status: { notIn: ['DRAFT', 'CANCELLED'] },
      OR: [
        {
          startDate: { lte: start },
          endDate: { gte: start },
        },
        {
          startDate: { lte: end },
          endDate: { gte: end },
        },
        {
          startDate: { gte: start },
          endDate: { lte: end },
        },
      ],
    },
    include: {
      venue: true,
      organizer: { select: { name: true, email: true } },
    },
  });

  return conflictingEvents;
}

// Endpoint to check conflict before submission
router.post('/check-conflict', authenticateToken, async (req, res) => {
  try {
    const { venueId, startDate, endDate, excludeEventId } = req.body;
    if (!venueId || !startDate || !endDate) {
      return res.status(400).json({ message: 'venueId, startDate, and endDate are required.' });
    }

    const conflicts = await checkVenueConflict(venueId, startDate, endDate, excludeEventId);
    if (conflicts.length > 0) {
      return res.json({
        hasConflict: true,
        conflicts: conflicts.map(c => ({
          id: c.id,
          title: c.title,
          venue: c.venue.name,
          startDate: c.startDate,
          endDate: c.endDate,
          organizer: c.organizer.name,
        })),
      });
    }

    res.json({ hasConflict: false, conflicts: [] });
  } catch (error) {
    console.error('Error checking conflict:', error);
    res.status(500).json({ message: 'Failed to check venue conflict.' });
  }
});

// GET Dashboard Stats (real database counts for organizer & admin overview)
router.get('/dashboard-stats', authenticateToken, async (req, res) => {
  try {
    const totalEvents = await prisma.event.count();
    const liveEvents = await prisma.event.count({ where: { status: 'LIVE' } });
    const totalRegistrations = await prisma.registration.count({ where: { status: 'CONFIRMED' } });
    const totalCheckedIn = await prisma.registration.count({ where: { checkedIn: true } });

    res.json({
      totalEvents,
      liveEvents,
      totalRegistrations,
      totalCheckedIn,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats.' });
  }
});

// GET all events (with search & filters)
router.get('/', async (req, res) => {
  try {
    const { search, category, status, department, startDate, endDate } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (department && department !== 'ALL') {
      where.organizer = { department };
    }

    if (startDate) {
      where.startDate = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.endDate = { lte: new Date(endDate) };
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        venue: true,
        organizer: { select: { id: true, name: true, email: true, department: true } },
        _count: {
          select: { registrations: { where: { status: 'CONFIRMED' } } },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    // Check if requester is authenticated to selectively expose accessCode
    let currentUser = null;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.split(' ')[1]) {
      try {
        currentUser = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      } catch (e) {}
    }

    const sanitizedEvents = events.map(evt => {
      const canSeeCode = currentUser && (currentUser.role === 'ADMIN' || evt.organizerId === currentUser.userId);
      return {
        ...evt,
        accessCode: canSeeCode ? evt.accessCode : undefined,
      };
    });

    res.json(sanitizedEvents);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Failed to fetch events.' });
  }
});

// GET event details by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        venue: true,
        organizer: { select: { id: true, name: true, email: true, department: true, avatar: true } },
        announcements: { orderBy: { publishedAt: 'desc' } },
        _count: {
          select: {
            registrations: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    // Counts for stats
    const confirmedCount = await prisma.registration.count({ where: { eventId: id, status: 'CONFIRMED' } });
    const waitlistCount = await prisma.registration.count({ where: { eventId: id, status: 'WAITLIST' } });
    const checkedInCount = await prisma.registration.count({ where: { eventId: id, checkedIn: true } });

    res.json({
      ...event,
      stats: {
        confirmedCount,
        waitlistCount,
        checkedInCount,
        capacity: event.capacity,
        spotsLeft: Math.max(0, event.capacity - confirmedCount),
      },
    });
  } catch (error) {
    console.error('Get event details error:', error);
    res.status(500).json({ message: 'Failed to fetch event details.' });
  }
});

// POST Create Event (Organizer or Admin)
router.post('/', authenticateToken, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      bannerUrl,
      startDate,
      endDate,
      venueId,
      capacity,
      rules,
      customFields,
      status,
      pointsValue,
    } = req.body;

    if (!title || !category || !startDate || !endDate || !venueId || !capacity) {
      return res.status(400).json({ message: 'Missing required event fields.' });
    }

    // Conflict Check
    const conflicts = await checkVenueConflict(venueId, startDate, endDate);
    if (conflicts.length > 0) {
      return res.status(409).json({
        message: 'Venue double-booking conflict detected!',
        conflicts: conflicts.map(c => `${c.title} (${c.venue.name}) from ${new Date(c.startDate).toLocaleString()} to ${new Date(c.endDate).toLocaleString()}`),
      });
    }

    const eventStatus = req.user.role === 'ADMIN' ? (status || 'APPROVED') : 'PENDING';
    const accessCode = `SEC-${Math.floor(100000 + Math.random() * 900000)}`;

    const categoryPosters = {
      Hackathon: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&auto=format&fit=crop&q=80',
      Workshop: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1200&auto=format&fit=crop&q=80',
      Cultural: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&auto=format&fit=crop&q=80',
      Sports: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
      Seminar: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&auto=format&fit=crop&q=80',
    };
    const finalPoster = bannerUrl && bannerUrl.trim() ? bannerUrl.trim() : (categoryPosters[category] || 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&auto=format&fit=crop&q=80');

    const newEvent = await prisma.event.create({
      data: {
        title,
        category,
        description: description || '',
        bannerUrl: finalPoster,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        venueId,
        organizerId: req.user.id,
        capacity: parseInt(capacity, 10),
        rules: rules || '',
        customFields: typeof customFields === 'string' ? customFields : JSON.stringify(customFields || []),
        status: eventStatus,
        pointsValue: parseInt(pointsValue || 10, 10),
        accessCode,
      },
      include: {
        venue: true,
        organizer: { select: { id: true, name: true, email: true, department: true, avatar: true } },
        _count: {
          select: { registrations: { where: { status: 'CONFIRMED' } } },
        },
      },
    });

    // Emit socket event for real-time updates across student, admin, and organizer dashboards
    const io = req.app.get('io');
    if (io) {
      io.emit('event:created', newEvent);
      io.emit('events:changed', { action: 'create', event: newEvent });
    }

    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Failed to create event.' });
  }
});

// PUT Update Event
router.put('/:id', authenticateToken, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const existingEvent = await prisma.event.findUnique({ where: { id } });

    if (!existingEvent) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    if (req.user.role !== 'ADMIN' && existingEvent.organizerId !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit events you created.' });
    }

    const {
      title,
      category,
      description,
      bannerUrl,
      startDate,
      endDate,
      venueId,
      capacity,
      rules,
      customFields,
      status,
      pointsValue,
    } = req.body;

    // Check conflict if venue or dates changed
    if (venueId || startDate || endDate) {
      const vId = venueId || existingEvent.venueId;
      const sDate = startDate || existingEvent.startDate;
      const eDate = endDate || existingEvent.endDate;

      const conflicts = await checkVenueConflict(vId, sDate, eDate, id);
      if (conflicts.length > 0) {
        return res.status(409).json({
          message: 'Venue double-booking conflict detected!',
          conflicts: conflicts.map(c => `${c.title} (${c.venue.name})`),
        });
      }
    }

    // Status Workflow check: Only ADMIN can change event status workflow
    if (status && status !== existingEvent.status && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied: Only Administrators can modify event status workflow.' });
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(category && { category }),
        ...(description !== undefined && { description }),
        ...(bannerUrl !== undefined && { bannerUrl }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(venueId && { venueId }),
        ...(capacity !== undefined && { capacity: parseInt(capacity, 10) }),
        ...(rules !== undefined && { rules }),
        ...(customFields !== undefined && { customFields: typeof customFields === 'string' ? customFields : JSON.stringify(customFields) }),
        ...(status && req.user.role === 'ADMIN' && { status }),
        ...(pointsValue !== undefined && { pointsValue: parseInt(pointsValue, 10) }),
      },
      include: {
        venue: true,
        organizer: { select: { id: true, name: true, email: true, department: true, avatar: true } },
        _count: {
          select: { registrations: { where: { status: 'CONFIRMED' } } },
        },
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('event:updated', updatedEvent);
      io.emit('events:changed', { action: 'update', event: updatedEvent });
    }

    res.json(updatedEvent);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Failed to update event.' });
  }
});

// Verify Event Secure Code
router.post('/:id/verify-code', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ valid: false, message: 'Access code is required.' });
    }

    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true, title: true, organizerId: true, accessCode: true },
    });

    if (!event) {
      return res.status(404).json({ valid: false, message: 'Event not found.' });
    }

    // Admin can bypass or code must match event's accessCode
    const isMatch = req.user.role === 'ADMIN' || (event.accessCode && event.accessCode.trim().toUpperCase() === code.trim().toUpperCase());

    if (!isMatch) {
      return res.status(403).json({ valid: false, message: 'Invalid Event Secure Code. Access denied.' });
    }

    res.json({ valid: true, message: `Access granted for ${event.title}.` });
  } catch (err) {
    console.error('Verify code error:', err);
    res.status(500).json({ valid: false, message: 'Server error during code verification.' });
  }
});

// DELETE Event (ADMIN ALONE has the access to delete events)
router.delete('/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const existingEvent = await prisma.event.findUnique({ where: { id } });

    if (!existingEvent) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    await prisma.event.delete({ where: { id } });

    const io = req.app.get('io');
    if (io) {
      io.emit('event:deleted', id);
      io.emit('events:changed', { action: 'delete', eventId: id });
    }

    res.json({ message: 'Event deleted successfully.' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Failed to delete event.' });
  }
});

module.exports = router;
