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
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Field';
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
  submitted: 'var(--color-chart-civic)',
  under_review: 'var(--color-chart-violet)',
  assigned: 'var(--color-chart-accent)',
  in_progress: 'var(--color-chart-accent-deep)',
  resolved: 'var(--color-chart-civic-deep)',
  rejected: 'var(--color-chart-rose)',
  closed: 'var(--color-chart-slate)',
};
const periodLabels = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '6m': 'Last 6 months',
};

function MetricCard({ label, value, detail }) {
  return (
    <Card as="article" className="p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-slate-950">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </Card>
  );
}

function ChartPanel({ title, children, empty }) {
  return (
    <Card as="section" className="min-w-0 p-5 sm:p-6">
      <h2 className="mb-4 font-heading text-base font-extrabold text-slate-950">{title}</h2>
      {empty ? (
        <EmptyState className="h-64 border-0 shadow-none" title="No chart data yet" description="There is nothing to display for this period." />
      ) : (
        children
      )}
    </Card>
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
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-civic-700">Overview</p>
          <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Administration analytics</h1>
          <p className="mt-2 text-sm text-slate-600">Complaint trends and resolution performance.</p>
        </div>
        <Select
            label="Date range"
            className="min-w-44"
            onChange={(event) => setRange(event.target.value)}
            value={range}
          >
            {Object.entries(periodLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
        </Select>
      </header>

      {error && (
        <p className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
          Unable to load analytics: {error}
        </p>
      )}

      {loading && !analytics ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="Loading analytics">
          {Array.from({ length: 5 }, (_, index) => (
            <Card key={index} className="space-y-3 p-5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-9 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </Card>
          ))}
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={`chart-${index}`} className="space-y-4 p-5 lg:col-span-1">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-60 w-full" />
            </Card>
          ))}
        </section>
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
              <p className="mt-5 rounded-2xl border border-civic-100 bg-civic-50 p-4 text-center text-sm text-civic-900">
                No complaints were created during {periodLabels[range].toLowerCase()}.
              </p>
            )}

            <section className="mt-5 grid gap-5 lg:grid-cols-2">
              <ChartPanel title="Complaints by status" empty={!statusData.length}>
                <div aria-label="Complaint distribution by status" className="h-72 min-w-0" role="group">
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
                          <Cell key={item.status} fill={statusColors[item.status] ?? 'var(--color-chart-slate)'} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartPanel>

              <ChartPanel title="Complaints by category" empty={!analytics.categoryCounts.length}>
                <div aria-label="Complaint counts by category" className="h-72 min-w-0" role="group">
                  <ResponsiveContainer height="100%" width="100%">
                    <BarChart
                      data={analytics.categoryCounts}
                      margin={{ top: 8, right: 12, left: -18, bottom: 28 }}
                    >
                      <CartesianGrid stroke="var(--color-chart-grid)" strokeDasharray="3 3" />
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
                      <Bar dataKey="count" name="Complaints" fill="var(--color-chart-civic)" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartPanel>

              <ChartPanel title="Complaint trend" empty={!trendData.some((item) => item.count)}>
                <div aria-label={`Complaint volume trend for ${periodLabels[range].toLowerCase()}`} className="h-72 min-w-0" role="group">
                  <ResponsiveContainer height="100%" width="100%">
                    <LineChart
                      data={trendData}
                      margin={{ top: 8, right: 16, left: -18, bottom: 4 }}
                    >
                      <CartesianGrid stroke="var(--color-chart-grid)" strokeDasharray="3 3" />
                      <XAxis dataKey="label" minTickGap={18} tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line
                        dataKey="count"
                        name="Complaints"
                        type="monotone"
                        stroke="var(--color-chart-civic)"
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
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-civic-50 text-sm font-extrabold text-civic-800">
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
