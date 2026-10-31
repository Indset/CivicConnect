import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { useAuth } from '@/contexts/AuthContext';
import { awarenessApi } from '@/services/api/endpoints';

const categories = ['Cleanliness', 'Traffic', 'Water', 'Noise', 'Public property'];
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
const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100';

const formatDate = (date) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(date));

function DriveMap({ location }) {
  const coordinates = location?.coordinates;
  if (!coordinates) {
    return (
      <p className="mt-3 rounded bg-slate-50 p-3 text-sm text-slate-500">
        Map coordinates are not available.
      </p>
    );
  }
  const center = [coordinates.lat, coordinates.lng];
  return (
    <div className="mt-3 h-44 overflow-hidden rounded-lg">
      <MapContainer center={center} zoom={14} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={center} />
      </MapContainer>
    </div>
  );
}

function TipCard({ tip, admin, onEdit, onDelete }) {
  return (
    <article className="overflow-hidden rounded-xl bg-white shadow-sm">
      {tip.imageUrl && (
        <img src={tip.imageUrl} alt="" className="h-40 w-full object-cover" loading="lazy" />
      )}
      <div className="p-5">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
          {tip.category}
        </span>
        <h3 className="mt-3 text-lg font-semibold">{tip.title}</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{tip.content}</p>
        {admin && (
          <div className="mt-4 flex gap-3 text-sm">
            <button type="button" className="text-blue-700" onClick={() => onEdit(tip)}>
              Edit
            </button>
            <button type="button" className="text-red-700" onClick={() => onDelete(tip)}>
              Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function DriveCard({ drive, admin, busy, onJoin, onEdit, onDelete }) {
  return (
    <article className="rounded-xl bg-white p-5 shadow-sm">
      {drive.imageUrl && (
        <img
          src={drive.imageUrl}
          alt=""
          className="mb-4 h-40 w-full rounded-lg object-cover"
          loading="lazy"
        />
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{drive.title}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {formatDate(drive.date)} (UTC) · {drive.startTime}–{drive.endTime} UTC
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium capitalize text-emerald-800">
          {drive.status}
        </span>
      </div>
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
      <DriveMap location={drive.location} />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {drive.status === 'upcoming' && (
          <button
            type="button"
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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
          </button>
        )}
        {admin && (
          <>
            <button type="button" className="text-sm text-blue-700" onClick={() => onEdit(drive)}>
              Edit
            </button>
            <button type="button" className="text-sm text-red-700" onClick={() => onDelete(drive)}>
              Delete
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function TipEditor({ value, onChange, onSubmit, onCancel, saving }) {
  return (
    <form className="space-y-3 rounded-xl border border-slate-200 bg-white p-5" onSubmit={onSubmit}>
      <h3 className="font-semibold">{value._id ? 'Edit tip' : 'Create tip'}</h3>
      <input
        className={inputClass}
        aria-label="Tip title"
        placeholder="Title"
        value={value.title}
        required
        minLength={5}
        maxLength={150}
        onChange={(event) => onChange({ ...value, title: event.target.value })}
      />
      <select
        className={inputClass}
        aria-label="Tip category"
        value={value.category}
        onChange={(event) => onChange({ ...value, category: event.target.value })}
      >
        {categories.map((category) => (
          <option key={category}>{category}</option>
        ))}
      </select>
      <textarea
        className={inputClass}
        aria-label="Tip content"
        placeholder="Content"
        value={value.content}
        required
        minLength={20}
        maxLength={5000}
        rows={4}
        onChange={(event) => onChange({ ...value, content: event.target.value })}
      />
      <input
        className={inputClass}
        aria-label="Tip image URL"
        type="url"
        placeholder="Image URL (optional)"
        value={value.imageUrl}
        onChange={(event) => onChange({ ...value, imageUrl: event.target.value })}
      />
      <EditorActions onCancel={onCancel} saving={saving} />
    </form>
  );
}

function DriveEditor({ value, onChange, onSubmit, onCancel, saving }) {
  const field = (key, label, props = {}) => (
    <label className="block space-y-1 text-sm">
      <span>{label}</span>
      <input
        className={inputClass}
        aria-label={label}
        value={value[key]}
        required={props.required}
        min={props.min}
        max={props.max}
        type={props.type ?? 'text'}
        onChange={(event) => onChange({ ...value, [key]: event.target.value })}
      />
    </label>
  );
  return (
    <form className="space-y-3 rounded-xl border border-slate-200 bg-white p-5" onSubmit={onSubmit}>
      <h3 className="font-semibold">{value._id ? 'Edit drive' : 'Create drive'}</h3>
      {field('title', 'Title', { required: true })}
      <label className="block space-y-1 text-sm">
        <span>Description</span>
        <textarea
          className={inputClass}
          aria-label="Drive description"
          value={value.description}
          required
          minLength={20}
          maxLength={5000}
          rows={3}
          onChange={(event) => onChange({ ...value, description: event.target.value })}
        />
      </label>
      {field('address', 'Address', { required: true })}
      {field('date', 'Date', { type: 'date', required: true })}
      <div className="grid grid-cols-2 gap-3">
        {field('startTime', 'Start time (UTC)', { type: 'time', required: true })}
        {field('endTime', 'End time (UTC)', { type: 'time', required: true })}
      </div>
      {field('organizer', 'Organizer', { required: true })}
      {field('imageUrl', 'Image URL', { type: 'url' })}
      <div className="grid grid-cols-2 gap-3">
        {field('latitude', 'Latitude', { type: 'number', min: -90, max: 90 })}
        {field('longitude', 'Longitude', { type: 'number', min: -180, max: 180 })}
      </div>
      {field('maxParticipants', 'Maximum participants (optional)', { type: 'number', min: 1 })}
      <EditorActions onCancel={onCancel} saving={saving} />
    </form>
  );
}

function EditorActions({ onCancel, saving }) {
  return (
    <div className="flex gap-3">
      <button
        className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={saving}
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" className="text-sm text-slate-600" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

export default function Awareness() {
  const { user } = useAuth();
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
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState(null);

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
    setNotice('');
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
      setNotice('Awareness content saved.');
      await loadContent();
    } catch (requestError) {
      setError(requestError.message || 'Unable to save awareness content.');
    } finally {
      setSaving(false);
    }
  };

  const deleteContent = async (type, item) => {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    setError('');
    setNotice('');
    try {
      if (type === 'tip') await awarenessApi.deleteTip(item._id);
      else await awarenessApi.deleteDrive(item._id);
      setNotice('Awareness content deleted.');
      await loadContent();
    } catch (requestError) {
      setError(requestError.message || 'Unable to delete awareness content.');
    }
  };

  const toggleDrive = async (drive) => {
    setBusyDrive(drive._id);
    setError('');
    setNotice('');
    try {
      const response = drive.hasJoined
        ? await awarenessApi.leaveDrive(drive._id)
        : await awarenessApi.joinDrive(drive._id);
      setDrives((current) =>
        current.map((item) => (item._id === drive._id ? response.data.drive : item)),
      );
      setNotice(drive.hasJoined ? 'You left the drive.' : 'You joined the drive.');
    } catch (requestError) {
      setError(requestError.message || 'Unable to update your drive participation.');
      await loadContent();
    } finally {
      setBusyDrive('');
    }
  };

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-blue-700">Community</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Awareness</h1>
          <p className="mt-2 text-slate-600">
            Practical civic tips and opportunities to make a difference together.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white"
            onClick={() =>
              setEditor({
                type: tab === 'tips' ? 'tip' : 'drive',
                value: { ...(tab === 'tips' ? initialTip : initialDrive) },
              })
            }
          >
            Create {tab === 'tips' ? 'tip' : 'drive'}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
          {notice}
        </p>
      )}

      <div className="mt-6 flex gap-2 border-b border-slate-200">
        <button
          type="button"
          className={`border-b-2 px-4 py-3 font-medium ${tab === 'tips' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-600'}`}
          onClick={() => {
            setTab('tips');
            setEditor(null);
          }}
        >
          Civic Sense Tips
        </button>
        <button
          type="button"
          className={`border-b-2 px-4 py-3 font-medium ${tab === 'drives' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-600'}`}
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
            <h2 className="text-xl font-semibold">Civic Sense Tips</h2>
            <label className="flex items-center gap-2 text-sm">
              <span>Category</span>
              <select
                className={`${inputClass} w-auto`}
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
              </select>
            </label>
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
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-amber-800">
                Tip of the day · {tipOfTheDay.category}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">{tipOfTheDay.title}</h3>
              <p className="mt-1 text-slate-700">{tipOfTheDay.content}</p>
            </div>
          )}
          {loading ? (
            <p className="mt-6 text-slate-600">Loading tips…</p>
          ) : tips.length ? (
            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {tips.map((tip) => (
                <TipCard
                  key={tip._id}
                  tip={tip}
                  admin={isAdmin}
                  onEdit={editTip}
                  onDelete={(item) => deleteContent('tip', item)}
                />
              ))}
            </div>
          ) : !error ? (
            <p className="mt-6 rounded-xl bg-white p-6 text-slate-600">
              No tips found for this category.
            </p>
          ) : null}
          <Pagination data={tipsPagination} page={tipsPage} onChange={setTipsPage} />
        </>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Cleanliness Drives</h2>
            <div className="flex gap-2">
              {['upcoming', 'completed'].map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${driveStatus === status ? 'bg-blue-700 text-white' : 'bg-white text-slate-700'}`}
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
            <p className="mt-6 text-slate-600">Loading drives…</p>
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
                  onDelete={(item) => deleteContent('drive', item)}
                />
              ))}
            </div>
          ) : !error ? (
            <p className="mt-6 rounded-xl bg-white p-6 text-slate-600">
              No {driveStatus} drives are available.
            </p>
          ) : null}
          <Pagination data={drivesPagination} page={drivesPage} onChange={setDrivesPage} />
        </>
      )}
    </section>
  );
}

function Pagination({ data, page, onChange }) {
  if (!data || data.pages < 2) return null;
  return (
    <div className="mt-6 flex items-center justify-center gap-4 text-sm">
      <button
        type="button"
        className="text-blue-700 disabled:text-slate-400"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </button>
      <span className="text-slate-600">
        Page {page} of {data.pages}
      </span>
      <button
        type="button"
        className="text-blue-700 disabled:text-slate-400"
        disabled={page >= data.pages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
