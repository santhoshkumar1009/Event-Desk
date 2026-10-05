const express = require('express');
const prisma = require('../prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Leaderboard: Student & Department Rankings
router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    // 1. Student rankings (sum of points)
    const studentPoints = await prisma.points.groupBy({
      by: ['userId'],
      _sum: { pointsEarned: true },
      _count: { id: true },
      orderBy: { _sum: { pointsEarned: 'desc' } },
      take: 20,
    });

    const studentIds = studentPoints.map((p) => p.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, email: true, department: true, studentId: true, avatar: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const studentRankings = studentPoints.map((p, idx) => ({
      rank: idx + 1,
      user: userMap.get(p.userId),
      totalPoints: p._sum.pointsEarned || 0,
      eventsAttended: p._count.id || 0,
    }));

    // 2. Department rankings
    const deptPointsRaw = await prisma.points.findMany({
      include: {
        user: { select: { department: true } },
      },
    });

    const deptMap = {};
    deptPointsRaw.forEach((p) => {
      const dept = p.user?.department || 'Unassigned';
      if (!deptMap[dept]) {
        deptMap[dept] = { department: dept, totalPoints: 0, eventsAttended: 0 };
      }
      deptMap[dept].totalPoints += p.pointsEarned;
      deptMap[dept].eventsAttended += 1;
    });

    const departmentRankings = Object.values(deptMap)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((d, idx) => ({ rank: idx + 1, ...d }));

    res.json({
      studentRankings,
      departmentRankings,
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Failed to fetch leaderboard data.' });
  }
});

// GET list of users (Admin only)
router.get('/', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { search, role, department } = req.query;

    const where = {};
    if (role && role !== 'ALL') where.role = role;
    if (department && department !== 'ALL') where.department = department;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { studentId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        studentId: true,
        avatar: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users.' });
  }
});

// PUT Update user role (Admin only)
router.put('/:id/role', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['STUDENT', 'ORGANIZER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Failed to update user role.' });
  }
});

// DELETE User (Admin only)
router.delete('/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id === id) {
      return res.status(400).json({ message: 'You cannot delete your own admin account.' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Safely remove or reassign dependent records in transaction
    await prisma.$transaction([
      prisma.points.deleteMany({ where: { userId: id } }),
      prisma.registration.deleteMany({ where: { userId: id } }),
      prisma.feedback.deleteMany({ where: { userId: id } }),
      prisma.task.updateMany({ where: { assigneeId: id }, data: { assigneeId: null } }),
      prisma.announcement.deleteMany({ where: { authorId: id } }),
      prisma.volunteerAssignment.deleteMany({ where: { volunteer: { userId: id } } }),
      prisma.volunteer.deleteMany({ where: { userId: id } }),
      prisma.event.updateMany({ where: { organizerId: id }, data: { organizerId: req.user.id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    const io = req.app.get('io');
    if (io) {
      io.emit('user:deleted', id);
      io.emit('stats:updated');
    }

    res.json({ message: `User "${targetUser.name}" deleted successfully.` });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user.' });
  }
});

module.exports = router;
