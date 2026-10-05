const express = require('express');
const prisma = require('../prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET expenses for event
router.get('/event/:eventId', authenticateToken, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  try {
    const { eventId } = req.params;
    const { code } = req.query;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        accessCode: true,
        organizerId: true,
        budgetStatus: true,
        budgetTotalPlanned: true,
        budgetApprovedAmount: true,
        budgetAdminComment: true,
        budgetSubmittedAt: true,
        budgetReviewedAt: true,
      },
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
          message: 'This event budget is secured. Enter the valid Event Access Code to view or manage expenses.',
        });
      }
    }

    const expenses = await prisma.expense.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });

    const totalPlanned = expenses.reduce((sum, e) => sum + e.plannedAmount, 0);
    const totalActual = expenses.reduce((sum, e) => sum + e.actualAmount, 0);

    res.json({
      expenses,
      event: {
        id: event.id,
        title: event.title,
        budgetStatus: event.budgetStatus || 'NOT_SUBMITTED',
        budgetTotalPlanned: event.budgetTotalPlanned || totalPlanned,
        budgetApprovedAmount: event.budgetApprovedAmount,
        budgetAdminComment: event.budgetAdminComment,
        budgetSubmittedAt: event.budgetSubmittedAt,
        budgetReviewedAt: event.budgetReviewedAt,
      },
      totals: {
        totalPlanned,
        totalActual,
        variance: totalPlanned - totalActual,
      },
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ message: 'Failed to fetch expenses.' });
  }
});

// POST Submit budget for admin approval (Organizer)
router.post('/event/:eventId/submit-budget', authenticateToken, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  try {
    const { eventId } = req.params;
    const { accessCode } = req.body;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { expenses: true },
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    if (req.user.role === 'ORGANIZER') {
      const providedCode = req.headers['x-event-access-code'] || accessCode;
      const isMatch = providedCode && event.accessCode && providedCode.trim().toUpperCase() === event.accessCode.trim().toUpperCase();
      if (!isMatch) {
        return res.status(403).json({ message: 'Invalid or missing Event Access Code.' });
      }
    }

    const totalPlanned = event.expenses.reduce((sum, e) => sum + e.plannedAmount, 0);

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        budgetStatus: 'PENDING_APPROVAL',
        budgetTotalPlanned: totalPlanned,
        budgetSubmittedAt: new Date(),
      },
      select: {
        id: true,
        title: true,
        budgetStatus: true,
        budgetTotalPlanned: true,
        budgetApprovedAmount: true,
        budgetAdminComment: true,
        budgetSubmittedAt: true,
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('budget:status_updated', {
        eventId,
        budgetStatus: 'PENDING_APPROVAL',
        budgetTotalPlanned: totalPlanned,
      });
      io.emit('admin:new_budget_submission', {
        eventId,
        eventTitle: event.title,
        totalPlanned,
      });
    }

    res.json({
      message: 'Budget submitted to Admin for review successfully!',
      event: updatedEvent,
    });
  } catch (error) {
    console.error('Submit budget error:', error);
    res.status(500).json({ message: 'Failed to submit budget for approval.' });
  }
});

// POST Add expense
router.post('/', authenticateToken, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  try {
    const { eventId, title, category, plannedAmount, actualAmount, notes, accessCode } = req.body;

    if (!eventId || !title || !plannedAmount) {
      return res.status(400).json({ message: 'eventId, title, and plannedAmount are required.' });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, accessCode: true },
    });

    if (req.user.role === 'ORGANIZER') {
      const providedCode = req.headers['x-event-access-code'] || accessCode;
      const isMatch = providedCode && event?.accessCode && providedCode.trim().toUpperCase() === event.accessCode.trim().toUpperCase();
      if (!isMatch) {
        return res.status(403).json({ message: 'Invalid or missing Event Access Code.' });
      }
    }

    const expense = await prisma.expense.create({
      data: {
        eventId,
        title,
        category: category || 'General',
        plannedAmount: parseFloat(plannedAmount),
        actualAmount: parseFloat(actualAmount || 0),
        notes,
      },
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({ message: 'Failed to add expense.' });
  }
});

// PUT Update expense
router.put('/:id', authenticateToken, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, plannedAmount, actualAmount, notes } = req.body;

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(category && { category }),
        ...(plannedAmount !== undefined && { plannedAmount: parseFloat(plannedAmount) }),
        ...(actualAmount !== undefined && { actualAmount: parseFloat(actualAmount) }),
        ...(notes !== undefined && { notes }),
      },
    });

    res.json(expense);
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ message: 'Failed to update expense.' });
  }
});

// DELETE expense
router.delete('/:id', authenticateToken, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.expense.delete({ where: { id } });
    res.json({ message: 'Expense deleted.' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ message: 'Failed to delete expense.' });
  }
});

module.exports = router;
