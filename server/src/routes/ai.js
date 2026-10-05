const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const prisma = require('../prisma');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Fallback intelligent query parser if Gemini API key is omitted/invalid
function smartFallbackResponse(userPrompt, dbContext) {
  const promptLower = userPrompt.toLowerCase();

  if (promptLower.includes('hackathon') || promptLower.includes('coding') || promptLower.includes('hackverse')) {
    const event = dbContext.events.find(e => e.title.toLowerCase().includes('hackathon') || e.title.toLowerCase().includes('hackverse'));
    if (event) {
      return `The **${event.title}** is located at **${event.venue}** (${event.building}). Capacity is ${event.capacity} with ${event.confirmedCount} confirmed registrations. Spots left: ${event.spotsLeft}. Status: ${event.status}.`;
    }
  }

  if (promptLower.includes('seat') || promptLower.includes('spot') || promptLower.includes('left') || promptLower.includes('available')) {
    const list = dbContext.events.map(e => `• **${e.title}**: ${e.spotsLeft} seats remaining (at ${e.venue})`).join('\n');
    return `Here is the current seat availability across upcoming events:\n\n${list}`;
  }

  if (promptLower.includes('where') || promptLower.includes('venue') || promptLower.includes('location')) {
    const list = dbContext.events.map(e => `• **${e.title}**: ${e.venue} (${e.building})`).join('\n');
    return `Here are event locations:\n\n${list}`;
  }

  if (promptLower.includes('draft') || promptLower.includes('announcement')) {
    return `📢 **Draft Announcement:**\n\n**Subject:** Important Event Update\n\nDear Participants,\n\nPlease take note of the upcoming schedule and venue guidelines for your registered event. Ensure you have your downloadable QR ticket ready on your mobile device for rapid check-in at the entrance.\n\nBest regards,\nEventFlow Coordination Team`;
  }

  return `EventFlow system has ${dbContext.events.length} active events and ${dbContext.venues.length} venues on campus. Top events include "${dbContext.events[0]?.title || 'HackVerse'}" with ${dbContext.events[0]?.confirmedCount || 0} registered students. How else can I assist you with event coordination?`;
}

router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required.' });
    }

    // Fetch live database context
    const events = await prisma.event.findMany({
      include: {
        venue: true,
        _count: { select: { registrations: { where: { status: 'CONFIRMED' } } } },
      },
      take: 15,
    });

    const venues = await prisma.venue.findMany({ select: { name: true, building: true, capacity: true } });

    const formattedEvents = events.map(e => {
      const confirmedCount = e._count.registrations;
      return {
        id: e.id,
        title: e.title,
        category: e.category,
        status: e.status,
        venue: e.venue.name,
        building: e.venue.building,
        startDate: e.startDate.toISOString(),
        endDate: e.endDate.toISOString(),
        capacity: e.capacity,
        confirmedCount,
        spotsLeft: Math.max(0, e.capacity - confirmedCount),
      };
    });

    const dbContext = { events: formattedEvents, venues };

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim() === '') {
      const reply = smartFallbackResponse(prompt, dbContext);
      return res.json({ response: reply, isFallback: true });
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      let text = '';
      
      const systemInstruction = `You are "Ask EventFlow", an intelligent college event AI assistant for the EventFlow platform. 
User Role: ${req.user.role} (${req.user.name}, Department: ${req.user.department}).
Current Live Database Context:
${JSON.stringify(dbContext, null, 2)}

Instructions:
1. Answer the user's question accurately using ONLY the live database context provided above.
2. If asked about event locations, dates, remaining seats, or statistics, give precise numbers and clear answers.
3. If an organizer requests an announcement draft, generate a professional, formatted announcement ready to post.
4. Keep responses friendly, concise, and beautifully formatted in GitHub Markdown.`;

      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(`${systemInstruction}\n\nUser Question: ${prompt}`);
        text = result.response.text();
      } catch (mErr) {
        console.warn('gemini-1.5-flash error, trying gemini-flash-latest:', mErr.message);
        try {
          const model2 = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
          const result2 = await model2.generateContent(`${systemInstruction}\n\nUser Question: ${prompt}`);
          text = result2.response.text();
        } catch (mErr2) {
          console.warn('gemini-flash-latest error, trying gemini-3.8-flash:', mErr2.message);
          try {
            const model3 = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
            const result3 = await model3.generateContent(`${systemInstruction}\n\nUser Question: ${prompt}`);
            text = result3.response.text();
          } catch (mErr3) {
            console.warn('gemini-3.8-flash error, falling back to smart parser:', mErr3.message);
          }
        }
      }

      const reply = text || smartFallbackResponse(prompt, dbContext);
      return res.json({ response: reply, isFallback: !text });
    } catch (geminiError) {
      console.warn('Gemini API call error (falling back to smart DB parser):', geminiError.message);
      const reply = smartFallbackResponse(prompt, dbContext);
      return res.json({ response: reply, isFallback: true });
    }
  } catch (error) {
    console.error('AI chat endpoint error:', error);
    res.status(500).json({ message: 'Error processing AI response.' });
  }
});

// POST AI Assistant: Auto-generate Event Description & Rules
router.post('/generate-event-details', authenticateToken, async (req, res) => {
  try {
    const { title, category } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Event title is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim() !== '') {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const prompt = `You are a college event planner. For an upcoming event with Title: "${title}" and Category: "${category || 'General'}", produce a JSON object with:
1. "description": An engaging 2-sentence description of the event.
2. "rules": 2 concise participation rules or guidelines.
3. "pointsValue": Recommended student participation points (number between 10 and 50).
Return ONLY the raw JSON object without markdown fences.`;

        let result;
        try {
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
          result = await model.generateContent(prompt);
        } catch (mErr) {
          const fallbackModel = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
          result = await fallbackModel.generateContent(prompt);
        }
        let rawText = result.response.text().trim();
        if (rawText.startsWith('```json')) rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        if (rawText.startsWith('```')) rawText = rawText.replace(/^```\s*/, '').replace(/\s*```$/, '');

        const parsed = JSON.parse(rawText);
        return res.json(parsed);
      } catch (err) {
        console.warn('AI generate event details fallback:', err.message);
      }
    }

    // Intelligent fallback
    res.json({
      description: `Join us for ${title}! An immersive ${category || 'campus'} event designed to bring together passionate students, showcase innovative projects, and foster campus collaboration.`,
      rules: `1. Valid College ID is mandatory for admission.\n2. Participants must register in advance and abide by campus code of conduct.`,
      pointsValue: category === 'Hackathon' ? 40 : category === 'Workshop' ? 25 : 15,
    });
  } catch (error) {
    console.error('Error generating event details:', error);
    res.status(500).json({ message: 'Failed to generate event details.' });
  }
});

module.exports = router;
