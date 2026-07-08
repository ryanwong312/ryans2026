const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { motion } from 'framer-motion';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay } from 'date-fns';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Flag,
  TrendingUp,
  Footprints,
  Target,
  CircleDot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import RichTextEditor from '@/components/editor/RichTextEditor';
import AIAssistant from '@/components/ai/AIAssistant';
import RunningAnalytics from '@/components/running/RunningAnalytics';
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
import WorkoutCard from '@/components/running/WorkoutCard';
import RaceCard from '@/components/running/RaceCard';
import StatCard from '@/components/ui/StatCard';
import QuoteDisplay from '@/components/quotes/QuoteDisplay';

const workoutTypes = [
  { value: 'easy', label: 'Easy Run' },
  { value: 'tempo', label: 'Tempo' },
  { value: 'intervals', label: 'Intervals' },
  { value: 'hills', label: 'Hills' },
  { value: 'long', label: 'Long Run' },
  { value: 'race', label: 'Race' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'cross_training', label: 'Cross Training' },
  { value: 'rest', label: 'Rest Day' },
];

const feelingOptions = [
  { value: 'great', label: 'Great' },
  { value: 'good', label: 'Good' },
  { value: 'okay', label: 'Okay' },
  { value: 'tough', label: 'Tough' },
  { value: 'struggled', label: 'Struggled' },
];

export default function Running() {
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showWorkoutDialog, setShowWorkoutDialog] = useState(false);
  const [showRaceDialog, setShowRaceDialog] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [editingRace, setEditingRace] = useState(null);

  const [workoutForm, setWorkoutForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'easy',
    planned_distance_km: '',
    actual_distance_km: '',
    actual_duration: '',
    pace_min_km: '',
    heart_rate_avg: '',
    description: '',
    notes: '',
    feeling: '',
    photos: [],
    completed: false
  });

  const [raceForm, setRaceForm] = useState({
    name: '',
    date: '',
    distance_km: '',
    location: '',
    target_time: '',
    priority: 'B',
    notes: ''
  });

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: weekWorkouts = [] } = useQuery({
    queryKey: ['workouts-week', format(weekStart, 'yyyy-MM-dd')],
    queryFn: () => db.entities.Workout.filter({
      date: { $gte: format(weekStart, 'yyyy-MM-dd'), $lte: format(weekEnd, 'yyyy-MM-dd') }
    }),
  });

  const { data: allRaces = [] } = useQuery({
    queryKey: ['races'],
    queryFn: () => db.entities.Race.list('date'),
  });

  const { data: shoes = [] } = useQuery({
    queryKey: ['shoes'],
    queryFn: () => db.entities.Shoe.filter({ retired: false }),
  });

  const { data: monthWorkouts = [] } = useQuery({
    queryKey: ['workouts-month'],
    queryFn: () => {
      const monthStart = format(subWeeks(new Date(), 4), 'yyyy-MM-dd');
      return db.entities.Workout.filter({ date: { $gte: monthStart } });
    },
  });

  const { data: allWorkouts = [] } = useQuery({
    queryKey: ['all-workouts'],
    queryFn: () => db.entities.Workout.list('-date', 100),
  });

  const upcomingRaces = allRaces.filter(r => !r.completed && new Date(r.date) >= new Date());
  const pastRaces = allRaces.filter(r => r.completed || new Date(r.date) < new Date());

  const weeklyKm = weekWorkouts.reduce((sum, w) => sum + (w.actual_distance_km || 0), 0);
  const monthlyKm = monthWorkouts.reduce((sum, w) => sum + (w.actual_distance_km || 0), 0);
  const completedWorkouts = weekWorkouts.filter(w => w.completed).length;

  const getWorkoutForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return weekWorkouts.find(w => w.date === dateStr);
  };

  const createWorkoutMutation = useMutation({
    mutationFn: (data) => db.entities.Workout.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts-week'] });
      queryClient.invalidateQueries({ queryKey: ['workouts-month'] });
      resetWorkoutForm();
      setShowWorkoutDialog(false);
    },
  });

  const updateWorkoutMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Workout.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts-week'] });
      queryClient.invalidateQueries({ queryKey: ['workouts-month'] });
      resetWorkoutForm();
      setShowWorkoutDialog(false);
      setEditingWorkout(null);
    },
  });

  const deleteWorkoutMutation = useMutation({
    mutationFn: (id) => db.entities.Workout.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts-week'] });
      queryClient.invalidateQueries({ queryKey: ['workouts-month'] });
      setShowWorkoutDialog(false);
      setEditingWorkout(null);
    },
  });

  const deleteRaceMutation = useMutation({
    mutationFn: (id) => db.entities.Race.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['races'] });
      setShowRaceDialog(false);
      setEditingRace(null);
    },
  });

  const createRaceMutation = useMutation({
    mutationFn: (data) => db.entities.Race.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['races'] });
      resetRaceForm();
      setShowRaceDialog(false);
    },
  });

  const updateRaceMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Race.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['races'] });
      resetRaceForm();
      setShowRaceDialog(false);
      setEditingRace(null);
    },
  });

  const resetWorkoutForm = () => {
    setWorkoutForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      type: 'easy',
      planned_distance_km: '',
      actual_distance_km: '',
      actual_duration: '',
      pace_min_km: '',
      heart_rate_avg: '',
      description: '',
      notes: '',
      feeling: '',
      photos: [],
      completed: false
    });
  };

  // Auto-calculate pace when distance and duration change
  const calculatePace = (distance, duration) => {
    if (!distance || !duration) return '';
    
    // Parse duration (format: MM:SS or HH:MM:SS)
    const parts = duration.split(':');
    let totalMinutes = 0;
    
    if (parts.length === 2) {
      totalMinutes = parseInt(parts[0]) + parseInt(parts[1]) / 60;
    } else if (parts.length === 3) {
      totalMinutes = parseInt(parts[0]) * 60 + parseInt(parts[1]) + parseInt(parts[2]) / 60;
    }
    
    const pace = totalMinutes / parseFloat(distance);
    return pace.toFixed(2);
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    const uploadPromises = files.map(file => db.integrations.Core.UploadFile({ file }));
    const results = await Promise.all(uploadPromises);
    const photoUrls = results.map(r => r.file_url);
    setWorkoutForm({ ...workoutForm, photos: [...(workoutForm.photos || []), ...photoUrls] });
  };

  const resetRaceForm = () => {
    setRaceForm({
      name: '',
      date: '',
      distance_km: '',
      location: '',
      target_time: '',
      priority: 'B',
      notes: ''
    });
  };

  const handleDayClick = (date) => {
    const workout = getWorkoutForDay(date);
    if (workout) {
      setEditingWorkout(workout);
      setWorkoutForm({
        ...workout,
        planned_distance_km: workout.planned_distance_km || '',
        actual_distance_km: workout.actual_distance_km || '',
        pace_min_km: workout.pace_min_km || '',
        heart_rate_avg: workout.heart_rate_avg || '',
      });
    } else {
      setWorkoutForm({ ...workoutForm, date: format(date, 'yyyy-MM-dd') });
    }
    setShowWorkoutDialog(true);
  };

  const handleSaveWorkout = async () => {
    const data = {
      ...workoutForm,
      planned_distance_km: workoutForm.planned_distance_km ? parseFloat(workoutForm.planned_distance_km) : null,
      actual_distance_km: workoutForm.actual_distance_km ? parseFloat(workoutForm.actual_distance_km) : null,
      pace_min_km: workoutForm.pace_min_km ? parseFloat(workoutForm.pace_min_km) : null,
      heart_rate_avg: workoutForm.heart_rate_avg ? parseInt(workoutForm.heart_rate_avg) : null,
    };

    if (editingWorkout) {
      updateWorkoutMutation.mutate({ id: editingWorkout.id, data });
    } else {
      createWorkoutMutation.mutate(data);
    }
  };

  const handleSaveRace = () => {
    const data = {
      ...raceForm,
      distance_km: parseFloat(raceForm.distance_km),
    };

    if (editingRace) {
      updateRaceMutation.mutate({ id: editingRace.id, data });
    } else {
      createRaceMutation.mutate(data);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Running Tracker</h1>
            <p className="text-slate-400">Track your runs, plan your races</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                resetWorkoutForm();
                setEditingWorkout(null);
                setShowWorkoutDialog(true);
              }}
              variant="outline"
              className="border-slate-600 gap-2"
            >
              <Plus className="w-4 h-4" />
              Log Workout
            </Button>
            <Button 
              onClick={() => {
                resetRaceForm();
                setEditingRace(null);
                setShowRaceDialog(true);
              }}
              className="bg-gradient-to-r from-teal-500 to-emerald-500 gap-2"
            >
              <Flag className="w-4 h-4" />
              Add Race
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="This Week" value={`${weeklyKm.toFixed(1)} km`} icon={Footprints} color="teal" />
          <StatCard title="Last 4 Weeks" value={`${monthlyKm.toFixed(1)} km`} icon={TrendingUp} color="indigo" />
          <StatCard title="Workouts Done" value={`${completedWorkouts}/${weekWorkouts.length}`} icon={Target} color="emerald" />
          <StatCard title="Upcoming Races" value={upcomingRaces.length} icon={Flag} color="orange" />
        </div>

        <Tabs defaultValue="week" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700/50">
            <TabsTrigger value="week" className="data-[state=active]:bg-teal-500">Week View</TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-teal-500">Analytics</TabsTrigger>
            <TabsTrigger value="races" className="data-[state=active]:bg-teal-500">Races</TabsTrigger>
            <TabsTrigger value="shoes" className="data-[state=active]:bg-teal-500">Shoes</TabsTrigger>
          </TabsList>

          <TabsContent value="week" className="mt-6">
            <div className="flex items-center justify-between mb-6">
              <Button variant="ghost" size="icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="text-slate-400">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-semibold text-white">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="text-slate-400">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-2 md:gap-4">
              {weekDays.map((day, i) => {
                const workout = getWorkoutForDay(day);
                const isToday = isSameDay(day, new Date());
                const isPast = day < new Date() && !isToday;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleDayClick(day)}
                    className={`cursor-pointer rounded-xl border p-3 min-h-[120px] transition-all ${
                      isToday ? 'bg-teal-500/10 border-teal-500/40' : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-center mb-2">
                      <p className="text-xs text-slate-400">{format(day, 'EEE')}</p>
                      <p className={`text-lg font-bold ${isToday ? 'text-teal-400' : 'text-white'}`}>{format(day, 'd')}</p>
                    </div>

                    {workout ? (
                      <WorkoutCard workout={workout} compact onClick={() => handleDayClick(day)} />
                    ) : (
                      <div className="flex items-center justify-center h-12 text-slate-600 text-sm">
                        {isPast ? 'Rest' : '+ Add'}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold text-white mb-4">This Week's Workouts</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {weekWorkouts.map(workout => (
                  <WorkoutCard 
                    key={workout.id} 
                    workout={workout}
                    onClick={() => {
                      setEditingWorkout(workout);
                      setWorkoutForm({ ...workout, planned_distance_km: workout.planned_distance_km || '', actual_distance_km: workout.actual_distance_km || '' });
                      setShowWorkoutDialog(true);
                    }}
                  />
                ))}
                {weekWorkouts.length === 0 && <p className="text-slate-500 col-span-full text-center py-8">No workouts this week</p>}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <RunningAnalytics workouts={allWorkouts} />
          </TabsContent>

          <TabsContent value="races" className="mt-6">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Flag className="w-5 h-5 text-teal-400" />
                  Upcoming Races
                </h3>
                <div className="space-y-4">
                  {upcomingRaces.map(race => (
                    <RaceCard key={race.id} race={race} onClick={() => { setEditingRace(race); setRaceForm(race); setShowRaceDialog(true); }} />
                  ))}
                  {upcomingRaces.length === 0 && <p className="text-slate-500 text-center py-8">No upcoming races</p>}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Past Races</h3>
                <div className="space-y-4">
                  {pastRaces.map(race => (
                    <RaceCard key={race.id} race={race} onClick={() => { setEditingRace(race); setRaceForm(race); setShowRaceDialog(true); }} />
                  ))}
                  {pastRaces.length === 0 && <p className="text-slate-500 text-center py-8">No past races</p>}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="shoes" className="mt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shoes.map(shoe => (
                <motion.div key={shoe.id} className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{shoe.name}</h3>
                      <p className="text-sm text-slate-400">{shoe.brand}</p>
                    </div>
                    <CircleDot className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Distance</span>
                      <span className="text-white">{shoe.total_km || 0} km</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-700/50">
                      <div 
                        className={`h-full rounded-full ${(shoe.total_km || 0) > (shoe.max_km || 800) * 0.8 ? 'bg-rose-500' : 'bg-teal-500'}`}
                        style={{ width: `${Math.min(((shoe.total_km || 0) / (shoe.max_km || 800)) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">{(shoe.max_km || 800) - (shoe.total_km || 0)} km remaining</p>
                  </div>
                </motion.div>
              ))}
              {shoes.length === 0 && <p className="text-slate-500 col-span-full text-center py-8">No shoes added yet</p>}
            </div>
          </TabsContent>
        </Tabs>

        <QuoteDisplay context="running" />
      </div>

      <Dialog open={showWorkoutDialog} onOpenChange={setShowWorkoutDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingWorkout ? 'Edit Workout' : 'Log Workout'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-400">Date</Label>
                <Input type="date" value={workoutForm.date} onChange={(e) => setWorkoutForm({ ...workoutForm, date: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div>
                <Label className="text-slate-400">Type</Label>
                <Select value={workoutForm.type} onValueChange={(value) => setWorkoutForm({ ...workoutForm, type: value })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {workoutTypes.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-slate-400">Description</Label>
              <Input value={workoutForm.description} onChange={(e) => setWorkoutForm({ ...workoutForm, description: e.target.value })} placeholder="e.g., 8x400m @ 5K pace" className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-400">Planned Distance (km)</Label>
                <Input type="number" step="0.1" value={workoutForm.planned_distance_km} onChange={(e) => setWorkoutForm({ ...workoutForm, planned_distance_km: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div>
                <Label className="text-slate-400">Actual Distance (km)</Label>
                <Input 
                  type="number" 
                  step="0.1" 
                  value={workoutForm.actual_distance_km} 
                  onChange={(e) => {
                    const newDistance = e.target.value;
                    const autoPace = calculatePace(newDistance, workoutForm.actual_duration);
                    setWorkoutForm({ 
                      ...workoutForm, 
                      actual_distance_km: newDistance,
                      pace_min_km: autoPace || workoutForm.pace_min_km
                    });
                  }} 
                  className="bg-slate-800 border-slate-700 text-white" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-400">Duration (MM:SS or HH:MM:SS)</Label>
                <Input 
                  value={workoutForm.actual_duration} 
                  onChange={(e) => {
                    const newDuration = e.target.value;
                    const autoPace = calculatePace(workoutForm.actual_distance_km, newDuration);
                    setWorkoutForm({ 
                      ...workoutForm, 
                      actual_duration: newDuration,
                      pace_min_km: autoPace || workoutForm.pace_min_km
                    });
                  }} 
                  placeholder="45:00" 
                  className="bg-slate-800 border-slate-700 text-white" 
                />
              </div>
              <div>
                <Label className="text-slate-400">Avg Pace (min/km) - Auto</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={workoutForm.pace_min_km} 
                  onChange={(e) => setWorkoutForm({ ...workoutForm, pace_min_km: e.target.value })} 
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="Auto-calculated" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-400">Avg Heart Rate</Label>
                <Input type="number" value={workoutForm.heart_rate_avg} onChange={(e) => setWorkoutForm({ ...workoutForm, heart_rate_avg: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div>
                <Label className="text-slate-400">How did it feel?</Label>
                <Select value={workoutForm.feeling} onValueChange={(value) => setWorkoutForm({ ...workoutForm, feeling: value })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {feelingOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-slate-400">Notes</Label>
              <RichTextEditor 
                content={workoutForm.notes} 
                onChange={(html) => setWorkoutForm({ ...workoutForm, notes: html })} 
                placeholder="How was the workout?" 
              />
            </div>
            <div>
              <Label className="text-slate-400">Photos</Label>
              <Input 
                type="file" 
                accept="image/*" 
                multiple 
                onChange={handlePhotoUpload} 
                className="bg-slate-800 border-slate-700 text-white" 
              />
              {workoutForm.photos?.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {workoutForm.photos.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-20 object-cover rounded" />
                      <button
                        onClick={() => setWorkoutForm({ ...workoutForm, photos: workoutForm.photos.filter((_, idx) => idx !== i) })}
                        className="absolute top-1 right-1 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="completed" checked={workoutForm.completed} onChange={(e) => setWorkoutForm({ ...workoutForm, completed: e.target.checked })} className="rounded border-slate-600" />
              <Label htmlFor="completed" className="text-slate-300">Mark as completed</Label>
            </div>
            <div className="flex gap-2">
              {editingWorkout && (
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    if (confirm('Delete this workout?')) {
                      deleteWorkoutMutation.mutate(editingWorkout.id);
                    }
                  }}
                  className="flex-1"
                >
                  Delete
                </Button>
              )}
              <Button onClick={handleSaveWorkout} className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500">
                {editingWorkout ? 'Save Changes' : 'Log Workout'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRaceDialog} onOpenChange={setShowRaceDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>{editingRace ? 'Edit Race' : 'Add Race'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-slate-400">Race Name</Label>
              <Input value={raceForm.name} onChange={(e) => setRaceForm({ ...raceForm, name: e.target.value })} placeholder="e.g., City Marathon 2026" className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-400">Date</Label>
                <Input type="date" value={raceForm.date} onChange={(e) => setRaceForm({ ...raceForm, date: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div>
                <Label className="text-slate-400">Distance (km)</Label>
                <Input type="number" step="0.1" value={raceForm.distance_km} onChange={(e) => setRaceForm({ ...raceForm, distance_km: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
              </div>
            </div>
            <div>
              <Label className="text-slate-400">Location</Label>
              <Input value={raceForm.location} onChange={(e) => setRaceForm({ ...raceForm, location: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-400">Target Time</Label>
                <Input value={raceForm.target_time} onChange={(e) => setRaceForm({ ...raceForm, target_time: e.target.value })} placeholder="1:30:00" className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div>
                <Label className="text-slate-400">Priority</Label>
                <Select value={raceForm.priority} onValueChange={(value) => setRaceForm({ ...raceForm, priority: value })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A Race (Goal)</SelectItem>
                    <SelectItem value="B">B Race (Important)</SelectItem>
                    <SelectItem value="C">C Race (Training)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              {editingRace && (
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    if (confirm('Delete this race?')) {
                      deleteRaceMutation.mutate(editingRace.id);
                    }
                  }}
                  className="flex-1"
                >
                  Delete
                </Button>
              )}
              <Button onClick={handleSaveRace} className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500">
                {editingRace ? 'Save Changes' : 'Add Race'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AIAssistant context="running" contextData={{}} />
    </div>
  );
}