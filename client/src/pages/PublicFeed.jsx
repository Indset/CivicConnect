import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { categoriesApi, complaintsApi } from '@/services/api/endpoints';
import { getComplaintLocationAddress } from '@/utils/complaintLocation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';
import { Input, Select } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';

const complaintStatuses = [
  'submitted',
  'under_review',
  'assigned',
  'in_progress',
  'resolved',
  'rejected',
  'closed',
];
const statusChipClass = (active) =>
  `min-h-9 shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold capitalize transition ${
    active
      ? 'border-civic-700 bg-civic-700 text-white shadow-sm'
      : 'border-slate-200 bg-white text-slate-600 hover:border-civic-300 hover:bg-civic-50 hover:text-civic-800'
  }`;

function ComplaintSkeleton() {
  return (
    <li>
      <Card className="animate-pulse overflow-hidden">
        <Skeleton className="h-48 w-full rounded-none" />
        <div className="space-y-3 p-5">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-28" />
        </div>
      </Card>
    </li>
  );
}

function PublicComplaintCard({ complaint, onToggleUpvote, isPending }) {
  return (
    <li className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-float">
      {complaint.images?.[0]?.url ? (
        <img
          className="h-48 w-full object-cover"
          src={complaint.images[0].url}
          alt={`Photo for ${complaint.title}`}
          loading="lazy"
        />
      ) : (
        <div className="grid h-48 place-items-center bg-civic-50 text-sm font-medium text-civic-800">
          No photo attached
        </div>
      )}
      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-extrabold uppercase tracking-wide text-civic-700">
            {complaint.category?.name ?? 'Uncategorized'}
          </span>
          <Badge status={complaint.status} />
        </div>
        <Link
          className="block font-heading text-lg font-extrabold leading-snug text-slate-950 transition hover:text-civic-700"
          to={`/complaints/${complaint._id}`}
        >
          {complaint.title}
        </Link>
        <p className="text-sm text-slate-600">{getComplaintLocationAddress(complaint.location)}</p>
        <p className="line-clamp-3 text-sm text-slate-600">{complaint.description}</p>
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <button
            aria-pressed={complaint.hasUpvoted}
            className={`rounded-xl px-3 py-2.5 text-sm font-bold transition duration-200 disabled:cursor-wait disabled:opacity-60 ${
              complaint.hasUpvoted
                ? 'bg-civic-100 text-civic-800'
                : 'bg-slate-100 text-slate-700 hover:bg-civic-50 hover:text-civic-800'
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
  const showToast = useToast();
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

  const chooseStatus = (status) => {
    pendingPageRef.current = false;
    setDraftFilters((current) => ({ ...current, status }));
    setFilters((current) => ({ ...current, status }));
    setComplaints([]);
    setPage(1);
    setReloadKey((current) => current + 1);
  };

  const toggleUpvote = async (complaint) => {
    if (pendingRef.current.has(complaint._id)) return;
    pendingRef.current.add(complaint._id);
    setPendingIds(new Set(pendingRef.current));
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
      showToast(requestError.message, 'error');
    } finally {
      pendingRef.current.delete(complaint._id);
      setPendingIds(new Set(pendingRef.current));
    }
  };

  return (
    <section>
      <header className="mb-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-civic-700">Neighbors taking action</p>
        <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Community report feed</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          See community reports and vote for issues that need attention.
        </p>
      </header>

      <form
        className="mb-4 grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={applyFilters}
      >
        <Input
          aria-label="Search complaints"
          className="lg:col-span-1"
          maxLength="100"
          onChange={(event) =>
            setDraftFilters((current) => ({ ...current, search: event.target.value }))
          }
          placeholder="Search reports"
          value={draftFilters.search}
        />
        <Select
          aria-label="Filter by category"
          label="Category"
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
        </Select>
        <Select
          aria-label="Sort complaints"
          label="Sort by"
          onChange={(event) =>
            setDraftFilters((current) => ({ ...current, sort: event.target.value }))
          }
          value={draftFilters.sort}
        >
          <option value="latest">Latest</option>
          <option value="most_upvoted">Most upvoted</option>
        </Select>
        <div className="flex gap-2">
          <button
            className="min-h-11 flex-1 rounded-xl bg-civic-700 px-4 py-2 font-bold text-white transition hover:bg-civic-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-civic-600"
            type="submit"
          >
            Apply
          </button>
          <button
            className="min-h-11 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            onClick={resetFilters}
            type="button"
          >
            Reset
          </button>
        </div>
      </form>

      <nav aria-label="Filter community reports by status" className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {[
          ['', 'All reports'],
          ...complaintStatuses.map((status) => [
            status,
            status === 'submitted' ? 'Pending' : status.replaceAll('_', ' '),
          ]),
        ].map(([value, label]) => (
          <button
            aria-pressed={filters.status === value}
            className={statusChipClass(filters.status === value)}
            key={value || 'all'}
            onClick={() => chooseStatus(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      {categoryError && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
          Category filters are unavailable: {categoryError}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
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
        <EmptyState title="No reports match just yet" description="Try changing your filters, or check back soon as neighbors continue sharing issues." />
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
              <Button
                variant="secondary"
                disabled={loadingMore}
                onClick={() => {
                  if (pendingPageRef.current) return;
                  pendingPageRef.current = true;
                  setPage((current) => current + 1);
                }}
                type="button"
              >
                {loadingMore ? 'Loading…' : 'Load more reports'}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
