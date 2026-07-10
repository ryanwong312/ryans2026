import { createClient } from '@base44/sdk';

export async function syncGoogleCalendar(accessToken, email, calendarId = 'primary') {
  try {
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
      if (pageCount > 10) break;
    } while (nextPageToken);

    const convertedEvents = allEvents.map(event => {
      const start = event.start;
      const end = event.end;
      const isAllDay = !!start?.date;

      let date, startTime, endTime;

      if (isAllDay) {
        date = start.date;
        startTime = '';
        endTime = '';
      } else {
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
        category: 'personal',
        tags: ['google-sync'],
        google_event_id: event.id,
        synced_by: email, // store the email that synced this event
      };
    });

    const db = createClient({
      appId: import.meta.env.VITE_BASE44_APP_ID,
      headers: { api_key: import.meta.env.VITE_BASE44_API_KEY },
    });

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const ev of convertedEvents) {
      let existing = await db.entities.CalendarEvent.filter({ google_event_id: ev.google_event_id });

      if (existing.length === 0) {
        const possibleDuplicates = await db.entities.CalendarEvent.filter({
          title: ev.title,
          date: ev.date,
          start_time: ev.start_time,
          all_day: ev.all_day,
        });
        if (possibleDuplicates.length > 0) {
          const dup = possibleDuplicates[0];
          await db.entities.CalendarEvent.update(dup.id, {
            google_event_id: ev.google_event_id,
            description: ev.description,
            location: ev.location,
            status: ev.status,
            end_time: ev.end_time,
            tags: ev.tags,
            synced_by: ev.synced_by,
          });
          updated++;
          continue;
        }
      }

      if (existing.length > 0) {
        const existingEvent = existing[0];
        let needsUpdate = false;
        if (existingEvent.title !== ev.title) { existingEvent.title = ev.title; needsUpdate = true; }
        if (existingEvent.description !== ev.description) { existingEvent.description = ev.description; needsUpdate = true; }
        if (existingEvent.location !== ev.location) { existingEvent.location = ev.location; needsUpdate = true; }
        if (existingEvent.status !== ev.status) { existingEvent.status = ev.status; needsUpdate = true; }
        if (existingEvent.end_time !== ev.end_time) { existingEvent.end_time = ev.end_time; needsUpdate = true; }
        if (existingEvent.synced_by !== ev.synced_by) { existingEvent.synced_by = ev.synced_by; needsUpdate = true; }

        if (needsUpdate) {
          await db.entities.CalendarEvent.update(existingEvent.id, {
            title: ev.title,
            description: ev.description,
            location: ev.location,
            status: ev.status,
            end_time: ev.end_time,
            tags: ev.tags,
            synced_by: ev.synced_by,
          });
          updated++;
        } else {
          skipped++;
        }
      } else {
        await db.entities.CalendarEvent.create(ev);
        imported++;
      }
    }

    return { success: true, imported, updated, skipped, total: allEvents.length, email };
  } catch (error) {
    console.error('Google Calendar sync error:', error);
    return { success: false, error: error.message, email };
  }
}

export async function getUserInfo(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error('Failed to get user info');
  }
  return response.json();
}

export function getGoogleAuthUrl(state = 'sync') {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/api/auth/google/callback`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.readonly email profile',
    access_type: 'offline',
    prompt: 'consent',
    state: state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}