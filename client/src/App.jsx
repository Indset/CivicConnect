import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  adminApi,
  authApi,
  categoriesApi,
  complaintsApi,
  notificationsApi,
} from '@/services/api/endpoints';
import { ComplaintMap, complaintStatusColors, LocationPicker } from '@/components/ComplaintMap';
import { getComplaintCoordinates, getComplaintLocationAddress } from '@/utils/complaintLocation';
import PublicFeed from '@/pages/PublicFeed';

const AdminAnalyticsDashboard = lazy(() => import('@/pages/AdminAnalyticsDashboard'));

const field =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100';
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
const Button = ({ children, ...props }) => (
  <button
    className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
    {...props}
  >
    {children}
  </button>
);

function AuthScreen({ mode }) {
  const navigate = useNavigate();
  const { token } = useParams();
  const { login, register, user } = useAuth();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
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
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200"
      >
        <Link to="/" className="text-lg font-bold text-blue-700">
          CivicConnect
        </Link>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
        {mode === 'register' && (
          <>
            <input
              className={field}
              name="fullName"
              minLength="2"
              placeholder="Full name"
              required
            />
            <input className={field} name="phone" placeholder="Phone number" required />
          </>
        )}
        <input
          className={field}
          name="email"
          type="email"
          placeholder="Email address"
          required={mode !== 'reset-password'}
        />
        {mode !== 'forgot-password' && (
          <input
            className={field}
            name={mode === 'reset-password' ? 'password' : 'password'}
            type="password"
            minLength="8"
            placeholder="Password"
            required
          />
        )}
        {(mode === 'register' || mode === 'reset-password') && (
          <input
            className={field}
            name="confirmPassword"
            type="password"
            minLength="8"
            placeholder="Confirm password"
            required
          />
        )}
        <Button disabled={busy}>
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
          <p className="text-sm text-slate-600">
            <Link className="text-blue-700" to="/forgot-password">
              Forgot password?
            </Link>{' '}
            ·{' '}
            <Link className="text-blue-700" to="/register">
              Create an account
            </Link>
          </p>
        )}
      </form>
    </main>
  );
}

function Shell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationError, setNotificationError] = useState('');
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

  const handleLogout = async () => {
    setSigningOut(true);
    await logout(); // always clears user via finally in AuthContext
    navigate('/login');
  };
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-6xl items-center gap-4 p-4">
          <Link to="/dashboard" className="font-bold text-blue-700">
            CivicConnect
          </Link>
          <Link to="/complaints">Complaints</Link>
          <Link to="/public-feed">Public feed</Link>
          <Link to="/complaints/new">Report issue</Link>
          <Link to="/complaints/map">Map view</Link>
          <Link className="flex items-center gap-2" to="/notifications">
            Notifications
            {unreadCount > 0 && (
              <span
                aria-label={`${unreadCount} unread notifications`}
                className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
          {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
          <span className="ml-auto text-sm text-slate-600">{user?.fullName}</span>
          <button
            onClick={handleLogout}
            disabled={signingOut}
            className="text-sm text-red-700 disabled:opacity-50"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </nav>
      </header>
      {notificationError && (
        <p className="mx-auto max-w-6xl px-6 pt-3 text-sm text-amber-800" role="status">
          Unread notification count unavailable: {notificationError}
        </p>
      )}
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}

function Dashboard({ mode }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (mode === 'admin') return undefined;
    const load = async () => {
      try {
        setData((await complaintsApi.mine({ limit: 5 })).data);
      } catch (err) {
        setError(err.message);
      }
    };
    load();
    return undefined;
  }, [mode]);
  return (
    <Shell>
      {mode === 'admin' ? (
        <Suspense fallback={<p className="mt-4 text-slate-600">Loading analytics…</p>}>
          <AdminAnalyticsDashboard />
        </Suspense>
      ) : (
        <>
          <h1 className="text-2xl font-bold">Hello, {user.fullName.split(' ')[0]}</h1>
          {error && <p className="mt-4 text-red-700">{error}</p>}
          {!data ? (
            <p className="mt-4">Loading…</p>
          ) : (
            <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
              <h2 className="font-semibold">Your recent reports</h2>
              <ul className="mt-3 divide-y">
                {data.complaints.map((item) => (
                  <li className="py-3" key={item._id}>
                    {item.title}{' '}
                    <span className="text-sm text-slate-500">
                      · {item.status.replace('_', ' ')}
                    </span>
                  </li>
                ))}
                {!data.complaints.length && (
                  <li className="py-3 text-slate-500">No reports yet.</li>
                )}
              </ul>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}

function NewComplaint() {
  const navigate = useNavigate();
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

  useEffect(
    () => () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.current.clear();
    },
    [],
  );

  useEffect(() => {
    categoriesApi
      .list()
      .then((response) => setCategories(response.data.categories))
      .catch((err) => setCategoriesError(err.message))
      .finally(() => setCategoriesLoading(false));
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
    try {
      const payload = new FormData(event.currentTarget);
      payload.set(
        'location',
        JSON.stringify({
          address: address.trim(),
          ...(coordinates ? { coordinates } : {}),
        }),
      );
      images.forEach(({ file }) => payload.append('images', file));
      await complaintsApi.create(payload);
      navigate('/complaints');
    } catch (err) {
      setError(err.errors?.join(' ') || err.message);
    } finally {
      setBusy(false);
    }
  };

  const categorySelect = categoriesLoading ? (
    <select className={field} disabled>
      <option>Loading categories…</option>
    </select>
  ) : categoriesError ? (
    <p className="rounded bg-red-50 p-3 text-sm text-red-700">
      Could not load categories — {categoriesError}
    </p>
  ) : categories.length === 0 ? (
    <p className="rounded bg-amber-50 p-3 text-sm text-amber-700">
      No categories available. Please try again later.
    </p>
  ) : (
    <select className={field} name="category" defaultValue="" required>
      <option value="" disabled>
        Select a category
      </option>
      {categories.map((category) => (
        <option value={category._id} key={category._id}>
          {category.name}
        </option>
      ))}
    </select>
  );

  return (
    <Shell>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold">Report a civic issue</h1>
        <form onSubmit={submit} className="mt-6 space-y-4 rounded-xl bg-white p-6 shadow-sm">
          {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {categorySelect}
          <input
            className={field}
            name="title"
            minLength="5"
            maxLength="150"
            placeholder="Issue title"
            required
          />
          <textarea
            className={field}
            name="description"
            minLength="20"
            maxLength="5000"
            placeholder="Describe the issue"
            rows="6"
            required
          />
          <section className="space-y-3 rounded-lg border border-slate-200 p-4">
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
            <input
              className={field}
              name="location"
              minLength="3"
              maxLength="500"
              placeholder="Address"
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
              className={field}
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
                      className="absolute right-2 top-2 rounded-full bg-white px-2 py-1 text-sm text-red-700 shadow"
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
          <select className={field} name="priority" defaultValue="medium">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <Button
            disabled={busy || categoriesLoading || !!categoriesError || categories.length === 0}
          >
            {busy ? 'Submitting…' : 'Submit report'}
          </Button>
        </form>
      </div>
    </Shell>
  );
}

function ComplaintsList() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [complaints, setComplaints] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setComplaints(null);
    const params = status ? { status } : {};
    const fetcher = isAdmin ? adminApi.complaints(params) : complaintsApi.mine(params);
    fetcher.then((res) => setComplaints(res.data.complaints)).catch((err) => setError(err.message));
  }, [status, isAdmin]);

  const statusStyles = {
    submitted: 'bg-blue-50 text-blue-700',
    under_review: 'bg-violet-50 text-violet-700',
    assigned: 'bg-amber-50 text-amber-700',
    in_progress: 'bg-blue-50 text-blue-700',
    resolved: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-red-50 text-red-700',
    closed: 'bg-slate-100 text-slate-700',
  };

  return (
    <Shell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isAdmin ? 'All complaints' : 'Your complaints'}</h1>
        <select
          className={field + ' w-auto'}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under review</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="rejected">Rejected</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      {error && <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!complaints ? (
        <p className="mt-4">Loading…</p>
      ) : (
        <div className="mt-6 rounded-xl bg-white shadow-sm">
          <ul className="divide-y">
            {complaints.map((item) => (
              <li className="space-y-3 p-4" key={item._id}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Link
                      className="font-medium text-blue-700 hover:underline"
                      to={`/complaints/${item._id}`}
                    >
                      {item.title}
                    </Link>
                    <p className="text-sm text-slate-500">
                      {getComplaintLocationAddress(item.location)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles[item.status] ?? 'bg-slate-100 text-slate-700'}`}
                  >
                    {statusLabels[item.status] ?? item.status.replaceAll('_', ' ')}
                  </span>
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
              </li>
            ))}
            {!complaints.length && (
              <li className="p-6 text-center text-slate-500">No complaints found.</li>
            )}
          </ul>
        </div>
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
      className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[minmax(10rem,1fr)_2fr_auto]"
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
        className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
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
      <h2 className="mb-4 text-lg font-semibold">Status timeline</h2>
      <ol className="ml-3 border-l-2 border-slate-200">
        {history.map((entry, index) => (
          <li
            className="relative pb-6 pl-7 last:pb-0"
            key={`${entry.status}-${entry.changedAt}-${index}`}
          >
            <span className="absolute -left-[13px] grid h-6 w-6 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
              {iconFor(entry.status)}
            </span>
            <h3 className="font-medium">
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

  return (
    <Shell>
      <Link className="text-sm text-blue-700 hover:underline" to="/complaints">
        Back to complaints
      </Link>
      {error && <p className="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}
      {!complaint ? (
        !error && <p className="mt-4">Loading complaint…</p>
      ) : (
        <article className="mt-5 space-y-6 rounded-xl bg-white p-6 shadow-sm">
          <header>
            <p className="text-sm text-slate-500">{complaint.category?.name ?? 'Uncategorized'}</p>
            <h1 className="mt-1 text-2xl font-bold">{complaint.title}</h1>
            <p className="mt-2 text-sm capitalize text-slate-600">
              {statusLabels[complaint.status] ?? complaint.status.replaceAll('_', ' ')} ·{' '}
              {complaint.priority} priority
            </p>
          </header>
          <ComplaintStatusTimeline complaint={complaint} />
          <p className="whitespace-pre-wrap">{complaint.description}</p>
          <section>
            <h2 className="font-semibold">Location</h2>
            <p className="mb-3 text-sm text-slate-600">
              {getComplaintLocationAddress(complaint.location)}
            </p>
            {getComplaintCoordinates(complaint) ? (
              <ComplaintMap complaints={[]} readOnlyComplaint={complaint} />
            ) : (
              <p className="rounded bg-slate-50 p-4 text-sm text-slate-500">
                No map pin was added for this complaint.
              </p>
            )}
          </section>
          {complaint.images?.length > 0 && (
            <section>
              <h2 className="mb-3 font-semibold">Photos</h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {complaint.images.map((image, index) => (
                  <li key={image.publicId || image.url}>
                    <a href={image.url} target="_blank" rel="noreferrer">
                      <img
                        className="h-48 w-full rounded-lg object-cover"
                        src={image.url}
                        alt={`Complaint photo ${index + 1}`}
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      )}
    </Shell>
  );
}

function ComplaintsMapView() {
  const [complaints, setComplaints] = useState(null);
  const [error, setError] = useState('');

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
      <h1 className="text-2xl font-bold">Complaint map</h1>
      <p className="mt-2 text-slate-600">Pins show complaints that have a selected map location.</p>
      {error && <p className="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}
      {complaints === null ? (
        !error && <p className="mt-4">Loading map…</p>
      ) : complaints.length ? (
        <div className="mt-5 overflow-hidden rounded-xl shadow-sm">
          <ComplaintMap complaints={complaints} fitAll />
        </div>
      ) : (
        <p className="mt-5 rounded-xl bg-white p-6 text-slate-600">
          No complaints with map pins are available yet.
        </p>
      )}
      <ul className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
        {Object.entries({
          submitted: 'Submitted',
          under_review: 'Under review',
          assigned: 'Assigned',
          in_progress: 'In progress',
          resolved: 'Resolved',
          rejected: 'Rejected',
          closed: 'Closed',
        }).map(([status, label]) => (
          <li className="flex items-center gap-2" key={status}>
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: complaintStatusColors[status] }}
            />
            {label}
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function Notifications() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

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
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
      window.dispatchEvent(new Event(notificationUpdateEvent));
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  const remove = async (id) => {
    try {
      await notificationsApi.remove(id);
      setItems((current) => current.filter((item) => item._id !== id));
      window.dispatchEvent(new Event(notificationUpdateEvent));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <Shell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button
          disabled={!items?.some((item) => !item.isRead)}
          onClick={markAllRead}
          className="text-sm text-blue-700 disabled:opacity-50"
        >
          Mark all as read
        </button>
      </div>
      {error && <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!items ? (
        <p className="mt-4">Loading…</p>
      ) : (
        <ul className="mt-6 divide-y rounded-xl bg-white shadow-sm">
          {items.map((item) => (
            <li
              key={item._id}
              className={`flex items-center justify-between gap-4 p-4 ${!item.isRead ? 'bg-blue-50/40' : ''}`}
            >
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-slate-600">{item.message}</p>
                <time className="mt-1 block text-xs text-slate-500" dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleString()}
                </time>
              </div>
              <div className="flex gap-3 text-sm">
                {!item.isRead && (
                  <button onClick={() => markRead(item._id)} className="text-blue-700">
                    Mark read
                  </button>
                )}
                <button onClick={() => remove(item._id)} className="text-red-700">
                  Delete
                </button>
              </div>
            </li>
          ))}
          {!items.length && (
            <li className="p-6 text-center text-slate-500">No notifications yet.</li>
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
