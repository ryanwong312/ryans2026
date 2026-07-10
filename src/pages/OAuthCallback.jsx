import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { syncGoogleCalendar, getUserInfo } from '@/lib/google-calendar';
import { ALLOWED_EMAILS } from '@/config/allowedEmails';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const state = urlParams.get('state') || 'sync';

    if (error) {
      toast({
        title: 'Google Auth Error',
        description: 'Authentication was cancelled or failed.',
        variant: 'destructive',
      });
      navigate(state === 'login' ? '/login' : '/calendar');
      return;
    }

    if (!code) {
      navigate(state === 'login' ? '/login' : '/calendar');
      return;
    }

    fetch('/api/auth/google/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(res => res.json())
      .then(async data => {
        if (data.error) throw new Error(data.error);
        const { access_token, refresh_token, expires_in } = data;

        if (state === 'login') {
          const userInfo = await getUserInfo(access_token);
          const email = userInfo.email;
          if (!email) throw new Error('No email returned from Google');

          if (!ALLOWED_EMAILS.includes(email)) {
            toast({
              title: 'Access Denied',
              description: `Your email (${email}) is not authorized.`,
              variant: 'destructive',
            });
            navigate('/login');
            return;
          }

          localStorage.setItem('auth_user', JSON.stringify({
            email,
            name: userInfo.name,
            picture: userInfo.picture,
            access_token,
            refresh_token,
            expires_at: Date.now() + expires_in * 1000,
          }));

          toast({
            title: '✅ Welcome!',
            description: `Signed in as ${email}.`,
          });
          navigate('/');
          return;
        }

        // Calendar sync flow
        const result = await syncGoogleCalendar(access_token);
        toast({
          title: result.success ? '✅ Sync Complete!' : '❌ Sync Failed',
          description: result.success 
            ? `Imported ${result.imported} new, updated ${result.updated}, skipped ${result.skipped} events.` 
            : result.error,
          variant: result.success ? 'default' : 'destructive',
        });
        navigate('/calendar');
      })
      .catch(err => {
        toast({
          title: 'Error',
          description: err.message || 'Something went wrong.',
          variant: 'destructive',
        });
        navigate(state === 'login' ? '/login' : '/calendar');
      });
  }, [navigate, toast]);

  return <div className="flex items-center justify-center min-h-screen text-white">Processing...</div>;
}