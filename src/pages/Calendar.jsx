const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RecurringEventForm from '@/components/calendar/RecurringEventForm';
import { Switch } from '@/components/ui/switch';
import CalendarEventItem from '@/components/calendar/CalendarEventItem';
import GoogleCalendarSync from '@/components/calendar/GoogleCalendarSync';
import AccountManager from '@/components/calendar/AccountManager';

const categoryColors = { academic: 'bg-indigo-500', fitness: 'bg-emerald-500', social: 'bg-purple-500', personal: 'bg-teal-500', work: 'bg-amber-500' };

export default function Calendar() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({ title: '', date: format(new Date(), 'yyyy-MM-dd'), start_time: '', end_time: '', all_day: false, category: 'personal', status: 'confirmed', location: '', description: '', tags: [] });

  // Account filter state
  const [filterAccounts, setFilterAccounts] = useState(() => {
    try {
      const tokens = JSON.parse(localStorage.getItem('sync_tokens') || '{}');
      return Object.keys(tokens);
    } catch { return []; }
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const { data: events = [], refetch: refetchEvents } = useQuery({
    queryKey: ['calendar-events', format(monthStart, 'yyyy-MM'), filterAccounts],
    queryFn: async () => {
      let result = await db.entities.CalendarEvent.filter({ 
        date: { $gte: format(calendarStart, 'yyyy-MM-dd'), $lte: format(calendarEnd, 'yyyy-MM-dd') }
      });
      // Filter by selected accounts
      if (filterAccounts.length > 0) {
        result = result.filter(e => filterAccounts.includes(e.synced_by));
      }
      return result;
    },
  });

  const { data: allEvents = [] } = useQuery({
    queryKey: ['all-calendar-events'],
    queryFn: async () => {
      const result = await db.entities.CalendarEvent.list('-date');
      return result;
    },
    staleTime: 0,
  });

  // Get list of connected accounts from localStorage
  const [connectedAccounts, setConnectedAccounts] = useState(() => {
    try {
      const tokens = JSON.parse(localStorage.getItem('sync_tokens') || '{}');
      return Object.values(tokens);
    } catch { return []; }
  });

  const { data: workouts = [] } = useQuery({ queryKey: ['workouts-calendar', format(monthStart, 'yyyy-MM')], queryFn: () => db.entities.Workout.filter({ date: { $gte: format(calendarStart, 'yyyy-MM-dd'), $lte: format(calendarEnd, 'yyyy-MM-dd') } }) });
  const { data: assignments = [] } = useQuery({ queryKey: ['assignments-calendar'], queryFn: () => db.entities.Assignment.filter({ due_date: { $gte: format(calendarStart, 'yyyy-MM-dd'), $lte: format(calendarEnd, 'yyyy-MM-dd') } }) });
  const { data: studySessions = [] } = useQuery({ queryKey: ['study-sessions-calendar', format(monthStart, 'yyyy-MM')], queryFn: () => db.entities.StudySession.filter({ date: { $gte: format(calendarStart, 'yyyy-MM-dd'), $lte: format(calendarEnd, 'yyyy-MM-dd') } }) });

  const getEventsForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return { events: events.filter(e => e.date === dateStr), workouts: workouts.filter(w => w.date === dateStr), assignments: assignments.filter(a => a.due_date === dateStr), studySessions: studySessions.filter(s => s.date === dateStr) };
  };

  const selectedDayData = getEventsForDay(selectedDate);

  const createEventMutation = useMutation({ mutationFn: (data) => db.entities.CalendarEvent.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['calendar-events'] }); resetEventForm(); setShowEventDialog(false); } });
  const updateEventMutation = useMutation({ mutationFn: ({ id, data }) => db.entities.CalendarEvent.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['calendar-events'] }); resetEventForm(); setShowEventDialog(false); setEditingEvent(null); } });
  const deleteEventMutation = useMutation({ mutationFn: (id) => db.entities.CalendarEvent.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['calendar-events'] }); resetEventForm(); setShowEventDialog(false); setEditingEvent(null); } });

  // Clean Duplicates Mutation
  const cleanDuplicatesMutation = useMutation({
    mutationFn: async () => {
      const allEventsList = await db.entities.CalendarEvent.list('-date');
      const seen = new Map();
      const toDelete = [];
      allEventsList.forEach(event => {
        const key = `${event.title}|${event.date}|${event.start_time}|${event.all_day}`;
        if (seen.has(key)) {
          const existing = seen.get(key);
          if (event.google_event_id && !existing.google_event_id) {
            toDelete.push(existing.id);
            seen.set(key, event);
          } else {
            toDelete.push(event.id);
          }
        } else {
          seen.set(key, event);
        }
      });
      for (const id of toDelete) {
        await db.entities.CalendarEvent.delete(id);
      }
      return toDelete.length;
    },
    onSuccess: (count) => {
      toast({
        title: `🧹 Removed ${count} duplicate events`,
        description: count === 0 ? 'No duplicates found.' : 'Your calendar is now clean.',
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['all-calendar-events'] });
    },
    onError: (error) => {
      toast({
        title: 'Error cleaning duplicates',
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
    }
  });

  const resetEventForm = () => setEventForm({ title: '', date: format(selectedDate, 'yyyy-MM-dd'), start_time: '', end_time: '', all_day: false, category: 'personal', status: 'confirmed', location: '', description: '', tags: [] });
  const handleDayClick = (date) => setSelectedDate(date);
  const handleAddEvent = () => { setEventForm({ ...eventForm, date: format(selectedDate, 'yyyy-MM-dd') }); setEditingEvent(null); setShowEventDialog(true); };
  const handleEditEvent = (event) => { setEditingEvent(event); setEventForm({ ...event, tags: event.tags || [] }); setShowEventDialog(true); };
  const handleSaveEvent = () => { if (editingEvent) { updateEventMutation.mutate({ id: editingEvent.id, data: eventForm }); } else { createEventMutation.mutate(eventForm); } };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Handler for account changes
  const handleAccountsChange = (newTokens) => {
    const emails = Object.keys(newTokens);
    setFilterAccounts(emails);
    setConnectedAccounts(Object.values(newTokens));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="text-slate-400"><ChevronLeft className="w-5 h-5" /></Button>
            <h1 className="text-2xl md:text-3xl font-bold text-white min-w-[200px] text-center">{format(currentMonth, 'MMMM yyyy')}</h1>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="text-slate-400"><ChevronRight className="w-5 h-5" /></Button>
          </div>
        </div>

        {/* Account Filter Toggles */}
        {connectedAccounts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <span className="text-xs font-medium text-slate-400 mr-2">Show:</span>
            {connectedAccounts.map(acc => {
              const isActive = filterAccounts.includes(acc.email);
              return (
                <button
                  key={acc.email}
                  onClick={() => {
                    if (isActive) {
                      setFilterAccounts(filterAccounts.filter(e => e !== acc.email));
                    } else {
                      setFilterAccounts([...filterAccounts, acc.email]);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    isActive 
                      ? 'bg-teal-500 text-white' 
                      : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {isActive ? '✓' : '○'} {acc.email}
                </button>
              );
            })}
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }} 
            className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-900"
          >
            Today
          </Button>

          <Button 
            onClick={handleAddEvent} 
            className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:opacity-90 gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => { console.log('All events:', allEvents); }} 
            className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-900"
          >
            Log All Events
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => cleanDuplicatesMutation.mutate()} 
            className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-900"
            disabled={cleanDuplicatesMutation.isPending}
          >
            {cleanDuplicatesMutation.isPending ? 'Cleaning...' : 'Clean Duplicates'}
          </Button>

          <div className="ml-auto">
            <GoogleCalendarSync className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-900" />
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map(day => <div key={day} className="text-center py-2 text-sm font-medium text-slate-400">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                const dayData = getEventsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const totalItems = dayData.events.length + dayData.workouts.length + dayData.assignments.length + dayData.studySessions.length;

                return (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }} onClick={() => handleDayClick(day)}
                    className={`min-h-[100px] p-2 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-teal-500/20 border-teal-500/50' : isToday ? 'bg-slate-800/50 border-slate-600' : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600'} ${!isCurrentMonth ? 'opacity-40' : ''}`}>
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'text-teal-400' : isCurrentMonth ? 'text-white' : 'text-slate-500'}`}>{format(day, 'd')}</div>
                    <div className="space-y-1">
                      {dayData.events.slice(0, 2).map(event => <div key={event.id} className={`text-xs px-1.5 py-0.5 rounded truncate ${categoryColors[event.category]} text-white`}>{event.title}</div>)}
                      {dayData.studySessions.slice(0, 1).map(session => <div key={session.id} className="text-xs px-1.5 py-0.5 rounded truncate bg-indigo-500/30 text-indigo-300 border border-indigo-500/30">📖 {session.duration_minutes}m</div>)}
                      {dayData.workouts.slice(0, 1).map(workout => <div key={workout.id} className="text-xs px-1.5 py-0.5 rounded truncate bg-cyan-500/30 text-cyan-300 border border-cyan-500/30">{workout.type}</div>)}
                      {dayData.assignments.slice(0, 1).map(assignment => <div key={assignment.id} className="text-xs px-1.5 py-0.5 rounded truncate bg-rose-500/30 text-rose-300 border border-rose-500/30">📚 {assignment.title}</div>)}
                      {totalItems > 3 && <div className="text-xs text-slate-400">+{totalItems - 3} more</div>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-4">
              {/* Account Manager */}
              <AccountManager onAccountsChange={handleAccountsChange} />
              
              {/* Sync button is already in action row, but we can keep it here as well or remove duplicate */}
              
              <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">{format(selectedDate, 'MMMM d')}</h2>
                  <Button size="sm" onClick={handleAddEvent} className="bg-teal-500/20 text-teal-400 hover:bg-teal-500/30"><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="space-y-4">
                  {selectedDayData.events.length > 0 && <div><h3 className="text-sm font-medium text-slate-400 mb-2">Events</h3><div className="space-y-2">{selectedDayData.events.map(event => <CalendarEventItem key={event.id} event={event} compact onClick={() => handleEditEvent(event)} />)}</div></div>}
                  {selectedDayData.studySessions.length > 0 && <div><h3 className="text-sm font-medium text-slate-400 mb-2">Study Sessions</h3><div className="space-y-2">{selectedDayData.studySessions.map(session => <div key={session.id} className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20"><p className="text-sm font-medium text-white">{session.name || session.topic || 'Study Session'}</p><p className="text-xs text-slate-400">{session.duration_minutes} min{session.start_time ? ' · ' + session.start_time : ''}</p>{session.tags?.length > 0 && <div className="flex gap-1 mt-1">{session.tags.map(t => <span key={t} className="px-1 py-0.5 text-xs rounded bg-indigo-500/20 text-indigo-300">#{t}</span>)}</div>}</div>)}</div></div>}
                  {selectedDayData.workouts.length > 0 && <div><h3 className="text-sm font-medium text-slate-400 mb-2">Workouts</h3><div className="space-y-2">{selectedDayData.workouts.map(workout => <div key={workout.id} className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20"><p className="text-sm font-medium text-white capitalize">{workout.type?.replace('_', ' ')}</p>{workout.planned_distance_km && <p className="text-xs text-slate-400">{workout.planned_distance_km} km</p>}</div>)}</div></div>}
                  {selectedDayData.assignments.length > 0 && <div><h3 className="text-sm font-medium text-slate-400 mb-2">Due Today</h3><div className="space-y-2">{selectedDayData.assignments.map(assignment => <div key={assignment.id} className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20"><p className="text-sm font-medium text-white">{assignment.title}</p><p className="text-xs text-slate-400 capitalize">{assignment.type}</p></div>)}</div></div>}
                  {selectedDayData.events.length === 0 && selectedDayData.workouts.length === 0 && selectedDayData.assignments.length === 0 && selectedDayData.studySessions.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No events</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showEventDialog} onOpenChange={(open) => { setShowEventDialog(open); if (!open) { setEditingEvent(null); resetEventForm(); } }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader><DialogTitle>{editingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label className="text-slate-400">Title</Label><Input value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} placeholder="Event title" className="bg-slate-800 border-slate-700 text-white" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-slate-400">Date</Label><Input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
              <div><Label className="text-slate-400">Category</Label><Select value={eventForm.category} onValueChange={(value) => setEventForm({ ...eventForm, category: value })}><SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="academic">Academic</SelectItem><SelectItem value="fitness">Fitness</SelectItem><SelectItem value="social">Social</SelectItem><SelectItem value="personal">Personal</SelectItem><SelectItem value="work">Work</SelectItem></SelectContent></Select></div>
            </div>
            
            <RecurringEventForm eventForm={eventForm} setEventForm={setEventForm} />
            <div className="flex items-center gap-4"><div className="flex items-center gap-2"><Switch checked={eventForm.all_day} onCheckedChange={(checked) => setEventForm({ ...eventForm, all_day: checked })} /><Label className="text-slate-300">All Day</Label></div></div>
            {!eventForm.all_day && <div className="grid grid-cols-2 gap-4"><div><Label className="text-slate-400">Start Time</Label><Input type="time" value={eventForm.start_time} onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div><div><Label className="text-slate-400">End Time</Label><Input type="time" value={eventForm.end_time} onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div></div>}
            <div><Label className="text-slate-400">Location</Label><Input value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} placeholder="Add location" className="bg-slate-800 border-slate-700 text-white" /></div>
            <div><Label className="text-slate-400">Status</Label><Select value={eventForm.status} onValueChange={(value) => setEventForm({ ...eventForm, status: value })}><SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="confirmed">Confirmed</SelectItem><SelectItem value="tentative">Tentative</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></div>
            <div><Label className="text-slate-400">Description</Label><Textarea value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} placeholder="Add details..." className="bg-slate-800 border-slate-700 text-white" /></div>
            <div className="flex gap-2">
              {editingEvent && <Button variant="destructive" onClick={() => deleteEventMutation.mutate(editingEvent.id)} className="flex-1">Delete</Button>}
              <Button onClick={handleSaveEvent} className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500">{editingEvent ? 'Save Changes' : 'Add Event'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}