import Event from '../models/Event.js';
import asyncHandler from '../utils/asyncHandler.js';

const buildContextSummary = (events = []) => {
  if (!events.length) {
    return 'No upcoming events found.';
  }

  return events
    .slice(0, 8)
    .map((event, index) => {
      const dateLabel = new Date(event.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const cityLabel = event?.address?.city || event.location;
      return `${index + 1}. ${event.title} (${dateLabel}) at ${cityLabel}`;
    })
    .join('\n');
};

const fallbackAssistantReply = ({ message, role, events, userName }) => {
  const lower = message.toLowerCase();
  const upcoming = events.slice(0, 4);

  if (lower.includes('upcoming') || lower.includes('next event')) {
    if (!upcoming.length) {
      return 'There are no upcoming events available right now. Please check again soon.';
    }

    return `Here are upcoming events:\n${upcoming
      .map((event) => `• ${event.title} on ${new Date(event.date).toLocaleDateString()} at ${event.location}`)
      .join('\n')}`;
  }

  if (lower.includes('location') || lower.includes('where')) {
    if (!upcoming.length) {
      return 'No event location data is available at the moment.';
    }

    return `Current event locations:\n${upcoming
      .map((event) => `• ${event.title}: ${event.location}`)
      .join('\n')}`;
  }

  if (lower.includes('status') || lower.includes('approval') || lower.includes('apply')) {
    return role === 'organizer'
      ? 'Volunteers apply with personal details, then you can approve, reject, or remove requests from your dashboard or notifications.'
      : 'After you apply, your request shows as Pending. Organizers can approve or reject it, and your dashboard updates in real time.';
  }

  if (lower.includes('contact') || lower.includes('organizer')) {
    if (!upcoming.length) {
      return 'Organizer contact details are shown inside each event details page when available.';
    }

    return `Open any event card and go to Event Details to view organizer information and contact context.`;
  }

  return `Hi ${userName || 'there'}! I can help with upcoming events, locations, application status, and dashboard guidance. Ask me things like “What are upcoming events?” or “How does approval work?”`;
};

export const chatWithAssistant = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Message is required'
    });
  }

  const role = req.user?.role || 'guest';
  const userName = req.user?.name || 'User';

  const upcomingEvents = await Event.find({ approved: true, status: 'upcoming', date: { $gte: new Date() } })
    .sort('date')
    .limit(8)
    .populate('organizer', 'name email');

  const contextSummary = buildContextSummary(upcomingEvents);
  const openAiApiKey = process.env.OPENAI_API_KEY;

  if (openAiApiKey) {
    try {
      const systemPrompt = `You are a polite assistant for a Community Service platform. User role: ${role}.\nUse the provided event context to answer clearly and briefly.\nIf unknown, state that politely.\n\nEvent context:\n${contextSummary}`;

      const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiApiKey}`
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature: 0.4,
          max_tokens: 300,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ]
        })
      });

      if (openAiResponse.ok) {
        const payload = await openAiResponse.json();
        const answer = payload?.choices?.[0]?.message?.content?.trim();

        if (answer) {
          return res.status(200).json({
            success: true,
            reply: answer,
            source: 'openai'
          });
        }
      }
    } catch (error) {
      console.error('OpenAI chat fallback triggered:', error.message);
    }
  }

  const reply = fallbackAssistantReply({
    message,
    role,
    events: upcomingEvents,
    userName
  });

  res.status(200).json({
    success: true,
    reply,
    source: 'local'
  });
});
