import React from 'react';
import { format, subDays, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PastDateSelector({ selectedDate, onDateChange, maxDaysBack = 365 }) {
  const today = new Date();
  const minDate = subDays(today, maxDaysBack);
  const isPastDate = format(selectedDate, 'yyyy-MM-dd') < format(today, 'yyyy-MM-dd');
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

  const goToPreviousDay = () => {
    const newDate = subDays(selectedDate, 1);
    if (newDate >= minDate) {
      onDateChange(newDate);
    }
  };

  const goToNextDay = () => {
    if (!isToday) {
      onDateChange(addDays(selectedDate, 1));
    }
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 p-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPreviousDay}
          disabled={format(selectedDate, 'yyyy-MM-dd') <= format(minDate, 'yyyy-MM-dd')}
          className="text-slate-300 hover:text-white disabled:opacity-30"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="flex-1 text-center">
          <Input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => {
              const newDate = new Date(e.target.value);
              if (newDate >= minDate && newDate <= today) {
                onDateChange(newDate);
              }
            }}
            min={format(minDate, 'yyyy-MM-dd')}
            max={format(today, 'yyyy-MM-dd')}
            className="bg-slate-800/50 border-slate-700 text-white text-center"
          />
          <div className="mt-2 flex items-center justify-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300 font-medium">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </span>
            {isPastDate && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs">
                Past Date
              </span>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextDay}
          disabled={isToday}
          className="text-slate-300 hover:text-white disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {!isToday && (
        <div className="mt-4 flex items-center justify-center">
          <Button
            onClick={goToToday}
            variant="outline"
            size="sm"
            className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10"
          >
            Jump to Today
          </Button>
        </div>
      )}

      {isPastDate && (
        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-amber-300 text-sm text-center">
            ⚠️ Editing past date. Changes will affect your streaks and statistics.
          </p>
        </div>
      )}
    </div>
  );
}