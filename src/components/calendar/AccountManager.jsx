import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getGoogleAuthUrl } from '@/lib/google-calendar';
import { X } from 'lucide-react';

export default function AccountManager({ onAccountsChange }) {
  const [tokens, setTokens] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sync_tokens') || '{}');
    } catch { return {}; }
  });

  const accounts = Object.values(tokens);

  const handleAddAccount = () => {
    const authUrl = getGoogleAuthUrl('sync');
    window.location.href = authUrl;
  };

  const handleRemoveAccount = (email) => {
    if (confirm(`Remove ${email} from sync?`)) {
      const newTokens = { ...tokens };
      delete newTokens[email];
      localStorage.setItem('sync_tokens', JSON.stringify(newTokens));
      setTokens(newTokens);
      if (onAccountsChange) onAccountsChange(newTokens);
    }
  };

  return (
    <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-400">Connected Accounts</h3>
        <Button onClick={handleAddAccount} variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-800">
          + Add Account
        </Button>
      </div>
      {accounts.length === 0 ? (
        <p className="text-sm text-slate-500">No accounts connected. Add one to sync.</p>
      ) : (
        <div className="space-y-2">
          {accounts.map(acc => (
            <div key={acc.email} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                  {acc.email.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-white truncate">{acc.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400">✓ Active</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-rose-400"
                  onClick={() => handleRemoveAccount(acc.email)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}