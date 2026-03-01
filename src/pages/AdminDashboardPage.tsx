import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSupabaseAuth } from '../context/SupabaseAuthContext';
import { motion } from 'framer-motion';
import { fetchDashboardData, type AnalyticsDashboardData } from '../services/analytics';

const ADMIN_EMAILS = ['srushtiraj.patil20@vit.edu'];
const G = '#00ff41'; // terminal green
const GD = '#00cc33'; // dimmer
const GDD = '#006b1d'; // very dim
const PERIODS = ['7d', '30d', '90d', '365d', 'all'] as const;

function fmt(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(0) + 'K';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

function flag(cc: string) {
  if (!cc || cc.length !== 2 || cc === '??' || cc === 'LO') return '--';
  return String.fromCodePoint(...[...cc.toUpperCase()].map(c => 0x1f1e6 - 65 + c.charCodeAt(0)));
}

function ago(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return s + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}

// ── Line chart - terminal style ──
const Line = ({ data, h = 64 }: { data: number[]; h?: number }) => {
  if (data.length < 2) return null;
  const mx = Math.max(...data, 1);
  const w = 800;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - 2 - (v / mx) * (h - 4),
  }));
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('');
  const fill = `${d}L${w},${h}L0,${h}Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none">
      <path d={fill} fill={G} opacity="0.07" />
      <path d={d} fill="none" stroke={G} strokeWidth="1.5" opacity="0.8" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill={G} />
    </svg>
  );
};

// ── Bar ──
const Bar = ({ pct }: { pct: number }) => (
  <div className="h-[3px] flex-1 bg-neutral-900 overflow-hidden">
    <div className="h-full" style={{ width: `${pct}%`, background: G, opacity: 0.6 }} />
  </div>
);

const AdminDashboardPage = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<string>('30d');
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [now, setNow] = useState(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const isAdmin = user && ADMIN_EMAILS.includes(user.email || '');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate('/login?redirect=/admin/dashboard');
    else if (!authLoading && isAuthenticated && !isAdmin) navigate('/');
  }, [authLoading, isAuthenticated, isAdmin, navigate]);

  const load = useCallback(async () => {
    if (!isAdmin || !user?.email) return;
    setLoading(true);
    setErr('');
    try {
      setData(await fetchDashboardData(user.email!, period));
      setNow(Date.now());
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user?.email, period]);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 60000);
    return () => clearInterval(timerRef.current);
  }, [load]);

  const vis = useMemo(() => data?.daily_visitors.map(d => d.visitors) || [], [data]);
  const evts = useMemo(() => data?.daily_visitors.map(d => d.events) || [], [data]);
  const toolMax = useMemo(() => data?.tool_usage[0]?.count || 1, [data]);
  const countryMax = useMemo(() => data?.country_breakdown[0]?.count || 1, [data]);
  const devTotal = useMemo(() => data?.device_breakdown.reduce((s, d) => s + d.count, 0) || 1, [data]);

  if (authLoading) return (
    <div className="min-h-screen bg-black flex items-center justify-center font-mono text-sm" style={{ color: GDD }}>
      authenticating...
    </div>
  );
  if (!isAuthenticated || !isAdmin) return null;

  const s = data?.summary;

  return (
    <div className="min-h-screen bg-black font-mono text-xs selection:bg-green-900/40" style={{ color: '#999' }}>
      {/* header */}
      <div className="sticky top-0 z-50 bg-black/95 border-b border-neutral-900">
        <div className="max-w-5xl mx-auto px-4 h-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/account" className="hover:opacity-70 transition" style={{ color: GDD }}>←</Link>
            <span style={{ color: G }}>anemo/analytics</span>
            <span style={{ color: GDD }}>{user?.email?.split('@')[0]}</span>
          </div>
          <div className="flex items-center gap-1">
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className="px-2 py-0.5 transition-all"
                style={{
                  color: period === p ? G : '#444',
                  background: period === p ? 'rgba(0,255,65,0.06)' : 'transparent',
                  border: period === p ? `1px solid ${GDD}` : '1px solid transparent',
                }}>
                {p}
              </button>
            ))}
            <button onClick={load} className="ml-2 px-2 py-0.5 hover:opacity-70" style={{ color: GDD }}
              title="refresh">↻</button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {err && (
          <div className="border border-red-900/50 px-3 py-2 text-red-500 text-xs">{err}</div>
        )}

        {loading && !data && (
          <div className="py-32 text-center" style={{ color: GDD }}>loading...</div>
        )}

        {s && data && (
          <>
            {/* ── KPIs ── */}
            <div className="grid grid-cols-4 gap-px bg-neutral-900">
              {[
                { k: 'visitors', v: s.unique_visitors },
                { k: 'views', v: s.total_page_views },
                { k: 'tool_uses', v: s.total_tool_uses },
                { k: 'events', v: s.total_events },
              ].map(({ k, v }) => (
                <div key={k} className="bg-black p-3">
                  <div className="text-[10px] mb-1" style={{ color: '#555' }}>{k}</div>
                  <div className="text-xl font-bold tabular-nums" style={{ color: G }}>{fmt(v)}</div>
                </div>
              ))}
            </div>

            {/* ── Visitor trend ── */}
            {vis.length >= 2 && (
              <div className="border border-neutral-900 p-3">
                <div className="flex items-baseline justify-between mb-2">
                  <span style={{ color: '#555' }}>visitors/day</span>
                  <span style={{ color: GDD }}>{data.daily_visitors.length}d</span>
                </div>
                <Line data={vis} h={72} />
                <div className="flex justify-between mt-1 text-[10px]" style={{ color: '#333' }}>
                  <span>{data.daily_visitors[0]?.date}</span>
                  <span>{data.daily_visitors[data.daily_visitors.length - 1]?.date}</span>
                </div>
              </div>
            )}

            {/* ── Events trend ── */}
            {evts.length >= 2 && (
              <div className="border border-neutral-900 p-3">
                <div className="flex items-baseline justify-between mb-2">
                  <span style={{ color: '#555' }}>events/day</span>
                  <span style={{ color: GDD }}>avg {Math.round(evts.reduce((a, b) => a + b, 0) / evts.length)}/d</span>
                </div>
                <Line data={evts} h={48} />
              </div>
            )}

            {/* ── Two column: tools + countries ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* TOOLS */}
              {data.tool_usage.length > 0 && (
                <div className="border border-neutral-900 p-3">
                  <div className="mb-2" style={{ color: '#555' }}>tools ({data.tool_usage.length})</div>
                  <div className="space-y-1.5">
                    {data.tool_usage.map((t, i) => (
                      <div key={t.tool} className="flex items-center gap-2">
                        <span className="w-4 text-right" style={{ color: '#333' }}>{i + 1}</span>
                        <span className="flex-1 truncate" style={{ color: i === 0 ? G : '#888' }}>{t.tool}</span>
                        <Bar pct={(t.count / toolMax) * 100} />
                        <span className="w-8 text-right tabular-nums" style={{ color: GD }}>{fmt(t.count)}</span>
                        <span className="w-6 text-right tabular-nums" style={{ color: '#444' }}>{t.unique_users}u</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* COUNTRIES */}
              {data.country_breakdown.length > 0 && (
                <div className="border border-neutral-900 p-3">
                  <div className="mb-2" style={{ color: '#555' }}>countries ({data.country_breakdown.length})</div>
                  <div className="space-y-1.5">
                    {data.country_breakdown.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-5" title={c.country_code}>{flag(c.country_code)}</span>
                        <span className="flex-1 truncate" style={{ color: i === 0 ? G : '#888' }}>{c.country}</span>
                        <Bar pct={(c.count / countryMax) * 100} />
                        <span className="w-8 text-right tabular-nums" style={{ color: GD }}>{fmt(c.count)}</span>
                        <span className="w-6 text-right tabular-nums" style={{ color: '#444' }}>{c.unique_visitors}u</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Three column: devices + browsers + os ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {data.device_breakdown.length > 0 && (
                <div className="border border-neutral-900 p-3">
                  <div className="mb-2" style={{ color: '#555' }}>devices</div>
                  {data.device_breakdown.map(d => (
                    <div key={d.device} className="flex items-center justify-between py-0.5">
                      <span style={{ color: '#888' }}>{d.device || '?'}</span>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums" style={{ color: GD }}>{fmt(d.count)}</span>
                        <span className="tabular-nums w-8 text-right" style={{ color: '#444' }}>
                          {Math.round((d.count / devTotal) * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {data.browser_breakdown.length > 0 && (
                <div className="border border-neutral-900 p-3">
                  <div className="mb-2" style={{ color: '#555' }}>browsers</div>
                  {data.browser_breakdown.map(b => (
                    <div key={b.browser} className="flex items-center justify-between py-0.5">
                      <span style={{ color: '#888' }}>{b.browser}</span>
                      <span className="tabular-nums" style={{ color: GD }}>{fmt(b.count)}</span>
                    </div>
                  ))}
                </div>
              )}

              {data.os_breakdown.length > 0 && (
                <div className="border border-neutral-900 p-3">
                  <div className="mb-2" style={{ color: '#555' }}>os</div>
                  {data.os_breakdown.map(o => (
                    <div key={o.os} className="flex items-center justify-between py-0.5">
                      <span style={{ color: '#888' }}>{o.os}</span>
                      <span className="tabular-nums" style={{ color: GD }}>{fmt(o.count)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Two column: pages + referrers ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.top_pages.length > 0 && (
                <div className="border border-neutral-900 p-3">
                  <div className="mb-2" style={{ color: '#555' }}>pages ({data.top_pages.length})</div>
                  <div className="space-y-1">
                    {data.top_pages.slice(0, 15).map((p, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="flex-1 truncate" style={{ color: i < 3 ? G : '#777' }}>{p.page}</span>
                        <span className="tabular-nums" style={{ color: GD }}>{fmt(p.count)}</span>
                        <span className="tabular-nums w-6 text-right" style={{ color: '#444' }}>{p.unique_visitors}u</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.top_referrers.length > 0 && (
                <div className="border border-neutral-900 p-3">
                  <div className="mb-2" style={{ color: '#555' }}>referrers</div>
                  <div className="space-y-1">
                    {data.top_referrers.map((r, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="flex-1 truncate" style={{ color: '#777' }}>{r.referrer || 'direct'}</span>
                        <span className="tabular-nums" style={{ color: GD }}>{fmt(r.count)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Live feed ── */}
            {data.recent_events.length > 0 && (
              <div className="border border-neutral-900 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span style={{ color: '#555' }}>live ({data.recent_events.length})</span>
                  <span className="flex items-center gap-1.5" style={{ color: GDD }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: G }} />
                    60s
                  </span>
                </div>
                <div className="space-y-0 max-h-[50vh] overflow-y-auto">
                  {data.recent_events.map(ev => (
                    <div key={ev.id}
                      className="flex items-center gap-2 py-1 border-b border-neutral-900/50 hover:bg-neutral-900/30 transition-colors px-1">
                      <span className="w-1 h-1 rounded-full flex-shrink-0"
                        style={{ background: ev.event_type === 'tool_use' ? G : GDD }} />
                      <span className="flex-1 truncate" style={{ color: ev.event_type === 'tool_use' ? G : '#777' }}>
                        {ev.tool_name || ev.page_path}
                      </span>
                      {ev.country && ev.country !== 'Local' && (
                        <span style={{ color: '#444' }}>{ev.country}{ev.city && ev.city !== 'Localhost' ? '/' + ev.city : ''}</span>
                      )}
                      {ev.device_type && <span style={{ color: '#333' }}>{ev.device_type[0]}</span>}
                      {ev.browser && <span style={{ color: '#333' }}>{ev.browser}</span>}
                      <span className="tabular-nums flex-shrink-0 w-6 text-right" style={{ color: '#333' }}>
                        {ev.created_at ? ago(ev.created_at) : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Footer ── */}
            <div className="flex items-center justify-between pt-2 text-[10px]" style={{ color: '#2a2a2a' }}>
              <span>{data.start_date?.split('T')[0]} → {new Date().toISOString().split('T')[0]}</span>
              <span>{loading ? '◌ syncing' : '● live'} · {new Date(now).toLocaleTimeString()}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
