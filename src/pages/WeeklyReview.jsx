const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { motion } from 'framer-motion';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { BarChart3, Sparkles, Loader2, TrendingUp, Flame, Moon, BookOpen, Footprints, Target, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';

export default function WeeklyReview() {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: reports = [] } = useQuery({
    queryKey: ['weekly-reports'],
    queryFn: () => db.entities.WeeklyReport.list('-week_start', 50),
  });

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const generateReport = async () => {
    setGenerating(true);
    try {
      const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

      const [days, workouts, studySessions, habits, habitLogs, goals] = await Promise.all([
        db.entities.Day.list('-date', 100),
        db.entities.Workout.list('-date', 100),
        db.entities.StudySession.list('-date', 100),
        db.entities.Habit.filter({ active: true }),
        db.entities.HabitLog.list('-date', 500),
        db.entities.Goal.filter({ status: 'active' }),
      ]);

      const weekDays = days.filter(d => d.date >= sevenDaysAgo);
      const weekWorkouts = workouts.filter(w => w.date >= sevenDaysAgo);
      const weekStudy = studySessions.filter(s => s.date >= sevenDaysAgo);
      const weekHabitLogs = habitLogs.filter(l => l.date >= sevenDaysAgo);

      const studyHours = weekStudy.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60;
      const runningDistance = weekWorkouts.reduce((sum, w) => sum + (w.actual_distance_km || 0), 0);
      const runningCount = weekWorkouts.filter(w => w.completed).length;
      const habitCompletionRate = habits.length > 0
        ? Math.round((weekHabitLogs.filter(l => l.completed).length / (habits.length * 7)) * 100)
        : 0;
      const avgSleep = weekDays.length > 0 && weekDays.some(d => d.sleep_hours)
        ? Math.round((weekDays.filter(d => d.sleep_hours).reduce((sum, d) => sum + d.sleep_hours, 0) / weekDays.filter(d => d.sleep_hours).length) * 10) / 10
        : 0;
      const journalEntries = weekDays.filter(d => d.journal_content || d.one_interesting_thing).length;
      const journalWordCount = weekDays.reduce((sum, d) => {
        const text = (d.journal_content || '').replace(/<[^>]*>/g, '') + ' ' + (d.one_interesting_thing || '');
        return sum + (text.trim() ? text.trim().split(/\s+/).length : 0);
      }, 0);

      const stats = {
        study_hours: Math.round(studyHours * 10) / 10,
        running_distance: Math.round(runningDistance * 10) / 10,
        running_count: runningCount,
        habit_completion_rate: habitCompletionRate,
        avg_sleep_hours: avgSleep,
        journal_entries: journalEntries,
        journal_word_count: journalWordCount,
        active_goals: goals.length,
      };

      const prompt = `You are a supportive life coach reviewing a student's week. Here are their stats for the week of ${weekStart} to ${weekEnd}:
- Study hours: ${stats.study_hours}
- Running distance: ${stats.running_distance} km (${stats.running_count} workouts)
- Habit completion rate: ${stats.habit_completion_rate}%
- Average sleep: ${stats.avg_sleep_hours} hours
- Journal entries: ${stats.journal_entries} (${stats.journal_word_count} words)
- Active goals: ${stats.active_goals}

Write a warm, encouraging weekly summary (2-3 paragraphs). Highlight what went well, identify areas for improvement, and end with one actionable tip for next week. Be personal and specific to the numbers.`;

      const response = await db.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            tip: { type: 'string' },
          },
        },
      });

      await db.entities.WeeklyReport.create({
        week_start: weekStart,
        week_end: weekEnd,
        summary: response.summary,
        stats: { ...stats, tip: response.tip },
        generated_at: new Date().toISOString(),
      });

      queryClient.invalidateQueries({ queryKey: ['weekly-reports'] });
    } catch (error) {
      console.error('Report generation failed:', error);
      alert('Failed to generate weekly report');
    } finally {
      setGenerating(false);
    }
  };

  const statIcons = {
    study_hours: { icon: BookOpen, label: 'Study Hours', color: 'text-indigo-400' },
    running_distance: { icon: Footprints, label: 'Running (km)', color: 'text-emerald-400' },
    habit_completion_rate: { icon: Flame, label: 'Habits', color: 'text-orange-400' },
    avg_sleep_hours: { icon: Moon, label: 'Avg Sleep', color: 'text-purple-400' },
    journal_entries: { icon: BookOpen, label: 'Journal Entries', color: 'text-teal-400' },
    active_goals: { icon: Target, label: 'Active Goals', color: 'text-amber-400' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-teal-400" />
              Weekly Review
            </h1>
            <p className="text-slate-400">AI-powered summaries of your week</p>
          </div>
          <Button
            onClick={generateReport}
            disabled={generating}
            className="bg-gradient-to-r from-teal-500 to-emerald-500 gap-2"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? 'Generating...' : 'Generate This Week'}
          </Button>
        </div>

        {reports.length === 0 && !generating && (
          <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-12 text-center">
            <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No weekly reports yet.</p>
            <p className="text-sm text-slate-500 mt-1">Click "Generate This Week" to create your first AI-powered review.</p>
          </div>
        )}

        <div className="space-y-6">
          {reports.map((report, i) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {format(new Date(report.week_start), 'MMM d')} – {format(new Date(report.week_end), 'MMM d, yyyy')}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Generated {report.generated_at ? format(new Date(report.generated_at), 'MMM d, h:mm a') : ''}
                  </p>
                </div>
              </div>

              {report.stats && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                  {Object.entries(statIcons).map(([key, { icon: Icon, label, color }]) => (
                    <div key={key} className="rounded-lg bg-slate-900/50 p-3 text-center">
                      <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
                      <p className="text-lg font-bold text-white">{report.stats[key] ?? '—'}</p>
                      <p className="text-xs text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              {report.summary && (
                <div className="prose prose-invert prose-sm max-w-none text-slate-300 mb-4">
                  <ReactMarkdown>{report.summary}</ReactMarkdown>
                </div>
              )}

              {report.stats?.tip && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
                  <Lightbulb className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-teal-300">{report.stats.tip}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}