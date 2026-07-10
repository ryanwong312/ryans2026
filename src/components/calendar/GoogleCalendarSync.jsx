import React, { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getGoogleAuthUrl } from '@/lib/google-calendar';

export default function GoogleCalendarSync({ className }) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = () => {
    const authUrl = getGoogleAuthUrl('sync'); // explicitly pass 'sync'
    window.location.href = authUrl;
  };

  return (
    <Button
      onClick={handleSync}
      disabled={isSyncing}
      variant="outline"
      size="sm"
      className={`gap-2 ${className || ''}`}
    >
      <CalendarIcon className="w-4 h-4" />
      Sync Google Calendar
    </Button>
  );
}