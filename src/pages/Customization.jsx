import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Palette, Type, Sun, Moon, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePreferences } from '@/components/customization/PreferencesProvider';

const ACCENT_OPTIONS = [
  { value: 'teal', label: 'Teal', from: '#14b8a6', to: '#10b981' },
  { value: 'blue', label: 'Blue', from: '#3b82f6', to: '#06b6d4' },
  { value: 'purple', label: 'Purple', from: '#8b5cf6', to: '#a855f7' },
  { value: 'orange', label: 'Orange', from: '#f97316', to: '#f59e0b' },
  { value: 'pink', label: 'Pink', from: '#ec4899', to: '#f43f5e' },
  { value: 'indigo', label: 'Indigo', from: '#6366f1', to: '#8b5cf6' },
];

const FONT_SIZE_OPTIONS = [
  { value: 14, label: 'Small' },
  { value: 16, label: 'Medium (Default)' },
  { value: 18, label: 'Large' },
  { value: 20, label: 'Extra Large' },
];

const FONT_COLOR_OPTIONS = [
  { value: '#ffffff', label: 'White (Default)' },
  { value: '#e2e8f0', label: 'Slate' },
  { value: '#fef3c7', label: 'Cream' },
  { value: '#ddd6fe', label: 'Lavender' },
  { value: '#a7f3d0', label: 'Mint' },
  { value: '#fbcfe8', label: 'Rose' },
];

export default function Customization() {
  const { prefs, updatePrefs } = usePreferences();
  const [localName, setLocalName] = useState(prefs.display_name);

  const handleReset = () => {
    if (confirm('Reset all customization to defaults?')) {
      updatePrefs({
        display_name: 'Ryan',
        theme_mode: 'dark',
        font_size: 16,
        font_color: '#ffffff',
        accent_color: 'teal',
      });
      setLocalName('Ryan');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Settings className="w-8 h-8 text-teal-400" />
              Customization
            </h1>
            <p className="text-slate-400">Personalize your Life OS experience</p>
          </div>
          <Button
            onClick={handleReset}
            variant="outline"
            className="border-slate-600 gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </Button>
        </div>

        {/* Name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-6"
        >
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-teal-400" />
            Your Name
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            This name appears in greetings throughout the app (e.g., "Good Evening, {prefs.display_name}")
          </p>
          <div className="flex gap-2">
            <Input
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="Enter your name"
              className="bg-slate-900/50 border-slate-700 text-white flex-1"
            />
            <Button
              onClick={() => updatePrefs({ display_name: localName.trim() || 'Ryan' })}
              className="bg-gradient-to-r from-teal-500 to-emerald-500 gap-2"
              disabled={localName === prefs.display_name}
            >
              <Check className="w-4 h-4" />
              Save
            </Button>
          </div>
        </motion.div>

        {/* Theme Mode */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-6"
        >
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Sun className="w-5 h-5 text-amber-400" />
            Theme Mode
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => updatePrefs({ theme_mode: 'dark' })}
              className={`rounded-xl border p-6 text-center transition-all ${
                prefs.theme_mode === 'dark'
                  ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-teal-500 ring-2 ring-teal-500/30'
                  : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
              }`}
            >
              <Moon className="w-8 h-8 mx-auto mb-2 text-indigo-400" />
              <span className="text-white font-medium">Dark Mode</span>
              <p className="text-xs text-slate-500 mt-1">Default theme</p>
            </button>
            <button
              onClick={() => updatePrefs({ theme_mode: 'light' })}
              className={`rounded-xl border p-6 text-center transition-all ${
                prefs.theme_mode === 'light'
                  ? 'bg-gradient-to-br from-slate-100 to-slate-200 border-teal-500 ring-2 ring-teal-500/30'
                  : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
              }`}
            >
              <Sun className="w-8 h-8 mx-auto mb-2 text-amber-400" />
              <span className="text-white font-medium">Light Mode</span>
              <p className="text-xs text-slate-500 mt-1">Brighter interface</p>
            </button>
          </div>
        </motion.div>

        {/* Accent Color */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-6"
        >
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-purple-400" />
            Accent Color
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Changes the gradient accents used across buttons and highlights
          </p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {ACCENT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => updatePrefs({ accent_color: opt.value })}
                className={`rounded-xl border p-4 text-center transition-all ${
                  prefs.accent_color === opt.value
                    ? 'border-white ring-2 ring-white/30 scale-105'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-full mx-auto mb-2"
                  style={{ background: `linear-gradient(135deg, ${opt.from}, ${opt.to})` }}
                />
                <span className="text-xs text-slate-300">{opt.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Font Size */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-6"
        >
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Type className="w-5 h-5 text-blue-400" />
            Font Size
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {FONT_SIZE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => updatePrefs({ font_size: opt.value })}
                className={`rounded-xl border p-4 text-center transition-all ${
                  prefs.font_size === opt.value
                    ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                    : 'bg-slate-900/50 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                <span style={{ fontSize: `${opt.value}px` }} className="font-medium">Aa</span>
                <p className="text-xs mt-1">{opt.label}</p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Font Color */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-6"
        >
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Type className="w-5 h-5 text-emerald-400" />
            Font Color
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Override the primary text color (best with dark mode)
          </p>
          <div className="flex flex-wrap gap-3 mb-4">
            {FONT_COLOR_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => updatePrefs({ font_color: opt.value })}
                className={`rounded-lg border px-4 py-3 text-center transition-all ${
                  prefs.font_color === opt.value
                    ? 'border-teal-500 ring-2 ring-teal-500/30 scale-105'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full mx-auto mb-1 border border-slate-600"
                  style={{ backgroundColor: opt.value }}
                />
                <span className="text-xs text-slate-300">{opt.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-slate-400 whitespace-nowrap">Custom:</Label>
            <Input
              type="color"
              value={prefs.font_color}
              onChange={(e) => updatePrefs({ font_color: e.target.value })}
              className="w-16 h-10 bg-slate-900/50 border-slate-700 cursor-pointer p-1"
            />
            <Input
              type="text"
              value={prefs.font_color}
              onChange={(e) => updatePrefs({ font_color: e.target.value })}
              className="bg-slate-900/50 border-slate-700 text-white flex-1"
            />
          </div>
        </motion.div>

        {/* Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Preview</h2>
          <div className="rounded-xl bg-slate-900/50 border border-slate-700/50 p-6">
            <h3 className="text-2xl font-bold text-white mb-2">
              Good Evening, {prefs.display_name}
            </h3>
            <p className="text-slate-400 mb-4">This is how your greeting will look.</p>
            <Button
              className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white"
              style={{
                background: prefs.accent_color !== 'teal'
                  ? `linear-gradient(to right, var(--user-accent-from), var(--user-accent-to))`
                  : undefined
              }}
            >
              Sample Button
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}