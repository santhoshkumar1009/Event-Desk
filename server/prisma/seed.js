const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting EventFlow Database Seeding...');

  // Clean existing tables in reverse order of dependency (PostgreSQL FK safe)
  await prisma.supportTicket.deleteMany({});
  await prisma.teamMateProfile.deleteMany({});
  await prisma.lostItem.deleteMany({});
  await prisma.projectSubmission.deleteMany({});
  await prisma.feedback.deleteMany({});
  await prisma.points.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.volunteerAssignment.deleteMany({});
  await prisma.volunteer.deleteMany({});
  await prisma.announcement.deleteMany({});
  await prisma.registration.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.venue.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = await bcrypt.hash('demo123', 10);

  // 1. Create Core Demo Users
  const studentUser = await prisma.user.create({
    data: {
      email: 'student@demo.com',
      password: passwordHash,
      name: 'Alex Johnson',
      role: 'STUDENT',
      department: 'Computer Science & Engineering',
      studentId: 'CS2024-001',
      avatar: null,
    },
  });

  const organizerUser = await prisma.user.create({
    data: {
      email: 'organizer@demo.com',
      password: passwordHash,
      name: 'Prof. Sarah Connor',
      role: 'ORGANIZER',
      department: 'Electronics & Communication',
      studentId: null,
      avatar: null,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      password: passwordHash,
      name: 'Dr. Michael Scott',
      role: 'ADMIN',
      department: 'Computer Science & Engineering',
      studentId: null,
      avatar: null,
    },
  });

  // Additional Organizers & Students (to generate 150+ registrations)
  const departments = [
    'Computer Science & Engineering',
    'Electronics & Communication',
    'Mechanical Engineering',
  ];

  const studentPool = [studentUser];
  const firstNames = ['Liam', 'Emma', 'Noah', 'Olivia', 'Ethan', 'Ava', 'Mason', 'Sophia', 'Lucas', 'Isabella', 'Logan', 'Mia', 'Jackson', 'Charlotte', 'Aiden', 'Harper', 'James', 'Amelia', 'Benjamin', 'Evelyn', 'Daniel', 'Abigail', 'Elijah', 'Emily', 'Oliver', 'Elizabeth', 'Jacob', 'Mila', 'Michael', 'Ella', 'Alexander', 'Avery', 'Henry', 'Sofia', 'Sebastian', 'Camila', 'Jack', 'Aria', 'Owen', 'Scarlett', 'Sam', 'Priya', 'Rohan', 'Ananya', 'Dev', 'Kavya', 'Rahul', 'Sneha', 'Arjun', 'Tanvi'];
  const lastNames = ['Smith', 'Patel', 'Sharma', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Rao', 'Verma', 'Gupta', 'Singh', 'Deshmukh'];

  for (let i = 2; i <= 50; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[i % lastNames.length];
    const dept = departments[i % departments.length];
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@demo.com`;
    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        name: `${fn} ${ln}`,
        role: 'STUDENT',
        department: dept,
        studentId: `${dept.split(' ').map(w => w[0]).join('')}2024-${String(i).padStart(3, '0')}`,
        avatar: null,
      },
    });
    studentPool.push(user);
  }

  console.log(`✅ Created ${studentPool.length} users (including Student, Organizer, Admin)`);

  // 2. Create 8 Venues
  const venuesData = [
    { name: 'Main Auditorium', building: 'Tech Block A', capacity: 500, facilities: '4K Projector, Surround Sound, Stage Lights, AC' },
    { name: 'Mini Auditorium', building: 'Tech Block B', capacity: 200, facilities: 'HD Projector, Wireless Mics, AC' },
    { name: 'Lab 301 - HPC Center', building: 'Science Building', capacity: 60, facilities: '60 High-End Workstations, Dual Monitors, Fiber LAN' },
    { name: 'Conference Hall 1', building: 'Admin Block', capacity: 100, facilities: 'Video Conferencing, Smart Board, Executive Seating' },
    { name: 'Open Amphitheatre', building: 'Campus Quadrangle', capacity: 800, facilities: 'Outdoor Stage, PA System, Event Canopy' },
    { name: 'Seminar Hall 202', building: 'Electronics Block', capacity: 120, facilities: 'Interactive Screen, Podium, AC' },
    { name: 'Indoor Sports Complex', building: 'Sports Pavilion', capacity: 350, facilities: 'Badminton Courts, Synthetic Flooring, Bleachers' },
    { name: 'Innovation & Incubation Hub', building: 'Tech Park Floor 3', capacity: 80, facilities: 'Whiteboards, Modular Desks, 3D Printers' },
  ];

  const createdVenues = [];
  for (const v of venuesData) {
    const venue = await prisma.venue.create({ data: v });
    createdVenues.push(venue);
  }
  console.log(`✅ Created ${createdVenues.length} Venues`);

  // 3. Create 12 Events across Categories & Statuses
  const now = new Date();
  const days = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  const eventsData = [
    {
      title: 'HackVerse 2026: 24-Hour AI & Web3 Hackathon',
      category: 'Hackathon',
      description: 'Build cutting-edge decentralized applications and AI solutions in a 24-hour sprint. Mentorship, free food, and $5,000 in cash prizes!',
      bannerUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800',
      startDate: days(-1),
      endDate: days(0),
      venueId: createdVenues[2].id, // Lab 301
      organizerId: organizerUser.id,
      capacity: 50,
      rules: 'Teams of 2-4 members. Code must be written during hackathon window.',
      customFields: JSON.stringify([
        { label: 'T-Shirt Size', type: 'select', options: ['S', 'M', 'L', 'XL'], required: true },
        { label: 'GitHub Profile URL', type: 'text', required: true },
        { label: 'Dietary Preference', type: 'select', options: ['Veg', 'Non-Veg', 'Vegan'], required: false }
      ]),
      status: 'LIVE',
      pointsValue: 50,
    },
    {
      title: 'Annual Cultural Fest - Resonance 2026',
      category: 'Cultural',
      description: 'The biggest inter-college cultural extravaganza featuring battle of the bands, dance showdowns, fashion shows, and celebrity guest performances.',
      bannerUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800',
      startDate: days(5),
      endDate: days(7),
      venueId: createdVenues[4].id, // Open Amphitheatre
      organizerId: organizerUser.id,
      capacity: 600,
      rules: 'College ID compulsory for entry. Gates close at 7 PM.',
      customFields: JSON.stringify([
        { label: 'Participating In', type: 'select', options: ['Solo Music', 'Group Dance', 'Battle of Bands', 'Audience'], required: true }
      ]),
      status: 'APPROVED',
      pointsValue: 20,
    },
    {
      title: 'Workshop: Full-Stack React & Node.js Masterclass',
      category: 'Workshop',
      description: 'Hands-on practical session building production-grade web applications. Learn state management, RESTful design, authentication, and deployment.',
      bannerUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800',
      startDate: days(2),
      endDate: days(2),
      venueId: createdVenues[1].id, // Mini Auditorium
      organizerId: organizerUser.id,
      capacity: 150,
      rules: 'Laptops required. Node.js LTS must be pre-installed.',
      customFields: JSON.stringify([
        { label: 'Prior React Experience', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'], required: true }
      ]),
      status: 'APPROVED',
      pointsValue: 30,
    },
    {
      title: 'RoboWars & Autonomous Navigation Summit',
      category: 'Workshop',
      description: 'Witness combat robotics in the arena and attend lectures on LiDAR ROS2 autonomous navigation from industry pioneers.',
      bannerUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800',
      startDate: days(-10),
      endDate: days(-9),
      venueId: createdVenues[0].id, // Main Auditorium
      organizerId: organizerUser.id,
      capacity: 250,
      rules: 'Follow safety guidelines around the arena glass cage.',
      customFields: JSON.stringify([]),
      status: 'COMPLETED',
      pointsValue: 40,
    },
    {
      title: 'Inter-Departmental Esports Championship: Valorant & BGMI',
      category: 'Sports',
      description: 'Compete for the ultimate gaming trophy! High-speed fiber network provided. Broadcasted live on Twitch and YouTube.',
      bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
      startDate: days(10),
      endDate: days(11),
      venueId: createdVenues[6].id, // Sports Complex
      organizerId: organizerUser.id,
      capacity: 120,
      rules: '5 players per team + 1 sub. Bring your own peripherals.',
      customFields: JSON.stringify([
        { label: 'Riot ID / Game Tag', type: 'text', required: true }
      ]),
      status: 'APPROVED',
      pointsValue: 25,
    },
    {
      title: 'Guest Lecture: Quantum Computing & The Future of Encryption',
      category: 'Seminar',
      description: 'Distinguished lecture by Dr. Alan Turing Institute Fellow on post-quantum cryptography and lattice-based algorithms.',
      bannerUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
      startDate: days(3),
      endDate: days(3),
      venueId: createdVenues[3].id, // Conference Hall 1
      organizerId: organizerUser.id,
      capacity: 90,
      rules: 'Formal dress code recommended.',
      customFields: JSON.stringify([]),
      status: 'APPROVED',
      pointsValue: 15,
    },
    {
      title: 'Startup Pitchathon 2026: Angel Seed Funding',
      category: 'Hackathon',
      description: 'Pitch your startup idea to top VC investors and incubators. Top 3 teams win seed capital up to $10,000.',
      bannerUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800',
      startDate: days(15),
      endDate: days(15),
      venueId: createdVenues[7].id, // Incubation Hub
      organizerId: organizerUser.id,
      capacity: 40,
      rules: 'Pitch deck max 10 slides. 5 min pitch + 5 min Q&A.',
      customFields: JSON.stringify([
        { label: 'Startup Name', type: 'text', required: true },
        { label: 'Deck Link', type: 'text', required: true }
      ]),
      status: 'PENDING',
      pointsValue: 40,
    },
    {
      title: 'Photography & Short Film Expo',
      category: 'Cultural',
      description: 'Exhibition of campus talent in photography, documentary filmmaking, and drone cinematography.',
      bannerUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800',
      startDate: days(-20),
      endDate: days(-19),
      venueId: createdVenues[5].id, // Seminar Hall 202
      organizerId: organizerUser.id,
      capacity: 100,
      rules: 'High resolution prints must be submitted 2 days in advance.',
      customFields: JSON.stringify([]),
      status: 'COMPLETED',
      pointsValue: 15,
    },
    {
      title: 'AI Prompt Engineering Workshop',
      category: 'Workshop',
      description: 'Master LLM orchestration, RAG architectures, and fine-tuning using Gemini and OpenAI APIs.',
      bannerUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
      startDate: days(12),
      endDate: days(12),
      venueId: createdVenues[2].id, // Lab 301
      organizerId: organizerUser.id,
      capacity: 55,
      rules: 'Basic Python knowledge required.',
      customFields: JSON.stringify([]),
      status: 'APPROVED',
      pointsValue: 30,
    },
    {
      title: 'Cadence & SolidWorks CAD Design Challenge',
      category: 'Workshop',
      description: '3D modelling and circuit simulation contest for Mechanical and Electronics students.',
      bannerUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800',
      startDate: days(-5),
      endDate: days(-5),
      venueId: createdVenues[5].id, // Seminar Hall 202
      organizerId: organizerUser.id,
      capacity: 60,
      rules: 'Individual competition. Software provided on lab machines.',
      customFields: JSON.stringify([]),
      status: 'COMPLETED',
      pointsValue: 35,
    },
    {
      title: 'Green Tech & Renewable Energy Symposium',
      category: 'Seminar',
      description: 'Exploring solar innovations, battery storage, and carbon-neutral campus strategies.',
      bannerUrl: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=800',
      startDate: days(20),
      endDate: days(20),
      venueId: createdVenues[3].id, // Conference Hall 1
      organizerId: organizerUser.id,
      capacity: 100,
      rules: 'Open for all engineering streams.',
      customFields: JSON.stringify([]),
      status: 'DRAFT',
      pointsValue: 20,
    },
    {
      title: 'Badminton & Table Tennis Campus Open',
      category: 'Sports',
      description: 'Singles and Doubles tournament across undergraduate and postgraduate divisions.',
      bannerUrl: 'https://images.unsplash.com/photo-1521537634581-0dced2efa2a3?w=800',
      startDate: days(8),
      endDate: days(9),
      venueId: createdVenues[6].id, // Indoor Sports Complex
      organizerId: organizerUser.id,
      capacity: 150,
      rules: 'Non-marking shoes compulsory.',
      customFields: JSON.stringify([
        { label: 'Event Category', type: 'select', options: ['Badminton Singles', 'Badminton Doubles', 'Table Tennis'], required: true }
      ]),
      status: 'APPROVED',
      pointsValue: 25,
    },
  ];

  const createdEvents = [];
  for (const e of eventsData) {
    const ev = await prisma.event.create({ data: e });
    createdEvents.push(ev);
  }
  console.log(`✅ Created ${createdEvents.length} Events`);

  // 4. Generate 150+ Registrations across events
  let totalRegistrations = 0;

  for (let i = 0; i < createdEvents.length; i++) {
    const ev = createdEvents[i];
    // Assign 12-25 registrations per event
    const regCount = Math.min(ev.capacity + 5, 12 + (i * 3) % 15);

    for (let r = 0; r < regCount; r++) {
      const student = studentPool[r % studentPool.length];

      // Determine status: if over capacity, set WAITLIST, else CONFIRMED
      let status = 'CONFIRMED';
      if (r >= ev.capacity) {
        status = 'WAITLIST';
      } else if (r % 13 === 0) {
        status = 'CANCELLED';
      }

      // Check-in logic: for LIVE or COMPLETED events, check in 75% of confirmed attendees
      let checkedIn = false;
      let checkedInAt = null;
      if (status === 'CONFIRMED' && (ev.status === 'LIVE' || ev.status === 'COMPLETED')) {
        if (r % 4 !== 0) {
          checkedIn = true;
          checkedInAt = new Date(ev.startDate.getTime() + (r * 15 * 60 * 1000));
        }
      }

      const customResponses = ev.customFields
        ? JSON.stringify({
            'T-Shirt Size': ['M', 'L', 'S', 'XL'][r % 4],
            'GitHub Profile URL': `https://github.com/${student.name.replace(/\s+/g, '').toLowerCase()}`,
            'Participating In': 'Group Dance',
            'Riot ID': `${student.name.split(' ')[0]}#1234`,
          })
        : null;

      await prisma.registration.create({
        data: {
          eventId: ev.id,
          userId: student.id,
          registrationType: r % 5 === 0 ? 'TEAM' : 'INDIVIDUAL',
          teamName: r % 5 === 0 ? `CyberKnights Team ${r}` : null,
          customResponses,
          status,
          checkedIn,
          checkedInAt,
          qrTicketCode: `EF-${ev.id.substring(0, 4)}-${student.id.substring(0, 4)}-${r + 100}`,
          registeredAt: new Date(Date.now() - (r * 3 * 3600 * 1000)),
        },
      });

      totalRegistrations++;

      // If checked in, grant points
      if (checkedIn) {
        await prisma.points.create({
          data: {
            userId: student.id,
            eventId: ev.id,
            pointsEarned: ev.pointsValue,
            awardedAt: checkedInAt || new Date(),
          },
        });
      }
    }
  }

  console.log(`✅ Created ${totalRegistrations} Registrations & Points entries`);

  // 5. Create Announcements
  const announcementsData = [
    {
      eventId: createdEvents[0].id, // Hackathon
      authorId: organizerUser.id,
      title: '🚀 HackVerse 2026 Opening Ceremony & API Credentials',
      content: 'Welcome hackathon participants! Wifi SSID: SIMATS-HACKPASS (Pass: Hack2026!). Join the Discord server for technical assistance.',
      isPinned: true,
      isUrgent: true,
      targetAudience: 'PARTICIPANTS',
    },
    {
      eventId: createdEvents[0].id,
      authorId: organizerUser.id,
      title: 'Midnight Pizza & Energy Drinks Served at Central Lounge',
      content: 'Take a quick break from coding! Head over to the lounge area for hot pizza and Red Bull.',
      isPinned: false,
      isUrgent: false,
      targetAudience: 'PARTICIPANTS',
    },
    {
      eventId: null,
      authorId: adminUser.id,
      title: '📢 Campus Spring Festival Schedule Released',
      content: 'Check out all upcoming events for the month! Make sure to register early as venue seats fill up fast.',
      isPinned: true,
      isUrgent: false,
      targetAudience: 'ALL',
    },
    {
      eventId: createdEvents[1].id, // Cultural
      authorId: organizerUser.id,
      title: 'Stage Rehearsal Slots Open for Resonance Dance Teams',
      content: 'Teams registered for Group Dance can report to Open Amphitheatre tomorrow between 3 PM - 6 PM for sound checks.',
      isPinned: false,
      isUrgent: false,
      targetAudience: 'PARTICIPANTS',
    },
    {
      eventId: createdEvents[2].id, // React Workshop
      authorId: organizerUser.id,
      title: 'Pre-requisite Software Setup Guide Sent via Email',
      content: 'Please ensure Node.js v20+ and VS Code are installed before attending the React Masterclass.',
      isPinned: false,
      isUrgent: false,
      targetAudience: 'PARTICIPANTS',
    },
  ];

  for (const a of announcementsData) {
    await prisma.announcement.create({ data: a });
  }
  console.log(`✅ Created ${announcementsData.length} Announcements`);

  // 6. Create Volunteers & Volunteer Assignments
  const volunteerStudents = studentPool.slice(5, 12);
  const createdVolunteers = [];
  for (const vStud of volunteerStudents) {
    const vol = await prisma.volunteer.create({
      data: {
        userId: vStud.id,
        phone: `+91 98765 ${Math.floor(10000 + Math.random() * 90000)}`,
        skills: 'Stage Management, Crowd Control, Technical Support, Anchor',
        status: 'ACTIVE',
      },
    });
    createdVolunteers.push(vol);
  }

  // Assign volunteers to events
  for (let i = 0; i < createdEvents.length; i += 2) {
    const ev = createdEvents[i];
    for (let j = 0; j < 2; j++) {
      const vol = createdVolunteers[(i + j) % createdVolunteers.length];
      await prisma.volunteerAssignment.create({
        data: {
          volunteerId: vol.id,
          eventId: ev.id,
          role: j === 0 ? 'QR Check-in Manager' : 'Stage & Sound Tech',
          shiftStart: ev.startDate,
          shiftEnd: ev.endDate,
          status: 'CHECKED_IN',
        },
      });
    }
  }
  console.log(`✅ Created ${createdVolunteers.length} Volunteers & Assignments`);

  // 7. Tasks (Kanban Board)
  const taskTemplates = [
    { title: 'Finalize Sponsor Banners & Logos', status: 'DONE', priority: 'HIGH' },
    { title: 'Test Lab 301 Fiber Network & Power Outlets', status: 'DONE', priority: 'HIGH' },
    { title: 'Print QR Pass Scanner Badges', status: 'IN_PROGRESS', priority: 'MEDIUM' },
    { title: 'Order Certificates & Trophies', status: 'IN_PROGRESS', priority: 'HIGH' },
    { title: 'Send Reminder Email to Waitlisted Candidates', status: 'TODO', priority: 'LOW' },
    { title: 'Arrange Catering & Snack Boxes', status: 'TODO', priority: 'MEDIUM' },
  ];

  for (let i = 0; i < 4; i++) {
    const ev = createdEvents[i];
    for (const t of taskTemplates) {
      await prisma.task.create({
        data: {
          eventId: ev.id,
          title: t.title,
          description: `Action item for event: ${ev.title}`,
          status: t.status,
          priority: t.priority,
          assigneeId: studentPool[i % studentPool.length].id,
          deadline: new Date(ev.startDate.getTime() - 24 * 3600 * 1000),
        },
      });
    }
  }
  console.log(`✅ Created Tasks for Events`);

  // 8. Budget & Expenses
  for (let i = 0; i < 5; i++) {
    const ev = createdEvents[i];
    const expenses = [
      { title: 'Catering & Beverages', category: 'Catering', plannedAmount: 1500, actualAmount: 1420, notes: 'Paid snack boxes & drinks' },
      { title: 'PA Sound System & Lighting', category: 'Equipment', plannedAmount: 800, actualAmount: 850, notes: 'Extra microphone rental' },
      { title: 'Winner Cash Prizes & Trophies', category: 'Prizes', plannedAmount: 3000, actualAmount: 3000, notes: 'Cheques & engraved glass trophies' },
      { title: 'Social Media Ads & Printing', category: 'Marketing', plannedAmount: 400, actualAmount: 380, notes: 'Posters and Instagram promotions' },
    ];

    for (const ex of expenses) {
      await prisma.expense.create({
        data: {
          eventId: ev.id,
          ...ex,
        },
      });
    }
  }
  console.log(`✅ Created Expenses & Budget Data`);

  // 9. Feedback
  for (let i = 0; i < 3; i++) {
    const ev = createdEvents[i + 3]; // Completed events
    for (let f = 0; f < 8; f++) {
      const student = studentPool[f + 1];
      await prisma.feedback.create({
        data: {
          eventId: ev.id,
          userId: student.id,
          rating: 4 + (f % 2),
          comment: f % 2 === 0 ? 'Amazing event! Highly organized and great speakers.' : 'Enjoyed the hands-on session. Would love more time for Q&A.',
        },
      });
    }
  }
  console.log(`✅ Created Feedback entries`);

  console.log('🎉 Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error Seeding Database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
