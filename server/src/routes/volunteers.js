const express = require('express');
const prisma = require('../prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET all volunteers
router.get('/', authenticateToken, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  try {
    const volunteers = await prisma.volunteer.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, department: true, studentId: true, avatar: true } },
        assignments: {
          include: {
            event: { select: { title: true, startDate: true, endDate: true } },
          },
        },
      },
    });
    res.json(volunteers);
  } catch (error) {
    console.error('Get volunteers error:', error);
    res.status(500).json({ message: 'Failed to fetch volunteers.' });
  }
});

// POST Register as Volunteer or Add Volunteer
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { phone, skills } = req.body;
    const userId = req.user.id;

    const existing = await prisma.volunteer.findUnique({ where: { userId } });
    if (existing) {
      return res.status(400).json({ message: 'User is already registered as a volunteer.' });
    }

    const volunteer = await prisma.volunteer.create({
      data: {
        userId,
        phone,
        skills,
        status: 'ACTIVE',
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    res.status(201).json(volunteer);
  } catch (error) {
    console.error('Register volunteer error:', error);
    res.status(500).json({ message: 'Failed to register volunteer.' });
  }
});

// POST Assign Volunteer to Event Shift
router.post('/assignments', authenticateToken, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  try {
    const { volunteerId, eventId, role, shiftStart, shiftEnd } = req.body;
    if (!volunteerId || !eventId || !role || !shiftStart || !shiftEnd) {
      return res.status(400).json({ message: 'All assignment fields are required.' });
    }

    const assignment = await prisma.volunteerAssignment.create({
      data: {
        volunteerId,
        eventId,
        role,
        shiftStart: new Date(shiftStart),
        shiftEnd: new Date(shiftEnd),
        status: 'ASSIGNED',
      },
      include: {
        volunteer: { include: { user: { select: { name: true, email: true } } } },
        event: { select: { title: true } },
      },
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Assign volunteer error:', error);
    res.status(500).json({ message: 'Failed to assign volunteer.' });
  }
});

// Update Volunteer Assignment Status (CHECKED_IN / COMPLETED)
router.put('/assignments/:id/status', authenticateToken, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await prisma.volunteerAssignment.update({
      where: { id },
      data: { status },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update assignment status error:', error);
    res.status(500).json({ message: 'Failed to update assignment status.' });
  }
});

module.exports = router;
