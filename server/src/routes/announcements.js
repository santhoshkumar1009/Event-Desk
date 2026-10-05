const express = require('express');
const prisma = require('../prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET announcements
router.get('/', async (req, res) => {
  try {
    const { eventId, targetAudience } = req.query;

    const where = {};
    if (eventId) {
      where.OR = [
        { eventId },
        { eventId: null }, // Global announcements
      ];
    }
    if (targetAudience) {
      where.targetAudience = { in: ['ALL', targetAudience] };
    }

    const announcements = await prisma.announcement.findMany({
      where,
      include: {
        author: { select: { name: true, role: true } },
        event: { select: { title: true } },
      },
      orderBy: [
        { isPinned: 'desc' },
        { publishedAt: 'desc' },
      ],
    });

    res.json(announcements);
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ message: 'Failed to fetch announcements.' });
  }
});

// POST Create announcement
router.post('/', authenticateToken, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  try {
    const { eventId, title, content, isPinned, isUrgent, targetAudience, scheduledAt } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required.' });
    }

    const announcement = await prisma.announcement.create({
      data: {
        eventId: eventId || null,
        authorId: req.user.id,
        title,
        content,
        isPinned: Boolean(isPinned),
        isUrgent: Boolean(isUrgent),
        targetAudience: targetAudience || 'ALL',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        publishedAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      },
      include: {
        author: { select: { name: true, role: true } },
        event: { select: { title: true } },
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('announcement:created', announcement);
    }

    res.status(201).json(announcement);
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ message: 'Failed to create announcement.' });
  }
});

// DELETE announcement
router.delete('/:id', authenticateToken, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.announcement.delete({ where: { id } });

    const io = req.app.get('io');
    if (io) io.emit('announcement:deleted', id);

    res.json({ message: 'Announcement deleted.' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ message: 'Failed to delete announcement.' });
  }
});

module.exports = router;
