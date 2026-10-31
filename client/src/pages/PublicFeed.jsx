import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { categoriesApi, complaintsApi } from '@/services/api/endpoints';
import { getComplaintLocationAddress } from '@/utils/complaintLocation';

const field =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100';
const statusStyles = {
  submitted: 'bg-blue-50 text-blue-700',
  under_review: 'bg-violet-50 text-violet-700',
  assigned: 'bg-amber-50 text-amber-700',
  in_progress: 'bg-orange-50 text-orange-700',
  resolved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  closed: 'bg-slate-100 text-slate-700',
};

function ComplaintSkeleton() {
  return (
    <li className="animate-pulse overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="h-48 bg-slate-200" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-1/3 rounded bg-slate-200" />
        <div className="h-6 w-3/4 rounded bg-slate-200" />
        <div className="h-4 w-full rounded bg-slate-200" />
        <div className="h-9 w-28 rounded bg-slate-200" />
      </div>
    </li>
  );
}

function PublicComplaintCard({ complaint, onToggleUpvote, isPending }) {
  return (
    <li className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      {complaint.images?.[0]?.url ? (
        <img
          className="h-48 w-full object-cover"
          src={complaint.images[0].url}
          alt={`Photo for ${complaint.title}`}
          loading="lazy"
        />
      ) : (
        <div className="grid h-48 place-items-center bg-slate-100 text-sm text-slate-500">
          No photo attached
        </div>
      )}
      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-slate-600">
            {complaint.category?.name ?? 'Uncategorized'}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles[complaint.status] ?? 'bg-slate-100 text-slate-700'}`}
          >
            {complaint.status.replaceAll('_', ' ')}
          </span>
        </div>
        <Link
          className="block text-lg font-semibold text-slate-900 hover:text-blue-700"
          to={`/complaints/${complaint._id}`}
        >
          {complaint.title}
        </Link>
        <p className="text-sm text-slate-600">{getComplaintLocationAddress(complaint.location)}</p>
        <p className="line-clamp-3 text-sm text-slate-600">{complaint.description}</p>
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <button
            aria-pressed={complaint.hasUpvoted}
            className={`rounded-lg px-3 py-2 text-sm font-medium disabled:cursor-wait disabled:opacity-60 ${
              complaint.hasUpvoted
                ? 'bg-blue-100 text-blue-800'
                : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
            }`}
            disabled={isPending}
            onClick={() => onToggleUpvote(complaint)}
            type="button"
          >
            {complaint.hasUpvoted ? '▲ Upvoted' : '▲ Upvote'}
          </button>
          <span aria-live="polite" className="text-sm text-slate-600">
            {complaint.upvoteCount} {complaint.upvoteCount === 1 ? 'vote' : 'votes'}
          </span>
        </div>
      </div>
    </li>
  );
}

export default function PublicFeed() {
  const [categories, setCategories] = useState([]);
  const [categoryError, setCategoryError] = useState('');
  const [draftFilters, setDraftFilters] = useState({
    category: '',
    status: '',
    search: '',
    sort: 'latest',
  });
  const [filters, setFilters] = useState(draftFilters);
  const [page, setPage] = useState(1);
  const [complaints, setComplaints] = useState([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const pendingRef = useRef(new Set());
  const pendingPageRef = useRef(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    categoriesApi
      .list()
      .then((response) => {
        if (active) setCategories(response.data.categories);
      })
      .catch((requestError) => {
        if (active) setCategoryError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (page === 1) setLoading(true);
    else setLoadingMore(true);
    setError('');

    complaintsApi
      .public({ ...filters, page, limit: 12 })
      .then((response) => {
        if (!active) return;
        const result = response.data;
        setComplaints((current) =>
          page === 1 ? result.complaints : [...current, ...result.complaints],
        );
        setHasNextPage(result.pagination.hasNextPage);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setLoadingMore(false);
        pendingPageRef.current = false;
      });

    return () => {
      active = false;
    };
  }, [filters, page, reloadKey]);

  const applyFilters = (event) => {
    event.preventDefault();
    pendingPageRef.current = false;
    setComplaints([]);
    setPage(1);
    setFilters({ ...draftFilters, search: draftFilters.search.trim() });
    setReloadKey((current) => current + 1);
  };

  const resetFilters = () => {
    const emptyFilters = { category: '', status: '', search: '', sort: 'latest' };
    pendingPageRef.current = false;
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
    setComplaints([]);
    setPage(1);
    setReloadKey((current) => current + 1);
  };

  const toggleUpvote = async (complaint) => {
    if (pendingRef.current.has(complaint._id)) return;
    pendingRef.current.add(complaint._id);
    setPendingIds(new Set(pendingRef.current));
    setActionError('');

    const previous = {
      hasUpvoted: complaint.hasUpvoted,
      upvoteCount: complaint.upvoteCount,
    };
    setComplaints((current) =>
      current.map((item) =>
        item._id === complaint._id
          ? {
              ...item,
              hasUpvoted: !previous.hasUpvoted,
              upvoteCount: Math.max(0, previous.upvoteCount + (previous.hasUpvoted ? -1 : 1)),
            }
          : item,
      ),
    );

    try {
      const response = await complaintsApi.toggleUpvote(complaint._id);
      const { upvoted, upvoteCount } = response.data;
      setComplaints((current) =>
        current.map((item) =>
          item._id === complaint._id ? { ...item, hasUpvoted: upvoted, upvoteCount } : item,
        ),
      );
    } catch (requestError) {
      setComplaints((current) =>
        current.map((item) => (item._id === complaint._id ? { ...item, ...previous } : item)),
      );
      setActionError(requestError.message);
    } finally {
      pendingRef.current.delete(complaint._id);
      setPendingIds(new Set(pendingRef.current));
    }
  };

  return (
    <section>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Public complaint feed</h1>
        <p className="mt-2 text-slate-600">
          See community reports and vote for issues that need attention.
        </p>
      </header>

      <form
        className="mb-6 grid gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={applyFilters}
      >
        <input
          aria-label="Search complaints"
          className={field}
          maxLength="100"
          onChange={(event) =>
            setDraftFilters((current) => ({ ...current, search: event.target.value }))
          }
          placeholder="Search reports"
          value={draftFilters.search}
        />
        <select
          aria-label="Filter by category"
          className={field}
          onChange={(event) =>
            setDraftFilters((current) => ({ ...current, category: event.target.value }))
          }
          value={draftFilters.category}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category._id} value={category._id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          className={field}
          onChange={(event) =>
            setDraftFilters((current) => ({ ...current, status: event.target.value }))
          }
          value={draftFilters.status}
        >
          <option value="">All statuses</option>
          {Object.keys(statusStyles).map((status) => (
            <option key={status} value={status}>
              {status.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort complaints"
          className={field}
          onChange={(event) =>
            setDraftFilters((current) => ({ ...current, sort: event.target.value }))
          }
          value={draftFilters.sort}
        >
          <option value="latest">Latest</option>
          <option value="most_upvoted">Most upvoted</option>
        </select>
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
            type="submit"
          >
            Apply
          </button>
          <button
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-50"
            onClick={resetFilters}
            type="button"
          >
            Reset
          </button>
        </div>
      </form>

      {categoryError && (
        <p className="mb-4 rounded bg-amber-50 p-3 text-sm text-amber-800">
          Category filters are unavailable: {categoryError}
        </p>
      )}
      {actionError && (
        <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700" role="alert">
          {actionError}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <ComplaintSkeleton key={index} />
          ))}
        </ul>
      ) : complaints.length === 0 && !error ? (
        <div className="rounded-xl bg-white p-10 text-center shadow-sm">
          <h2 className="text-lg font-semibold">No complaints found</h2>
          <p className="mt-2 text-slate-600">Try changing the filters or check back later.</p>
        </div>
      ) : (
        <>
          <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {complaints.map((complaint) => (
              <PublicComplaintCard
                complaint={complaint}
                isPending={pendingIds.has(complaint._id)}
                key={complaint._id}
                onToggleUpvote={toggleUpvote}
              />
            ))}
          </ul>
          {hasNextPage && (
            <div className="mt-6 text-center">
              <button
                className="rounded-lg border border-slate-300 bg-white px-5 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                disabled={loadingMore}
                onClick={() => {
                  if (pendingPageRef.current) return;
                  pendingPageRef.current = true;
                  setPage((current) => current + 1);
                }}
                type="button"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
