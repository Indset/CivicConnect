import { Navigate, Route, Routes } from 'react-router-dom';
import App from '@/App';
import { useAuth } from '@/contexts/AuthContext';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, authError, refreshUser } = useAuth();
  if (loading)
    return (
      <main className="grid min-h-screen place-items-center text-slate-600">
        Loading CivicConnect…
      </main>
    );
  if (authError && !user)
    return (
      <main className="grid min-h-screen place-items-center p-6 text-slate-600">
        <div className="space-y-3 text-center">
          <p role="alert">Unable to verify your session: {authError.message}</p>
          <button className="text-blue-700 underline" onClick={refreshUser}>
            Try again
          </button>
        </div>
      </main>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<App mode="login" />} />
      <Route path="/register" element={<App mode="register" />} />
      <Route path="/forgot-password" element={<App mode="forgot-password" />} />
      <Route path="/reset-password/:token" element={<App mode="reset-password" />} />
      <Route path="/" element={<App />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <App mode="dashboard" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/complaints"
        element={
          <ProtectedRoute>
            <App mode="complaints" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/complaints/new"
        element={
          <ProtectedRoute>
            <App mode="new-complaint" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/complaints/map"
        element={
          <ProtectedRoute>
            <App mode="complaints-map" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/complaints/:id"
        element={
          <ProtectedRoute>
            <App mode="complaint-details" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <App mode="profile" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <App mode="notifications" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute adminOnly>
            <App mode="admin" />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
