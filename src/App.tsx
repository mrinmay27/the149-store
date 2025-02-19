import { Suspense, useEffect } from "react";
import { Routes, Route, createRoutesFromElements, createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "./components/ui/toaster";
import ErrorBoundary from "./components/ErrorBoundary";
import Loading from "./components/ui/Loading";
import Home from "./components/home";
import SalesMode from "./components/SalesMode";
import Inventory from "./components/Inventory";
import Reports from "./components/Reports";
import Deposits from "./components/Deposits";
import Expenses from "./components/Expenses";
import AuthPage from "./pages/auth";
import UserApprovals from "./components/admin/UserApprovals";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminUtils from './components/admin/AdminUtils';
import { useStore } from "./lib/store";
import PullToRefresh from "./components/ui/PullToRefresh";
import Profile from "./components/Profile";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      <Route path="/auth" element={<AuthPage />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      } />
      
      <Route path="/sales" element={
        <ProtectedRoute>
          <SalesMode />
        </ProtectedRoute>
      } />
      
      <Route path="/inventory" element={
        <ProtectedRoute>
          <Inventory />
        </ProtectedRoute>
      } />
      
      <Route path="/reports" element={
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      } />

      <Route path="/deposits" element={
        <ProtectedRoute>
          <Deposits />
        </ProtectedRoute>
      } />

      <Route path="/expenses" element={
        <ProtectedRoute>
          <Expenses />
        </ProtectedRoute>
      } />

      <Route path="/admin/approvals" element={
        <ProtectedRoute>
          <UserApprovals />
        </ProtectedRoute>
      } />

      <Route path="/profile" element={<Profile />} />
    </Route>
  ),
  {
    future: {
      v7_relativeSplatPath: true
    }
  }
);

function App() {
  const initializeStore = useStore(state => state.initializeStore);
  const initialized = useStore(state => state.initialized);
  const fetchAllData = useStore(state => state.fetchAllData);

  useEffect(() => {
    if (!initialized) {
      initializeStore();
    }

    // Register service worker with proper error handling and cleanup
    if ('serviceWorker' in navigator) {
      let registration: ServiceWorkerRegistration;

      const registerSW = async () => {
        try {
          registration = await navigator.serviceWorker.register('/service-worker.js');
          console.log('SW registered:', registration);

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, notify user if needed
                  console.log('New content is available; please refresh.');
                }
              });
            }
          });
        } catch (error) {
          console.error('SW registration failed:', error);
        }
      };

      window.addEventListener('load', registerSW);

      return () => {
        // Cleanup service worker on component unmount
        if (registration) {
          registration.unregister().catch(error => {
            console.error('SW unregister failed:', error);
          });
        }
      };
    }
  }, [initialized, initializeStore]);

  const handleRefresh = async () => {
    await fetchAllData();
  };

  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading fullScreen />}>
        <div className="min-h-screen h-screen flex flex-col overflow-hidden bg-background text-foreground">
          <AdminUtils />
          <PullToRefresh onRefresh={handleRefresh}>
            <div className="flex-1 overflow-y-auto">
              <RouterProvider router={router} />
            </div>
          </PullToRefresh>
          <Toaster />
        </div>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
