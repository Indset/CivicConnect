import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi, authApi, categoriesApi, complaintsApi } from '@/services/api/endpoints';

const field =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100';
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
          <Link to="/complaints/new">Report issue</Link>
          <Link to="/notifications">Notifications</Link>
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
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}

function Dashboard({ mode }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const load = async () => {
      try {
        if (mode === 'admin') setData((await adminApi.dashboard()).data.dashboard);
        else setData((await complaintsApi.mine({ limit: 5 })).data);
      } catch (err) {
        setError(err.message);
      }
    };
    load();
  }, [mode]);
  return (
    <Shell>
      <h1 className="text-2xl font-bold">
        {mode === 'admin' ? 'Administration' : `Hello, ${user.fullName.split(' ')[0]}`}
      </h1>
      {error && <p className="mt-4 text-red-700">{error}</p>}
      {!data ? (
        <p className="mt-4">Loading…</p>
      ) : mode === 'admin' ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</p>
              <p className="mt-1 text-3xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Your recent reports</h2>
          <ul className="mt-3 divide-y">
            {data.complaints.map((item) => (
              <li className="py-3" key={item._id}>
                {item.title}{' '}
                <span className="text-sm text-slate-500">· {item.status.replace('_', ' ')}</span>
              </li>
            ))}
            {!data.complaints.length && <li className="py-3 text-slate-500">No reports yet.</li>}
          </ul>
        </div>
      )}
    </Shell>
  );
}

function NewComplaint() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    categoriesApi
      .list()
      .then((response) => setCategories(response.data.categories))
      .catch((err) => setCategoriesError(err.message))
      .finally(() => setCategoriesLoading(false));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await complaintsApi.create(Object.fromEntries(new FormData(event.currentTarget)));
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
      <option value="" disabled>Select a category</option>
      {categories.map((category) => (
        <option value={category._id} key={category._id}>{category.name}</option>
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
          <input className={field} name="title" minLength="5" maxLength="150" placeholder="Issue title" required />
          <textarea className={field} name="description" minLength="20" maxLength="5000" placeholder="Describe the issue" rows="6" required />
          <input className={field} name="location" minLength="3" maxLength="500" placeholder="Location" required />
          <select className={field} name="priority" defaultValue="medium">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <Button disabled={busy || categoriesLoading || !!categoriesError || categories.length === 0}>
            {busy ? 'Submitting…' : 'Submit report'}
          </Button>
        </form>
      </div>
    </Shell>
  );
}

export default function App({ mode }) {
  if (['login', 'register', 'forgot-password', 'reset-password'].includes(mode))
    return <AuthScreen mode={mode} />;
  if (mode === 'new-complaint') return <NewComplaint />;
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
