import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  Bell,
  Activity,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileText,
  Eye,
  EyeOff,
  House,
  LayoutDashboard,
  LogOut,
  Map,
  MapPinned,
  Menu,
  Plus,
  ShieldCheck,
  ThumbsUp,
  UsersRound,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  adminApi,
  aiApi,
  authApi,
  categoriesApi,
  complaintsApi,
  notificationsApi,
} from '@/services/api/endpoints';
import { getComplaintCoordinates, getComplaintLocationAddress } from '@/utils/complaintLocation';
import { complaintStatusColors } from '@/data/complaintStatus';
import PublicFeed from '@/pages/PublicFeed';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';
import Avatar from '@/components/ui/Avatar';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import QuoteCard from '@/components/ui/QuoteCard';
import { getDailyCivicQuoteIndex } from '@/data/civicQuotes';

const AdminAnalyticsDashboard = lazy(() => import('@/pages/AdminAnalyticsDashboard'));
const AwarenessPage = lazy(() => import('@/pages/Awareness'));
const LazyComplaintMap = lazy(() =>
  import('@/components/ComplaintMap').then((module) => ({ default: module.ComplaintMap })),
);
const LazyLocationPicker = lazy(() =>
  import('@/components/ComplaintMap').then((module) => ({ default: module.LocationPicker })),
);

const field =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-civic-600 focus:ring-4 focus:ring-civic-100';
const maxComplaintImages = 4;
const maxImageSize = 5 * 1024 * 1024;
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const statusLabels = {
  submitted: 'Pending',
  under_review: 'Pending review',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
  closed: 'Closed',
};
const nextStatuses = {
  submitted: ['in_progress', 'resolved', 'rejected'],
  under_review: ['in_progress', 'resolved', 'rejected'],
  assigned: ['in_progress', 'resolved', 'rejected'],
  in_progress: ['resolved', 'rejected'],
  resolved: ['closed'],
  rejected: ['closed'],
  closed: [],
};
const notificationUpdateEvent = 'civicconnect:notifications-updated';
const statusChipClass = (active) =>
  `min-h-9 rounded-full border px-3.5 py-2 text-xs font-bold capitalize transition ${
    active
      ? 'border-civic-700 bg-civic-700 text-white shadow-sm'
      : 'border-slate-200 bg-white text-slate-600 hover:border-civic-300 hover:bg-civic-50 hover:text-civic-800'
  }`;

function ComplaintMap(props) {
  const className = props.className ?? 'h-96 w-full';
  return (
    <Suspense
      fallback={
        <div aria-label="Loading map" className={className} role="status">
          <Skeleton className="h-full w-full" />
        </div>
      }
    >
      <div aria-label="Complaint locations map" className={className} role="region">
        <LazyComplaintMap {...props} />
      </div>
    </Suspense>
  );
}

function LocationPicker(props) {
  const [isNearViewport, setIsNearViewport] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    if (!('IntersectionObserver' in window)) {
      setIsNearViewport(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div aria-label="Select complaint location on map" className="h-80 w-full" ref={containerRef} role="region">
      {isNearViewport ? (
        <Suspense
          fallback={
            <div aria-label="Loading location picker" className="h-full w-full" role="status">
              <Skeleton className="h-full w-full" />
            </div>
          }
        >
          <LazyLocationPicker {...props} />
        </Suspense>
      ) : (
        <div aria-label="Location map loads when visible" className="h-full w-full" role="status">
          <Skeleton className="h-full w-full" />
        </div>
      )}
    </div>
  );
}

function renderNavIcon(name, size = 17) {
  const iconProps = { 'aria-hidden': true, size };
  if (name === 'dashboard') return <House {...iconProps} />;
  if (name === 'complaints') return <ClipboardList {...iconProps} />;
  if (name === 'community') return <UsersRound {...iconProps} />;
  if (name === 'map') return <MapPinned {...iconProps} />;
  if (name === 'awareness') return <ShieldCheck {...iconProps} />;
  return <LayoutDashboard {...iconProps} />;
}

function renderDashboardIcon(name) {
  const iconProps = { 'aria-hidden': true, size: 20 };
  if (name === 'total') return <FileText {...iconProps} />;
  if (name === 'pending') return <Clock3 {...iconProps} />;
  if (name === 'inProgress') return <Activity {...iconProps} />;
  return <CheckCircle2 {...iconProps} />;
}

function renderQuickLinkIcon(name) {
  const iconProps = { 'aria-hidden': true, size: 21 };
  if (name === 'community') return <UsersRound {...iconProps} />;
  if (name === 'map') return <Map {...iconProps} />;
  return <ShieldCheck {...iconProps} />;
}

function PasswordField({ label, visible, onToggle, ...inputProps }) {
  return (
    <div className="relative">
      <Input
        {...inputProps}
        className="pr-20"
        label={label}
        type={visible ? 'text' : 'password'}
      />
      <button
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-[2.35rem] inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-civic-700 hover:bg-civic-50"
        onClick={onToggle}
        type="button"
      >
        {visible ? <EyeOff aria-hidden="true" size={15} /> : <Eye aria-hidden="true" size={15} />}
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

function AuthScreen({ mode }) {
  const navigate = useNavigate();
  const { token } = useParams();
  const { login, register, user } = useAuth();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (mode === 'login') await login(values);
      else if (mode === 'register') await register(values);
      else if (mode === 'forgot-password') {
        const result = await authApi.forgotPassword(values);
        setNotice(result.message);
      } else {
        await authApi.resetPassword(token, values);
      }
      // After password reset the user is NOT logged in — send to login
      if (mode === 'reset-password') navigate('/login');
      else if (mode !== 'forgot-password') navigate('/dashboard');
    } catch (err) {
      setError(err.errors?.join(' ') || err.message);
    } finally {
      setBusy(false);
    }
  };
  const title =
    mode === 'register'
      ? 'Create your account'
      : mode === 'forgot-password'
        ? 'Reset your password'
        : mode === 'reset-password'
          ? 'Choose a new password'
          : 'Welcome back';
  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[minmax(0,1fr)_minmax(26rem,0.82fr)]">
      <aside className="relative hidden min-h-full overflow-hidden bg-gradient-to-br from-civic-950 via-civic-800 to-civic-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 top-28 h-96 w-96 rounded-full border border-white/10" />
        <div className="absolute -right-12 top-48 h-56 w-56 rounded-full border border-accent-500/30" />
        <Link to="/" className="relative flex items-center gap-3 font-heading text-lg font-extrabold">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-accent-100">C</span>
          CivicConnect
        </Link>
        <div className="relative max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-civic-200">Small actions. Shared progress.</p>
          <h2 className="mt-5 font-heading text-5xl font-extrabold leading-[1.08]">
            Better places start with people who care.
          </h2>
          <p className="mt-6 max-w-lg text-base leading-7 text-civic-100/80">
            Make a local issue visible, follow it as it moves forward, and help your neighborhood thrive.
          </p>
        </div>
        <QuoteCard className="relative max-w-xl text-civic-100/80" />
      </aside>
      <div className="grid min-h-screen place-items-center p-5 sm:p-8">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-5 rounded-3xl border border-slate-200/80 bg-white p-7 shadow-float sm:p-9"
      >
        <Link to="/" className="flex items-center gap-3 font-heading text-lg font-extrabold text-civic-800">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-civic-50 text-civic-700">C</span>
          CivicConnect
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-civic-700">Your community, connected</p>
          <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        </div>
        {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}
        {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{notice}</p>}
        {mode === 'register' && (
          <>
            <Input label="Full name" name="fullName" minLength="2" placeholder="Your name" autoComplete="name" required />
            <Input label="Phone number" name="phone" type="tel" placeholder="Phone number" autoComplete="tel" required />
          </>
        )}
        {mode !== 'reset-password' && <Input label="Email address" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />}
        {mode !== 'forgot-password' && (
          <PasswordField
            label={mode === 'reset-password' ? 'New password' : 'Password'}
            name="password"
            minLength="8"
            placeholder="At least 8 characters"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            visible={passwordVisible}
            onToggle={() => setPasswordVisible((visible) => !visible)}
            required
          />
        )}
        {(mode === 'register' || mode === 'reset-password') && (
          <PasswordField
            label="Confirm password"
            name="confirmPassword"
            minLength="8"
            placeholder="Repeat password"
            autoComplete="new-password"
            visible={passwordVisible}
            onToggle={() => setPasswordVisible((visible) => !visible)}
            required
          />
        )}
        <Button className="w-full" loading={busy}>
          {busy
            ? 'Please wait…'
            : mode === 'register'
              ? 'Create account'
              : mode === 'forgot-password'
                ? 'Send reset link'
                : mode === 'reset-password'
                  ? 'Reset password'
                  : 'Sign in'}
        </Button>
        {mode === 'login' && (
          <p className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
            <Link className="font-semibold text-civic-700 hover:text-civic-900" to="/forgot-password">
              Forgot password?
            </Link>{' '}
            ·{' '}
            <Link className="font-semibold text-civic-700 hover:text-civic-900" to="/register">
              Create an account
            </Link>
          </p>
        )}
      </form>
      </div>
    </main>
  );
}

function Shell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationError, setNotificationError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const displayName = user?.fullName ?? user?.username ?? user?.name ?? 'CivicConnect user';
  const roleLabel = user?.role === 'admin' ? 'Admin' : 'Citizen';
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/complaints', label: 'Complaints', icon: 'complaints' },
    { to: '/public-feed', label: 'Community', icon: 'community' },
    { to: '/complaints/map', label: 'Map', icon: 'map' },
    { to: '/awareness', label: 'Awareness', icon: 'awareness' },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Analytics', icon: 'analytics' }] : []),
  ];
  const refreshUnreadCount = useCallback(() => {
    notificationsApi
      .unreadCount()
      .then((response) => {
        setUnreadCount(response.data.unreadCount);
        setNotificationError('');
      })
      .catch((error) => setNotificationError(error.message));
  }, []);

  useEffect(() => {
    refreshUnreadCount();
    window.addEventListener(notificationUpdateEvent, refreshUnreadCount);
    window.addEventListener('focus', refreshUnreadCount);
    const intervalId = window.setInterval(refreshUnreadCount, 60000);
    return () => {
      window.removeEventListener(notificationUpdateEvent, refreshUnreadCount);
      window.removeEventListener('focus', refreshUnreadCount);
      window.clearInterval(intervalId);
    };
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!userMenuOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!userMenuRef.current?.contains(event.target)) setUserMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      navigate('/login');
      setSigningOut(false);
      setUserMenuOpen(false);
      setMenuOpen(false);
    }
  };
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 shadow-[0_8px_24px_-24px_rgba(15,35,48,0.5)] backdrop-blur-xl">
        <nav className="mx-auto max-w-7xl" aria-label="Main navigation">
          <div className="flex min-h-[4.5rem] items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
            <Link to="/dashboard" className="mr-auto flex min-w-0 shrink-0 items-center gap-2.5 font-heading text-base font-extrabold tracking-tight text-slate-900">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-civic-700 text-white shadow-sm">
                <House aria-hidden="true" size={20} strokeWidth={2.5} />
              </span>
              <span className="truncate">Civic<span className="text-civic-700">Connect</span></span>
            </Link>
            <div className="hidden items-center gap-1 xl:flex">
            {navItems.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/dashboard'}
                className={({ isActive }) => `inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-bold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-civic-600 ${isActive ? 'bg-civic-50 text-civic-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                {renderNavIcon(icon, 15)}
                {label}
              </NavLink>
            ))}
            </div>
            <Link
              aria-label="Report an issue"
              className="hidden min-h-10 items-center justify-center gap-2 rounded-xl bg-accent-500 px-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-accent-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 lg:inline-flex"
              to="/complaints/new"
            >
              <Plus aria-hidden="true" size={16} />
              <span className="hidden 2xl:inline">Report issue</span>
              <span className="2xl:hidden">Report</span>
            </Link>
            <NavLink
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
              className={({ isActive }) => `relative grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${isActive ? 'bg-civic-50 text-civic-800' : 'text-slate-600 hover:bg-slate-100'}`}
              to="/notifications"
            >
              <Bell aria-hidden="true" size={19} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-grid min-w-5 place-items-center rounded-full bg-accent-500 px-1 text-[10px] font-extrabold leading-5 text-white ring-2 ring-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
            <div className="relative hidden xl:block" ref={userMenuRef}>
              <button
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                className="flex min-h-11 max-w-52 items-center gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-civic-600"
                onClick={() => setUserMenuOpen((open) => !open)}
                type="button"
              >
                <Avatar name={displayName} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold text-slate-800">{displayName}</span>
                  <span className={`mt-0.5 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold ${roleLabel === 'Admin' ? 'bg-accent-50 text-accent-700' : 'bg-civic-50 text-civic-700'}`}>{roleLabel}</span>
                </span>
                <ChevronDown aria-hidden="true" size={15} className={`shrink-0 text-slate-400 transition ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-float" role="menu">
                  <div className="border-b border-slate-100 px-3 py-3">
                    <p className="truncate text-sm font-bold text-slate-900">{displayName}</p>
                    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${roleLabel === 'Admin' ? 'bg-accent-50 text-accent-700' : 'bg-civic-50 text-civic-700'}`}>{roleLabel}</span>
                  </div>
                  <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-civic-50 hover:text-civic-800" onClick={() => setUserMenuOpen(false)} role="menuitem" to="/dashboard">
                    <LayoutDashboard aria-hidden="true" size={17} /> Dashboard
                  </Link>
                  <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50" disabled={signingOut} onClick={handleLogout} role="menuitem" type="button">
                    <LogOut aria-hidden="true" size={17} /> {signingOut ? 'Signing out…' : 'Sign out'}
                  </button>
                </div>
              )}
            </div>
            <button
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50 xl:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              {menuOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
            </button>
          </div>
          <div
            aria-hidden={!menuOpen}
            className={`overflow-hidden border-t border-slate-200 bg-white shadow-lg transition-[max-height,opacity,visibility] duration-300 ease-out xl:hidden ${menuOpen ? 'visible max-h-[36rem] opacity-100' : 'invisible pointer-events-none max-h-0 border-transparent opacity-0'}`}
            id="mobile-navigation"
          >
            <div className="mx-auto max-w-7xl px-3 py-3 sm:px-6 lg:px-8">
              <div className="mb-3 flex items-center gap-3 rounded-2xl bg-civic-50/80 p-3">
                <Avatar name={displayName} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{displayName}</p>
                  <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${roleLabel === 'Admin' ? 'bg-accent-100 text-accent-700' : 'bg-civic-100 text-civic-800'}`}>{roleLabel}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {navItems.map(({ to, label, icon }) => (
                  <NavLink key={to} end={to === '/dashboard'} onClick={() => setMenuOpen(false)} to={to} className={({ isActive }) => `flex min-h-11 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${isActive ? 'bg-civic-100 text-civic-900' : 'text-slate-600 hover:bg-slate-50'}`}>
                    {renderNavIcon(icon)} {label}
                  </NavLink>
                ))}
                <NavLink onClick={() => setMenuOpen(false)} to="/notifications" className={({ isActive }) => `flex min-h-11 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${isActive ? 'bg-civic-100 text-civic-900' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <Bell aria-hidden="true" size={17} /> Notifications
                  {unreadCount > 0 && <span className="ml-auto inline-grid min-w-5 place-items-center rounded-full bg-accent-500 px-1 text-[10px] leading-5 text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                </NavLink>
                <NavLink onClick={() => setMenuOpen(false)} to="/complaints/new" className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-civic-700 hover:bg-civic-50">
                  <Plus aria-hidden="true" size={17} /> Report issue
                </NavLink>
                <button className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50" disabled={signingOut} onClick={handleLogout} type="button">
                  <LogOut aria-hidden="true" size={17} /> {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </div>
          </div>
        </nav>
      </header>
      {notificationError && (
        <p className="mx-auto max-w-7xl px-6 pt-3 text-sm text-amber-800" role="status">
          Unread notification count unavailable: {notificationError}
        </p>
      )}
      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-6 sm:px-6 sm:py-9 lg:px-8">{children}</main>
      <footer className="mt-8 border-t border-slate-200 bg-white/80">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-9 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_0.8fr_1fr] lg:px-8">
          <div>
            <Link to="/dashboard" className="inline-flex items-center gap-2 font-heading text-base font-extrabold text-slate-900">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-civic-700 text-white"><House aria-hidden="true" size={16} /></span>
              Civic<span className="-ml-2 text-civic-700">Connect</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">CivicConnect helps neighbors raise local concerns, follow progress, and make shared spaces better together.</p>
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Quick links</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link className="text-slate-600 hover:text-civic-800" to="/dashboard">Dashboard</Link></li>
              <li><Link className="text-slate-600 hover:text-civic-800" to="/public-feed">Community reports</Link></li>
              <li><Link className="text-slate-600 hover:text-civic-800" to="/awareness">Awareness</Link></li>
            </ul>
          </div>
          <QuoteCard className="text-slate-700" />
        </div>
      </footer>
    </div>
  );
}

function Dashboard({ mode }) {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ total: null, pending: null, inProgress: null, resolved: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminStats, setAdminStats] = useState(null);
  const [adminStatsError, setAdminStatsError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const loadDashboard = useCallback(async () => {
    try {
      const [recent, submitted, underReview, assigned, inProgress, resolved] = await Promise.all([
        complaintsApi.mine({ page: 1, limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
        complaintsApi.mine({ page: 1, limit: 1, status: 'submitted' }),
        complaintsApi.mine({ page: 1, limit: 1, status: 'under_review' }),
        complaintsApi.mine({ page: 1, limit: 1, status: 'assigned' }),
        complaintsApi.mine({ page: 1, limit: 1, status: 'in_progress' }),
        complaintsApi.mine({ page: 1, limit: 1, status: 'resolved' }),
      ]);
      setReports(recent.data.complaints);
      setStats({
        total: recent.data.pagination.total,
        pending:
          submitted.data.pagination.total +
          underReview.data.pagination.total +
          assigned.data.pagination.total,
        inProgress: inProgress.data.pagination.total,
        resolved: resolved.data.pagination.total,
      });
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Unable to load your reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode === 'admin') return undefined;
    loadDashboard();
  }, [loadDashboard, mode, reloadKey]);

  useEffect(() => {
    if (user?.role !== 'admin') return undefined;
    let active = true;
    adminApi
      .dashboard()
      .then((response) => {
        if (active) {
          setAdminStats(response.data.dashboard);
          setAdminStatsError('');
        }
      })
      .catch((requestError) => {
        if (active) setAdminStatsError(requestError.message || 'Unable to load admin summary.');
      });
    return () => {
      active = false;
    };
  }, [user?.role]);

  const handleReportCreated = (complaint) => {
    if (complaint) {
      setReports((current) => [complaint, ...current].slice(0, 5));
      setStats((current) => ({
        total: (current.total ?? 0) + 1,
        pending: (current.pending ?? 0) + (complaint.status === 'submitted' ? 1 : 0),
        inProgress: (current.inProgress ?? 0) + (complaint.status === 'in_progress' ? 1 : 0),
        resolved: (current.resolved ?? 0) + (complaint.status === 'resolved' ? 1 : 0),
      }));
    }
    setReloadKey((key) => key + 1);
  };
  const displayName = user?.fullName ?? user?.username ?? 'neighbor';
  const quickLinks = [
    { to: '/public-feed', label: 'Public feed', description: 'See what neighbors are reporting.', icon: 'community' },
    { to: '/complaints/map', label: 'Map view', description: 'Explore reports around the city.', icon: 'map' },
    { to: '/awareness', label: 'Awareness', description: 'Tips and local community drives.', icon: 'awareness' },
  ];

  return (
    <Shell>
      {mode === 'admin' ? (
        <Suspense fallback={<p className="mt-4 text-slate-600">Loading analytics…</p>}>
          <AdminAnalyticsDashboard />
        </Suspense>
      ) : (
        <>
          <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-civic-700">Your civic home</p>
              <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Hello, {displayName}</h1>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">Your voice helps make our shared spaces better. Here’s your community activity.</p>
            </div>
            <Link to="/complaints" className="text-sm font-bold text-civic-700 transition hover:text-civic-900">View all my reports <span aria-hidden="true">→</span></Link>
          </header>
          <Card className="relative mb-6 overflow-hidden bg-civic-950 p-5 text-white shadow-float sm:p-7">
            <span aria-hidden="true" className="absolute -right-10 -top-14 h-48 w-48 rounded-full border border-white/10" />
            <span className="relative mb-3 block text-xs font-extrabold uppercase tracking-[0.18em] text-civic-200">Quote of the day</span>
            <QuoteCard
              autoRotate={false}
              initialIndex={getDailyCivicQuoteIndex()}
              showNext={false}
              className="relative max-w-3xl text-white"
            />
          </Card>
          <section aria-label="My report statistics" className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {[
              { key: 'total', label: 'My total reports', value: stats.total, tone: 'bg-civic-50 text-civic-700' },
              { key: 'pending', label: 'Pending', value: stats.pending, tone: 'bg-amber-50 text-amber-700' },
              { key: 'inProgress', label: 'In progress', value: stats.inProgress, tone: 'bg-sky-50 text-sky-700' },
              { key: 'resolved', label: 'Resolved', value: stats.resolved, tone: 'bg-emerald-50 text-emerald-700' },
            ].map(({ key, label, value, tone }) => (
              <Card as="article" className="p-4 sm:p-5" key={key}>
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}>{renderDashboardIcon(key)}</span>
                <p className="mt-4 text-xs font-bold text-slate-500 sm:text-sm">{label}</p>
                <p className="mt-1 font-heading text-2xl font-extrabold text-slate-950">{value ?? '—'}</p>
              </Card>
            ))}
          </section>
          {error && <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">Could not load your reports: {error}</p>}
          <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)]">
            <ComplaintForm
              embedded
              onSuccess={handleReportCreated}
            />
            <div className="space-y-5">
              <Card className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-civic-700">Follow the progress</p>
                    <h2 className="mt-1 font-heading text-xl font-extrabold text-slate-950">My recent reports</h2>
                  </div>
                  <Link aria-label="View all my reports" className="shrink-0 text-xs font-bold text-civic-700 hover:text-civic-900" to="/complaints">View all →</Link>
                </div>
                {loading ? (
                  <div className="mt-5 space-y-3">{[0, 1, 2].map((item) => <Skeleton className="h-20 w-full" key={item} />)}</div>
                ) : reports.length ? (
                  <ul className="mt-4 divide-y divide-slate-100">
                    {reports.map((item) => (
                      <li className="flex gap-3 py-4 first:pt-0 last:pb-0" key={item._id}>
                        {item.images?.[0]?.url ? (
                          <img alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" loading="lazy" src={item.images[0].url} />
                        ) : (
                          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-civic-50 text-civic-700"><FileText aria-hidden="true" size={22} /></span>
                        )}
                        <div className="min-w-0 flex-1">
                          <Link className="block truncate text-sm font-bold text-slate-900 transition hover:text-civic-700" to={`/complaints/${item._id}`}>{item.title}</Link>
                          <p className="mt-1 truncate text-xs text-slate-500">{item.category?.name ?? 'Civic report'} · {new Date(item.createdAt).toLocaleDateString()}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.upvoteCount ?? item.upvotes?.length ?? 0} upvotes</p>
                        </div>
                        <Badge status={item.status} className="h-fit shrink-0" />
                      </li>
                    ))}
                  </ul>
                ) : !error ? (
                  <EmptyState
                    className="mt-5 px-4 py-8"
                    icon={<House aria-hidden="true" size={22} />}
                    title="No reports yet"
                    description="Your first report can make your street better."
                    action={<a className="text-sm font-bold text-civic-700 hover:text-civic-900" href="#quick-report">Raise a complaint ↓</a>}
                  />
                ) : null}
              </Card>
              {user?.role === 'admin' && (
                <Card className="flex items-center justify-between gap-4 border-civic-200 bg-civic-50/70 p-4">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wide text-civic-800">Admin quick stats</p>
                    {adminStats ? (
                      <p className="mt-1 text-sm text-slate-700">
                        {adminStats.totalComplaints} reports · {adminStats.pendingComplaints} pending · {adminStats.totalUsers} users
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-slate-600">{adminStatsError || 'Loading citywide summary…'}</p>
                    )}
                  </div>
                  <Link aria-label="Open admin analytics" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-civic-700 text-white hover:bg-civic-800" to="/admin">
                    <ArrowUpRight aria-hidden="true" size={19} />
                  </Link>
                </Card>
              )}
            </div>
          </div>
          <section className="mt-8">
            <h2 className="font-heading text-lg font-extrabold text-slate-950">Explore CivicConnect</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {quickLinks.map(({ to, label, description, icon }) => (
                <Link className="group flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-civic-200 hover:shadow-float" key={to} to={to}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-civic-50 text-civic-700">{renderQuickLinkIcon(icon)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-heading text-sm font-extrabold text-slate-900">{label}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
                  </span>
                  <ArrowUpRight aria-hidden="true" className="shrink-0 text-slate-400 transition group-hover:text-civic-700" size={17} />
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </Shell>
  );
}

function ComplaintForm({ embedded = false, onSuccess }) {
  const showToast = useToast();
  const previewUrls = useRef(new Set());
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState([]);
  const [imageError, setImageError] = useState('');
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [addressLookupLoading, setAddressLookupLoading] = useState(false);
  const [addressLookupError, setAddressLookupError] = useState('');
  const [geolocationError, setGeolocationError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [categorySuggestion, setCategorySuggestion] = useState(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');

  useEffect(() => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    if (`${trimmedTitle} ${trimmedDescription}`.trim().length < 15) {
      setCategorySuggestion(null);
      setSuggestionError('');
      setSuggestionLoading(false);
      return undefined;
    }

    let active = true;
    setCategorySuggestion(null);
    setSuggestionError('');
    setSuggestionLoading(true);
    const timeoutId = setTimeout(() => {
      aiApi
        .suggestCategory({ title: trimmedTitle, description: trimmedDescription })
        .then((response) => {
          if (active) setCategorySuggestion(response.data);
        })
        .catch((requestError) => {
          if (active) setSuggestionError(requestError.message);
        })
        .finally(() => {
          if (active) setSuggestionLoading(false);
        });
    }, 800);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [title, description]);

  useEffect(
    () => () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.current.clear();
    },
    [],
  );

  useEffect(() => {
    let active = true;
    categoriesApi
      .list()
      .then((response) => {
        if (active) setCategories(response.data.categories);
      })
      .catch((err) => {
        if (active) setCategoriesError(err.message);
      })
      .finally(() => {
        if (active) setCategoriesLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!coordinates) return undefined;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setAddressLookupLoading(true);
      setAddressLookupError('');
      try {
        const query = new URLSearchParams({
          lat: String(coordinates.lat),
          lon: String(coordinates.lng),
          format: 'jsonv2',
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query}`, {
          signal: controller.signal,
          headers: { 'Accept-Language': 'en' },
        });
        if (!response.ok)
          throw new Error('Address lookup failed. You can enter the address manually.');
        const result = await response.json();
        if (!result.display_name)
          throw new Error('No address was found. You can enter it manually.');
        setAddress(result.display_name.slice(0, 500));
      } catch (lookupError) {
        if (lookupError.name !== 'AbortError') setAddressLookupError(lookupError.message);
      } finally {
        if (!controller.signal.aborted) setAddressLookupLoading(false);
      }
    }, 1000);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [coordinates]);

  const addImages = (event) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = '';
    const valid = [];
    const errors = [];
    selected.forEach((file) => {
      if (!allowedImageTypes.includes(file.type)) {
        errors.push(`${file.name}: choose a JPG, PNG, or WEBP image.`);
      } else if (file.size > maxImageSize) {
        errors.push(`${file.name}: images must be 5 MB or smaller.`);
      } else {
        valid.push(file);
      }
    });
    const slots = maxComplaintImages - images.length;
    if (valid.length > slots) errors.push(`You can attach at most ${maxComplaintImages} images.`);
    const additions = valid.slice(0, Math.max(slots, 0)).map((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.add(previewUrl);
      return { file, previewUrl };
    });
    setImages((current) => [...current, ...additions]);
    setImageError(errors.join(' '));
  };

  const removeImage = (previewUrl) => {
    previewUrls.current.delete(previewUrl);
    URL.revokeObjectURL(previewUrl);
    setImages((current) => current.filter((image) => image.previewUrl !== previewUrl));
    setImageError('');
  };

  const useCurrentLocation = () => {
    setGeolocationError('');
    if (!navigator.geolocation) {
      setGeolocationError('Your browser does not support location access.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setCoordinates({ lat: coords.latitude, lng: coords.longitude }),
      (locationError) => {
        setGeolocationError(
          locationError.code === 1
            ? 'Location permission was denied. Select a point on the map or enter an address.'
            : 'Could not get your location. Select a point on the map or enter an address.',
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    const form = event.currentTarget;
    try {
      const payload = new FormData(form);
      payload.set(
        'location',
        JSON.stringify({
          address: address.trim(),
          ...(coordinates ? { coordinates } : {}),
        }),
      );
      images.forEach(({ file }) => payload.append('images', file));
      const response = await complaintsApi.create(payload);
      form.reset();
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.current.clear();
      setImages([]);
      setImageError('');
      setAddress('');
      setCoordinates(null);
      setAddressLookupLoading(false);
      setAddressLookupError('');
      setGeolocationError('');
      setTitle('');
      setDescription('');
      setCategory('');
      setCategorySuggestion(null);
      setSuggestionError('');
      showToast('Your complaint has been submitted. Thank you for speaking up.', 'success');
      onSuccess?.(response.data.complaint);
    } catch (err) {
      setError(err.errors?.join(' ') || err.message);
    } finally {
      setBusy(false);
    }
  };

  const categorySelect = categoriesError ? (
    <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
      Could not load categories — {categoriesError}
    </p>
  ) : categories.length === 0 && !categoriesLoading ? (
    <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
      No categories are available right now. Please try again later.
    </p>
  ) : (
    <Select
      label="Issue category"
      name="category"
      onChange={(event) => setCategory(event.target.value)}
      value={category}
      disabled={categoriesLoading}
      required
    >
      <option value="" disabled>{categoriesLoading ? 'Loading categories…' : 'Select a category'}</option>
      {categories.map((category) => (
        <option value={category._id} key={category._id}>{category.name}</option>
      ))}
    </Select>
  );

  return (
      <div className={embedded ? 'w-full' : 'mx-auto max-w-3xl'}>
        {!embedded && <div className="mb-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-civic-700">A better block starts here</p>
          <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Report a civic issue</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Tell us what needs attention. Add a location or photo to help your community team act with context.</p>
        </div>}
        <Card as="form" onSubmit={submit} className="space-y-6 p-5 sm:p-8">
          {embedded && (
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-civic-700">Take the first step</p>
              <h2 className="mt-1 font-heading text-xl font-extrabold text-slate-950">Raise a complaint</h2>
              <p className="mt-1 text-sm leading-5 text-slate-600">Report a local issue with the details your community needs to take action.</p>
            </div>
          )}
          {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{error}</p>}
          <Input
            label="Issue title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            minLength="5"
            maxLength="150"
            placeholder="e.g. Broken streetlight near the library"
            required
          />
          <Textarea
            label="Describe the issue"
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            minLength="20"
            maxLength="5000"
            placeholder="What happened, where exactly, and how is it affecting people?"
            rows="6"
            required
          />
          {suggestionLoading && (
            <p className="text-sm text-slate-500" role="status">
              Suggesting a category…
            </p>
          )}
          {suggestionError && (
            <p className="text-sm text-amber-700" role="status">
              Category suggestion unavailable: {suggestionError}
            </p>
          )}
          {categorySuggestion && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-civic-200 bg-civic-50 p-4">
              <p className="text-sm text-blue-900">
                Suggested category: <strong>{categorySuggestion.categoryName}</strong> (
                {Math.round(categorySuggestion.confidence * 100)}%)
                <span className="ml-1 text-blue-800">{categorySuggestion.reason}</span>
              </p>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  className="text-sm font-semibold text-civic-800 underline"
                  onClick={() => {
                    setCategory(categorySuggestion.categoryId);
                    setCategorySuggestion(null);
                  }}
                  type="button"
                >
                  Apply
                </button>
                <button
                  aria-label="Dismiss category suggestion"
                  className="rounded-lg px-2 py-1 text-sm text-slate-600 transition hover:bg-white hover:text-slate-900"
                  onClick={() => setCategorySuggestion(null)}
                  type="button"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {categorySelect}
            <Select label="Priority" name="priority" defaultValue="medium">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
          </div>
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Issue location</h2>
                <p className="text-sm text-slate-500">
                  Enter an address or select a pin on the map.
                </p>
              </div>
              <Button type="button" onClick={useCurrentLocation}>
                Use my current location
              </Button>
            </div>
            <Input
              label="Issue address"
              name="location"
              minLength="3"
              maxLength="500"
              placeholder="Street address, landmark, or neighborhood"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              required
            />
            {addressLookupLoading && <p className="text-sm text-slate-500">Looking up address…</p>}
            {(addressLookupError || geolocationError) && (
              <p className="text-sm text-amber-700">{addressLookupError || geolocationError}</p>
            )}
            <LocationPicker coordinates={coordinates} onSelect={setCoordinates} />
            {coordinates && (
              <button
                className="text-sm text-blue-700 underline"
                type="button"
                onClick={() => setCoordinates(null)}
              >
                Clear map pin
              </button>
            )}
          </section>
          <section className="space-y-3">
            <label className="block font-medium" htmlFor="complaint-images">
              Add photos (up to 4, 5 MB each)
            </label>
            <input
              id="complaint-images"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-civic-50 file:px-3 file:py-2 file:text-sm file:font-bold file:text-civic-800"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={addImages}
            />
            {imageError && <p className="text-sm text-red-700">{imageError}</p>}
            {images.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {images.map(({ file, previewUrl }) => (
                  <li className="relative" key={previewUrl}>
                    <img
                      className="h-28 w-full rounded-lg object-cover"
                      src={previewUrl}
                      alt={`Preview of ${file.name}`}
                    />
                    <button
                      aria-label={`Remove ${file.name}`}
                      className="absolute right-2 top-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-rose-700 shadow-md transition hover:bg-rose-50"
                      type="button"
                      onClick={() => removeImage(previewUrl)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <Button
            className="w-full sm:w-auto"
            disabled={busy || categoriesLoading || !!categoriesError || categories.length === 0}
            loading={busy}
          >
            {busy ? 'Submitting…' : 'Submit complaint'}
          </Button>
        </Card>
      </div>
  );
}

function NewComplaint() {
  const navigate = useNavigate();
  return (
    <Shell>
      <ComplaintForm onSuccess={() => navigate('/complaints')} />
    </Shell>
  );
}

function ComplaintsList() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [complaints, setComplaints] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const statuses = [
    ['', 'All'],
    ['submitted', 'Pending'],
    ['under_review', 'Under review'],
    ['assigned', 'Assigned'],
    ['in_progress', 'In progress'],
    ['resolved', 'Resolved'],
    ['rejected', 'Rejected'],
    ['closed', 'Closed'],
  ];

  useEffect(() => {
    setComplaints(null);
    const params = status ? { status } : {};
    const fetcher = isAdmin ? adminApi.complaints(params) : complaintsApi.mine(params);
    fetcher.then((res) => setComplaints(res.data.complaints)).catch((err) => setError(err.message));
  }, [status, isAdmin]);

  return (
    <Shell>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-civic-700">{isAdmin ? 'Citywide overview' : 'Your activity'}</p>
          <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-slate-950">{isAdmin ? 'All complaints' : 'Your complaints'}</h1>
          <p className="mt-2 text-sm text-slate-600">Follow each report from first notice to meaningful progress.</p>
        </div>
        {!isAdmin && <Link className="text-sm font-bold text-civic-700 hover:text-civic-900" to="/complaints/new">+ Report an issue</Link>}
      </header>
      <nav aria-label="Filter complaints by status" className="mb-5 flex gap-2 overflow-x-auto pb-2">
        {statuses.map(([value, label]) => (
          <button
            aria-pressed={status === value}
            className={`${statusChipClass(status === value)} shrink-0`}
            key={value || 'all'}
            onClick={() => setStatus(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{error}</p>}
      {!complaints ? (
        <ul aria-label="Loading complaints" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <li key={index}>
              <Card className="overflow-hidden p-0">
                <Skeleton className="h-44 w-full rounded-none" />
                <div className="space-y-3 p-5">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-28" />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {complaints.map((item) => (
              <li key={item._id}>
                <Card className="h-full overflow-hidden p-0 transition duration-200 hover:-translate-y-1 hover:shadow-float">
                  {item.images?.[0]?.url ? (
                    <img
                      alt={`Photo for ${item.title}`}
                      className="h-44 w-full object-cover"
                      loading="lazy"
                      src={item.images[0].url}
                    />
                  ) : (
                    <div className="grid h-44 place-items-center bg-gradient-to-br from-civic-50 to-civic-100 text-sm font-semibold text-civic-800">
                      Civic report
                    </div>
                  )}
                  <div className="space-y-3 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-xs font-extrabold uppercase tracking-wide text-civic-700">
                        {item.category?.name ?? 'Uncategorized'}
                      </span>
                      <Badge status={item.status} />
                    </div>
                    <Link
                      className="block font-heading text-lg font-extrabold leading-snug text-slate-950 hover:text-civic-700"
                      to={`/complaints/${item._id}`}
                    >
                      {item.title}
                    </Link>
                    <p className="line-clamp-2 text-sm leading-6 text-slate-600">{item.description}</p>
                    <p className="text-sm text-slate-500">{getComplaintLocationAddress(item.location)}</p>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">
                      <time dateTime={item.createdAt}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recently reported'}
                      </time>
                      <span>{item.upvoteCount ?? 0} votes</span>
                    </div>
                {isAdmin && (
                  <AdminComplaintStatusEditor
                    complaint={item}
                    onUpdated={(updated) =>
                      setComplaints((current) =>
                        current.map((complaint) =>
                          complaint._id === updated._id ? updated : complaint,
                        ),
                      )
                    }
                  />
                )}
                  </div>
                </Card>
              </li>
            ))}
            {!complaints.length && (
              <li className="md:col-span-2 xl:col-span-3">
                <EmptyState title="No reports in this view" description="Try another status filter, or submit a report to get the conversation started." action={!isAdmin && <Link className="font-bold text-civic-700" to="/complaints/new">Report an issue →</Link>} />
              </li>
            )}
        </ul>
      )}
    </Shell>
  );
}

function AdminComplaintStatusEditor({ complaint, onUpdated }) {
  const [status, setStatus] = useState(complaint.status);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const options = [complaint.status, ...(nextStatuses[complaint.status] ?? [])];

  useEffect(() => setStatus(complaint.status), [complaint.status]);

  const saveStatus = async (event) => {
    event.preventDefault();
    if (status === complaint.status) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const response = await adminApi.setStatus(complaint._id, status, note.trim());
      onUpdated(response.data.complaint);
      setNote('');
      setSuccess('Status updated.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[minmax(10rem,1fr)_2fr_auto]"
      onSubmit={saveStatus}
    >
      <label className="sr-only" htmlFor={`status-${complaint._id}`}>
        Complaint status
      </label>
      <select
        className={field}
        id={`status-${complaint._id}`}
        onChange={(event) => setStatus(event.target.value)}
        value={status}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {statusLabels[option] ?? option}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor={`status-note-${complaint._id}`}>
        Status update note
      </label>
      <textarea
        className={field}
        id={`status-note-${complaint._id}`}
        maxLength={1000}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Optional note for the complainant"
        rows={1}
        value={note}
      />
      <button
        className="min-h-11 rounded-xl bg-civic-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-civic-800 disabled:opacity-50"
        disabled={busy || status === complaint.status}
        type="submit"
      >
        {busy ? 'Saving…' : 'Update'}
      </button>
      {(error || success) && (
        <p
          className={`text-sm sm:col-span-3 ${error ? 'text-red-700' : 'text-emerald-700'}`}
          role={error ? 'alert' : 'status'}
        >
          {error || success}
        </p>
      )}
    </form>
  );
}

function ComplaintStatusTimeline({ complaint }) {
  const history = complaint.statusHistory?.length
    ? complaint.statusHistory
    : [{ status: complaint.status, note: 'Complaint submitted', changedAt: complaint.createdAt }];
  const iconFor = (status) => {
    if (status === 'resolved' || status === 'closed') return '✓';
    if (status === 'rejected') return '×';
    if (status === 'in_progress' || status === 'assigned') return '↻';
    return '•';
  };

  return (
    <section>
      <h2 className="mb-4 font-heading text-lg font-extrabold">Status timeline</h2>
      <ol className="ml-3 border-l-2 border-slate-200">
        {history.map((entry, index) => (
          <li
            className="relative pb-6 pl-7 last:pb-0"
            key={`${entry.status}-${entry.changedAt}-${index}`}
          >
            <span
              aria-hidden="true"
              className="absolute -left-[13px] grid h-6 w-6 place-items-center rounded-full border-[3px] border-white text-xs font-extrabold text-white shadow-sm"
              style={{ backgroundColor: complaintStatusColors[entry.status] ?? '#64748b' }}
            >
              {iconFor(entry.status)}
            </span>
            <h3 className="font-heading font-bold">
              {statusLabels[entry.status] ?? entry.status.replaceAll('_', ' ')}
            </h3>
            {entry.note && (
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{entry.note}</p>
            )}
            {entry.changedAt && (
              <time className="mt-1 block text-xs text-slate-500" dateTime={entry.changedAt}>
                {new Date(entry.changedAt).toLocaleString()}
              </time>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function ComplaintDetails() {
  const { id } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [error, setError] = useState('');
  const [upvoting, setUpvoting] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    let active = true;
    complaintsApi
      .get(id)
      .then((response) => {
        if (active) setComplaint(response.data.complaint);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const toggleUpvote = async () => {
    if (!complaint || upvoting) return;
    setUpvoting(true);
    try {
      const response = await complaintsApi.toggleUpvote(complaint._id);
      setComplaint((current) => ({
        ...current,
        hasUpvoted: response.data.upvoted,
        upvoteCount: response.data.upvoteCount,
      }));
    } catch (requestError) {
      showToast(requestError.message, 'error');
    } finally {
      setUpvoting(false);
    }
  };

  return (
    <Shell>
      <nav aria-label="Breadcrumb" className="mb-5">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm">
          <li><Link className="font-semibold text-slate-500 hover:text-civic-800" to="/dashboard">Dashboard</Link></li>
          <li aria-hidden="true"><ChevronRight className="text-slate-400" size={15} /></li>
          <li><Link className="font-semibold text-slate-500 hover:text-civic-800" to="/complaints">Complaints</Link></li>
          <li aria-hidden="true"><ChevronRight className="text-slate-400" size={15} /></li>
          <li aria-current="page" className="max-w-[min(60vw,30rem)] truncate font-bold text-slate-800">{complaint?.title ?? 'Complaint details'}</li>
        </ol>
      </nav>
      {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800" role="alert">{error}</p>}
      {!complaint ? (
        !error && <div className="mt-5 space-y-3"><Skeleton className="h-16 w-2/3" /><Skeleton className="h-72 w-full" /></div>
      ) : (
        <article className="mt-5 space-y-5">
          <Card className="p-5 sm:p-8">
            <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-civic-700">{complaint.category?.name ?? 'Uncategorized'}</p>
                <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">{complaint.title}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-2"><Badge status={complaint.status} /><Badge className="bg-white text-slate-600 ring-slate-200" status="priority">{complaint.priority} priority</Badge></div>
              </div>
              <button
                aria-pressed={Boolean(complaint.hasUpvoted)}
                className={`inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold shadow-sm transition disabled:cursor-wait disabled:opacity-60 ${
                  complaint.hasUpvoted
                    ? 'bg-accent-100 text-accent-700 ring-1 ring-accent-500/30'
                    : 'bg-accent-500 text-white hover:bg-accent-600'
                }`}
                disabled={upvoting}
                onClick={toggleUpvote}
                type="button"
              >
                <ThumbsUp aria-hidden="true" size={17} />
                {upvoting ? 'Updating…' : complaint.hasUpvoted ? 'Upvoted' : 'Upvote'}
                <span className="rounded-full bg-white/20 px-2 py-0.5">{complaint.upvoteCount ?? 0}</span>
              </button>
            </header>
            <p className="mt-6 whitespace-pre-wrap leading-7 text-slate-700">{complaint.description}</p>
          </Card>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
            <Card className="overflow-hidden p-0">
              <section>
                <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                  <h2 className="font-heading text-lg font-extrabold">Photos</h2>
                </div>
                {complaint.images?.length > 0 ? (
                  <ul className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
                {complaint.images.map((image, index) => (
                  <li key={image.publicId || image.url}>
                    <a className="block overflow-hidden rounded-xl bg-slate-100" href={image.url} target="_blank" rel="noreferrer">
                      <img
                        className="h-36 w-full object-cover transition duration-300 hover:scale-105 sm:h-48"
                        src={image.url}
                        alt={`Complaint photo ${index + 1}`}
                        loading="lazy"
                      />
                    </a>
                  </li>
                ))}
                  </ul>
                ) : (
                  <p className="p-5 text-sm text-slate-500">No photos were added to this report.</p>
                )}
              </section>
            </Card>
            <Card className="p-5 sm:p-6">
              <ComplaintStatusTimeline complaint={complaint} />
            </Card>
          </div>
          <Card className="overflow-hidden p-0">
            <section>
              <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                <h2 className="font-heading text-lg font-extrabold">Reported location</h2>
                <p className="mt-1 text-sm text-slate-600">{getComplaintLocationAddress(complaint.location)}</p>
              </div>
              {getComplaintCoordinates(complaint) ? (
                <ComplaintMap complaints={[]} readOnlyComplaint={complaint} />
              ) : (
                <p className="m-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  No map pin was added for this complaint.
                </p>
              )}
            </section>
          </Card>
        </article>
      )}
    </Shell>
  );
}

function ComplaintsMapView() {
  const [complaints, setComplaints] = useState(null);
  const [error, setError] = useState('');
  const [visibleStatuses, setVisibleStatuses] = useState(() => Object.keys(complaintStatusColors));
  const statusNames = {
    submitted: 'Pending',
    under_review: 'Under review',
    assigned: 'Assigned',
    in_progress: 'In progress',
    resolved: 'Resolved',
    rejected: 'Rejected',
    closed: 'Closed',
  };
  const visibleComplaints = complaints?.filter((item) => visibleStatuses.includes(item.status)) ?? [];

  useEffect(() => {
    let active = true;
    complaintsApi
      .map()
      .then((response) => {
        if (active) setComplaints(response.data.complaints);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Shell>
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-civic-700">See the bigger picture</p>
      <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-slate-950">Complaint map</h1>
      <p className="mt-2 text-slate-600">Pins show complaints that have a selected map location.</p>
      {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800" role="alert">{error}</p>}
      {complaints === null ? (
        !error && <Skeleton className="mt-5 h-[70vh] min-h-[30rem] w-full" />
      ) : (
        <div className="relative mt-5 overflow-hidden rounded-2xl border border-slate-200 shadow-float">
          <ComplaintMap complaints={visibleComplaints} fitAll className="h-[70vh] min-h-[30rem] w-full" />
          {!complaints.length && (
            <p className="absolute bottom-4 left-4 z-[1000] max-w-xs rounded-xl border border-slate-200 bg-white/95 p-3 text-sm text-slate-600 shadow-card">
              No mapped reports yet. Reports with a selected location pin will appear here.
            </p>
          )}
          <Card className="absolute right-3 top-3 z-[1000] max-h-[60%] w-[min(21rem,calc(100%-1.5rem))] overflow-auto p-4 shadow-float sm:right-5 sm:top-5">
            <h2 className="font-heading text-sm font-extrabold text-slate-950">Map filters</h2>
            <p className="mt-1 text-xs text-slate-500">Choose which report statuses to show.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(statusNames).map(([status, label]) => {
                const active = visibleStatuses.includes(status);
                return (
                  <button
                    aria-pressed={active}
                    className={`${statusChipClass(active)} inline-flex items-center gap-1.5`}
                    key={status}
                    onClick={() =>
                      setVisibleStatuses((current) =>
                        active ? current.filter((value) => value !== status) : [...current, status],
                      )
                    }
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: complaintStatusColors[status] }}
                    />
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Showing {visibleComplaints.length} of {complaints.length} mapped reports
            </p>
          </Card>
        </div>
      )}
    </Shell>
  );
}

function Notifications() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const showToast = useToast();

  const load = useCallback(async () => {
    try {
      const response = await notificationsApi.list();
      setItems(response.data.notifications);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
      setItems((current) =>
        current.map((item) => (item._id === id ? { ...item, isRead: true } : item)),
      );
      window.dispatchEvent(new Event(notificationUpdateEvent));
      showToast('Notification marked as read.', 'success');
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
      window.dispatchEvent(new Event(notificationUpdateEvent));
      showToast('All notifications marked as read.', 'success');
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  const remove = async (id) => {
    try {
      await notificationsApi.remove(id);
      setItems((current) => current.filter((item) => item._id !== id));
      window.dispatchEvent(new Event(notificationUpdateEvent));
      showToast('Notification deleted.', 'success');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-civic-700">Your updates</p>
          <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-slate-950">Notifications</h1>
          <p className="mt-2 text-sm text-slate-600">Stay in the loop as your community reports move forward.</p>
        </div>
        <Button
          variant="secondary"
          type="button"
          disabled={!items?.some((item) => !item.isRead)}
          onClick={markAllRead}
        >
          Mark all as read
        </Button>
      </div>
      {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{error}</p>}
      {!items ? (
        <div aria-label="Loading notifications" className="mt-5 space-y-3">
          {[0, 1, 2].map((item) => <Skeleton className="h-24 w-full" key={item} />)}
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((item) => (
            <li
              key={item._id}
              className={`flex flex-col justify-between gap-4 rounded-2xl border p-5 shadow-card sm:flex-row sm:items-center ${
                !item.isRead ? 'border-civic-200 bg-civic-50/65' : 'border-slate-200/80 bg-white'
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-heading font-extrabold text-slate-950">{item.title}</p>
                  {!item.isRead && <Badge status="in_progress" className="normal-case">New</Badge>}
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.message}</p>
                <time className="mt-1 block text-xs text-slate-500" dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleString()}
                </time>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {!item.isRead && (
                  <Button type="button" variant="secondary" className="min-h-9 px-3 py-2 text-xs" onClick={() => markRead(item._id)}>
                    Mark read
                  </Button>
                )}
                <Button type="button" variant="ghost" className="min-h-9 px-3 py-2 text-xs text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={() => remove(item._id)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
          {!items.length && (
            <li>
              <EmptyState title="You're all caught up" description="Updates about your reports and community activity will show up here." />
            </li>
          )}
        </ul>
      )}
    </Shell>
  );
}

export default function App({ mode }) {
  if (['login', 'register', 'forgot-password', 'reset-password'].includes(mode))
    return <AuthScreen mode={mode} />;
  if (mode === 'new-complaint') return <NewComplaint />;
  if (mode === 'complaints') return <ComplaintsList />;
  if (mode === 'public-feed')
    return (
      <Shell>
        <PublicFeed />
      </Shell>
    );
  if (mode === 'complaint-details') return <ComplaintDetails />;
  if (mode === 'complaints-map') return <ComplaintsMapView />;
  if (mode === 'notifications') return <Notifications />;
  if (mode === 'awareness')
    return (
      <Shell>
        <Suspense fallback={<p className="text-slate-600">Loading awareness content…</p>}>
          <AwarenessPage />
        </Suspense>
      </Shell>
    );
  if (!mode)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">CivicConnect</h1>
          <p className="mt-3 text-slate-600">Report civic issues. Track meaningful change.</p>
          <Link
            className="mt-6 inline-block rounded-lg bg-blue-700 px-4 py-2 text-white"
            to="/login"
          >
            Get started
          </Link>
        </div>
      </main>
    );
  return <Dashboard mode={mode} />;
}
