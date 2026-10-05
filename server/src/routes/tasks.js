const express = require('express');
const prisma = require('../prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET tasks for event
router.get('/event/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const tasks = await prisma.task.findMany({
      where: { eventId },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Failed to fetch tasks.' });
  }
});

// POST Create task
router.post('/', authenticateToken, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  try {
    const { eventId, title, description, status, assigneeId, deadline, priority } = req.body;

    if (!eventId || !title) {
      return res.status(400).json({ message: 'eventId and title are required.' });
    }

    const task = await prisma.task.create({
      data: {
        eventId,
        title,
        description,
        status: status || 'TODO',
        assigneeId: assigneeId || null,
        deadline: deadline ? new Date(deadline) : null,
        priority: priority || 'MEDIUM',
      },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
      },
    });

    const io = req.app.get('io');
    if (io) io.emit(`event:${eventId}:task`, task);

    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Failed to create task.' });
  }
});

// PUT Update task status or details
router.put('/:id', authenticateToken, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, assigneeId, deadline, priority } = req.body;

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(assigneeId !== undefined && { assigneeId }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(priority && { priority }),
      },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
      },
    });

    const io = req.app.get('io');
    if (io) io.emit(`event:${task.eventId}:task`, task);

    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Failed to update task.' });
  }
});

// DELETE task
router.delete('/:id', authenticateToken, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.delete({ where: { id } });

    const io = req.app.get('io');
    if (io) io.emit(`event:${task.eventId}:task_deleted`, id);

    res.json({ message: 'Task deleted.' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Failed to delete task.' });
  }
});

module.exports = router;
