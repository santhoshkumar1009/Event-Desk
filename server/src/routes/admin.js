const express = require('express');
const prisma = require('../prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET System Analytics & Stats
router.get('/analytics', authenticateToken, requireRole('ADMIN', 'ORGANIZER'), async (req, res) => {
  try {
    const totalEvents = await prisma.event.count();
    const liveEvents = await prisma.event.count({ where: { status: 'LIVE' } });
    const completedEvents = await prisma.event.count({ where: { status: 'COMPLETED' } });

    const totalRegistrations = await prisma.registration.count({ where: { status: { not: 'CANCELLED' } } });
    const totalCheckedIn = await prisma.registration.count({ where: { checkedIn: true } });
    const totalCapacity = await prisma.event.aggregate({ _sum: { capacity: true } });

    const overallCapacity = totalCapacity._sum.capacity || 1;
    const overallFillRate = Math.min(100, Math.round((totalRegistrations / overallCapacity) * 100));
    const noShowCount = Math.max(0, totalRegistrations - totalCheckedIn);
    const noShowRate = totalRegistrations > 0 ? Math.round((noShowCount / totalRegistrations) * 100) : 0;

    // 1. Department-wise split of registrations
    const registrationsWithUsers = await prisma.registration.findMany({
      where: { status: 'CONFIRMED' },
      include: { user: { select: { department: true } } },
    });

    const deptSplit = {};
    registrationsWithUsers.forEach((r) => {
      const d = r.user?.department || 'Other';
      deptSplit[d] = (deptSplit[d] || 0) + 1;
    });

    const departmentChartData = Object.entries(deptSplit).map(([department, count]) => ({
      department,
      count,
    }));

    // 2. Registrations per event
    const eventsWithRegs = await prisma.event.findMany({
      select: {
        id: true,
        title: true,
        capacity: true,
        category: true,
        status: true,
        _count: {
          select: {
            registrations: true,
          },
        },
      },
      take: 10,
      orderBy: { registrations: { _count: 'desc' } },
    });

    const eventFillChartData = await Promise.all(
      eventsWithRegs.map(async (e) => {
        const confirmed = await prisma.registration.count({ where: { eventId: e.id, status: 'CONFIRMED' } });
        const checkedIn = await prisma.registration.count({ where: { eventId: e.id, checkedIn: true } });
        return {
          title: e.title.length > 20 ? e.title.substring(0, 20) + '...' : e.title,
          capacity: e.capacity,
          confirmed,
          checkedIn,
          fillRate: Math.round((confirmed / e.capacity) * 100),
        };
      })
    );

    // 3. Category distribution
    const eventsByCategory = await prisma.event.groupBy({
      by: ['category'],
      _count: { id: true },
    });
    const categoryChartData = eventsByCategory.map((c) => ({
      category: c.category,
      count: c._count.id,
    }));

    res.json({
      summary: {
        totalEvents,
        liveEvents,
        completedEvents,
        totalRegistrations,
        totalCheckedIn,
        overallFillRate,
        noShowRate,
      },
      charts: {
        departmentSplit: departmentChartData,
        eventFillRate: eventFillChartData,
        categoryDistribution: categoryChartData,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Failed to generate analytics.' });
  }
});

// GET all event budgets for Admin Review Desk
router.get('/budgets', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { status } = req.query;

    const where = {};
    if (status && status !== 'ALL') {
      where.budgetStatus = status;
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        organizer: { select: { id: true, name: true, email: true, department: true } },
        venue: { select: { id: true, name: true, building: true } },
        expenses: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [
        { budgetSubmittedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json(events);
  } catch (error) {
    console.error('Get admin budgets error:', error);
    res.status(500).json({ message: 'Failed to fetch event budgets.' });
  }
});

// PATCH Review and Approve / Reject / Request Revision for an Event Budget
router.patch('/budgets/:eventId/review', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { eventId } = req.params;
    const { action, comment, approvedAmount } = req.body;

    if (!['APPROVE', 'REJECT', 'REQUEST_REVISION'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Must be APPROVE, REJECT, or REQUEST_REVISION.' });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { expenses: true },
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    const totalPlanned = event.expenses.reduce((sum, e) => sum + e.plannedAmount, 0);

    let nextBudgetStatus = 'APPROVED';
    let finalApprovedAmount = event.budgetApprovedAmount;

    if (action === 'APPROVE') {
      nextBudgetStatus = 'APPROVED';
      finalApprovedAmount = approvedAmount !== undefined && approvedAmount !== null
        ? parseFloat(approvedAmount)
        : (event.budgetTotalPlanned || totalPlanned);
    } else if (action === 'REJECT') {
      nextBudgetStatus = 'REJECTED';
    } else if (action === 'REQUEST_REVISION') {
      nextBudgetStatus = 'REVISION_REQUESTED';
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        budgetStatus: nextBudgetStatus,
        budgetAdminComment: comment || null,
        budgetApprovedAmount: finalApprovedAmount,
        budgetReviewedAt: new Date(),
        budgetTotalPlanned: event.budgetTotalPlanned || totalPlanned,
      },
      include: {
        organizer: { select: { id: true, name: true, email: true, department: true } },
        venue: { select: { id: true, name: true } },
        expenses: true,
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('budget:status_updated', {
        eventId,
        budgetStatus: nextBudgetStatus,
        budgetAdminComment: comment || null,
        budgetApprovedAmount: finalApprovedAmount,
        eventTitle: event.title,
      });
      io.emit(`event:${eventId}:budget_updated`, {
        eventId,
        budgetStatus: nextBudgetStatus,
        budgetAdminComment: comment || null,
        budgetApprovedAmount: finalApprovedAmount,
      });
    }

    res.json({
      message: `Budget successfully marked as ${nextBudgetStatus}!`,
      event: updatedEvent,
    });
  } catch (error) {
    console.error('Review budget error:', error);
    res.status(500).json({ message: 'Failed to process budget review.' });
  }
});

module.exports = router;
