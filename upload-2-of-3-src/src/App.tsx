import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LocationProvider } from './context/LocationContext';
import { PreferencesProvider, usePreferences } from './context/PreferencesContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import { EnvironmentDataProvider } from './context/EnvironmentDataContext';
import { AppShell } from './layouts/AppShell';
import { MobileShell } from './layouts/MobileShell';
import { useIsMobileShell } from './utils/platform';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { CardSkeleton } from './components/common/States';
import { OnboardingFlow } from './onboarding/OnboardingFlow';
import { LanguagePicker } from './onboarding/LanguagePicker';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const WeatherPage = lazy(() => import('./pages/WeatherPage'));
const AirQualityPage = lazy(() => import('./pages/AirQualityPage'));
const PollutionMapPage = lazy(() => import('./pages/PollutionMapPage'));
const AIPredictionsPage = lazy(() => import('./pages/AIPredictionsPage'));
const WarningsPage = lazy(() => import('./pages/WarningsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ActionsPage = lazy(() => import('./pages/ActionsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const MobileHomePage = lazy(() => import('./pages/mobile/MobileHomePage'));
const LocationsPage = lazy(() => import('./pages/mobile/LocationsPage'));
const ProfilePage = lazy(() => import('./pages/mobile/ProfilePage'));

const PageFallback: React.FC = () => (
  <div className="space-y-5">
    <CardSkeleton lines={4} />
    <CardSkeleton lines={4} />
  </div>
);

function withPage(node: React.ReactNode, title: string) {
  return (
    <ErrorBoundary fallbackTitle={title}>
      <Suspense fallback={<PageFallback />}>{node}</Suspense>
    </ErrorBoundary>
  );
}

/** Shows the language picker before anything else — even before
 * onboarding — since someone who reads only Hindi shouldn't need to
 * read English first just to find their language. */
const LanguageGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hasSelectedLanguage } = useLanguage();
  if (!hasSelectedLanguage) return <LanguagePicker />;
  return <>{children}</>;
};

/** Shows the first-run onboarding flow instead of the app until it's completed. */
const OnboardingGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { preferences } = usePreferences();
  if (!preferences.onboardingCompleted) return <OnboardingFlow />;
  return <>{children}</>;
};


/**
 * Phones (and the installed Android app) get the bottom-tab shell and the
 * sky-style Home; wide windows (desktop/Electron) keep the sidebar layout.
 * Both share every data page, so no feature is lost on either side.
 */
const AppRoutes: React.FC = () => {
  const isMobile = useIsMobileShell();
  return (
    <Routes>
      <Route element={isMobile ? <MobileShell /> : <AppShell />}>
        <Route
          path="/"
          element={isMobile ? withPage(<MobileHomePage />, 'Home failed to load') : withPage(<DashboardPage />, 'Dashboard failed to load')}
        />
        <Route path="/weather" element={withPage(<WeatherPage />, 'Weather page failed to load')} />
        <Route path="/air-quality" element={withPage(<AirQualityPage />, 'Air quality page failed to load')} />
        <Route path="/pollution-map" element={withPage(<PollutionMapPage />, 'Pollution map failed to load')} />
        <Route path="/ai-predictions" element={withPage(<AIPredictionsPage />, 'AI predictions page failed to load')} />
        <Route path="/warnings" element={withPage(<WarningsPage />, 'Warnings page failed to load')} />
        <Route path="/analytics" element={withPage(<AnalyticsPage />, 'Analytics page failed to load')} />
        <Route path="/actions" element={withPage(<ActionsPage />, 'Actions page failed to load')} />
        <Route path="/settings" element={withPage(<SettingsPage />, 'Settings page failed to load')} />
        <Route path="/locations" element={isMobile ? withPage(<LocationsPage />, 'Locations failed to load') : <Navigate to="/" replace />} />
        <Route path="/profile" element={isMobile ? withPage(<ProfilePage />, 'Profile failed to load') : <Navigate to="/settings" replace />} />
        <Route path="*" element={withPage(<NotFoundPage />, 'Page failed to load')} />
      </Route>
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter>
          <ToastProvider>
            <LocationProvider>
              <PreferencesProvider>
                <LanguageGate>
                  <OnboardingGate>
                    <EnvironmentDataProvider>
                      <AppRoutes />
                    </EnvironmentDataProvider>
                  </OnboardingGate>
                </LanguageGate>
              </PreferencesProvider>
            </LocationProvider>
          </ToastProvider>
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
