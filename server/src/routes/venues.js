const express = require('express');
const prisma = require('../prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET all active venues
router.get('/', async (req, res) => {
  try {
    const venues = await prisma.venue.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(venues);
  } catch (error) {
    console.error('Get venues error:', error);
    res.status(500).json({ message: 'Failed to fetch venues.' });
  }
});

// POST Create venue (Admin only)
router.post('/', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, building, capacity, facilities } = req.body;
    if (!name || !building || !capacity) {
      return res.status(400).json({ message: 'Name, building, and capacity are required.' });
    }

    const venue = await prisma.venue.create({
      data: {
        name,
        building,
        capacity: parseInt(capacity, 10),
        facilities: facilities || '',
      },
    });

    res.status(201).json(venue);
  } catch (error) {
    console.error('Create venue error:', error);
    res.status(500).json({ message: 'Failed to create venue.' });
  }
});

// PUT Update venue (Admin only)
router.put('/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, building, capacity, facilities, isActive } = req.body;

    const venue = await prisma.venue.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(building && { building }),
        ...(capacity !== undefined && { capacity: parseInt(capacity, 10) }),
        ...(facilities !== undefined && { facilities }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json(venue);
  } catch (error) {
    console.error('Update venue error:', error);
    res.status(500).json({ message: 'Failed to update venue.' });
  }
});

module.exports = router;
