import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { syncGoogleCalendar, getUserInfo } from '@/lib/google-calendar';

const ALLOWED_EMAILS = [
  'wongryan312@gmail.com',
  'wongryanhk@gmail.com',
  'thenewryanwong@gmail.com',
  // add your school email if you want to allow it to log in
  '3217009@student.isf.edu.hk',
];

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

        // Always get user info to know the email
        const userInfo = await getUserInfo(access_token);
        const email = userInfo.email;
        if (!email) throw new Error('No email returned from Google');

        if (state === 'login') {
          // Login flow – verify allowed
          if (!ALLOWED_EMAILS.includes(email)) {
            toast({
              title: 'Access Denied',
              description: `Your email (${email}) is not authorized.`,
              variant: 'destructive',
            });
            navigate('/login');
            return;
          }

          // Store main auth user
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

        // Sync flow – store this token for the specific email
        const syncTokens = JSON.parse(localStorage.getItem('sync_tokens') || '{}');
        syncTokens[email] = {
          access_token,
          refresh_token,
          expires_at: Date.now() + expires_in * 1000,
          email,
          name: userInfo.name,
        };
        localStorage.setItem('sync_tokens', JSON.stringify(syncTokens));

        // Now sync this account's calendar
        const result = await syncGoogleCalendar(access_token, email);
        toast({
          title: result.success ? `✅ Synced ${email}` : `❌ Sync failed for ${email}`,
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