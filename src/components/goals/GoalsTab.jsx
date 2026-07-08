const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Target, CheckCircle2, Circle, Grid, List, Flame, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GoalCard from '@/components/goals/GoalCard';
import StatCard from '@/components/ui/StatCard';

const categories = ['academic', 'athletic', 'personal', 'health', 'creative', 'social', 'career'];

export default function GoalsTab() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('grid');
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [goalForm, setGoalForm] = useState({ title: '', why_it_matters: '', category: 'personal', target_date: '', progress: 0, status: 'active', milestones: [], notes: '' });
  const [newMilestone, setNewMilestone] = useState('');

  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: () => db.entities.Goal.list('-created_date') });

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const filteredGoals = filterCategory === 'all' ? activeGoals : activeGoals.filter(g => g.category === filterCategory);
  const avgProgress = activeGoals.length > 0 ? Math.round(activeGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / activeGoals.length) : 0;

  const createGoalMutation = useMutation({ mutationFn: (data) => db.entities.Goal.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['goals'] }); resetGoalForm(); setShowGoalDialog(false); } });
  const updateGoalMutation = useMutation({ mutationFn: ({ id, data }) => db.entities.Goal.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['goals'] }); resetGoalForm(); setShowGoalDialog(false); setEditingGoal(null); } });
  const deleteGoalMutation = useMutation({ mutationFn: (id) => db.entities.Goal.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['goals'] }); resetGoalForm(); setShowGoalDialog(false); setEditingGoal(null); } });

  const resetGoalForm = () => { setGoalForm({ title: '', why_it_matters: '', category: 'personal', target_date: '', progress: 0, status: 'active', milestones: [], notes: '' }); setNewMilestone(''); };
  const handleEditGoal = (goal) => { setEditingGoal(goal); setGoalForm({ ...goal, milestones: goal.milestones || [] }); setShowGoalDialog(true); };
  const handleSaveGoal = () => { if (editingGoal) { updateGoalMutation.mutate({ id: editingGoal.id, data: goalForm }); } else { createGoalMutation.mutate(goalForm); } };
  const addMilestone = () => { if (newMilestone.trim() && !goalForm.milestones.some(m => m.title === newMilestone.trim())) { setGoalForm({ ...goalForm, milestones: [...goalForm.milestones, { title: newMilestone.trim(), completed: false }] }); setNewMilestone(''); } };
  const toggleMilestone = (index) => { const newMilestones = [...goalForm.milestones]; newMilestones[index].completed = !newMilestones[index].completed; setGoalForm({ ...goalForm, milestones: newMilestones }); };
  const removeMilestone = (index) => setGoalForm({ ...goalForm, milestones: goalForm.milestones.filter((_, i) => i !== index) });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3"><Target className="w-6 h-6 text-teal-400" />Goals & Projects</h2>
          <p className="text-slate-400">Track your ambitions and celebrate progress</p>
        </div>
        <Button onClick={() => { resetGoalForm(); setEditingGoal(null); setShowGoalDialog(true); }} className="bg-gradient-to-r from-teal-500 to-emerald-500 gap-2"><Plus className="w-4 h-4" />New Goal</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Active Goals" value={activeGoals.length} icon={Target} color="teal" />
        <StatCard title="Avg Progress" value={`${avgProgress}%`} icon={Flame} color="orange" />
        <StatCard title="Completed" value={completedGoals.length} icon={CheckCircle2} color="emerald" />
        <StatCard title="This Year" value={goals.filter(g => new Date(g.created_date) >= new Date(new Date().getFullYear(), 0, 1)).length} icon={Star} color="amber" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Select value={filterCategory} onValueChange={setFilterCategory}><SelectTrigger className="w-40 bg-slate-800/50 border-slate-700 text-white"><SelectValue placeholder="Filter" /></SelectTrigger><SelectContent><SelectItem value="all">All Categories</SelectItem>{categories.map(cat => <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>)}</SelectContent></Select>
        <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg">
          <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'bg-teal-500' : ''}><Grid className="w-4 h-4" /></Button>
          <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-teal-500' : ''}><List className="w-4 h-4" /></Button>
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="bg-slate-800/50 border border-slate-700/50"><TabsTrigger value="active" className="data-[state=active]:bg-teal-500">Active ({activeGoals.length})</TabsTrigger><TabsTrigger value="completed" className="data-[state=active]:bg-teal-500">Completed ({completedGoals.length})</TabsTrigger></TabsList>
        <TabsContent value="active" className="mt-6">
          <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
            <AnimatePresence>{filteredGoals.map(goal => <motion.div key={goal.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}><GoalCard goal={goal} onClick={() => handleEditGoal(goal)} /></motion.div>)}</AnimatePresence>
            {filteredGoals.length === 0 && <p className="text-slate-500 col-span-full text-center py-12">No active goals{filterCategory !== 'all' ? ` in ${filterCategory}` : ''}. Create one to get started!</p>}
          </div>
        </TabsContent>
        <TabsContent value="completed" className="mt-6">
          <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
            {completedGoals.map(goal => <GoalCard key={goal.id} goal={goal} onClick={() => handleEditGoal(goal)} />)}
            {completedGoals.length === 0 && <p className="text-slate-500 col-span-full text-center py-12">No completed goals yet. Keep working!</p>}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showGoalDialog} onOpenChange={(open) => { setShowGoalDialog(open); if (!open) { setEditingGoal(null); resetGoalForm(); } }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingGoal ? 'Edit Goal' : 'Create Goal'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label className="text-slate-400">Goal Title</Label><Input value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} placeholder="What do you want to achieve?" className="bg-slate-800 border-slate-700 text-white" /></div>
            <div><Label className="text-slate-400">Why It Matters</Label><Textarea value={goalForm.why_it_matters} onChange={(e) => setGoalForm({ ...goalForm, why_it_matters: e.target.value })} placeholder="Why is this goal important to you?" className="bg-slate-800 border-slate-700 text-white" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-slate-400">Category</Label><Select value={goalForm.category} onValueChange={(value) => setGoalForm({ ...goalForm, category: value })}><SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger><SelectContent>{categories.map(cat => <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-slate-400">Target Date</Label><Input type="date" value={goalForm.target_date} onChange={(e) => setGoalForm({ ...goalForm, target_date: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
            </div>
            <div><Label className="text-slate-400">Progress: {goalForm.progress}%</Label><Slider value={[goalForm.progress]} onValueChange={([value]) => setGoalForm({ ...goalForm, progress: value })} max={100} step={5} className="mt-2" /></div>
            <div><Label className="text-slate-400">Status</Label><Select value={goalForm.status} onValueChange={(value) => setGoalForm({ ...goalForm, status: value })}><SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="paused">Paused</SelectItem><SelectItem value="abandoned">Abandoned</SelectItem></SelectContent></Select></div>
            <div>
              <Label className="text-slate-400">Milestones</Label>
              <div className="flex gap-2 mt-2"><Input value={newMilestone} onChange={(e) => setNewMilestone(e.target.value)} placeholder="Add a milestone" className="bg-slate-800 border-slate-700 text-white" onKeyPress={(e) => e.key === 'Enter' && addMilestone()} /><Button onClick={addMilestone} variant="outline" className="border-slate-600"><Plus className="w-4 h-4" /></Button></div>
              <div className="space-y-2 mt-3">{goalForm.milestones.map((milestone, index) => <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50"><button onClick={() => toggleMilestone(index)}>{milestone.completed ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Circle className="w-5 h-5 text-slate-500" />}</button><span className={`flex-1 text-sm ${milestone.completed ? 'text-slate-500 line-through' : 'text-white'}`}>{milestone.title}</span><button onClick={() => removeMilestone(index)} className="text-slate-500 hover:text-rose-400">×</button></div>)}</div>
            </div>
            <div className="flex gap-2 pt-4">
              {editingGoal && <Button variant="destructive" onClick={() => deleteGoalMutation.mutate(editingGoal.id)} className="flex-1">Delete</Button>}
              <Button onClick={handleSaveGoal} className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500">{editingGoal ? 'Save Changes' : 'Create Goal'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}