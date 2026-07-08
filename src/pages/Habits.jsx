const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { motion } from 'framer-motion';
import { format, subMonths, startOfMonth, endOfMonth, subDays } from 'date-fns';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Settings,
  TrendingUp,
  BarChart3,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import HabitCard from '@/components/habits/HabitCard';
import HabitHeatmap from '@/components/habits/HabitHeatmap';
import HabitTrendsChart from '@/components/habits/HabitTrendsChart';
import HabitAnalytics from '@/components/habits/HabitAnalytics';
import AdvancedStreaks from '@/components/habits/AdvancedStreaks';
import StatCard from '@/components/ui/StatCard';
import AIAssistant from '@/components/ai/AIAssistant';
import PastDateSelector from '@/components/habits/PastDateSelector';

import { Dumbbell, BookOpen, PenTool, Clock, CheckSquare, Smartphone, Ban, Moon, Heart, Zap, Coffee, Droplets, Sun, Brain, Music, Apple, Bike, Camera, Flame, Footprints, Leaf, Smile, Target, Wind, Download, Upload, Loader2 } from 'lucide-react';
import { downloadCSV, parseCSVLine } from '@/utils/csvExport';
import { calculateDayStreak } from '@/utils/streakCalculator';

const iconOptions = [
  { value: 'Dumbbell', label: 'Workout', icon: Dumbbell },
  { value: 'BookOpen', label: 'Reading', icon: BookOpen },
  { value: 'PenTool', label: 'Writing', icon: PenTool },
  { value: 'Clock', label: 'Time', icon: Clock },
  { value: 'CheckSquare', label: 'Tasks', icon: CheckSquare },
  { value: 'Smartphone', label: 'Screen', icon: Smartphone },
  { value: 'Ban', label: 'Avoid', icon: Ban },
  { value: 'Moon', label: 'Sleep', icon: Moon },
  { value: 'Heart', label: 'Health', icon: Heart },
  { value: 'Zap', label: 'Energy', icon: Zap },
  { value: 'Coffee', label: 'Coffee', icon: Coffee },
  { value: 'Droplets', label: 'Water', icon: Droplets },
  { value: 'Sun', label: 'Morning', icon: Sun },
  { value: 'Brain', label: 'Mind', icon: Brain },
  { value: 'Music', label: 'Music', icon: Music },
  { value: 'Apple', label: 'Food', icon: Apple },
  { value: 'Bike', label: 'Cycling', icon: Bike },
  { value: 'Camera', label: 'Photos', icon: Camera },
  { value: 'Flame', label: 'Streak', icon: Flame },
  { value: 'Footprints', label: 'Steps', icon: Footprints },
  { value: 'Leaf', label: 'Nature', icon: Leaf },
  { value: 'Smile', label: 'Happy', icon: Smile },
  { value: 'Target', label: 'Goal', icon: Target },
  { value: 'Wind', label: 'Breathe', icon: Wind },
];

const colorOptions = ['#14b8a6', '#6366f1', '#a855f7', '#f97316', '#ec4899', '#10b981', '#f59e0b', '#f43f5e'];

export default function Habits() {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [newHabit, setNewHabit] = useState({
    name: '',
    type: 'build',
    description: '',
    icon: 'CheckSquare',
    color: 'teal',
    active: true
  });

  const todayStr = format(selectedDate, 'yyyy-MM-dd');

  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: () => db.entities.Habit.list('order'),
  });

  const { data: todayLogs = [], refetch: refetchTodayLogs } = useQuery({
    queryKey: ['habit-logs-today', todayStr],
    queryFn: () => db.entities.HabitLog.filter({ date: todayStr }),
  });

  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  const { data: monthLogs = [] } = useQuery({
    queryKey: ['habit-logs-month', monthStart, monthEnd],
    queryFn: () => db.entities.HabitLog.filter({ 
      date: { $gte: monthStart, $lte: monthEnd }
    }),
  });

  const { data: allLogs = [] } = useQuery({
    queryKey: ['all-habit-logs'],
    queryFn: () => db.entities.HabitLog.list('-date', 5000),
  });

  const { data: dayEntries = [] } = useQuery({
    queryKey: ['day-entries-month', monthStart, monthEnd],
    queryFn: () => db.entities.Day.filter({ 
      date: { $gte: monthStart, $lte: monthEnd }
    }),
  });

  const activeHabits = habits.filter(h => h.active);
  const buildHabits = activeHabits.filter(h => h.type === 'build');
  const limitHabits = activeHabits.filter(h => h.type === 'limit');

  const isHabitCompleted = (habitId) => {
    return todayLogs.some(log => log.habit_id === habitId && log.completed);
  };

  const getHabitLog = (habitId) => {
    return todayLogs.find(log => log.habit_id === habitId);
  };

  const toggleHabit = async (habit) => {
    const existingLog = getHabitLog(habit.id);
    
    if (existingLog) {
      await db.entities.HabitLog.update(existingLog.id, {
        completed: !existingLog.completed
      });
    } else {
      await db.entities.HabitLog.create({
        habit_id: habit.id,
        date: todayStr,
        completed: true
      });
    }
    
    refetchTodayLogs();
  };

  const calculateStreak = (habitId, referenceDate = selectedDate) => {
    const completedDates = allLogs
      .filter(log => log.habit_id === habitId && log.completed)
      .map(log => log.date);
    return calculateDayStreak(completedDates, referenceDate);
  };

  const createHabitMutation = useMutation({
    mutationFn: (data) => db.entities.Habit.create({ ...data, order: habits.length }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      setShowAddHabit(false);
      setNewHabit({
        name: '',
        type: 'build',
        description: '',
        icon: 'CheckSquare',
        color: 'teal',
        active: true
      });
    },
  });

  const updateHabitMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Habit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      setEditingHabit(null);
    },
  });

  const deleteHabitMutation = useMutation({
    mutationFn: async (habit) => {
      // Delete all habit logs for this habit, then the habit itself
      await db.entities.HabitLog.deleteMany({ habit_id: habit.id });
      await db.entities.Habit.delete(habit.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit-logs-today'] });
      queryClient.invalidateQueries({ queryKey: ['habit-logs-month'] });
      queryClient.invalidateQueries({ queryKey: ['all-habit-logs'] });
    },
  });

  const todayCompleted = todayLogs.filter(log => log.completed).length;
  const completionRate = activeHabits.length > 0 
    ? Math.round((todayCompleted / activeHabits.length) * 100) 
    : 0;

  const longestStreak = Math.max(...activeHabits.map(h => calculateStreak(h.id)), 0);

  const exportHabitsCSV = async () => {
    try {
      const [allHabits, exportLogs] = await Promise.all([
        db.entities.Habit.list('order'),
        db.entities.HabitLog.list('-date', 5000),
      ]);
      const dates = [...new Set(exportLogs.map(log => log.date))].sort((a, b) => new Date(b) - new Date(a));
      const headers = ['Date', ...allHabits.map(h => h.name)];
      const rows = dates.map(date => {
        const row = [date];
        allHabits.forEach(habit => {
          const log = exportLogs.find(l => l.date === date && l.habit_id === habit.id);
          row.push(log ? (log.completed ? 'Yes' : 'No') : '');
        });
        return row;
      });
      downloadCSV(rows, headers, `habits_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    } catch (err) {
      console.error('CSV export failed:', err);
      alert('Failed to export habits CSV');
    }
  };

  const [importingHabits, setImportingHabits] = useState(false);

  const importHabitsCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportingHabits(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        alert('No data rows found in CSV');
        return;
      }

      const headers = parseCSVLine(lines[0]);
      const habitNames = headers.slice(1);

      const allHabits = await db.entities.Habit.list('order');
      const nameToId = {};
      allHabits.forEach(h => { nameToId[h.name] = h.id; });

      const existingLogs = await db.entities.HabitLog.list('-date', 5000);
      const existingMap = {};
      existingLogs.forEach(l => { existingMap[`${l.date}_${l.habit_id}`] = l; });

      const toCreate = [];
      const toUpdate = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const date = values[0];
        if (!date) continue;

        for (let j = 0; j < habitNames.length; j++) {
          const habitName = habitNames[j];
          const habitId = nameToId[habitName];
          if (!habitId) continue;

          const rawValue = (values[j + 1] || '').trim().toLowerCase();
          if (rawValue === '') continue;

          const completed = rawValue === 'yes' || rawValue === 'true' || rawValue === '1';
          const key = `${date}_${habitId}`;
          const existing = existingMap[key];

          if (existing) {
            if (existing.completed !== completed) {
              toUpdate.push({ id: existing.id, completed });
            }
          } else {
            toCreate.push({ habit_id: habitId, date, completed });
          }
        }
      }

      if (toCreate.length > 0) await db.entities.HabitLog.bulkCreate(toCreate);
      if (toUpdate.length > 0) await db.entities.HabitLog.bulkUpdate(toUpdate);

      queryClient.invalidateQueries({ queryKey: ['habit-logs-today'] });
      queryClient.invalidateQueries({ queryKey: ['habit-logs-month'] });
      queryClient.invalidateQueries({ queryKey: ['all-habit-logs'] });

      alert(`Imported ${toCreate.length + toUpdate.length} habit records (${toCreate.length} new, ${toUpdate.length} updated)!`);
    } catch (err) {
      console.error('Import failed:', err);
      alert('Failed to import habits CSV');
    } finally {
      setImportingHabits(false);
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Habit Tracker</h1>
            <p className="text-slate-400">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={exportHabitsCSV}
              variant="outline"
              size="sm"
              className="border-slate-600 gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={importHabitsCSV}
                className="hidden"
                disabled={importingHabits}
              />
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 gap-2 pointer-events-none"
                disabled={importingHabits}
                type="button"
              >
                {importingHabits ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span className="hidden sm:inline">Import</span>
              </Button>
            </label>
            <Button 
              onClick={() => setShowAddHabit(true)}
              className="bg-gradient-to-r from-teal-500 to-emerald-500 gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Habit
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Today's Progress"
            value={`${todayCompleted}/${activeHabits.length}`}
            subtitle={`${completionRate}% complete`}
            icon={Target}
            color="emerald"
          />
          <StatCard
            title="Longest Streak"
            value={longestStreak}
            subtitle="days"
            icon={Flame}
            color="orange"
          />
          <StatCard
            title="Build Habits"
            value={buildHabits.length}
            subtitle="active"
            icon={TrendingUp}
            color="teal"
          />
          <StatCard
            title="Limit Habits"
            value={limitHabits.length}
            subtitle="active"
            icon={BarChart3}
            color="rose"
          />
        </div>

        <Tabs defaultValue="today" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700/50">
            <TabsTrigger value="today" className="data-[state=active]:bg-teal-500">Today</TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-teal-500">Analytics</TabsTrigger>
            <TabsTrigger value="streaks" className="data-[state=active]:bg-teal-500">Streaks</TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-teal-500">Calendar</TabsTrigger>
            <TabsTrigger value="trends" className="data-[state=active]:bg-teal-500">Trends</TabsTrigger>
            <TabsTrigger value="manage" className="data-[state=active]:bg-teal-500">Manage</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-6">
            <PastDateSelector 
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              maxDaysBack={365}
            />
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Build Habits
                </h2>
                <div className="space-y-3">
                  {buildHabits.map(habit => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      isCompleted={isHabitCompleted(habit.id)}
                      onToggle={() => toggleHabit(habit)}
                      streak={calculateStreak(habit.id)}
                    />
                  ))}
                  {buildHabits.length === 0 && (
                    <p className="text-slate-500 text-center py-8">No build habits yet</p>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-rose-400" />
                  Limit Habits
                  <span className="text-xs text-slate-400 font-normal ml-2">(Check = Success)</span>
                </h2>
                <div className="space-y-3">
                  {limitHabits.map(habit => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      isCompleted={isHabitCompleted(habit.id)}
                      onToggle={() => toggleHabit(habit)}
                      streak={calculateStreak(habit.id)}
                    />
                  ))}
                  {limitHabits.length === 0 && (
                    <p className="text-slate-500 text-center py-8">No limit habits yet</p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <HabitAnalytics habits={activeHabits} habitLogs={monthLogs} dayEntries={dayEntries} />
          </TabsContent>

          <TabsContent value="streaks" className="mt-6">
            <div className="space-y-6">
              {activeHabits.map(habit => (
                <div key={habit.id} className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-6">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    {habit.name}
                  </h3>
                  <AdvancedStreaks habit={habit} logs={monthLogs} />
                </div>
              ))}
              {activeHabits.length === 0 && (
                <p className="text-slate-500 text-center py-12">No active habits to show streaks for</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="text-slate-400"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-semibold text-white">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(new Date())}
                className="text-slate-400"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
            
            <HabitHeatmap 
              habitLogs={monthLogs} 
              habits={activeHabits} 
              month={currentMonth} 
            />
          </TabsContent>

          <TabsContent value="trends" className="mt-6">
            <HabitTrendsChart habits={activeHabits} habitLogs={allLogs} />
          </TabsContent>

          <TabsContent value="manage" className="mt-6">
            <div className="space-y-4">
              {habits.map(habit => (
                <motion.div
                  key={habit.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-slate-700/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-slate-700/50">
                      <Settings className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{habit.name}</h3>
                      <p className="text-sm text-slate-400 capitalize">{habit.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={habit.active}
                      onCheckedChange={(checked) => 
                        updateHabitMutation.mutate({ id: habit.id, data: { active: checked } })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingHabit(habit)}
                      className="text-slate-400"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete "${habit.name}" and all its logged data? This cannot be undone.`)) {
                          deleteHabitMutation.mutate(habit);
                        }
                      }}
                      className="text-rose-400 hover:text-rose-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showAddHabit || !!editingHabit} onOpenChange={(open) => {
        if (!open) {
          setShowAddHabit(false);
          setEditingHabit(null);
        }
      }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>{editingHabit ? 'Edit Habit' : 'Add New Habit'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-slate-400">Name</Label>
              <Input
                value={editingHabit?.name ?? newHabit.name}
                onChange={(e) => editingHabit 
                  ? setEditingHabit({ ...editingHabit, name: e.target.value })
                  : setNewHabit({ ...newHabit, name: e.target.value })
                }
                placeholder="e.g., Read 5+ pages"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-400">Type</Label>
              <Select
                value={editingHabit?.type ?? newHabit.type}
                onValueChange={(value) => editingHabit
                  ? setEditingHabit({ ...editingHabit, type: value })
                  : setNewHabit({ ...newHabit, type: value })
                }
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="build">Build (Do this)</SelectItem>
                  <SelectItem value="limit">Limit (Avoid this)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-400">Description</Label>
              <Input
                value={editingHabit?.description ?? newHabit.description}
                onChange={(e) => editingHabit
                  ? setEditingHabit({ ...editingHabit, description: e.target.value })
                  : setNewHabit({ ...newHabit, description: e.target.value })
                }
                placeholder="Optional details..."
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-400 mb-2 block">Icon</Label>
              <div className="grid grid-cols-6 gap-2">
                {iconOptions.map(iconOption => {
                  const IconComponent = iconOption.icon;
                  const isSelected = (editingHabit?.icon ?? newHabit.icon) === iconOption.value;
                  return (
                    <button
                      key={iconOption.value}
                      type="button"
                      onClick={() => editingHabit
                        ? setEditingHabit({ ...editingHabit, icon: iconOption.value })
                        : setNewHabit({ ...newHabit, icon: iconOption.value })
                      }
                      className={`p-3 rounded-lg border transition-all ${
                        isSelected 
                          ? 'bg-teal-500/20 border-teal-500 text-teal-400' 
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                      title={iconOption.label}
                    >
                      <IconComponent className="w-5 h-5 mx-auto" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-slate-400 mb-2 block">Color</Label>
              <div className="grid grid-cols-8 gap-2">
                {[
                  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6',
                  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
                  '#f43f5e', '#fb7185', '#fbbf24', '#fde047', '#a3e635', '#4ade80', '#34d399', '#5eead4',
                  '#22d3ee', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6'
                ].map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => editingHabit
                      ? setEditingHabit({ ...editingHabit, color })
                      : setNewHabit({ ...newHabit, color })
                    }
                    className={`w-8 h-8 rounded-lg transition-all hover:scale-110 ${
                      (editingHabit?.color ?? newHabit.color) === color 
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' 
                        : ''
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <Button
              onClick={() => editingHabit
                ? updateHabitMutation.mutate({ id: editingHabit.id, data: editingHabit })
                : createHabitMutation.mutate(newHabit)
              }
              disabled={editingHabit ? !editingHabit.name?.trim() : !newHabit.name?.trim()}
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 disabled:opacity-50"
            >
              {editingHabit ? 'Save Changes' : 'Create Habit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AIAssistant context="habits" contextData={{ habitCount: habits.length }} />
    </div>
  );
}