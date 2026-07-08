const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useRef } from 'react';

import { motion } from 'framer-motion';
import { Download, Upload, Loader2, Database, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import JSZip from 'jszip';

const entities = [
  { name: 'Day', label: 'Journal Entries', icon: '📖' },
  { name: 'Habit', label: 'Habits', icon: '✅' },
  { name: 'HabitLog', label: 'Habit Logs', icon: '📋' },
  { name: 'Workout', label: 'Workouts', icon: '🏃' },
  { name: 'StudySession', label: 'Study Sessions', icon: '🎓' },
  { name: 'Assignment', label: 'Assignments', icon: '📝' },
  { name: 'IBSubject', label: 'Subjects', icon: '📚' },
  { name: 'ClassNote', label: 'Class Notes', icon: '🗒️' },
  { name: 'Race', label: 'Races', icon: '🏁' },
  { name: 'Shoe', label: 'Shoes', icon: '👟' },
  { name: 'Goal', label: 'Goals', icon: '🎯' },
  { name: 'Note', label: 'Notes', icon: '🗒️' },
  { name: 'Quote', label: 'Quotes', icon: '💬' },
  { name: 'CalendarEvent', label: 'Calendar Events', icon: '📅' },
  { name: 'BodyMetric', label: 'Body Metrics', icon: '📏' },
  { name: 'PersonalData', label: 'Personal Data', icon: '🔒' },
  { name: 'AIConversation', label: 'AI Conversations', icon: '🤖' },
  { name: 'WeeklyReport', label: 'Weekly Reports', icon: '📊' },
  { name: 'SuggestionLog', label: 'Suggestions', icon: '💡' },
  { name: 'UserPreference', label: 'Preferences', icon: '⚙️' },
];

export default function Data() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [exportProgress, setExportProgress] = useState('');
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    setExporting(true);
    setExportProgress('Fetching your data...');
    try {
      const zip = new JSZip();
      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        setExportProgress(`Fetching ${entity.label}... (${i + 1}/${entities.length})`);
        const records = await db.entities[entity.name].list('-created_date', 5000);
        zip.file(`${entity.name}.json`, JSON.stringify(records, null, 2));
      }
      setExportProgress('Creating backup zip...');
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifeos_backup_${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setExportProgress('');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data: ' + (error.message || 'Unknown error'));
      setExportProgress('');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm('This will import all data from the backup zip. Imported records will be added alongside existing ones (no data will be deleted). Continue?')) {
      e.target.value = '';
      return;
    }

    setImporting(true);
    setImportResult(null);
    try {
      const zip = await JSZip.loadAsync(file);
      const results = [];

      for (const entity of entities) {
        const zipFile = zip.file(`${entity.name}.json`);
        if (!zipFile) continue;

        const content = await zipFile.async('string');
        let records;
        try {
          records = JSON.parse(content);
        } catch {
          continue;
        }
        if (!Array.isArray(records) || records.length === 0) continue;

        const cleanRecords = records.map(r => {
          const { id, created_date, updated_date, created_by_id, ...rest } = r;
          return rest;
        });

        try {
          if (entity.name === 'UserPreference') {
            const existing = await db.entities.UserPreference.list();
            if (existing.length > 0) {
              await db.entities.UserPreference.update(existing[0].id, cleanRecords[0]);
            } else {
              await db.entities.UserPreference.create(cleanRecords[0]);
            }
            results.push({ entity: entity.label, count: 1, success: true });
          } else {
            await db.entities[entity.name].bulkCreate(cleanRecords);
            results.push({ entity: entity.label, count: cleanRecords.length, success: true });
          }
        } catch (err) {
          results.push({ entity: entity.label, count: 0, success: false, error: err.message });
        }
      }

      setImportResult(results);
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import data. Make sure the file is a valid backup zip.');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Database className="w-8 h-8 text-teal-400" />
              Data
            </h1>
            <p className="text-slate-400">Export or import your Life OS data</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleImport}
            className="hidden"
            disabled={importing}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="bg-gradient-to-r from-teal-500 to-emerald-500 gap-2"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {importing ? 'Importing...' : 'Import Backup'}
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-6 mb-6"
        >
          <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-teal-400" />
                Export All Data
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Download a zip file containing all your data as JSON files
              </p>
            </div>
            <Button
              onClick={handleExport}
              disabled={exporting}
              variant="outline"
              className="border-slate-600 gap-2"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>

          {exportProgress && (
            <div className="mt-4 p-3 rounded-lg bg-slate-900/50 text-sm text-slate-300 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
              {exportProgress}
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            {entities.map(e => (
              <div key={e.name} className="flex items-center gap-2 text-xs text-slate-400 px-3 py-2 rounded-lg bg-slate-900/30">
                <span>{e.icon}</span>
                <span>{e.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {importResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-6 mb-6"
          >
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Import Results
            </h2>
            <div className="space-y-2">
              {importResult.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50">
                  <span className="text-sm text-slate-300">{r.entity}</span>
                  {r.success ? (
                    <span className="text-sm text-emerald-400">✓ {r.count} records imported</span>
                  ) : (
                    <span className="text-sm text-rose-400">✗ {r.error}</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Refresh the page to see imported data across the app.
            </p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-6"
        >
          <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            How it works
          </h3>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>• <span className="text-slate-300">Export</span> downloads a zip with all your data as JSON files</li>
            <li>• <span className="text-slate-300">Import Backup</span> restores data from a previously exported zip</li>
            <li>• Importing adds records alongside existing ones — it does not delete current data</li>
            <li>• Keep your backup zip in a safe place for data portability</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}