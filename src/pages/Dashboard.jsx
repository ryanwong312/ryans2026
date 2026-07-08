const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { motion } from 'framer-motion';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Flame,
  Moon,
  BookOpen,
  Footprints,
  Target,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import QuoteDisplay from '@/components/quotes/QuoteDisplay';
import StatCard from '@/components/ui/StatCard';
import MoodSelector, { getMoodEmoji, getMoodLabel } from '@/components/ui/MoodSelector';
import TodaySchedule from '@/components/dashboard/TodaySchedule';
import WeeklyStats from '@/components/dashboard/WeeklyStats';
import AIDashboardCoach from '@/components/dashboard/AIDashboardCoach';
import AIAssistant from '@/components/ai/AIAssistant';
import { calculateDayStreak } from '@/utils/streakCalculator';
import { usePreferences } from '@/components/customization/PreferencesProvider';
import { Flag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function LiveClock() {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-right">
      <div className="text-2xl font-bold text-white font-mono">
        {format(time, 'HH:mm:ss')}
      </div>
      <div className="text-xs text-slate-500">
        {format(time, 'EEE, MMM d')}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkInData, setCheckInData] = useState({
    mood: 5,
    one_interesting_thing: '',
  });
  const { prefs } = usePreferences();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const { data: todayEntry, refetch: refetchDay } = useQuery({
    queryKey: ['today-entry'],
    queryFn: () => db.entities.Day.filter({ date: todayStr }),
  });

  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: () => db.entities.Habit.filter({ active: true }),
  });

  const { data: habitLogs = [] } = useQuery({
    queryKey: ['habit-logs-today', todayStr],
    queryFn: () => db.entities.HabitLog.filter({ date: todayStr }),
  });

  const { data: allHabitLogs = [] } = useQuery({
    queryKey: ['all-habit-logs'],
    queryFn: () => db.entities.HabitLog.list('-date', 5000),
  });

  const { data: workouts = [] } = useQuery({
    queryKey: ['workouts-week'],
    queryFn: () => {
      const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');
      return db.entities.Workout.filter({ 
        date: { $gte: weekStart, $lte: weekEnd } 
      });
    },
  });

  const { data: studySessions = [] } = useQuery({
    queryKey: ['study-sessions-week'],
    queryFn: () => {
      const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');
      return db.entities.StudySession.filter({ 
        date: { $gte: weekStart, $lte: weekEnd } 
      });
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['upcoming-assignments'],
    queryFn: () => db.entities.Assignment.filter({ 
      status: { $ne: 'completed' } 
    }, 'due_date', 5),
  });

  const { data: upcomingRaces = [] } = useQuery({
    queryKey: ['upcoming-races'],
    queryFn: () => db.entities.Race.filter({ 
      completed: false,
      date: { $gte: todayStr }
    }, 'date', 10),
  });

  const today = todayEntry?.[0];
  const completedHabits = habitLogs.filter(log => log.completed).length;
  const habitCompletionRate = habits.length > 0 ? Math.round((completedHabits / habits.length) * 100) : 0;

  const weeklyKm = workouts.reduce((sum, w) => sum + (w.actual_distance_km || 0), 0);
  const weeklyStudyHours = Math.round(studySessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60);

  // Calculate longest current habit streak
  const calculateLongestHabitStreak = () => {
    if (habits.length === 0 || allHabitLogs.length === 0) return 0;
    
    let longestStreak = 0;
    habits.forEach(habit => {
      const completedDates = allHabitLogs
        .filter(log => log.habit_id === habit.id && log.completed)
        .map(log => log.date);
      const streak = calculateDayStreak(completedDates);
      longestStreak = Math.max(longestStreak, streak);
    });
    
    return longestStreak;
  };

  const longestHabitStreak = calculateLongestHabitStreak();

  const handleCheckIn = async () => {
    if (today) {
      await db.entities.Day.update(today.id, checkInData);
    } else {
      await db.entities.Day.create({
        date: todayStr,
        ...checkInData
      });
    }
    refetchDay();
    setShowCheckIn(false);
  };

  useEffect(() => {
    if (today) {
      setCheckInData({
        mood: today.mood != null ? today.mood : 5,
        one_interesting_thing: today.one_interesting_thing || '',
      });
    }
  }, [today]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-4xl font-bold text-white mb-2"
            >
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {prefs.display_name}
            </motion.h1>
            <p className="text-slate-400">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          
          <Button 
            onClick={() => setShowCheckIn(true)}
            className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {today ? 'Update Check-In' : 'Daily Check-In'}
          </Button>
        </div>

        <QuoteDisplay context="general" />

        {today && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-6">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Today's Mood</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{getMoodEmoji(today.mood)}</span>
                  <span className="text-xl text-white">{getMoodLabel(today.mood)}</span>
                </div>
                <LiveClock />
              </div>
            </div>
            
            {today.one_interesting_thing && (
              <div className="rounded-xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border border-teal-500/20 p-6">
                <h3 className="text-sm font-medium text-teal-400 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  One Shining Moment
                </h3>
                <p className="text-white text-lg">{today.one_interesting_thing}</p>
              </div>
            )}
          </motion.div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Habit Streak"
            value={`${longestHabitStreak} days`}
            subtitle={`${completedHabits}/${habits.length} today`}
            icon={Flame}
            color="orange"
            trend={longestHabitStreak > 0 ? 'up' : 'neutral'}
          />
          <StatCard
            title="This Week"
            value={`${workouts.filter(w => w.completed).length} workouts`}
            subtitle={`${weeklyKm.toFixed(1)} km total`}
            icon={Footprints}
            color="teal"
          />
          <StatCard
            title="Weekly Study"
            value={`${weeklyStudyHours}h`}
            icon={BookOpen}
            color="indigo"
          />
          <StatCard
            title="Last Night's Sleep"
            value={today?.sleep_hours ? `${today.sleep_hours}h` : '--'}
            subtitle={today?.sleep_quality || 'Not logged'}
            icon={Moon}
            color="purple"
          />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <TodaySchedule />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                Upcoming Deadlines
              </h3>
              <Link to={createPageUrl('Study')}>
                <ChevronRight className="w-5 h-5 text-slate-400 hover:text-white transition" />
              </Link>
            </div>
            {assignments.length > 0 ? (
              <div className="space-y-3">
                {assignments.filter(a => a.due_date).slice(0, 3).map(assignment => (
                  <div key={assignment.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white truncate">{assignment.title}</p>
                      <p className="text-sm text-slate-400 capitalize">{assignment.type}</p>
                    </div>
                    <div className="text-right ml-2">
                      <p className={`text-sm whitespace-nowrap ${
                        new Date(assignment.due_date) < new Date() ? 'text-rose-400' :
                        new Date(assignment.due_date) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) ? 'text-amber-400' :
                        'text-slate-400'
                      }`}>
                        {format(new Date(assignment.due_date), 'MMM d')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No upcoming deadlines</p>
            )}
          </motion.div>

          <WeeklyStats />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Flag className="w-5 h-5 text-orange-400" />
                Upcoming Races
              </h3>
              <Link to={createPageUrl('Running')}>
                <ChevronRight className="w-5 h-5 text-slate-400 hover:text-white transition" />
              </Link>
            </div>
            {upcomingRaces.length > 0 ? (
              <div className="space-y-3">
                {upcomingRaces.filter(r => r.date).slice(0, 3).map(race => (
                  <div key={race.id} className="p-3 rounded-lg bg-slate-900/50">
                    <p className="font-medium text-white">{race.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-slate-400">{race.distance_km}km</p>
                      <p className="text-sm text-orange-400">{format(new Date(race.date), 'MMM d')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No upcoming races</p>
            )}
          </motion.div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Journal', icon: '📖', page: 'Journal', color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30' },
            { name: 'Habits', icon: '✅', page: 'Habits', color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30' },
            { name: 'Running', icon: '🏃', page: 'Running', color: 'from-teal-500/20 to-cyan-500/20 border-teal-500/30' },
            { name: 'Study Hub', icon: '🎓', page: 'Study', color: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/30' },
          ].map((item, i) => (
            <Link key={item.name} to={createPageUrl(item.page)}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                whileHover={{ scale: 1.03 }}
                className={`rounded-xl bg-gradient-to-br ${item.color} border p-6 text-center cursor-pointer`}
              >
                <span className="text-3xl mb-2 block">{item.icon}</span>
                <span className="text-white font-medium">{item.name}</span>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      <Dialog open={showCheckIn} onOpenChange={setShowCheckIn}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Daily Check-In</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-3">How are you feeling?</label>
              <MoodSelector 
                value={checkInData.mood} 
                onChange={(mood) => setCheckInData({ ...checkInData, mood })} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                One Interesting Thing Today
              </label>
              <Input
                value={checkInData.one_interesting_thing}
                onChange={(e) => setCheckInData({ ...checkInData, one_interesting_thing: e.target.value })}
                placeholder="What made today special?"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <Button 
              onClick={handleCheckIn}
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-500"
            >
              Save Check-In
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AIAssistant context="general" contextData={{}} />
    </div>
  );
}