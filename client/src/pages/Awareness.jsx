import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { awarenessApi } from '@/services/api/endpoints';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';
import Modal from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import QuoteCard from '@/components/ui/QuoteCard';

const categories = ['Cleanliness', 'Traffic', 'Water', 'Noise', 'Public property'];
const DriveMap = lazy(() => import('@/components/DriveMap'));
const tipThemes = {
  Cleanliness: { badge: 'border-emerald-200 bg-emerald-50 text-emerald-800', stripe: 'bg-emerald-400' },
  Traffic: { badge: 'border-amber-200 bg-amber-50 text-amber-800', stripe: 'bg-amber-400' },
  Water: { badge: 'border-sky-200 bg-sky-50 text-sky-800', stripe: 'bg-sky-400' },
  Noise: { badge: 'border-violet-200 bg-violet-50 text-violet-800', stripe: 'bg-violet-400' },
  'Public property': { badge: 'border-civic-200 bg-civic-50 text-civic-800', stripe: 'bg-civic-500' },
};
const initialTip = { title: '', content: '', category: categories[0], imageUrl: '' };
const initialDrive = {
  title: '',
  description: '',
  address: '',
  date: '',
  startTime: '08:00',
  endTime: '10:00',
  organizer: '',
  imageUrl: '',
  latitude: '',
  longitude: '',
  maxParticipants: '',
};
const formatDate = (date) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(date));

function TipCard({ tip, admin, onEdit, onDelete }) {
  const theme = tipThemes[tip.category] ?? tipThemes.Cleanliness;
  return (
    <Card as="article" className="group overflow-hidden transition duration-200 hover:-translate-y-1 hover:shadow-float">
      <div className={`h-1.5 ${theme.stripe}`} />
      {tip.imageUrl && (
        <img src={tip.imageUrl} alt={`Illustration for ${tip.title}`} className="h-40 w-full object-cover" loading="lazy" />
      )}
      <div className="p-5">
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${theme.badge}`}>
          {tip.category}
        </span>
        <h3 className="mt-3 font-heading text-lg font-extrabold text-slate-950">{tip.title}</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{tip.content}</p>
        {admin && (
          <div className="mt-4 flex gap-3 text-sm">
            <button type="button" className="font-bold text-civic-700 hover:text-civic-900" onClick={() => onEdit(tip)}>
              Edit
            </button>
            <button type="button" className="font-bold text-rose-700 hover:text-rose-900" onClick={() => onDelete(tip)}>
              Delete
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

function DriveCard({ drive, admin, busy, onJoin, onEdit, onDelete }) {
  const date = new Date(drive.date);
  const day = new Intl.DateTimeFormat(undefined, { day: '2-digit', timeZone: 'UTC' }).format(date);
  const month = new Intl.DateTimeFormat(undefined, { month: 'short', timeZone: 'UTC' }).format(date);
  return (
    <Card as="article" className="overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-float">
      <div className="flex gap-4">
        <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-2xl bg-accent-50 text-accent-700 ring-1 ring-accent-100">
          <span className="font-heading text-2xl font-extrabold leading-none">{day}</span>
          <span className="mt-1 text-xs font-extrabold uppercase tracking-wide">{month}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="font-heading text-lg font-extrabold text-slate-950">{drive.title}</h3>
            <Badge status={drive.status} />
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {formatDate(drive.date)} (UTC) · {drive.startTime}–{drive.endTime} UTC
          </p>
        </div>
      </div>
      {drive.imageUrl && (
        <img
          src={drive.imageUrl}
          alt={`Photo for ${drive.title}`}
          className="mt-4 h-40 w-full rounded-xl object-cover"
          loading="lazy"
        />
      )}
      <p className="mt-3 text-sm leading-6 text-slate-600">{drive.description}</p>
      <p className="mt-3 text-sm text-slate-700">
        <span className="font-medium">Location:</span> {drive.location.address}
      </p>
      <p className="mt-1 text-sm text-slate-700">
        <span className="font-medium">Organizer:</span> {drive.organizer}
      </p>
      <p className="mt-1 text-sm text-slate-700">
        <span className="font-medium">Participants:</span> {drive.participantsCount}
        {drive.maxParticipants ? ` / ${drive.maxParticipants}` : ''}
      </p>
      {drive.location?.coordinates ? (
        <Suspense fallback={<div aria-label="Loading drive map" className="mt-3 h-44 animate-pulse rounded-lg bg-slate-100" role="status" />}>
          <DriveMap location={drive.location} title={drive.title} />
        </Suspense>
      ) : (
        <p className="mt-3 rounded bg-slate-50 p-3 text-sm text-slate-600">
          Map coordinates are not available.
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {drive.status === 'upcoming' && (
          <Button
            type="button"
            variant={drive.hasJoined ? 'secondary' : 'primary'}
            className="min-h-10 px-4 py-2 text-xs"
            disabled={
              busy ||
              (!drive.hasJoined &&
                drive.maxParticipants &&
                drive.participantsCount >= drive.maxParticipants)
            }
            onClick={() => onJoin(drive)}
          >
            {busy
              ? 'Please wait…'
              : drive.hasJoined
                ? 'Leave drive'
                : drive.maxParticipants && drive.participantsCount >= drive.maxParticipants
                  ? 'Drive full'
                  : 'Join drive'}
          </Button>
        )}
        {admin && (
          <>
            <button type="button" className="text-sm font-bold text-civic-700" onClick={() => onEdit(drive)}>
              Edit
            </button>
            <button type="button" className="text-sm font-bold text-rose-700" onClick={() => onDelete(drive)}>
              Delete
            </button>
          </>
        )}
      </div>
    </Card>
  );
}

function TipEditor({ value, onChange, onSubmit, onCancel, saving }) {
  return (
    <Card as="form" className="space-y-4 p-5 sm:p-6" onSubmit={onSubmit}>
      <h3 className="font-heading text-lg font-extrabold">{value._id ? 'Edit tip' : 'Create tip'}</h3>
      <Input
        label="Tip title"
        placeholder="A short, practical reminder"
        value={value.title}
        required
        minLength={5}
        maxLength={150}
        onChange={(event) => onChange({ ...value, title: event.target.value })}
      />
      <Select
        label="Category"
        value={value.category}
        onChange={(event) => onChange({ ...value, category: event.target.value })}
      >
        {categories.map((category) => (
          <option key={category}>{category}</option>
        ))}
      </Select>
      <Textarea
        label="Tip content"
        placeholder="Share a helpful action neighbors can take…"
        value={value.content}
        required
        minLength={20}
        maxLength={5000}
        rows={4}
        onChange={(event) => onChange({ ...value, content: event.target.value })}
      />
      <Input
        label="Image URL (optional)"
        type="url"
        placeholder="https://"
        value={value.imageUrl}
        onChange={(event) => onChange({ ...value, imageUrl: event.target.value })}
      />
      <EditorActions onCancel={onCancel} saving={saving} />
    </Card>
  );
}

function DriveEditor({ value, onChange, onSubmit, onCancel, saving }) {
  const field = (key, label, props = {}) => (
    <Input
      label={label}
      value={value[key]}
      required={props.required}
      min={props.min}
      max={props.max}
      minLength={props.minLength}
      maxLength={props.maxLength}
      type={props.type ?? 'text'}
      onChange={(event) => onChange({ ...value, [key]: event.target.value })}
    />
  );
  return (
    <Card as="form" className="space-y-4 p-5 sm:p-6" onSubmit={onSubmit}>
      <h3 className="font-heading text-lg font-extrabold">{value._id ? 'Edit drive' : 'Create drive'}</h3>
      {field('title', 'Title', { required: true, minLength: 5, maxLength: 150 })}
      <Textarea
        label="Description"
        value={value.description}
        required
        minLength={20}
        maxLength={5000}
        rows={3}
        onChange={(event) => onChange({ ...value, description: event.target.value })}
      />
      {field('address', 'Address', { required: true, minLength: 3, maxLength: 500 })}
      {field('date', 'Date', { type: 'date', required: true })}
      <div className="grid grid-cols-2 gap-3">
        {field('startTime', 'Start time (UTC)', { type: 'time', required: true })}
        {field('endTime', 'End time (UTC)', { type: 'time', required: true })}
      </div>
      {field('organizer', 'Organizer', { required: true, minLength: 2, maxLength: 150 })}
      {field('imageUrl', 'Image URL', { type: 'url' })}
      <div className="grid grid-cols-2 gap-3">
        {field('latitude', 'Latitude', { type: 'number', min: -90, max: 90 })}
        {field('longitude', 'Longitude', { type: 'number', min: -180, max: 180 })}
      </div>
      {field('maxParticipants', 'Maximum participants (optional)', { type: 'number', min: 1 })}
      <EditorActions onCancel={onCancel} saving={saving} />
    </Card>
  );
}

function EditorActions({ onCancel, saving }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button loading={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
      <Button type="button" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

export default function Awareness() {
  const { user } = useAuth();
  const showToast = useToast();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState('tips');
  const [category, setCategory] = useState('');
  const [driveStatus, setDriveStatus] = useState('upcoming');
  const [tips, setTips] = useState([]);
  const [drives, setDrives] = useState([]);
  const [tipsPage, setTipsPage] = useState(1);
  const [drivesPage, setDrivesPage] = useState(1);
  const [tipsPagination, setTipsPagination] = useState(null);
  const [drivesPagination, setDrivesPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyDrive, setBusyDrive] = useState('');
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tipResponse, driveResponse] = await Promise.all([
        awarenessApi.listTips({ category: category || undefined, page: tipsPage, limit: 12 }),
        awarenessApi.listDrives({ status: driveStatus, page: drivesPage, limit: 12 }),
      ]);
      setTips(tipResponse.data.tips);
      setTipsPagination(tipResponse.data.pagination);
      setDrives(driveResponse.data.drives);
      setDrivesPagination(driveResponse.data.pagination);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load awareness content.');
    } finally {
      setLoading(false);
    }
  }, [category, driveStatus, drivesPage, tipsPage]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const tipOfTheDay = useMemo(() => {
    if (!tips.length) return null;
    const dayIndex = Math.floor(Date.now() / 86400000);
    return tips[dayIndex % tips.length];
  }, [tips]);

  const editTip = (tip) =>
    setEditor({
      type: 'tip',
      value: {
        _id: tip._id,
        title: tip.title,
        content: tip.content,
        category: tip.category,
        imageUrl: tip.imageUrl ?? '',
      },
    });
  const editDrive = (drive) =>
    setEditor({
      type: 'drive',
      value: {
        _id: drive._id,
        title: drive.title,
        description: drive.description,
        address: drive.location.address,
        date: new Date(drive.date).toISOString().slice(0, 10),
        startTime: drive.startTime,
        endTime: drive.endTime,
        organizer: drive.organizer,
        imageUrl: drive.imageUrl ?? '',
        latitude: drive.location.coordinates?.lat ?? '',
        longitude: drive.location.coordinates?.lng ?? '',
        maxParticipants: drive.maxParticipants ?? '',
      },
    });

  const submitEditor = async (event) => {
    event.preventDefault();
    if (!editor) return;
    setSaving(true);
    setError('');
    try {
      if (editor.type === 'tip') {
        const { _id, ...payload } = editor.value;
        if (_id) await awarenessApi.updateTip(_id, payload);
        else await awarenessApi.createTip(payload);
      } else {
        const { _id, address, latitude, longitude, maxParticipants, ...fields } = editor.value;
        const hasLatitude = latitude !== '';
        const hasLongitude = longitude !== '';
        if (hasLatitude !== hasLongitude)
          throw new Error('Provide both map coordinates or leave both blank.');
        const payload = {
          ...fields,
          location: {
            address,
            ...(hasLatitude
              ? { coordinates: { lat: Number(latitude), lng: Number(longitude) } }
              : {}),
          },
          ...(maxParticipants !== ''
            ? { maxParticipants: Number(maxParticipants) }
            : { maxParticipants: null }),
        };
        if (_id) await awarenessApi.updateDrive(_id, payload);
        else await awarenessApi.createDrive(payload);
      }
      setEditor(null);
      showToast('Awareness content saved.', 'success');
      await loadContent();
    } catch (requestError) {
      setError(requestError.message || 'Unable to save awareness content.');
    } finally {
      setSaving(false);
    }
  };

  const deleteContent = async () => {
    if (!deleteTarget) return;
    setError('');
    setDeleting(true);
    try {
      if (deleteTarget.type === 'tip') await awarenessApi.deleteTip(deleteTarget.item._id);
      else await awarenessApi.deleteDrive(deleteTarget.item._id);
      setDeleteTarget(null);
      showToast('Awareness content deleted.', 'success');
      await loadContent();
    } catch (requestError) {
      setError(requestError.message || 'Unable to delete awareness content.');
    } finally {
      setDeleting(false);
    }
  };

  const toggleDrive = async (drive) => {
    setBusyDrive(drive._id);
    setError('');
    try {
      const response = drive.hasJoined
        ? await awarenessApi.leaveDrive(drive._id)
        : await awarenessApi.joinDrive(drive._id);
      setDrives((current) =>
        current.map((item) => (item._id === drive._id ? response.data.drive : item)),
      );
      showToast(drive.hasJoined ? 'You left the drive.' : 'You joined the drive.', 'success');
    } catch (requestError) {
      setError(requestError.message || 'Unable to update your drive participation.');
      await loadContent();
    } finally {
      setBusyDrive('');
    }
  };

  return (
    <section>
      <div className="grid gap-5 rounded-2xl border border-civic-100 bg-white/80 p-5 shadow-card sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)] lg:items-center">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-civic-700">Community</p>
          <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Awareness</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Practical civic tips and opportunities to make a difference together.
          </p>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4 lg:justify-end">
          <QuoteCard compact className="max-w-sm text-slate-700" />
          {isAdmin && (
            <Button
              type="button"
              className="min-h-11"
              onClick={() =>
                setEditor({
                  type: tab === 'tips' ? 'tip' : 'drive',
                  value: { ...(tab === 'tips' ? initialTip : initialDrive) },
                })
              }
            >
              Create {tab === 'tips' ? 'tip' : 'drive'}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        <button
          type="button"
          className={`min-h-12 shrink-0 border-b-2 px-4 py-3 text-sm font-bold transition ${tab === 'tips' ? 'border-civic-700 text-civic-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          onClick={() => {
            setTab('tips');
            setEditor(null);
          }}
        >
          Civic Sense Tips
        </button>
        <button
          type="button"
          className={`min-h-12 shrink-0 border-b-2 px-4 py-3 text-sm font-bold transition ${tab === 'drives' ? 'border-civic-700 text-civic-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          onClick={() => {
            setTab('drives');
            setEditor(null);
          }}
        >
          Cleanliness Drives
        </button>
      </div>

      {tab === 'tips' ? (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-heading text-xl font-extrabold text-slate-950">Civic Sense Tips</h2>
            <Select
                label="Category"
                className="min-w-52"
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setTipsPage(1);
                }}
              >
                <option value="">All categories</option>
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
            </Select>
          </div>
          {editor?.type === 'tip' && (
            <div className="mt-5">
              <TipEditor
                value={editor.value}
                onChange={(value) => setEditor({ ...editor, value })}
                onSubmit={submitEditor}
                onCancel={() => setEditor(null)}
                saving={saving}
              />
            </div>
          )}
          {tipOfTheDay && (
            <div className="mt-5 rounded-2xl border border-accent-200 bg-gradient-to-br from-accent-50 to-white p-5 shadow-card sm:p-6">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-accent-700">
                Tip of the day · {tipOfTheDay.category}
              </p>
              <h3 className="mt-2 font-heading text-xl font-extrabold text-slate-950">{tipOfTheDay.title}</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">{tipOfTheDay.content}</p>
            </div>
          )}
          {loading ? (
            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <Card key={index} className="space-y-3 p-5">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </Card>
              ))}
            </div>
          ) : tips.length ? (
            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {tips.map((tip) => (
                <TipCard
                  key={tip._id}
                  tip={tip}
                  admin={isAdmin}
                  onEdit={editTip}
                  onDelete={(item) => setDeleteTarget({ type: 'tip', item })}
                />
              ))}
            </div>
          ) : !error ? (
            <EmptyState className="mt-5" title="No tips in this category yet" description="Choose another category or check back later for new civic-sense ideas." />
          ) : null}
          <Pagination data={tipsPagination} page={tipsPage} onChange={setTipsPage} />
        </>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-heading text-xl font-extrabold text-slate-950">Cleanliness Drives</h2>
            <div className="flex gap-2">
              {['upcoming', 'completed'].map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`min-h-10 rounded-full px-4 py-2 text-sm font-bold capitalize transition ${driveStatus === status ? 'bg-civic-700 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:bg-civic-50 hover:text-civic-800'}`}
                  onClick={() => {
                    setDriveStatus(status);
                    setDrivesPage(1);
                  }}
                >
                  {status === 'completed' ? 'Past drives' : 'Upcoming'}
                </button>
              ))}
            </div>
          </div>
          {editor?.type === 'drive' && (
            <div className="mt-5">
              <DriveEditor
                value={editor.value}
                onChange={(value) => setEditor({ ...editor, value })}
                onSubmit={submitEditor}
                onCancel={() => setEditor(null)}
                saving={saving}
              />
            </div>
          )}
          {loading ? (
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Card key={index} className="space-y-3 p-5">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-10 w-28" />
                </Card>
              ))}
            </div>
          ) : drives.length ? (
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              {drives.map((drive) => (
                <DriveCard
                  key={drive._id}
                  drive={drive}
                  admin={isAdmin}
                  busy={busyDrive === drive._id}
                  onJoin={toggleDrive}
                  onEdit={editDrive}
                  onDelete={(item) => setDeleteTarget({ type: 'drive', item })}
                />
              ))}
            </div>
          ) : !error ? (
            <EmptyState className="mt-5" title={`No ${driveStatus} drives right now`} description="Community events will appear here as soon as they're scheduled." />
          ) : null}
          <Pagination data={drivesPagination} page={drivesPage} onChange={setDrivesPage} />
        </>
      )}
      <Modal
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.type ?? 'content'}?`}
        description={`“${deleteTarget?.item.title ?? ''}” will be permanently removed.`}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      >
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" disabled={deleting} onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button type="button" variant="danger" loading={deleting} onClick={deleteContent}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Modal>
    </section>
  );
}

function Pagination({ data, page, onChange }) {
  if (!data || data.pages < 2) return null;
  return (
    <div className="mt-6 flex items-center justify-center gap-4 text-sm">
      <Button
        type="button"
        variant="ghost"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </Button>
      <span className="text-sm text-slate-600">
        Page {page} of {data.pages}
      </span>
      <Button
        type="button"
        variant="ghost"
        disabled={page >= data.pages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
