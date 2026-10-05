const express = require('express');
const prisma = require('../prisma');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET all feedbacks for a specific event
router.get('/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const feedbacks = await prisma.feedback.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, name: true, department: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalRatings = feedbacks.length;
    const avgRating = totalRatings > 0
      ? (feedbacks.reduce((acc, f) => acc + f.rating, 0) / totalRatings).toFixed(1)
      : 0;

    res.json({
      feedbacks,
      stats: {
        totalRatings,
        avgRating: parseFloat(avgRating),
      },
    });
  } catch (error) {
    console.error('Get event feedback error:', error);
    res.status(500).json({ message: 'Failed to fetch event feedback.' });
  }
});

// GET current student's submitted feedbacks
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const feedbacks = await prisma.feedback.findMany({
      where: { userId: req.user.id },
      include: {
        event: { select: { id: true, title: true, category: true, startDate: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(feedbacks);
  } catch (error) {
    console.error('Get my feedback error:', error);
    res.status(500).json({ message: 'Failed to fetch your feedbacks.' });
  }
});

// POST submit feedback for an event
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { eventId, rating, comment } = req.body;

    if (!eventId || !rating) {
      return res.status(400).json({ message: 'Event ID and rating (1-5) are required.' });
    }

    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: 'Rating must be an integer between 1 and 5.' });
    }

    // Check if user already submitted feedback for this event
    const existing = await prisma.feedback.findFirst({
      where: { eventId, userId: req.user.id },
    });

    let feedbackRecord;
    if (existing) {
      feedbackRecord = await prisma.feedback.update({
        where: { id: existing.id },
        data: {
          rating: numRating,
          comment: comment || null,
        },
        include: {
          event: { select: { title: true } },
          user: { select: { name: true, department: true } },
        },
      });
    } else {
      feedbackRecord = await prisma.feedback.create({
        data: {
          eventId,
          userId: req.user.id,
          rating: numRating,
          comment: comment || null,
        },
        include: {
          event: { select: { title: true } },
          user: { select: { name: true, department: true } },
        },
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit(`event:${eventId}:feedback`, feedbackRecord);
    }

    res.status(201).json(feedbackRecord);
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ message: 'Failed to submit feedback.' });
  }
});

module.exports = router;
