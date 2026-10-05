const express = require('express');
const prisma = require('../prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET all lost items (filterable by eventId or status)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { eventId, status } = req.query;
    const where = {};
    if (eventId) where.eventId = eventId;
    if (status && status !== 'ALL') where.status = status;

    const items = await prisma.lostItem.findMany({
      where,
      include: {
        event: { select: { id: true, title: true, organizerId: true, venue: true } },
        user: { select: { id: true, name: true, email: true, department: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(items);
  } catch (error) {
    console.error('Get lost items error:', error);
    res.status(500).json({ message: 'Failed to fetch lost items.' });
  }
});

// GET items reported by current user
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const items = await prisma.lostItem.findMany({
      where: { userId: req.user.id },
      include: {
        event: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (error) {
    console.error('Get my lost items error:', error);
    res.status(500).json({ message: 'Failed to fetch your reported items.' });
  }
});

// POST report a lost item (Student)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { eventId, itemName, category, description, location, contactPhone } = req.body;

    if (!eventId || !itemName || !description) {
      return res.status(400).json({ message: 'Event, item name, and description are required.' });
    }

    const item = await prisma.lostItem.create({
      data: {
        eventId,
        userId: req.user.id,
        itemName,
        category: category || 'Other',
        description,
        location: location || null,
        contactPhone: contactPhone || null,
        status: 'REPORTED',
      },
      include: {
        event: { select: { id: true, title: true, organizerId: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('lost_item:new', item);
      io.emit(`event:${eventId}:lost_item`, item);
    }

    res.status(201).json(item);
  } catch (error) {
    console.error('Report lost item error:', error);
    res.status(500).json({ message: 'Failed to report lost item.' });
  }
});

// PATCH update lost item status (Organizer / Admin)
router.patch('/:id/status', authenticateToken, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, foundNotes } = req.body;

    if (!['REPORTED', 'FOUND', 'CLAIMED', 'RESOLVED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const item = await prisma.lostItem.update({
      where: { id },
      data: {
        status,
        ...(foundNotes !== undefined && { foundNotes }),
      },
      include: {
        event: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('lost_item:updated', item);
    }

    res.json(item);
  } catch (error) {
    console.error('Update lost item status error:', error);
    res.status(500).json({ message: 'Failed to update lost item.' });
  }
});

module.exports = router;
