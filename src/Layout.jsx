import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  BookOpen,
  CheckSquare,
  Activity,
  GraduationCap,
  Calendar,
  FileText,
  Moon,
  Lock,
  MessageCircle,
  Menu,
  X,
  Sparkles,
  Settings,
  BarChart3,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/components/customization/PreferencesProvider';

const navItems = [
  { name: 'Dashboard', icon: Home, page: 'Dashboard', emoji: '🏠' },
  { name: 'Journal', icon: BookOpen, page: 'Journal', emoji: '📖' },
  { name: 'Habits', icon: CheckSquare, page: 'Habits', emoji: '✅' },
  { name: 'Running', icon: Activity, page: 'Running', emoji: '🏃' },
  { name: 'Study Hub', icon: GraduationCap, page: 'Study', emoji: '🎓' },
  { name: 'Calendar', icon: Calendar, page: 'Calendar', emoji: '📅' },
  { name: 'Notes', icon: FileText, page: 'Notes', emoji: '📝' },
  { name: 'Sleep', icon: Moon, page: 'Sleep', emoji: '😴' },
  { name: 'Weekly Review', icon: BarChart3, page: 'WeeklyReview', emoji: '📊' },
  { name: 'Personal', icon: Lock, page: 'Personal', emoji: '🔒' },
  { name: 'Data', icon: Database, page: 'Data', emoji: '💾' },
  { name: 'AI Coach', icon: MessageCircle, page: 'AICoach', emoji: '💬' },
  { name: 'Customize', icon: Settings, page: 'Customization', emoji: '⚙️' },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { prefs } = usePreferences();

  const isActivePage = (pageName) => {
    return currentPageName === pageName;
  };

  const appTitle = `${prefs.display_name}'s 2026`;

  return (
    <div className="min-h-screen bg-slate-950" style={{ minHeight: '100vh' }}>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-lg border-b border-slate-800">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-teal-400" />
            <span className="font-bold text-white text-lg">{appTitle}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-72 bg-slate-900 border-r border-slate-800 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-8">
                  <Sparkles className="w-8 h-8 text-teal-400" />
                  <div>
                    <h1 className="font-bold text-white text-xl">{appTitle}</h1>
                    <p className="text-xs text-slate-500">Life Operating System</p>
                  </div>
                </div>
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isActivePage(item.page);
                    return (
                      <Link
                        key={item.name}
                        to={createPageUrl(item.page)}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-teal-500/20 to-emerald-500/20 text-teal-400 border border-teal-500/30'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                      >
                        <span className="text-lg">{item.emoji}</span>
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-72 lg:flex-col">
        <div className="flex flex-col flex-grow bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/50 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white text-xl">{appTitle}</h1>
                <p className="text-xs text-slate-500">Life Operating System</p>
              </div>
            </div>
            
            <nav className="space-y-1">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = isActivePage(item.page);
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      to={createPageUrl(item.page)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                        isActive
                          ? 'bg-gradient-to-r from-teal-500/20 to-emerald-500/20 text-teal-400 border border-teal-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <span className="text-lg group-hover:scale-110 transition-transform">{item.emoji}</span>
                      <span className="font-medium">{item.name}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="ml-auto w-2 h-2 rounded-full bg-teal-400"
                        />
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>
          </div>

          {/* Footer */}
          <div className="mt-auto p-6 border-t border-slate-800/50">
            <div className="text-center">
              <p className="text-xs text-slate-500">Built for excellence</p>
              <p className="text-xs text-slate-600 mt-1">© 2026 Ryan's OS</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-72">
        <main className="pt-16 lg:pt-0">
          {children}
        </main>
      </div>

      {/* Quick Action FAB - AI Coach */}
      <Link to={createPageUrl('AICoach')}>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 shadow-lg shadow-teal-500/25 flex items-center justify-center text-white lg:hidden"
        >
          <MessageCircle className="w-6 h-6" />
        </motion.button>
      </Link>
    </div>
  );
}