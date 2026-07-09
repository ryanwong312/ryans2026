import { createClient } from '@base44/sdk';

// This function will be called from your frontend
export async function syncGoogleCalendar(accessToken, calendarId = 'primary') {
  try {
    // Set date range: from 6 months ago to 12 months in the future
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    const twelveMonthsAhead = new Date(now);
    twelveMonthsAhead.setMonth(now.getMonth() + 12);

    const timeMin = sixMonthsAgo.toISOString();
    const timeMax = twelveMonthsAhead.toISOString();

    let allEvents = [];
    let nextPageToken = null;
    let pageCount = 0;

    do {
      // Build URL with pagination token
      let url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?` +
        `maxResults=250&` +
        `orderBy=startTime&` +
        `singleEvents=true&` +
        `timeMin=${encodeURIComponent(timeMin)}&` +
        `timeMax=${encodeURIComponent(timeMax)}`;

      if (nextPageToken) {
        url += `&pageToken=${encodeURIComponent(nextPageToken)}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch Google Calendar events');
      }

      const data = await response.json();
      const items = data.items || [];
      allEvents = allEvents.concat(items);
      nextPageToken = data.nextPageToken || null;
      pageCount++;

      // Safety: limit to 10 pages (2500 events) to avoid infinite loops
      if (pageCount > 10) break;

    } while (nextPageToken);

    // 2. Convert Google events to your app's format
    const convertedEvents = allEvents.map(event => {
      // Determine if it's an all-day event (no dateTime)
      const start = event.start;
      const end = event.end;
      const isAllDay = !!start?.date; // if date field exists, it's all-day

      let date, startTime, endTime;

      if (isAllDay) {
        // All-day events: use the date as-is (YYYY-MM-DD)
        date = start.date;
        startTime = '';
        endTime = '';
      } else {
        // Timed events: extract date and time
        const startDateTime = new Date(start.dateTime);
        const endDateTime = new Date(end.dateTime);
        date = startDateTime.toISOString().split('T')[0];
        startTime = startDateTime.toTimeString().slice(0, 5);
        endTime = endDateTime.toTimeString().slice(0, 5);
      }

      return {
        title: event.summary || 'Untitled Event',
        date: date,
        start_time: startTime,
        end_time: endTime,
        all_day: isAllDay,
        description: event.description || '',
        location: event.location || '',
        status: event.status === 'cancelled' ? 'cancelled' : 'confirmed',
        category: 'personal', // default; you can add logic to map categories
        tags: ['google-sync'],
        google_event_id: event.id,
      };
    });

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

    return { success: true, imported, total: allEvents.length };
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