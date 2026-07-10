import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { PreferencesProvider } from '@/components/customization/PreferencesProvider';
import Data from './pages/Data';
import WeeklyReview from './pages/WeeklyReview';
import Login from './pages/Login';
import OAuthCallback from './pages/OAuthCallback';
import RequireAuth from './components/auth/RequireAuth';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <PreferencesProvider>
          <Router>
            <NavigationTracker />
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/api/auth/google/callback" element={<OAuthCallback />} />

              {/* Protected routes – wrap in RequireAuth */}
              <Route path="/" element={
                <RequireAuth>
                  <LayoutWrapper currentPageName={mainPageKey}>
                    <MainPage />
                  </LayoutWrapper>
                </RequireAuth>
              } />
              {Object.entries(Pages).map(([path, Page]) => (
                <Route
                  key={path}
                  path={`/${path}`}
                  element={
                    <RequireAuth>
                      <LayoutWrapper currentPageName={path}>
                        <Page />
                      </LayoutWrapper>
                    </RequireAuth>
                  }
                />
              ))}
              <Route path="/Data" element={
                <RequireAuth>
                  <LayoutWrapper currentPageName="Data"><Data /></LayoutWrapper>
                </RequireAuth>
              } />
              <Route path="/WeeklyReview" element={
                <RequireAuth>
                  <LayoutWrapper currentPageName="WeeklyReview"><WeeklyReview /></LayoutWrapper>
                </RequireAuth>
              } />
              <Route path="*" element={<PageNotFound />} />
            </Routes>
            <Toaster />
          </Router>
        </PreferencesProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;