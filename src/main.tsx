import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import './index.css'
import { initAnalytics } from './lib/analytics'
import { ThemeProvider } from './lib/theme'
import { StoreProvider } from './lib/store'
import { NotificationsProvider } from './lib/notifications'
import { ProfileProvider } from './lib/profile'
import { AuthProvider } from './lib/auth'
import { SubscriptionProvider } from './lib/subscription'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import { AuthGate } from './features/auth/AuthGate'
import { AppShell } from './app/AppShell'
import { DashboardScreen } from './features/dashboard/DashboardScreen'
import { GroupsScreen } from './features/groups/GroupsScreen'
import { GroupScreen } from './features/group/GroupScreen'
import { NotificationsScreen } from './features/notifications/NotificationsScreen'
import { SettingsScreen } from './features/settings/SettingsScreen'
import {
  ProfileSettingsScreen,
  BankSettingsScreen,
  AppearanceSettingsScreen,
  DataSettingsScreen,
} from './features/settings/SettingsScreens'
import { TermsScreen, PrivacyScreen } from './features/legal/LegalScreens'
import { FaqScreen } from './features/legal/FaqScreen'
import { ZaloCallbackScreen } from './features/auth/ZaloCallbackScreen'
import { JoinScreen } from './features/groups/JoinScreen'
import { JoinEntryScreen } from './features/groups/JoinEntryScreen'
import { RouteError } from './components/RouteError'
import { LazyConsoleRoot } from './features/admin/LazyConsoleRoot'

const router = createBrowserRouter([
  // Trang pháp lý truy cập được cả khi chưa đăng nhập (link từ màn Login).
  { path: '/terms', element: <TermsScreen /> },
  { path: '/privacy', element: <PrivacyScreen /> },
  { path: '/auth/zalo/callback', element: <ZaloCallbackScreen /> },
  { path: '/join', element: <JoinEntryScreen />, errorElement: <RouteError /> },
  { path: '/join/:token', element: <JoinScreen />, errorElement: <RouteError /> },
  {
    path: '/console/*',
    element: <LazyConsoleRoot />,
    errorElement: <RouteError />,
  },
  {
    element: (
      <AuthGate>
        <AppShell />
      </AuthGate>
    ),
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <DashboardScreen /> },
      { path: '/groups', element: <GroupsScreen /> },
      { path: '/g/:id', element: <GroupScreen /> },
      { path: '/notifications', element: <NotificationsScreen /> },
      { path: '/settings', element: <SettingsScreen /> },
      { path: '/settings/profile', element: <ProfileSettingsScreen /> },
      { path: '/settings/bank', element: <BankSettingsScreen /> },
      { path: '/settings/appearance', element: <AppearanceSettingsScreen /> },
      { path: '/settings/data', element: <DataSettingsScreen /> },
      { path: '/faq', element: <FaqScreen /> },
    ],
  },
  { path: '*', element: <RouteError /> },
])

initAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <SubscriptionProvider>
            <StoreProvider>
              <NotificationsProvider>
                <ProfileProvider>
                  <RouterProvider router={router} />
                </ProfileProvider>
              </NotificationsProvider>
            </StoreProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
