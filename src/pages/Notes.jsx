const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Plus, Search, Pin, Folder, Tag, MoreHorizontal, Trash2, FileText, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RichTextEditor from '@/components/editor/RichTextEditor';
import EnhancedWhiteboard from '@/components/whiteboard/EnhancedWhiteboard';
import UnsavedChangesDialog from '@/components/shared/UnsavedChangesDialog';
import GoalsTab from '@/components/goals/GoalsTab';

export default function Notes() {
  const queryClient = useQueryClient();
  const [topTab, setTopTab] = useState('notes');
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [tagInput, setTagInput] = useState('');
  const [noteForm, setNoteForm] = useState({ title: '', content: '', tags: [], folder: '', pinned: false, whiteboard_data: null });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('text');

  const { data: notes = [] } = useQuery({ queryKey: ['notes'], queryFn: () => db.entities.Note.list('-created_date') });

  const folders = [...new Set(notes.map(n => n.folder).filter(Boolean))];
  const allTags = [...new Set(notes.flatMap(n => n.tags || []))];

  const filteredNotes = notes.filter(note => {
    const matchesSearch = !searchQuery || note.title?.toLowerCase().includes(searchQuery.toLowerCase()) || note.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = selectedFolder === 'all' || (selectedFolder === 'unfiled' ? !note.folder : note.folder === selectedFolder);
    return matchesSearch && matchesFolder;
  }).sort((a, b) => { if (a.pinned && !b.pinned) return -1; if (!a.pinned && b.pinned) return 1; return 0; });

  const createNoteMutation = useMutation({ mutationFn: (data) => db.entities.Note.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notes'] }); resetNoteForm(); setShowNoteDialog(false); } });
  const updateNoteMutation = useMutation({ mutationFn: ({ id, data }) => db.entities.Note.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notes'] }); resetNoteForm(); setShowNoteDialog(false); setEditingNote(null); } });
  const deleteNoteMutation = useMutation({ mutationFn: (id) => db.entities.Note.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notes'] }); } });

  const resetNoteForm = () => { setNoteForm({ title: '', content: '', tags: [], folder: '', pinned: false, whiteboard_data: null }); setTagInput(''); setActiveTab('text'); };
  const handleEditNote = (note) => { setEditingNote(note); setNoteForm({ title: note.title || '', content: note.content || '', tags: note.tags || [], folder: note.folder || '', pinned: note.pinned || false, whiteboard_data: note.whiteboard_data || null }); setShowNoteDialog(true); };
  const handleWhiteboardSave = (data) => { setNoteForm({ ...noteForm, whiteboard_data: data }); setHasUnsavedChanges(true); };
  const handleSaveNote = () => { if (editingNote) { updateNoteMutation.mutate({ id: editingNote.id, data: noteForm }); } else { createNoteMutation.mutate(noteForm); } };
  const handleTogglePin = async (note) => { await db.entities.Note.update(note.id, { pinned: !note.pinned }); queryClient.invalidateQueries({ queryKey: ['notes'] }); };
  const addTag = () => { if (tagInput.trim() && !noteForm.tags.includes(tagInput.trim())) { setNoteForm({ ...noteForm, tags: [...noteForm.tags, tagInput.trim()] }); setTagInput(''); } };
  const removeTag = (tag) => setNoteForm({ ...noteForm, tags: noteForm.tags.filter(t => t !== tag) });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              {topTab === 'notes' ? <FileText className="w-8 h-8 text-amber-400" /> : <Target className="w-8 h-8 text-teal-400" />}
              {topTab === 'notes' ? 'Notes & Ideas' : 'Goals & Projects'}
            </h1>
            <p className="text-slate-400">{topTab === 'notes' ? 'Capture thoughts, ideas, and inspiration' : 'Track your ambitions and celebrate progress'}</p>
          </div>
          {topTab === 'notes' && (
            <Button onClick={() => { resetNoteForm(); setEditingNote(null); setShowNoteDialog(true); }} className="bg-gradient-to-r from-amber-500 to-orange-500 gap-2"><Plus className="w-4 h-4" />New Note</Button>
          )}
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setTopTab('notes')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${topTab === 'notes' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>📝 Notes</button>
          <button onClick={() => setTopTab('goals')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${topTab === 'goals' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>🎯 Goals</button>
        </div>

        {topTab === 'goals' ? (
          <GoalsTab />
        ) : (
          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <div className="sticky top-8 space-y-6">
                <div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" /><Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search notes..." className="pl-10 bg-slate-800/50 border-slate-700 text-white" /></div>
                <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-4">
                  <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2"><Folder className="w-4 h-4" />Folders</h3>
                  <div className="space-y-1">
                    <button onClick={() => setSelectedFolder('all')} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${selectedFolder === 'all' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-300 hover:bg-slate-700/50'}`}>All Notes ({notes.length})</button>
                    <button onClick={() => setSelectedFolder('unfiled')} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${selectedFolder === 'unfiled' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-300 hover:bg-slate-700/50'}`}>Unfiled ({notes.filter(n => !n.folder).length})</button>
                    {folders.map(folder => <button key={folder} onClick={() => setSelectedFolder(folder)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${selectedFolder === folder ? 'bg-amber-500/20 text-amber-300' : 'text-slate-300 hover:bg-slate-700/50'}`}>{folder} ({notes.filter(n => n.folder === folder).length})</button>)}
                  </div>
                </div>
                {allTags.length > 0 && <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-4"><h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2"><Tag className="w-4 h-4" />Tags</h3><div className="flex flex-wrap gap-2">{allTags.map(tag => <span key={tag} className="px-2 py-1 text-xs rounded-full bg-slate-700/50 text-slate-300">#{tag}</span>)}</div></div>}
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {filteredNotes.map(note => (
                    <motion.div key={note.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} onClick={() => handleEditNote(note)}
                      className={`cursor-pointer rounded-xl border p-5 transition-all hover:border-slate-600 ${note.pinned ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/30 border-slate-700/50'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-white line-clamp-1">{note.title || 'Untitled'}</h3>
                        <div className="flex items-center gap-1">
                          {note.pinned && <Pin className="w-4 h-4 text-amber-400" />}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="w-4 h-4 text-slate-400" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleTogglePin(note); }}><Pin className="w-4 h-4 mr-2" />{note.pinned ? 'Unpin' : 'Pin'}</DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteNoteMutation.mutate(note.id); }} className="text-rose-400"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="text-sm text-slate-400 line-clamp-3 mb-3" dangerouslySetInnerHTML={{ __html: note.content || 'No content' }} />
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex gap-1 flex-wrap">{note.tags?.slice(0, 3).map(tag => <span key={tag} className="px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">#{tag}</span>)}</div>
                        <span className="text-slate-500">{format(new Date(note.created_date), 'MMM d')}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {filteredNotes.length === 0 && <p className="text-slate-500 col-span-full text-center py-12">{searchQuery ? 'No notes match your search' : 'No notes yet. Create one!'}</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {topTab === 'notes' && (
        <Dialog open={showNoteDialog} onOpenChange={(open) => { setShowNoteDialog(open); if (!open) { setEditingNote(null); resetNoteForm(); } }}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingNote ? 'Edit Note' : 'New Note'}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div><Input value={noteForm.title} onChange={(e) => { setNoteForm({ ...noteForm, title: e.target.value }); setHasUnsavedChanges(true); }} placeholder="Note title" className="bg-slate-800 border-slate-700 text-white text-lg font-semibold" /></div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-slate-800/50">
                  <TabsTrigger value="text">📝 Text</TabsTrigger>
                  <TabsTrigger value="whiteboard">🎨 Whiteboard</TabsTrigger>
                </TabsList>
                <TabsContent value="text" className="mt-4">
                  <RichTextEditor content={noteForm.content} onChange={(html) => { setNoteForm({ ...noteForm, content: html }); setHasUnsavedChanges(true); }} placeholder="Start writing..." />
                </TabsContent>
                <TabsContent value="whiteboard" className="mt-4">
                  <div className="h-[500px] rounded-xl overflow-hidden border border-slate-700">
                    <EnhancedWhiteboard
                      whiteboardData={noteForm.whiteboard_data}
                      onSave={handleWhiteboardSave}
                      noteId={editingNote?.id || 'new'}
                    />
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-slate-400">Folder</Label><Input value={noteForm.folder} onChange={(e) => setNoteForm({ ...noteForm, folder: e.target.value })} placeholder="e.g., Ideas, Projects" className="bg-slate-800 border-slate-700 text-white" list="folders" /><datalist id="folders">{folders.map(f => <option key={f} value={f} />)}</datalist></div>
                <div><Label className="text-slate-400">Tags</Label><div className="flex gap-2"><Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add tag" className="bg-slate-800 border-slate-700 text-white" onKeyPress={(e) => e.key === 'Enter' && addTag()} /><Button onClick={addTag} variant="outline" className="border-slate-600"><Plus className="w-4 h-4" /></Button></div></div>
              </div>
              {noteForm.tags.length > 0 && <div className="flex flex-wrap gap-2">{noteForm.tags.map(tag => <span key={tag} className="flex items-center gap-1 px-2 py-1 text-sm rounded-full bg-amber-500/20 text-amber-300">#{tag}<button onClick={() => removeTag(tag)} className="hover:text-white">×</button></span>)}</div>}
              <div className="flex gap-2 pt-4">
                {editingNote && <Button variant="destructive" onClick={() => { deleteNoteMutation.mutate(editingNote.id); setShowNoteDialog(false); }} className="flex-1">Delete</Button>}
                <Button onClick={handleSaveNote} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500">{editingNote ? 'Save Changes' : 'Create Note'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}