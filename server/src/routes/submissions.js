const express = require('express');
const prisma = require('../prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET current student's project submissions
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const submissions = await prisma.projectSubmission.findMany({
      where: { userId: req.user.id },
      include: {
        event: { select: { id: true, title: true, category: true, startDate: true, bannerUrl: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
    res.json(submissions);
  } catch (error) {
    console.error('Get my submissions error:', error);
    res.status(500).json({ message: 'Failed to fetch project submissions.' });
  }
});

// GET all submissions for an event (Organizers & Admin)
router.get('/event/:eventId', authenticateToken, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  try {
    const { eventId } = req.params;
    const { code } = req.query;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, accessCode: true, organizerId: true },
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
          message: 'This event is secured. Enter the valid Event Access Code to view project submissions.',
        });
      }
    }

    const submissions = await prisma.projectSubmission.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, name: true, email: true, department: true, studentId: true } },
        event: { select: { id: true, title: true, organizerId: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
    res.json(submissions);
  } catch (error) {
    console.error('Get event submissions error:', error);
    res.status(500).json({ message: 'Failed to fetch event submissions.' });
  }
});

// POST submit or update project report
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { eventId, title, description, repoUrl, demoUrl, reportUrl, teamMembers } = req.body;

    if (!eventId || !title || !description) {
      return res.status(400).json({ message: 'Event ID, project title, and description are required.' });
    }

    // Check if a submission already exists for this event and user
    const existing = await prisma.projectSubmission.findFirst({
      where: { eventId, userId: req.user.id },
    });

    let submission;
    if (existing) {
      submission = await prisma.projectSubmission.update({
        where: { id: existing.id },
        data: {
          title,
          description,
          repoUrl: repoUrl || null,
          demoUrl: demoUrl || null,
          reportUrl: reportUrl || null,
          teamMembers: teamMembers || null,
          submittedAt: new Date(),
        },
        include: {
          event: { select: { title: true } },
          user: { select: { name: true, email: true } },
        },
      });
    } else {
      submission = await prisma.projectSubmission.create({
        data: {
          eventId,
          userId: req.user.id,
          title,
          description,
          repoUrl: repoUrl || null,
          demoUrl: demoUrl || null,
          reportUrl: reportUrl || null,
          teamMembers: teamMembers || null,
        },
        include: {
          event: { select: { title: true } },
          user: { select: { name: true, email: true } },
        },
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit(`event:${eventId}:submission`, submission);
    }

    res.status(201).json(submission);
  } catch (error) {
    console.error('Submit project error:', error);
    res.status(500).json({ message: 'Failed to submit project report.' });
  }
});

// PATCH review submission (Organizer & Admin)
router.patch('/:id/review', authenticateToken, requireRole('ORGANIZER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, score, feedback } = req.body;

    const submission = await prisma.projectSubmission.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(score !== undefined && { score: parseInt(score, 10) }),
        ...(feedback !== undefined && { feedback }),
      },
      include: {
        event: { select: { title: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit(`submission:${id}:reviewed`, submission);
    }

    res.json(submission);
  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({ message: 'Failed to review submission.' });
  }
});

module.exports = router;
