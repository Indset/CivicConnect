import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { adminApi } from '@/services/api/endpoints';

const field =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100';
const statusNames = {
  submitted: 'Pending',
  under_review: 'Pending review',
  assigned: 'Assigned',
  in_progress: 'In progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
  closed: 'Closed',
};
const statusColors = {
  submitted: '#2563eb',
  under_review: '#7c3aed',
  assigned: '#d97706',
  in_progress: '#ea580c',
  resolved: '#059669',
  rejected: '#dc2626',
  closed: '#64748b',
};
const periodLabels = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '6m': 'Last 6 months',
};

function MetricCard({ label, value, detail }) {
  return (
    <article className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </article>
  );
}

function ChartPanel({ title, children, empty }) {
  return (
    <section className="min-w-0 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-4 font-semibold text-slate-900">{title}</h2>
      {empty ? (
        <p className="grid h-64 place-items-center text-sm text-slate-500">
          No data for this period.
        </p>
      ) : (
        children
      )}
    </section>
  );
}

function buildTrendData(analytics, range) {
  const monthly = range === '6m';
  const byDate = new Map(analytics.trend.map((item) => [item.date, item]));
  const date = new Date(analytics.dateRange.from);
  if (monthly) date.setUTCDate(1);
  const count = monthly ? 6 : range === '7d' ? 7 : 30;
  const formatter = new Intl.DateTimeFormat(
    undefined,
    monthly
      ? { month: 'short', year: 'numeric', timeZone: 'UTC' }
      : { month: 'short', day: 'numeric', timeZone: 'UTC' },
  );

  return Array.from({ length: count }, () => {
    const key = monthly ? date.toISOString().slice(0, 7) : date.toISOString().slice(0, 10);
    const point = byDate.get(key);
    const item = {
      date: key,
      label: point?.label ?? formatter.format(date),
      count: point?.count ?? 0,
    };
    if (monthly) date.setUTCMonth(date.getUTCMonth() + 1);
    else date.setUTCDate(date.getUTCDate() + 1);
    return item;
  });
}

export default function AdminAnalyticsDashboard() {
  const [range, setRange] = useState('6m');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setAnalytics(null);
    setError('');
    adminApi
      .analytics(range)
      .then((response) => {
        if (active) setAnalytics(response.data.analytics);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [range]);

  const statusData = (analytics?.statusCounts ?? []).map((item) => ({
    ...item,
    name: statusNames[item.status] ?? item.status,
  }));
  const trendData = analytics ? buildTrendData(analytics, range) : [];
  const resolutionDays = analytics?.averageResolutionTime.days;
  const resolutionValue =
    resolutionDays == null
      ? '—'
      : resolutionDays < 1
        ? `${analytics.averageResolutionTime.hours.toFixed(1)} h`
        : `${resolutionDays.toFixed(1)} d`;

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Administration analytics</h1>
          <p className="mt-1 text-slate-600">Complaint trends and resolution performance.</p>
        </div>
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          Date range
          <select
            className={field}
            onChange={(event) => setRange(event.target.value)}
            value={range}
          >
            {Object.entries(periodLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </header>

      {error && (
        <p className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">
          Unable to load analytics: {error}
        </p>
      )}

      {loading && !analytics ? (
        <p className="rounded-xl bg-white p-8 text-center text-slate-600">Loading analytics…</p>
      ) : (
        analytics && (
          <>
            <section
              aria-label="Complaint key performance indicators"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
            >
              <MetricCard
                label="Total complaints"
                value={analytics.totals.total}
                detail={periodLabels[range]}
              />
              <MetricCard label="Pending" value={analytics.totals.pending} />
              <MetricCard label="In progress" value={analytics.totals.inProgress} />
              <MetricCard label="Resolved" value={analytics.totals.resolved} />
              <MetricCard
                label="Average resolution time"
                value={resolutionValue}
                detail={`${analytics.averageResolutionTime.count} resolved complaints`}
              />
            </section>
            {analytics.totals.total === 0 && (
              <p className="mt-5 rounded-lg bg-white p-4 text-center text-sm text-slate-600 ring-1 ring-slate-200">
                No complaints were created during {periodLabels[range].toLowerCase()}.
              </p>
            )}

            <section className="mt-5 grid gap-5 lg:grid-cols-2">
              <ChartPanel title="Complaints by status" empty={!statusData.length}>
                <div className="h-72 min-w-0">
                  <ResponsiveContainer height="100%" width="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="48%"
                        innerRadius={62}
                        outerRadius={100}
                        paddingAngle={2}
                      >
                        {statusData.map((item) => (
                          <Cell key={item.status} fill={statusColors[item.status] ?? '#64748b'} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartPanel>

              <ChartPanel title="Complaints by category" empty={!analytics.categoryCounts.length}>
                <div className="h-72 min-w-0">
                  <ResponsiveContainer height="100%" width="100%">
                    <BarChart
                      data={analytics.categoryCounts}
                      margin={{ top: 8, right: 12, left: -18, bottom: 28 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        angle={-20}
                        height={58}
                        interval={0}
                        textAnchor="end"
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" name="Complaints" fill="#2563eb" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartPanel>

              <ChartPanel title="Complaint trend" empty={!trendData.some((item) => item.count)}>
                <div className="h-72 min-w-0">
                  <ResponsiveContainer height="100%" width="100%">
                    <LineChart
                      data={trendData}
                      margin={{ top: 8, right: 16, left: -18, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" minTickGap={18} tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line
                        dataKey="count"
                        name="Complaints"
                        type="monotone"
                        stroke="#2563eb"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </ChartPanel>

              <ChartPanel title="Top upvoted complaints" empty={!analytics.topUpvoted.length}>
                <ol className="divide-y">
                  {analytics.topUpvoted.map((complaint, index) => (
                    <li className="flex items-center gap-3 py-3" key={complaint._id}>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-800">{complaint.title}</p>
                        <p className="text-xs text-slate-500">{complaint.complaintId}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-slate-700">
                        {complaint.upvoteCount} votes
                      </span>
                    </li>
                  ))}
                </ol>
              </ChartPanel>

              <ChartPanel title="Complaints by area" empty={!analytics.areaCounts.length}>
                <ol className="divide-y">
                  {analytics.areaCounts.map((item) => (
                    <li className="flex items-center justify-between gap-4 py-3" key={item.area}>
                      <span className="truncate text-slate-700">{item.area}</span>
                      <span className="font-semibold text-slate-900">{item.count}</span>
                    </li>
                  ))}
                </ol>
              </ChartPanel>
            </section>
          </>
        )
      )}
    </div>
  );
}
