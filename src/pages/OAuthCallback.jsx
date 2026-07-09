import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { syncGoogleCalendar } from '@/lib/google-calendar';
import { db } from '@/lib/query-client'; // import db

export default function OAuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      toast({
        title: 'Google Auth Error',
        description: 'Authentication was cancelled or failed.',
        variant: 'destructive',
      });
      navigate('/calendar');
      return;
    }

    if (code) {
      fetch('/api/auth/google/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
        .then(res => res.json())
        .then(async data => {
          if (data.error) throw new Error(data.error);
          const result = await syncGoogleCalendar(data.access_token);
          
          // Debug: Log saved events
          const savedEvents = await db.entities.CalendarEvent.list('-date');
          console.log('Saved events count:', savedEvents.length);
          console.log('First 3 events:', savedEvents.slice(0, 3));
          
          toast({
            title: result.success ? '✅ Sync Complete!' : '❌ Sync Failed',
            description: result.success 
              ? `Imported ${result.imported} new events from Google Calendar.` 
              : result.error,
            variant: result.success ? 'default' : 'destructive',
          });
        })
        .catch(err => {
          toast({
            title: 'Error',
            description: err.message || 'Something went wrong.',
            variant: 'destructive',
          });
        })
        .finally(() => {
          navigate('/calendar');
        });
    } else {
      navigate('/calendar');
    }
  }, [navigate, toast]);

  return <div className="flex items-center justify-center min-h-screen text-white">Processing Google Calendar sync...</div>;
}