import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, RefreshCw, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { syncGoogleCalendar, getGoogleAuthUrl } from '@/lib/google-calendar';
import { useToast } from '@/components/ui/use-toast';

export default function GoogleCalendarSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const { toast } = useToast();

  // Check if we're returning from Google OAuth
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (code) {
      // We have an auth code – exchange it for an access token
      handleAuthCode(code);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (error) {
      toast({
        title: 'Google Auth Error',
        description: 'Authentication was cancelled or failed.',
        variant: 'destructive',
      });
    }
  }, []);

  const handleAuthCode = async (code) => {
    setIsSyncing(true);
    try {
      // Exchange code for access token using your backend
      const response = await fetch('/api/auth/google/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get access token');
      }

      // Now sync calendar events
      const result = await syncGoogleCalendar(data.access_token);
      setSyncResult(result);
      
      toast({
        title: result.success ? '✅ Sync Complete!' : '❌ Sync Failed',
        description: result.success 
          ? `Imported ${result.imported} new events from Google Calendar.` 
          : result.error,
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
      setSyncResult({ success: false, error: error.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSync = () => {
    const authUrl = getGoogleAuthUrl();
    // Open in new window or redirect
    window.open(authUrl, '_blank', 'width=500,height=600');
    // Or use window.location.href to redirect
    // window.location.href = authUrl;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-5 mb-4"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20">
              <CalendarIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Google Calendar Sync</h3>
              <p className="text-xs text-slate-400">Import events from Google Calendar</p>
            </div>
          </div>
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            size="sm"
            className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600"
          >
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4 mr-2" />
            )}
            {isSyncing ? 'Syncing...' : 'Sync Google Calendar'}
          </Button>
        </div>

        {syncResult && (
          <div className={`p-3 rounded-lg text-sm ${
            syncResult.success 
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' 
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
          }`}>
            {syncResult.success ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>Imported {syncResult.imported} new events from Google Calendar.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Error: {syncResult.error}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}