import React from 'react';
import { motion } from 'framer-motion';

// New 7-point mood scale (integers 1-7 for new entries)
export const moods = [
  { value: 1, emoji: '😣', label: 'Terrible', color: 'bg-rose-600' },
  { value: 2, emoji: '😔', label: 'Rough', color: 'bg-orange-500' },
  { value: 3, emoji: '☹️', label: 'Low', color: 'bg-amber-500' },
  { value: 4, emoji: '😐', label: 'Okay', color: 'bg-yellow-500' },
  { value: 5, emoji: '🙂', label: 'Good', color: 'bg-teal-500' },
  { value: 6, emoji: '😁', label: 'Great', color: 'bg-emerald-500' },
  { value: 7, emoji: '🤩', label: 'Amazing', color: 'bg-green-500' },
];

// Map migrated float values to their display integer
const migratedMap = { 1: 1, 2.5: 2, 4: 4, 5.5: 5, 7: 7 };
// Map legacy string values to their new integer
const legacyStringMap = { rough: 1, low: 2, okay: 4, good: 5, amazing: 7 };

// Convert any stored mood value (float, int, or legacy string) to the selector integer 1-7
export function moodToValue(value) {
  if (value == null || value === '') return null;
  const num = Number(value);
  if (!isNaN(num)) {
    if (migratedMap[num] != null) return migratedMap[num];
    const rounded = Math.round(num);
    if (rounded >= 1 && rounded <= 7) return rounded;
    return null;
  }
  if (typeof value === 'string' && legacyStringMap[value] != null) return legacyStringMap[value];
  return null;
}

export function getMoodInfo(value) {
  const v = moodToValue(value);
  if (v == null) return null;
  return moods.find(m => m.value === v) || null;
}

export function getMoodEmoji(value) {
  return getMoodInfo(value)?.emoji || '😐';
}

export function getMoodLabel(value) {
  return getMoodInfo(value)?.label || 'Okay';
}

export default function MoodSelector({ value, onChange, size = 'md', showLabel = true }) {
  const selectedValue = moodToValue(value);

  const sizeClasses = {
    xs: 'text-base p-1',
    sm: 'text-lg p-1.5',
    md: 'text-2xl p-3',
    lg: 'text-3xl p-4',
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="flex items-center justify-center gap-1 flex-nowrap w-full">
        {moods.map((mood) => {
          const isSelected = selectedValue === mood.value;
          return (
            <motion.button
              key={mood.value}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onChange(mood.value)}
              className={`${sizeClasses[size]} rounded-xl transition-all duration-200 ${
                isSelected
                  ? `${mood.color} shadow-lg ring-2 ring-white/30`
                  : 'bg-slate-800/50 hover:bg-slate-700/50'
              }`}
              title={mood.label}
            >
              {mood.emoji}
            </motion.button>
          );
        })}
      </div>
      {showLabel && selectedValue != null && (
        <div className="text-center">
          <span className={`px-4 py-1.5 rounded-full text-sm font-medium text-white ${moods.find(m => m.value === selectedValue)?.color}`}>
            {moods.find(m => m.value === selectedValue)?.label}
          </span>
        </div>
      )}
    </div>
  );
}