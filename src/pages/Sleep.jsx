const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { motion } from 'framer-motion';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { Moon, Zap, TrendingUp, Clock, BarChart3, Download, Upload, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line } from 'recharts';
import StatCard from '@/components/ui/StatCard';
import { Button } from '@/components/ui/button';
import { downloadCSV, parseCSVLine } from '@/utils/csvExport';

export default function Sleep() {
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState(30);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);

  const startDate = format(subDays(new Date(), timeRange), 'yyyy-MM-dd');
  const endDate = format(new Date(), 'yyyy-MM-dd');

  const { data: days = [] } = useQuery({ queryKey: ['days-sleep', startDate, endDate], queryFn: () => db.entities.Day.filter({ date: { $gte: startDate, $lte: endDate } }, 'date') });
  const { data: habitLogs = [] } = useQuery({ queryKey: ['habit-logs-sleep', startDate, endDate], queryFn: () => db.entities.HabitLog.filter({ date: { $gte: startDate, $lte: endDate } }) });
  const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: () => db.entities.Habit.filter({ active: true }) });

  const daysWithSleep = days.filter(d => d.sleep_hours);
  const avgSleepHours = daysWithSleep.length > 0 ? (daysWithSleep.reduce((sum, d) => sum + d.sleep_hours, 0) / daysWithSleep.length).toFixed(1) : 0;
  const sleepGoal = 8;
  const daysMetGoal = daysWithSleep.filter(d => d.sleep_hours >= sleepGoal).length;
  const goalRate = daysWithSleep.length > 0 ? Math.round((daysMetGoal / daysWithSleep.length) * 100) : 0;

  const bedtimes = days.filter(d => d.bedtime).map(d => { const [hours, mins] = d.bedtime.split(':').map(Number); return hours + mins / 60; });
  const avgBedtime = bedtimes.length > 0 ? bedtimes.reduce((a, b) => a + b) / bedtimes.length : 0;
  const bedtimeVariance = bedtimes.length > 0 ? Math.sqrt(bedtimes.reduce((sum, b) => sum + Math.pow(b - avgBedtime, 2), 0) / bedtimes.length) : 0;
  const consistencyScore = Math.max(0, Math.round(100 - bedtimeVariance * 20));

  const chartData = eachDayOfInterval({ start: subDays(new Date(), timeRange - 1), end: new Date() }).map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayData = days.find(d => d.date === dateStr);
    const dayLogs = habitLogs.filter(l => l.date === dateStr);
    const completedHabits = dayLogs.filter(l => l.completed).length;
    const habitRate = habits.length > 0 ? (completedHabits / habits.length) * 100 : 0;
    return { date: format(date, 'MMM d'), sleep: dayData?.sleep_hours || null, quality: dayData?.sleep_quality === 'excellent' ? 4 : dayData?.sleep_quality === 'good' ? 3 : dayData?.sleep_quality === 'fair' ? 2 : dayData?.sleep_quality === 'poor' ? 1 : null, energy: dayData?.energy_level || null, habitRate: Math.round(habitRate) };
  });

  const qualityLabels = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Excellent' };

  const getCorrelation = () => {
    const validData = chartData.filter(d => d.sleep && d.habitRate);
    if (validData.length < 5) return null;
    const n = validData.length;
    const sumX = validData.reduce((s, d) => s + d.sleep, 0);
    const sumY = validData.reduce((s, d) => s + d.habitRate, 0);
    const sumXY = validData.reduce((s, d) => s + d.sleep * d.habitRate, 0);
    const sumX2 = validData.reduce((s, d) => s + d.sleep * d.sleep, 0);
    const sumY2 = validData.reduce((s, d) => s + d.habitRate * d.habitRate, 0);
    const r = (n * sumXY - sumX * sumY) / Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    return isNaN(r) ? null : r;
  };

  const correlation = getCorrelation();

  const exportSleepCSV = async () => {
    try {
      const allDays = await db.entities.Day.list('date', 5000);
      const rows = allDays
        .filter(d => d.sleep_hours || d.sleep_quality || d.bedtime || d.wake_time || d.energy_level)
        .map(d => [
          d.date,
          d.sleep_hours || '',
          d.sleep_quality || '',
          d.bedtime || '',
          d.wake_time || '',
          d.energy_level || '',
        ]);
      downloadCSV(rows, ['Date', 'Sleep Hours', 'Sleep Quality', 'Bedtime', 'Wake Time', 'Energy Level'], `sleep_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    } catch (err) {
      console.error('Sleep CSV export failed:', err);
      alert('Failed to export sleep CSV');
    }
  };

  const importSleepCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        alert('No data rows found in CSV');
        return;
      }

      const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
      const idx = (name) => headers.indexOf(name);

      const allDays = await db.entities.Day.list('date', 5000);
      const dayMap = {};
      allDays.forEach(d => { dayMap[d.date] = d; });

      const toCreate = [];
      const toUpdate = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const date = values[idx('date')]?.trim();
        if (!date) continue;

        const sleepHours = values[idx('sleep hours')]?.trim();
        const sleepQuality = values[idx('sleep quality')]?.trim().toLowerCase();
        const bedtime = values[idx('bedtime')]?.trim();
        const wakeTime = values[idx('wake time')]?.trim();
        const energyLevel = values[idx('energy level')]?.trim();

        const dayData = {};
        if (sleepHours !== '' && sleepHours != null) dayData.sleep_hours = parseFloat(sleepHours);
        if (sleepQuality) dayData.sleep_quality = sleepQuality;
        if (bedtime) dayData.bedtime = bedtime;
        if (wakeTime) dayData.wake_time = wakeTime;
        if (energyLevel !== '' && energyLevel != null) dayData.energy_level = parseFloat(energyLevel);

        if (Object.keys(dayData).length === 0) continue;

        const existing = dayMap[date];
        if (existing) {
          toUpdate.push({ id: existing.id, ...dayData });
        } else {
          toCreate.push({ date, ...dayData });
        }
      }

      if (toCreate.length > 0) await db.entities.Day.bulkCreate(toCreate);
      if (toUpdate.length > 0) await db.entities.Day.bulkUpdate(toUpdate);

      queryClient.invalidateQueries({ queryKey: ['days-sleep'] });
      alert(`Imported ${toCreate.length + toUpdate.length} sleep records (${toCreate.length} new, ${toUpdate.length} updated)!`);
    } catch (err) {
      console.error('Sleep import failed:', err);
      alert('Failed to import sleep CSV');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3"><Moon className="w-8 h-8 text-indigo-400" />Sleep Trends</h1>
            <p className="text-slate-400">Track and analyze your sleep patterns</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {[7, 30, 90].map(range => (
              <button key={range} onClick={() => setTimeRange(range)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${timeRange === range ? 'bg-indigo-500 text-white' : 'bg-slate-800/50 text-slate-400 hover:text-white'}`}>{range} days</button>
            ))}
            <Button onClick={exportSleepCSV} variant="outline" size="sm" className="border-slate-600 gap-2 ml-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".csv"
              onChange={importSleepCSV}
              className="hidden"
              disabled={importing}
            />
            <Button
              onClick={() => importInputRef.current?.click()}
              variant="outline"
              size="sm"
              className="border-slate-600 gap-2"
              disabled={importing}
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span className="hidden sm:inline">Import</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Average Sleep" value={`${avgSleepHours}h`} subtitle={parseFloat(avgSleepHours) >= 7 ? 'Good!' : 'Below target'} icon={Moon} color="indigo" trend={parseFloat(avgSleepHours) >= 7 ? 'up' : 'down'} />
          <StatCard title="Goal Met" value={`${goalRate}%`} subtitle={`${daysMetGoal}/${daysWithSleep.length} nights`} icon={TrendingUp} color="teal" />
          <StatCard title="Consistency" value={`${consistencyScore}%`} subtitle="Bedtime regularity" icon={Clock} color="purple" />
          <StatCard title="Logged Days" value={daysWithSleep.length} subtitle={`of ${timeRange} days`} icon={BarChart3} color="amber" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Sleep Duration</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs><linearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="date" stroke="#64748b" fontSize={12} /><YAxis stroke="#64748b" fontSize={12} domain={[0, 12]} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} labelStyle={{ color: '#94a3b8' }} />
                  <Area type="monotone" dataKey="sleep" stroke="#6366f1" fill="url(#sleepGradient)" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Sleep Quality</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="date" stroke="#64748b" fontSize={12} /><YAxis stroke="#64748b" fontSize={12} domain={[0, 4]} tickFormatter={(v) => qualityLabels[v] || ''} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} formatter={(value) => [qualityLabels[value] || 'N/A', 'Quality']} />
                  <Bar dataKey="quality" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Sleep vs Habit Completion</h3>
              {correlation !== null && <span className={`text-sm px-2 py-1 rounded ${correlation > 0.3 ? 'bg-emerald-500/20 text-emerald-300' : correlation < -0.3 ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-500/20 text-slate-300'}`}>r = {correlation.toFixed(2)}</span>}
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="date" stroke="#64748b" fontSize={12} /><YAxis yAxisId="left" stroke="#6366f1" fontSize={12} domain={[0, 12]} /><YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={12} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Line yAxisId="left" type="monotone" dataKey="sleep" stroke="#6366f1" dot={false} connectNulls /><Line yAxisId="right" type="monotone" dataKey="habitRate" stroke="#10b981" dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4 text-sm"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500" /><span className="text-slate-400">Sleep Hours</span></div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-slate-400">Habit Completion %</span></div></div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-amber-400" />Energy Levels</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs><linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="date" stroke="#64748b" fontSize={12} /><YAxis stroke="#64748b" fontSize={12} domain={[0, 10]} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="energy" stroke="#f59e0b" fill="url(#energyGradient)" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {correlation !== null && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">💡 Insights</h3>
            <div className="space-y-3 text-slate-300">
              {parseFloat(avgSleepHours) < 7 && <p>• You're averaging less than 7 hours of sleep. Try to get to bed 30 minutes earlier.</p>}
              {correlation > 0.3 && <p>• There's a positive correlation between your sleep and habit completion. Better sleep = more productive days!</p>}
              {consistencyScore < 70 && <p>• Your bedtime varies quite a bit. A more consistent sleep schedule can improve sleep quality.</p>}
              {goalRate >= 80 && <p>• Great job! You're meeting your sleep goal {goalRate}% of the time.</p>}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}