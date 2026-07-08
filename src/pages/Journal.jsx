const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { motion } from 'framer-motion';
import { format, subDays, addDays } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  Moon,
  X,
  Image as ImageIcon,
  Save,
  FileText,
  Mic,
  Image,
  Download,
  Upload,
  Loader2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VoiceNotes from '@/components/journal/VoiceNotes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MoodSelector, { getMoodEmoji, getMoodLabel, moods, moodToValue } from '@/components/ui/MoodSelector';
import { Textarea } from '@/components/ui/textarea';
import RichTextEditor from '@/components/editor/RichTextEditor';
import QuoteDisplay from '@/components/quotes/QuoteDisplay';
import UnsavedChangesDialog from '@/components/shared/UnsavedChangesDialog';
import EnhancedPhotoUpload from '@/components/media/EnhancedPhotoUpload';
import { downloadCSV } from '@/utils/csvExport';

export default function Journal() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    mood: 5,
    one_interesting_thing: '',
    gratitude_1: '',
    gratitude_2: '',
    gratitude_3: '',
    journal_content: '',
    photos: [],
    voice_notes: [],
    sleep_hours: null,
    sleep_quality: '',
    bedtime: '',
    wake_time: '',
    energy_level: 5
  });
  const [activeTab, setActiveTab] = useState('text');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [uploadingBackup, setUploadingBackup] = useState(false);
  const restoreInputRef = useRef(null);

  const dateStr = format(currentDate, 'yyyy-MM-dd');

  const { data: dayEntries, isLoading } = useQuery({
    queryKey: ['day-entry', dateStr],
    queryFn: () => db.entities.Day.filter({ date: dateStr }),
  });

  const { data: habitLogs = [] } = useQuery({
    queryKey: ['habit-logs', dateStr],
    queryFn: () => db.entities.HabitLog.filter({ date: dateStr }),
  });

  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: () => db.entities.Habit.filter({ active: true }),
  });

  const { data: workouts = [] } = useQuery({
    queryKey: ['workouts', dateStr],
    queryFn: () => db.entities.Workout.filter({ date: dateStr }),
  });

  const { data: studySessions = [] } = useQuery({
    queryKey: ['study-sessions', dateStr],
    queryFn: () => db.entities.StudySession.filter({ date: dateStr }),
  });

  const dayEntry = dayEntries?.[0];

  useEffect(() => {
    if (dayEntry) {
      setFormData({
        mood: dayEntry.mood != null ? dayEntry.mood : 5,
        one_interesting_thing: dayEntry.one_interesting_thing || '',
        gratitude_1: dayEntry.gratitude_1 || '',
        gratitude_2: dayEntry.gratitude_2 || '',
        gratitude_3: dayEntry.gratitude_3 || '',
        journal_content: dayEntry.journal_content || '',
        photos: dayEntry.photos || [],
        voice_notes: dayEntry.voice_notes || [],
        sleep_hours: dayEntry.sleep_hours || null,
        sleep_quality: dayEntry.sleep_quality || '',
        bedtime: dayEntry.bedtime || '',
        wake_time: dayEntry.wake_time || '',
        energy_level: dayEntry.energy_level || 5
      });
      setIsEditing(false);
    } else {
      setFormData({
        mood: 5,
        one_interesting_thing: '',
        gratitude_1: '',
        gratitude_2: '',
        gratitude_3: '',
        journal_content: '',
        photos: [],
        voice_notes: [],
        sleep_hours: null,
        sleep_quality: '',
        bedtime: '',
        wake_time: '',
        energy_level: 5
      });
      setIsEditing(true);
    }
  }, [dayEntry, dateStr]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (dayEntry) {
        return db.entities.Day.update(dayEntry.id, data);
      } else {
        return db.entities.Day.create({ date: dateStr, ...data });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-entry', dateStr] });
      setIsEditing(false);
    },
  });

  const handleSave = async () => {
    saveMutation.mutate(formData);
    setHasUnsavedChanges(false);
  };

  const handlePhotosChange = (newPhotos) => {
    setFormData({ ...formData, photos: newPhotos });
    setHasUnsavedChanges(true);
  };

  const goToPreviousDay = () => setCurrentDate(subDays(currentDate, 1));
  const goToNextDay = () => {
    if (format(currentDate, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd')) {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const completedHabitsToday = habitLogs.filter(log => log.completed);
  const totalStudyMinutes = studySessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  const countJournalWords = (day) => {
    const stripHtml = (s) => (s || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    const fields = [day.one_interesting_thing, day.gratitude_1, day.gratitude_2, day.gratitude_3, day.journal_content];
    return fields.reduce((sum, f) => {
      const text = stripHtml(f);
      return sum + (text ? text.split(/\s+/).filter(Boolean).length : 0);
    }, 0);
  };

  const getHabitCompletionPercent = (dayDate, allHabitLogs, allHabits) => {
    if (allHabits.length === 0) return '';
    const dayLogs = allHabitLogs.filter(l => l.date === dayDate);
    if (dayLogs.length === 0) return '0';
    const completed = dayLogs.filter(l => l.completed).length;
    return Math.round((completed / allHabits.length) * 100);
  };

  const downloadJournalsCSV = async () => {
    try {
      const [allDays, allHabitLogs, allHabits] = await Promise.all([
        db.entities.Day.list('-date', 1000),
        db.entities.HabitLog.list('-date', 2000),
        db.entities.Habit.filter({ active: true }),
      ]);
      const rows = allDays
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(day => [
          day.date,
          day.mood != null ? day.mood : '',
          day.mood != null ? getMoodLabel(day.mood) : '',
          day.one_interesting_thing || '',
          day.gratitude_1 || '',
          day.gratitude_2 || '',
          day.gratitude_3 || '',
          (day.journal_content || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim(),
          getHabitCompletionPercent(day.date, allHabitLogs, allHabits),
          countJournalWords(day),
          day.sleep_hours || '',
          day.sleep_quality || '',
          day.bedtime || '',
          day.wake_time || '',
        ]);
      downloadCSV(rows, ['Date', 'Mood Value', 'Mood Label', 'One Interesting Thing', 'Gratitude 1', 'Gratitude 2', 'Gratitude 3', 'Journal Entry', 'Habit Completion %', 'Word Count', 'Sleep Hours', 'Sleep Quality', 'Bedtime', 'Wake Time'], `journal_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    } catch (error) {
      console.error('CSV export failed:', error);
      alert('Failed to export journal CSV');
    }
  };

  const downloadAllJournals = async () => {
    try {
      const [allDays, allHabitLogs, allHabits] = await Promise.all([
        db.entities.Day.list('-date'),
        db.entities.HabitLog.list('-date', 2000),
        db.entities.Habit.filter({ active: true }),
      ]);
      const totalWordCount = allDays.reduce((sum, day) => sum + countJournalWords(day), 0);

      const journalText = allDays.map(day => {
        let entry = `\n${'='.repeat(60)}\n`;
        entry += `DATE: ${format(new Date(day.date), 'MMMM d, yyyy (EEEE)')}\n`;
        entry += `WORD COUNT: ${countJournalWords(day)}\n`;
        entry += `${'='.repeat(60)}\n\n`;

        if (day.mood != null) entry += `MOOD: ${getMoodLabel(day.mood)} (${day.mood})\n\n`;
        if (day.one_interesting_thing) entry += `ONE INTERESTING THING:\n${day.one_interesting_thing}\n\n`;
        
        if (day.gratitude_1 || day.gratitude_2 || day.gratitude_3) {
          entry += `GRATITUDE:\n`;
          if (day.gratitude_1) entry += `1. ${day.gratitude_1}\n`;
          if (day.gratitude_2) entry += `2. ${day.gratitude_2}\n`;
          if (day.gratitude_3) entry += `3. ${day.gratitude_3}\n`;
          entry += `\n`;
        }
        
        if (day.journal_content) {
          const plainText = day.journal_content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
          entry += `JOURNAL ENTRY:\n${plainText}\n\n`;
        }
        
        if (day.sleep_hours) {
          entry += `SLEEP: ${day.sleep_hours} hours (${day.sleep_quality || 'not rated'})\n`;
          if (day.bedtime) entry += `Bedtime: ${day.bedtime}\n`;
          if (day.wake_time) entry += `Wake time: ${day.wake_time}\n`;
          entry += `\n`;
        }

        const dayLogs = allHabitLogs.filter(l => l.date === day.date);
        const completedCount = dayLogs.filter(l => l.completed).length;
        const totalCount = allHabits.length;
        const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        entry += `HABIT COMPLETION: ${completedCount}/${totalCount} (${pct}%)\n\n`;
        
        return entry;
      }).join('\n');

      const header = `${'='.repeat(60)}\nTOTAL JOURNAL WORD COUNT: ${totalWordCount}\nGENERATED: ${format(new Date(), 'MMMM d, yyyy h:mm a')}\n${'='.repeat(60)}\n\n`;
      
      const blob = new Blob([header + journalText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `journal_backup_${format(new Date(), 'yyyy-MM-dd')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download journal entries');
    }
  };

  const uploadJournalBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingBackup(true);
    try {
      const text = await file.text();
      const entries = text.split('='.repeat(60)).filter(e => e.trim());
      
      let imported = 0;
      for (const entry of entries) {
        const dateMatch = entry.match(/DATE:\s*([^\n]+)/);
        if (!dateMatch) continue;
        
        const dateStr = new Date(dateMatch[1]).toISOString().split('T')[0];
        
        const moodMatch = entry.match(/MOOD:\s*[^(]*\(([\d.]+)\)/);
        const interestingMatch = entry.match(/ONE INTERESTING THING:\s*([^\n]+(?:\n(?!GRATITUDE:|JOURNAL ENTRY:|SLEEP:)[^\n]+)*)/);
        const journalMatch = entry.match(/JOURNAL ENTRY:\s*([^\n]+(?:\n(?!SLEEP:)[^\n]+)*)/);
        const sleepMatch = entry.match(/SLEEP:\s*(\d+\.?\d*)\s*hours/);
        const qualityMatch = entry.match(/hours\s*\(([^)]+)\)/);
        
        const gratitude1Match = entry.match(/GRATITUDE:\s*\n1\.\s*([^\n]+)/);
        const gratitude2Match = entry.match(/2\.\s*([^\n]+)/);
        const gratitude3Match = entry.match(/3\.\s*([^\n]+)/);
        
        const existingEntries = await db.entities.Day.filter({ date: dateStr });
        const dayData = {
          date: dateStr,
          mood: moodMatch ? parseFloat(moodMatch[1]) : undefined,
          one_interesting_thing: interestingMatch ? interestingMatch[1].trim() : undefined,
          journal_content: journalMatch ? journalMatch[1].trim() : undefined,
          sleep_hours: sleepMatch ? parseFloat(sleepMatch[1]) : undefined,
          sleep_quality: qualityMatch ? qualityMatch[1].trim() : undefined,
          gratitude_1: gratitude1Match ? gratitude1Match[1].trim() : undefined,
          gratitude_2: gratitude2Match ? gratitude2Match[1].trim() : undefined,
          gratitude_3: gratitude3Match ? gratitude3Match[1].trim() : undefined,
        };
        
        Object.keys(dayData).forEach(key => dayData[key] === undefined && delete dayData[key]);
        
        if (existingEntries.length > 0) {
          await db.entities.Day.update(existingEntries[0].id, dayData);
        } else {
          await db.entities.Day.create(dayData);
        }
        imported++;
      }
      
      queryClient.invalidateQueries({ queryKey: ['day-entry'] });
      alert(`Successfully imported ${imported} journal entries!`);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload journal backup');
    } finally {
      setUploadingBackup(false);
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousDay}
              className="text-slate-400 hover:text-white"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {format(currentDate, 'EEEE')}
              </h1>
              <p className="text-slate-400">{format(currentDate, 'MMMM d, yyyy')}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextDay}
              disabled={format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')}
              className="text-slate-400 hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={downloadAllJournals}
              variant="outline"
              size="sm"
              className="border-slate-600 gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Backup</span>
            </Button>

            <Button
              onClick={downloadJournalsCSV}
              variant="outline"
              size="sm"
              className="border-slate-600 gap-2"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            
            <input
              ref={restoreInputRef}
              type="file"
              accept=".txt"
              onChange={uploadJournalBackup}
              className="hidden"
              disabled={uploadingBackup}
            />
            <Button
              onClick={() => restoreInputRef.current?.click()}
              variant="outline"
              size="sm"
              className="border-slate-600 gap-2"
              disabled={uploadingBackup}
              type="button"
            >
              {uploadingBackup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span className="hidden sm:inline">Restore</span>
            </Button>
            
            {!isEditing && dayEntry && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300"
              >
                Edit
              </Button>
            )}
            {isEditing && (
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="bg-gradient-to-r from-teal-500 to-emerald-500 gap-2"
                size="sm"
              >
                <Save className="w-4 h-4" />
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-6"
            >
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <Label className="text-slate-400">How was your day?</Label>
                      {moodToValue(formData.mood) != null && (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${moods.find(m => m.value === moodToValue(formData.mood))?.color}`}>
                          {getMoodLabel(formData.mood)}
                        </span>
                      )}
                    </div>
                    <MoodSelector
                      value={formData.mood}
                      onChange={(mood) => {
                        if (isEditing) {
                          setFormData({ ...formData, mood });
                          setHasUnsavedChanges(true);
                        }
                      }}
                      size="xs"
                      showLabel={false}
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 mb-2 block">One Interesting Thing</Label>
                    {isEditing ? (
                     <Input
                       value={formData.one_interesting_thing}
                       onChange={(e) => {
                         setFormData({ ...formData, one_interesting_thing: e.target.value });
                         setHasUnsavedChanges(true);
                       }}
                       placeholder="What made today special?"
                       className="bg-slate-900/50 border-slate-700 text-white"
                     />
                    ) : (
                      <p className="text-white p-2">
                        {formData.one_interesting_thing || 'Nothing logged'}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-slate-400 mb-3 block">Three Things I'm Grateful For</Label>
                  <div className="space-y-3">
                    {isEditing ? (
                      <>
                        <Input
                          value={formData.gratitude_1}
                          onChange={(e) => setFormData({ ...formData, gratitude_1: e.target.value })}
                          placeholder="1. I'm grateful for..."
                          className="bg-slate-900/50 border-slate-700 text-white"
                        />
                        <Input
                          value={formData.gratitude_2}
                          onChange={(e) => setFormData({ ...formData, gratitude_2: e.target.value })}
                          placeholder="2. I'm grateful for..."
                          className="bg-slate-900/50 border-slate-700 text-white"
                        />
                        <Input
                          value={formData.gratitude_3}
                          onChange={(e) => setFormData({ ...formData, gratitude_3: e.target.value })}
                          placeholder="3. I'm grateful for..."
                          className="bg-slate-900/50 border-slate-700 text-white"
                        />
                      </>
                    ) : (
                      <div className="space-y-2">
                        {formData.gratitude_1 && (
                          <p className="text-white p-2 rounded-lg bg-slate-900/50">1. {formData.gratitude_1}</p>
                        )}
                        {formData.gratitude_2 && (
                          <p className="text-white p-2 rounded-lg bg-slate-900/50">2. {formData.gratitude_2}</p>
                        )}
                        {formData.gratitude_3 && (
                          <p className="text-white p-2 rounded-lg bg-slate-900/50">3. {formData.gratitude_3}</p>
                        )}
                        {!formData.gratitude_1 && !formData.gratitude_2 && !formData.gratitude_3 && (
                          <p className="text-slate-500 p-2">No gratitude entries</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-6"
            >
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-slate-900/50 border border-slate-700/50 mb-4">
                  <TabsTrigger value="text" className="data-[state=active]:bg-teal-500 gap-2">
                    <FileText className="w-4 h-4" />
                    Text Entry
                  </TabsTrigger>
                  <TabsTrigger value="voice" className="data-[state=active]:bg-teal-500 gap-2">
                    <Mic className="w-4 h-4" />
                    Voice Notes
                    {formData.voice_notes.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-teal-500/30 text-teal-300">
                        {formData.voice_notes.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="photos" className="data-[state=active]:bg-teal-500 gap-2">
                    <Image className="w-4 h-4" />
                    Photos
                    {formData.photos.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-teal-500/30 text-teal-300">
                        {formData.photos.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="mt-0">
                  {isEditing ? (
                    <RichTextEditor
                      content={formData.journal_content}
                      onChange={(html) => {
                        setFormData({ ...formData, journal_content: html });
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Write about your day..."
                    />
                  ) : (
                    <div className="min-h-[200px] p-4 rounded-lg bg-slate-900/50 text-slate-300">
                      {formData.journal_content ? (
                        <div dangerouslySetInnerHTML={{ __html: formData.journal_content }} className="prose prose-invert max-w-none" />
                      ) : (
                        <span className="text-slate-500">No entry yet</span>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="voice" className="mt-0">
                  {isEditing ? (
                    <VoiceNotes
                      voiceNotes={formData.voice_notes}
                      onAddNote={(note) => setFormData({ ...formData, voice_notes: [...formData.voice_notes, note] })}
                      onDeleteNote={(index) => setFormData({ ...formData, voice_notes: formData.voice_notes.filter((_, i) => i !== index) })}
                      onUpdateNote={(index, updatedNote) => {
                        const newNotes = [...formData.voice_notes];
                        newNotes[index] = updatedNote;
                        setFormData({ ...formData, voice_notes: newNotes });
                      }}
                    />
                  ) : (
                    <div className="min-h-[200px]">
                      {formData.voice_notes.length > 0 ? (
                        <div className="space-y-3">
                          {formData.voice_notes.map((note, index) => (
                            <div key={index} className="p-4 rounded-lg bg-slate-900/50">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-white font-medium">{note.timestamp}</p>
                                <p className="text-xs text-slate-500">{note.duration}</p>
                              </div>
                              {note.transcription && (
                                <p className="text-sm text-slate-400">{note.transcription}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-center py-12">No voice notes</p>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="photos" className="mt-0">
                  {isEditing ? (
                    <EnhancedPhotoUpload
                      photos={formData.photos}
                      onPhotosChange={handlePhotosChange}
                    />
                  ) : (
                    <div className="min-h-[200px]">
                      {formData.photos.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {formData.photos.map((photo, index) => (
                            <div key={index} className="relative">
                              <img src={photo} alt={`Journal photo ${index + 1}`} className="w-full h-40 object-cover rounded-lg" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-32 rounded-lg border border-dashed border-slate-700 text-slate-500">
                          <div className="text-center">
                            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No photos added</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </motion.div>

          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Moon className="w-5 h-5 text-indigo-400" />
                <Label className="text-slate-400 text-lg">Sleep Log</Label>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <Label className="text-xs text-slate-500 mb-1 block">Bedtime</Label>
                    {isEditing ? (
                      <Input
                        type="time"
                        value={formData.bedtime}
                        onChange={(e) => {
                          const newBedtime = e.target.value;
                          setFormData({ ...formData, bedtime: newBedtime });
                          
                          // Auto-calculate sleep hours if both times are set
                          if (newBedtime && formData.wake_time) {
                            const bed = new Date(`2000-01-01T${newBedtime}`);
                            const wake = new Date(`2000-01-${formData.wake_time < newBedtime ? '02' : '01'}T${formData.wake_time}`);
                            const diffMs = wake - bed;
                            const hours = diffMs / (1000 * 60 * 60);
                            setFormData(prev => ({ ...prev, sleep_hours: parseFloat(hours.toFixed(1)) }));
                          }
                        }}
                        className="bg-slate-900/50 border-slate-700 text-white text-sm w-full"
                      />
                    ) : (
                      <p className="text-white text-sm">{formData.bedtime || '--:--'}</p>
                    )}
                  </div>
                  <div className="min-w-0">
                    <Label className="text-xs text-slate-500 mb-1 block">Wake Time</Label>
                    {isEditing ? (
                      <Input
                        type="time"
                        value={formData.wake_time}
                        onChange={(e) => {
                          const newWakeTime = e.target.value;
                          setFormData({ ...formData, wake_time: newWakeTime });
                          
                          // Auto-calculate sleep hours if both times are set
                          if (formData.bedtime && newWakeTime) {
                            const bed = new Date(`2000-01-01T${formData.bedtime}`);
                            const wake = new Date(`2000-01-${newWakeTime < formData.bedtime ? '02' : '01'}T${newWakeTime}`);
                            const diffMs = wake - bed;
                            const hours = diffMs / (1000 * 60 * 60);
                            setFormData(prev => ({ ...prev, sleep_hours: parseFloat(hours.toFixed(1)) }));
                          }
                        }}
                        className="bg-slate-900/50 border-slate-700 text-white text-sm w-full"
                      />
                    ) : (
                      <p className="text-white text-sm">{formData.wake_time || '--:--'}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <Label className="text-xs text-slate-500 mb-1 block">Hours Slept</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        value={formData.sleep_hours || ''}
                        onChange={(e) => setFormData({ ...formData, sleep_hours: parseFloat(e.target.value) })}
                        className="bg-slate-900/50 border-slate-700 text-white text-sm w-full"
                      />
                    ) : (
                      <p className="text-white text-lg font-bold">{formData.sleep_hours || '--'}h</p>
                    )}
                  </div>
                  <div className="min-w-0">
                    <Label className="text-xs text-slate-500 mb-1 block">Quality</Label>
                    {isEditing ? (
                      <Select
                        value={formData.sleep_quality}
                        onValueChange={(value) => setFormData({ ...formData, sleep_quality: value })}
                      >
                        <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white text-sm w-full h-9">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="poor">Poor</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-white text-sm capitalize">{formData.sleep_quality || 'Not rated'}</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-6"
            >
              <Label className="text-slate-400 text-lg mb-4 block">Today's Activity</Label>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Habits Completed</span>
                  <span className="text-white font-medium">
                    {completedHabitsToday.length}/{habits.length}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Study Time</span>
                  <span className="text-white font-medium">
                    {Math.floor(totalStudyMinutes / 60)}h {totalStudyMinutes % 60}m
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Workouts</span>
                  <span className="text-white font-medium">
                    {workouts.filter(w => w.completed).length}/{workouts.length}
                  </span>
                </div>

                {workouts.length > 0 && (
                  <div className="pt-2 border-t border-slate-700/50">
                    {workouts.map(workout => (
                      <div key={workout.id} className="text-sm text-slate-300 py-1">
                        <span className="capitalize">{workout.type?.replace('_', ' ')}</span>
                        {workout.actual_distance_km && (
                          <span className="text-slate-500 ml-2">{workout.actual_distance_km} km</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            <QuoteDisplay context="journal" compact />
          </div>
        </div>
      </div>

      <UnsavedChangesDialog
        open={showUnsavedWarning}
        onDiscard={() => {
          setShowUnsavedWarning(false);
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
        }}
        onCancel={() => {
          setShowUnsavedWarning(false);
          setPendingAction(null);
        }}
      />
    </div>
  );
}