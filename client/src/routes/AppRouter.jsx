import { Component } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Home, RotateCw } from 'lucide-react';
import App from '@/App';
import { useAuth } from '@/contexts/AuthContext';

function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-5">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-float sm:p-10">
        <p className="font-heading text-7xl font-extrabold tracking-tight text-civic-700">404</p>
        <h1 className="mt-4 font-heading text-2xl font-extrabold text-slate-950">We can’t find that page</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          The link may be outdated, or the page may have moved. Let’s get you back to your community.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-civic-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-civic-800"
          >
            <Home aria-hidden="true" size={16} />
            CivicConnect home
          </Link>
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowRight aria-hidden="true" size={16} />
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}

class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CivicConnect page failed to render.', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-screen place-items-center bg-slate-50 p-5">
          <section className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-float sm:p-10">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-700">
              <AlertTriangle aria-hidden="true" size={24} />
            </span>
            <h1 className="mt-4 font-heading text-2xl font-extrabold text-slate-950">Something went wrong</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This page hit an unexpected problem. Your account and reports are safe; try loading the page again.
            </p>
            <button
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-civic-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-civic-800"
              onClick={() => window.location.reload()}
              type="button"
            >
              <RotateCw aria-hidden="true" size={16} />
              Reload page
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

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
    <AppErrorBoundary>
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
          path="/public-feed"
          element={
            <ProtectedRoute>
              <App mode="public-feed" />
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
          path="/awareness"
          element={
            <ProtectedRoute>
              <App mode="awareness" />
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
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppErrorBoundary>
  );
}
