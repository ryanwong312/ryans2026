const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { motion } from 'framer-motion';
import { format, subDays } from 'date-fns';
import { Plus, BookOpen, FileText, Clock, GraduationCap, AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RichTextEditor from '@/components/editor/RichTextEditor';
import SubjectCard from '@/components/study/SubjectCard';
import AIStudySessionSummary from '@/components/study/AIStudySessionSummary';
import AIAssistant from '@/components/ai/AIAssistant';
import StatCard from '@/components/ui/StatCard';
import StudyTimer from '@/components/study/StudyTimer';
import QuoteDisplay from '@/components/quotes/QuoteDisplay';

const ibGroups = [
  { value: 1, label: 'Group 1: Language & Literature' },
  { value: 2, label: 'Group 2: Language Acquisition' },
  { value: 3, label: 'Group 3: Individuals & Societies' },
  { value: 4, label: 'Group 4: Sciences' },
  { value: 5, label: 'Group 5: Mathematics' },
  { value: 6, label: 'Group 6: The Arts' },
  { value: 7, label: 'Core (TOK/EE/CAS)' },
];

const assignmentTypes = ['homework', 'essay', 'ia', 'presentation', 'exam', 'project', 'other'];

export default function Study() {
  const queryClient = useQueryClient();
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);

  const [subjectForm, setSubjectForm] = useState({ name: '', group: 1, level: 'HL', teacher: '', color: 'indigo', ia_progress: 0 });
  const [assignmentForm, setAssignmentForm] = useState({ subject_id: '', title: '', description: '', due_date: '', type: 'homework', priority: 'medium', status: 'not_started' });
  const [noteForm, setNoteForm] = useState({ subject_id: '', date: format(new Date(), 'yyyy-MM-dd'), title: '', content: '' });
  const [sessionForm, setSessionForm] = useState({ subject_id: '', date: format(new Date(), 'yyyy-MM-dd'), duration_minutes: 45, topic: '', type: 'self_study', productivity_rating: 3 });

  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: () => db.entities.IBSubject.list('group') });
  const { data: assignments = [] } = useQuery({ queryKey: ['assignments'], queryFn: () => db.entities.Assignment.list('due_date') });
  const { data: classNotes = [] } = useQuery({ queryKey: ['class-notes'], queryFn: () => db.entities.ClassNote.list('-date') });
  const { data: studySessions = [] } = useQuery({ queryKey: ['study-sessions'], queryFn: () => db.entities.StudySession.list('-date') });

  const weekStart = format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const weekSessions = studySessions.filter(s => s.date >= weekStart);
  const weeklyStudyMinutes = weekSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const pendingAssignments = assignments.filter(a => a.status !== 'completed' && a.status !== 'submitted');
  const overdueAssignments = pendingAssignments.filter(a => new Date(a.due_date) < new Date());

  const getSubjectStudyHours = (subjectId) => Math.round(studySessions.filter(s => s.subject_id === subjectId).reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60);
  const getSubjectNotesCount = (subjectId) => classNotes.filter(n => n.subject_id === subjectId).length;

  const createSubjectMutation = useMutation({ mutationFn: (data) => db.entities.IBSubject.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subjects'] }); setShowSubjectDialog(false); setSubjectForm({ name: '', group: 1, level: 'HL', teacher: '', color: 'indigo', ia_progress: 0 }); } });
  const updateSubjectMutation = useMutation({ mutationFn: ({ id, data }) => db.entities.IBSubject.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subjects'] }); setShowSubjectDialog(false); setEditingSubject(null); setSubjectForm({ name: '', group: 1, level: 'HL', teacher: '', color: 'indigo', ia_progress: 0 }); } });
  const deleteSubjectMutation = useMutation({ mutationFn: (id) => db.entities.IBSubject.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subjects'] }); setShowSubjectDialog(false); setEditingSubject(null); } });
  const createAssignmentMutation = useMutation({ mutationFn: (data) => db.entities.Assignment.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assignments'] }); setShowAssignmentDialog(false); } });
  const updateAssignmentMutation = useMutation({ 
    mutationFn: ({ id, data }) => db.entities.Assignment.update(id, data), 
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['assignments'] }); 
      setShowAssignmentDialog(false); 
      setEditingAssignment(null); 
    } 
  });
  const createNoteMutation = useMutation({ 
    mutationFn: (data) => db.entities.ClassNote.create(data), 
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['class-notes'] }); 
      setShowNoteDialog(false); 
    } 
  });
  
  const createSessionMutation = useMutation({ 
    mutationFn: (data) => db.entities.StudySession.create(data), 
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['study-sessions'] }); 
      setShowSessionDialog(false); 
    } 
  });

  const getSubjectName = (id) => subjects.find(s => s.id === id)?.name || 'Unknown';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3"><GraduationCap className="w-8 h-8 text-indigo-400" />Study Hub</h1>
            <p className="text-slate-400">IB Diploma Programme</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowSessionDialog(true)} variant="outline" className="border-slate-600 gap-2"><Clock className="w-4 h-4" />Log Session</Button>
            <Button onClick={() => setShowNoteDialog(true)} variant="outline" className="border-slate-600 gap-2"><FileText className="w-4 h-4" />Add Notes</Button>
            <Button onClick={() => setShowAssignmentDialog(true)} className="bg-gradient-to-r from-indigo-500 to-purple-500 gap-2"><Plus className="w-4 h-4" />Add Assignment</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Weekly Study" value={`${Math.floor(weeklyStudyMinutes / 60)}h ${weeklyStudyMinutes % 60}m`} icon={Clock} color="indigo" />
          <StatCard title="Pending Tasks" value={pendingAssignments.length} icon={FileText} color="amber" />
          <StatCard title="Overdue" value={overdueAssignments.length} icon={AlertTriangle} color="rose" />
          <StatCard title="Total Notes" value={classNotes.length} icon={BookOpen} color="teal" />
        </div>

        <Tabs defaultValue="subjects" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700/50">
            <TabsTrigger value="subjects" className="data-[state=active]:bg-indigo-500">Subjects</TabsTrigger>
            <TabsTrigger value="assignments" className="data-[state=active]:bg-indigo-500">Assignments</TabsTrigger>
            <TabsTrigger value="notes" className="data-[state=active]:bg-indigo-500">Class Notes</TabsTrigger>
            <TabsTrigger value="sessions" className="data-[state=active]:bg-indigo-500">Study Log</TabsTrigger>
          </TabsList>

          <TabsContent value="subjects" className="mt-6">
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowSubjectDialog(true)} variant="outline" className="border-slate-600 gap-2"><Plus className="w-4 h-4" />Add Subject</Button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map(subject => <SubjectCard key={subject.id} subject={subject} studyHours={getSubjectStudyHours(subject.id)} notesCount={getSubjectNotesCount(subject.id)} onClick={() => { setEditingSubject(subject); setSubjectForm(subject); setShowSubjectDialog(true); }} />)}
              {subjects.length === 0 && <p className="text-slate-500 col-span-full text-center py-12">No subjects added yet.</p>}
            </div>
          </TabsContent>

          <TabsContent value="assignments" className="mt-6">
            <div className="space-y-4">
              {overdueAssignments.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-rose-400 mb-3 flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Overdue</h3>
                  <div className="space-y-2">
                    {overdueAssignments.map(a => <AssignmentRow key={a.id} assignment={a} subjects={subjects} onEdit={() => { setEditingAssignment(a); setAssignmentForm(a); setShowAssignmentDialog(true); }} onStatusChange={(status) => updateAssignmentMutation.mutate({ id: a.id, data: { status } })} />)}
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Pending</h3>
                <div className="space-y-2">
                  {pendingAssignments.filter(a => new Date(a.due_date) >= new Date()).map(a => <AssignmentRow key={a.id} assignment={a} subjects={subjects} onEdit={() => { setEditingAssignment(a); setAssignmentForm(a); setShowAssignmentDialog(true); }} onStatusChange={(status) => updateAssignmentMutation.mutate({ id: a.id, data: { status } })} />)}
                  {pendingAssignments.filter(a => new Date(a.due_date) >= new Date()).length === 0 && <p className="text-slate-500 text-center py-8">No pending assignments</p>}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="mt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classNotes.slice(0, 12).map(note => (
                <motion.div key={note.id} className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-5">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-300">{getSubjectName(note.subject_id)}</span>
                    <span className="text-xs text-slate-500">{format(new Date(note.date), 'MMM d')}</span>
                  </div>
                  <h3 className="font-semibold text-white mb-2">{note.title}</h3>
                  <div className="text-sm text-slate-400 line-clamp-3 prose prose-invert" dangerouslySetInnerHTML={{ __html: note.content }} />
                </motion.div>
              ))}
              {classNotes.length === 0 && <p className="text-slate-500 col-span-full text-center py-12">No class notes yet</p>}
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="mt-6">
            <AIStudySessionSummary studySessions={studySessions} subjects={subjects} />
            
            <div className="mt-6">
            <div className="space-y-3">
              {studySessions.slice(0, 20).map(session => (
                <motion.div key={session.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-indigo-500/20"><BookOpen className="w-4 h-4 text-indigo-400" /></div>
                    <div><h3 className="font-medium text-white">{getSubjectName(session.subject_id)}</h3><p className="text-sm text-slate-400">{session.topic || session.type}</p></div>
                  </div>
                  <div className="text-right"><p className="text-white font-medium">{session.duration_minutes} min</p><p className="text-xs text-slate-500">{format(new Date(session.date), 'MMM d')}</p></div>
                </motion.div>
              ))}
              {studySessions.length === 0 && <p className="text-slate-500 text-center py-12">No study sessions logged</p>}
              </div>
              </div>
              </TabsContent>
        </Tabs>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <QuoteDisplay context="study" />
          </div>
          <div>
            <StudyTimer onSessionComplete={(session) => {
              if (subjects.length > 0) {
                createSessionMutation.mutate({
                  subject_id: subjects[0].id,
                  date: format(new Date(), 'yyyy-MM-dd'),
                  duration_minutes: session.duration,
                  topic: 'Focus session',
                  type: 'self_study',
                  productivity_rating: 4
                });
              }
            }} />
          </div>
        </div>
      </div>

      <Dialog open={showSubjectDialog} onOpenChange={(open) => { setShowSubjectDialog(open); if (!open) { setEditingSubject(null); setSubjectForm({ name: '', group: 1, level: 'HL', teacher: '', color: 'indigo', ia_progress: 0 }); } }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader><DialogTitle>{editingSubject ? 'Edit Subject' : 'Add Subject'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label className="text-slate-400">Subject Name</Label><Input value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} placeholder="e.g., Biology" className="bg-slate-800 border-slate-700 text-white" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-slate-400">Group</Label><Select value={String(subjectForm.group)} onValueChange={(value) => setSubjectForm({ ...subjectForm, group: parseInt(value) })}><SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger><SelectContent>{ibGroups.map(g => <SelectItem key={g.value} value={String(g.value)}>{g.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-slate-400">Level</Label><Select value={subjectForm.level} onValueChange={(value) => setSubjectForm({ ...subjectForm, level: value })}><SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="HL">Higher Level (HL)</SelectItem><SelectItem value="SL">Standard Level (SL)</SelectItem><SelectItem value="Core">Core</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label className="text-slate-400">Teacher</Label><Input value={subjectForm.teacher} onChange={(e) => setSubjectForm({ ...subjectForm, teacher: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
            <div className="flex gap-2 pt-4">
              {editingSubject && <Button variant="destructive" onClick={() => { if (confirm('Delete this subject? All notes and assignments will remain but be unlinked.')) deleteSubjectMutation.mutate(editingSubject.id); }} className="flex-1">Delete</Button>}
              <Button onClick={() => editingSubject ? updateSubjectMutation.mutate({ id: editingSubject.id, data: subjectForm }) : createSubjectMutation.mutate(subjectForm)} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500">{editingSubject ? 'Save Changes' : 'Add Subject'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAssignmentDialog} onOpenChange={(open) => { setShowAssignmentDialog(open); if (!open) setEditingAssignment(null); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader><DialogTitle>{editingAssignment ? 'Edit Assignment' : 'Add Assignment'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label className="text-slate-400">Subject</Label><Select value={assignmentForm.subject_id} onValueChange={(value) => setAssignmentForm({ ...assignmentForm, subject_id: value })}><SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Select subject" /></SelectTrigger><SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-slate-400">Title</Label><Input value={assignmentForm.title} onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-slate-400">Due Date</Label><Input type="date" value={assignmentForm.due_date} onChange={(e) => setAssignmentForm({ ...assignmentForm, due_date: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
              <div><Label className="text-slate-400">Type</Label><Select value={assignmentForm.type} onValueChange={(value) => setAssignmentForm({ ...assignmentForm, type: value })}><SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger><SelectContent>{assignmentTypes.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <Button onClick={() => editingAssignment ? updateAssignmentMutation.mutate({ id: editingAssignment.id, data: assignmentForm }) : createAssignmentMutation.mutate(assignmentForm)} className="w-full bg-gradient-to-r from-indigo-500 to-purple-500">{editingAssignment ? 'Save Changes' : 'Add Assignment'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
          <DialogHeader><DialogTitle>Add Class Notes</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-slate-400">Subject</Label><Select value={noteForm.subject_id} onValueChange={(value) => setNoteForm({ ...noteForm, subject_id: value })}><SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Select subject" /></SelectTrigger><SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-slate-400">Date</Label><Input type="date" value={noteForm.date} onChange={(e) => setNoteForm({ ...noteForm, date: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
            </div>
            <div><Label className="text-slate-400">Title</Label><Input value={noteForm.title} onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })} placeholder="Topic or chapter title" className="bg-slate-800 border-slate-700 text-white" /></div>
            <div><Label className="text-slate-400">Notes</Label><RichTextEditor content={noteForm.content} onChange={(html) => setNoteForm({ ...noteForm, content: html })} placeholder="Take your notes here..." /></div>
            <Button onClick={() => createNoteMutation.mutate(noteForm)} className="w-full bg-gradient-to-r from-indigo-500 to-purple-500">Save Notes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader><DialogTitle>Log Study Session</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label className="text-slate-400">Subject</Label><Select value={sessionForm.subject_id} onValueChange={(value) => setSessionForm({ ...sessionForm, subject_id: value })}><SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Select subject" /></SelectTrigger><SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-slate-400">Date</Label><Input type="date" value={sessionForm.date} onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
              <div><Label className="text-slate-400">Duration (minutes)</Label><Input type="number" value={sessionForm.duration_minutes} onChange={(e) => setSessionForm({ ...sessionForm, duration_minutes: parseInt(e.target.value) })} className="bg-slate-800 border-slate-700 text-white" /></div>
            </div>
            <div><Label className="text-slate-400">Topic</Label><Input value={sessionForm.topic} onChange={(e) => setSessionForm({ ...sessionForm, topic: e.target.value })} placeholder="What did you study?" className="bg-slate-800 border-slate-700 text-white" /></div>
            <Button onClick={() => createSessionMutation.mutate(sessionForm)} className="w-full bg-gradient-to-r from-indigo-500 to-purple-500">Log Session</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AIAssistant context="study" contextData={{ subjects }} />
    </div>
  );
}

function AssignmentRow({ assignment, subjects, onEdit, onStatusChange }) {
  const subject = subjects.find(s => s.id === assignment.subject_id);
  const isOverdue = new Date(assignment.due_date) < new Date() && assignment.status !== 'completed' && assignment.status !== 'submitted';
  const isCompleted = assignment.status === 'completed' || assignment.status === 'submitted';

  const priorityStyles = {
    high: 'border-rose-500/50 border-2',
    medium: 'border-amber-500/50 border-2',
    low: 'border-emerald-500/50 border-2',
    none: ''
  };

  const priorityIcons = {
    high: '❗',
    medium: '⏰',
    low: '✅',
    none: ''
  };

  return (
    <motion.div className={`flex items-center gap-4 p-4 rounded-xl border transition cursor-pointer ${isCompleted ? 'bg-slate-800/20 border-slate-800/50' : isOverdue ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600'} ${!isCompleted && !isOverdue && assignment.priority ? priorityStyles[assignment.priority] : ''}`} onClick={onEdit}>
      <button onClick={(e) => { e.stopPropagation(); onStatusChange(isCompleted ? 'not_started' : 'completed'); }} className="flex-shrink-0">
        {isCompleted ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <Circle className="w-6 h-6 text-slate-500 hover:text-teal-400 transition" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {assignment.priority && assignment.priority !== 'none' && (
            <span className="text-lg">{priorityIcons[assignment.priority]}</span>
          )}
          <h3 className={`font-medium ${isCompleted ? 'text-slate-500 line-through' : 'text-white'}`}>{assignment.title}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${assignment.priority === 'high' ? 'bg-rose-500/20 text-rose-300' : assignment.priority === 'medium' ? 'bg-amber-500/20 text-amber-300' : assignment.priority === 'low' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-300'}`} className="capitalize">{assignment.type}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-400">{subject && <span>{subject.name}</span>}<span className="capitalize">{assignment.type}</span></div>
      </div>
      <div className="text-right"><p className={`text-sm font-medium ${isOverdue ? 'text-rose-400' : isCompleted ? 'text-slate-500' : 'text-slate-300'}`}>{format(new Date(assignment.due_date), 'MMM d')}</p></div>
    </motion.div>
  );
}