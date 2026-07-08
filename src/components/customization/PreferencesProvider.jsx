const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const DEFAULT_PREFS = {
  display_name: 'Ryan',
  theme_mode: 'dark',
  font_size: 16,
  font_color: '#ffffff',
  accent_color: 'teal',
};

const ACCENT_THEMES = {
  teal: { from: '#14b8a6', to: '#10b981', fromClass: 'from-teal-500', toClass: 'to-emerald-500', fromRgb: '20,184,166', toRgb: '16,185,129' },
  blue: { from: '#3b82f6', to: '#06b6d4', fromClass: 'from-blue-500', toClass: 'to-cyan-500', fromRgb: '59,130,246', toRgb: '6,182,212' },
  purple: { from: '#8b5cf6', to: '#a855f7', fromClass: 'from-purple-500', toClass: 'to-fuchsia-500', fromRgb: '139,92,246', toRgb: '168,85,247' },
  orange: { from: '#f97316', to: '#f59e0b', fromClass: 'from-orange-500', toClass: 'to-amber-500', fromRgb: '249,115,22', toRgb: '245,158,11' },
  pink: { from: '#ec4899', to: '#f43f5e', fromClass: 'from-pink-500', toClass: 'to-rose-500', fromRgb: '236,72,153', toRgb: '244,63,94' },
  indigo: { from: '#6366f1', to: '#8b5cf6', fromClass: 'from-indigo-500', toClass: 'to-purple-500', fromRgb: '99,102,241', toRgb: '139,92,246' },
};

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const queryClient = useQueryClient();
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  const { data: prefRecords = [] } = useQuery({
    queryKey: ['user-preferences'],
    queryFn: () => db.entities.UserPreference.list(),
  });

  const prefRecord = prefRecords[0];

  useEffect(() => {
    if (prefRecord) {
      setPrefs({
        display_name: prefRecord.display_name || DEFAULT_PREFS.display_name,
        theme_mode: prefRecord.theme_mode || DEFAULT_PREFS.theme_mode,
        font_size: prefRecord.font_size || DEFAULT_PREFS.font_size,
        font_color: prefRecord.font_color || DEFAULT_PREFS.font_color,
        accent_color: prefRecord.accent_color || DEFAULT_PREFS.accent_color,
      });
    }
  }, [prefRecord]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    // Theme mode
    if (prefs.theme_mode === 'light') {
      root.classList.add('theme-light');
      root.classList.remove('theme-dark');
    } else {
      root.classList.add('theme-dark');
      root.classList.remove('theme-light');
    }

    // Font size
    root.style.fontSize = `${prefs.font_size}px`;

    // Font color - only override if not default white
    if (prefs.font_color && prefs.font_color !== '#ffffff') {
      root.classList.add('custom-text-color');
      root.style.setProperty('--user-text-color', prefs.font_color);
    } else {
      root.classList.remove('custom-text-color');
      root.style.removeProperty('--user-text-color');
    }

    // Accent color
    const accent = ACCENT_THEMES[prefs.accent_color] || ACCENT_THEMES.teal;
    root.style.setProperty('--user-accent-from', accent.from);
    root.style.setProperty('--user-accent-to', accent.to);
    root.style.setProperty('--user-accent-from-rgb', accent.fromRgb);
    root.style.setProperty('--user-accent-to-rgb', accent.toRgb);

    if (prefs.accent_color !== 'teal') {
      root.classList.add('custom-accent');
    } else {
      root.classList.remove('custom-accent');
    }
  }, [prefs]);

  const updateMutation = useMutation({
    mutationFn: async (newPrefs) => {
      if (prefRecord) {
        return db.entities.UserPreference.update(prefRecord.id, newPrefs);
      } else {
        return db.entities.UserPreference.create(newPrefs);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
    },
  });

  const updatePrefs = useCallback((newPrefs) => {
    setPrefs(prev => ({ ...prev, ...newPrefs }));
    updateMutation.mutate(newPrefs);
  }, [updateMutation]);

  return (
    <PreferencesContext.Provider value={{ prefs, updatePrefs, accentThemes: ACCENT_THEMES }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) return { prefs: DEFAULT_PREFS, updatePrefs: () => {}, accentThemes: ACCENT_THEMES };
  return ctx;
}