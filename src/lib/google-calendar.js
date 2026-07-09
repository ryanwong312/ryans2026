import { createClient } from '@base44/sdk';

// This function will be called from your frontend
export async function syncGoogleCalendar(accessToken, calendarId = 'primary') {
  try {
    // 1. Fetch events from Google Calendar
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?maxResults=50&orderBy=startTime&singleEvents=true`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch Google Calendar events');
    }

    const data = await response.json();
    const events = data.items || [];

    // 2. Convert Google events to your app's format
    const convertedEvents = events.map(event => ({
      title: event.summary || 'Untitled Event',
      date: event.start?.date || event.start?.dateTime?.split('T')[0] || new Date().toISOString().split('T')[0],
      start_time: event.start?.dateTime ? new Date(event.start.dateTime).toTimeString().slice(0, 5) : '',
      end_time: event.end?.dateTime ? new Date(event.end.dateTime).toTimeString().slice(0, 5) : '',
      all_day: !event.start?.dateTime,
      description: event.description || '',
      location: event.location || '',
      status: 'confirmed',
      category: 'personal',
      tags: ['google-sync'],
      google_event_id: event.id,
    }));

    // 3. Save to your Base44 app
    const db = createClient({
      appId: import.meta.env.VITE_BASE44_APP_ID,
      headers: { api_key: import.meta.env.VITE_BASE44_API_KEY },
    });

    let imported = 0;
    for (const ev of convertedEvents) {
      // Check if already exists (by google_event_id)
      const existing = await db.entities.CalendarEvent.filter({ google_event_id: ev.google_event_id });
      if (existing.length === 0) {
        await db.entities.CalendarEvent.create(ev);
        imported++;
      }
    }

    return { success: true, imported, total: events.length };
  } catch (error) {
    console.error('Google Calendar sync error:', error);
    return { success: false, error: error.message };
  }
}

// OAuth helper: get the auth URL
export function getGoogleAuthUrl() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/api/auth/google/callback`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    access_type: 'offline',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}