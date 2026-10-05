const express = require('express');
const prisma = require('../prisma');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET all available teammates looking for a team
router.get('/available', authenticateToken, async (req, res) => {
  try {
    const { eventId, search, department } = req.query;

    const where = {
      status: 'LOOKING',
    };

    if (eventId) {
      where.OR = [
        { eventId },
        { eventId: null },
      ];
    }

    if (department && department !== 'ALL') {
      where.user = { department };
    }

    if (search) {
      where.OR = [
        { skills: { contains: search, mode: 'insensitive' } },
        { roleLooking: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const profiles = await prisma.teamMateProfile.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, department: true, studentId: true } },
        event: { select: { id: true, title: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(profiles);
  } catch (error) {
    console.error('Get available teammates error:', error);
    res.status(500).json({ message: 'Failed to fetch available teammates.' });
  }
});

// GET current student's own teammate profile
router.get('/my-profile', authenticateToken, async (req, res) => {
  try {
    const profile = await prisma.teamMateProfile.findUnique({
      where: { userId: req.user.id },
      include: {
        event: { select: { id: true, title: true } },
      },
    });

    res.json(profile || null);
  } catch (error) {
    console.error('Get my team profile error:', error);
    res.status(500).json({ message: 'Failed to fetch your teammate profile.' });
  }
});

// POST create or update student's teammate profile
router.post('/my-profile', authenticateToken, async (req, res) => {
  try {
    const { skills, roleLooking, bio, lookingFor, eventId, status } = req.body;

    if (!skills || !roleLooking) {
      return res.status(400).json({ message: 'Skills and role you are looking for are required.' });
    }

    const profile = await prisma.teamMateProfile.upsert({
      where: { userId: req.user.id },
      create: {
        userId: req.user.id,
        skills,
        roleLooking,
        bio: bio || null,
        lookingFor: lookingFor || null,
        eventId: eventId || null,
        status: status || 'LOOKING',
      },
      update: {
        skills,
        roleLooking,
        bio: bio !== undefined ? bio : undefined,
        lookingFor: lookingFor !== undefined ? lookingFor : undefined,
        eventId: eventId !== undefined ? eventId : undefined,
        status: status || undefined,
      },
      include: {
        user: { select: { id: true, name: true, email: true, department: true } },
        event: { select: { id: true, title: true } },
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('team:profile_updated', profile);
    }

    res.json(profile);
  } catch (error) {
    console.error('Save team profile error:', error);
    res.status(500).json({ message: 'Failed to save teammate profile.' });
  }
});

// POST toggle team status (LOOKING vs TEAMED_UP)
router.post('/toggle-status', authenticateToken, async (req, res) => {
  try {
    const current = await prisma.teamMateProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!current) {
      return res.status(404).json({ message: 'Teammate profile not found. Create one first.' });
    }

    const newStatus = current.status === 'LOOKING' ? 'TEAMED_UP' : 'LOOKING';
    const updated = await prisma.teamMateProfile.update({
      where: { userId: req.user.id },
      data: { status: newStatus },
    });

    res.json(updated);
  } catch (error) {
    console.error('Toggle team status error:', error);
    res.status(500).json({ message: 'Failed to toggle status.' });
  }
});

module.exports = router;
