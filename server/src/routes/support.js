const express = require('express');
const prisma = require('../prisma');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET categorized FAQs
router.get('/faqs', (req, res) => {
  const faqs = [
    {
      category: 'Registrations & Tickets',
      question: 'How do I download or view my event QR Pass?',
      answer: 'Go to "My Passes & Tickets" from the sidebar menu. Each registered event displays your dynamic ticket pass along with a unique QR code. Organizers will scan this QR ticket at the venue check-in desk.',
    },
    {
      category: 'Registrations & Tickets',
      question: 'What happens if an event reaches maximum capacity?',
      answer: 'Once confirmed registrations reach the venue capacity, subsequent registrations are automatically placed on the WAITLIST. If a confirmed participant cancels, waitlisted students are promoted based on timestamp.',
    },
    {
      category: 'Attendance & Points',
      question: 'How and when are SIMATS Activity Points awarded?',
      answer: 'Activity points are credited in real-time immediately when your QR pass is verified and scanned by the event coordinator at the venue entrance.',
    },
    {
      category: 'Teams & Hackathons',
      question: 'How can I find teammates for Hackathons or Projects?',
      answer: 'Use the "Team Formation" portal in the sidebar. You can browse students seeking teammates, filter by skills or department, or post your own profile outlining your strengths.',
    },
    {
      category: 'Submissions & Reports',
      question: 'How do I submit my project report for competitions?',
      answer: 'Navigate to "Project Submission" in the sidebar, select your registered event, and enter your project title, repository link, live demo, and report details.',
    },
    {
      category: 'Lost & Found',
      question: 'I lost an item during a campus event. What should I do?',
      answer: 'Immediately submit a report under the "Lost & Found" menu. Details are automatically shared with event coordinators and security at the venue registration desk.',
    },
  ];

  res.json(faqs);
});

// GET support contacts
router.get('/contacts', (req, res) => {
  const contacts = [
    {
      role: 'Student Affairs & Campus Events Desk',
      name: 'Dr. Michael Scott',
      email: 'studentaffairs@simats.edu',
      phone: '+91 44 2680 1555 (Ext. 204)',
      office: 'Admin Block, Ground Floor',
      hours: 'Mon - Fri: 8:30 AM - 4:30 PM',
    },
    {
      role: 'Technical & System Support',
      name: 'EventFlow Technical Operations',
      email: 'eventflow-support@simats.edu',
      phone: '+91 44 2680 1556',
      office: 'IT Center, Lab 301',
      hours: 'Mon - Sat: 9:00 AM - 6:00 PM',
    },
    {
      role: 'Campus Security & Lost Property Desk',
      name: 'Chief Security Officer',
      email: 'security@simats.edu',
      phone: '+91 44 2680 1999 (24/7 Helpline)',
      office: 'Main Gate Control Room',
      hours: '24/7 Available',
    },
  ];

  res.json(contacts);
});

// GET user's support queries
router.get('/tickets/my', authenticateToken, async (req, res) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tickets);
  } catch (error) {
    console.error('Get my support tickets error:', error);
    res.status(500).json({ message: 'Failed to fetch support queries.' });
  }
});

// POST submit a support ticket
router.post('/tickets', authenticateToken, async (req, res) => {
  try {
    const { category, subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required.' });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: req.user.id,
        category: category || 'General',
        subject,
        message,
        status: 'OPEN',
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('support:new_ticket', ticket);
    }

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Create support ticket error:', error);
    res.status(500).json({ message: 'Failed to submit support query.' });
  }
});

module.exports = router;
