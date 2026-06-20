import Link from 'next/link';
import { Zap, BarChart3, TrendingUp, Battery, Bot, ArrowRight } from 'lucide-react';

const FEATURES = [
  {
    icon:  BarChart3,
    color: '#3b82f6',
    title: 'Real-Time Analytics',
    desc:  'Live KPIs, daily totals, solar penetration rates, and cost breakdowns — updated continuously from real grid and weather data.',
    href:  '/analytics',
  },
  {
    icon:  TrendingUp,
    color: '#f59e0b',
    title: 'AI Forecasting',
    desc:  'Machine learning models forecast energy demand, solar generation, and ERCOT grid prices up to 7 days ahead with confidence intervals.',
    href:  '/forecast',
  },
  {
    icon:  Battery,
    color: '#8b5cf6',
    title: 'Battery Optimizer',
    desc:  'Linear programming engine determines the optimal charge/discharge schedule to minimize electricity costs across the next 24 hours.',
    href:  '/optimizer',
  },
  {
    icon:  Bot,
    color: '#22c55e',
    title: 'AI Copilot',
    desc:  'Ask questions in plain English — "Why did costs spike yesterday?" — and get instant answers grounded in your real energy data.',
    href:  '/copilot',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-0)' }}>
      {/* Hero */}
      <section className="relative px-8 pt-24 pb-16 text-center overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.08) 0%, transparent 70%)' }} />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: 'var(--accent)' }}>
            <Zap className="w-3 h-3" />
            ERCOT · Austin TX · Live Energy Intelligence
          </div>
          <h1 className="text-5xl font-extrabold mb-4 leading-tight" style={{ color: 'var(--text-1)' }}>
            EnergyFlow <span style={{ color: 'var(--accent)' }}>AI</span>
          </h1>
          <p className="text-xl max-w-2xl mx-auto mb-8" style={{ color: 'var(--text-muted)' }}>
            Real-time energy intelligence for microgrids and distributed energy resources.
            Live grid data, AI forecasting, and automated battery optimization — in one platform.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ background: 'var(--accent)', color: '#000' }}
            >
              Open Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/analytics"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ background: 'var(--bg-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
            >
              View Reports
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-8 pb-16 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, color, title, desc, href }) => (
            <Link key={title} href={href} className="card-hover group rounded-xl p-5 flex gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${color}18` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-1)' }}>
                  {title}
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--accent)' }} />
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Data sources */}
      <section className="px-8 pb-24 max-w-5xl mx-auto">
        <div className="card text-center">
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>LIVE DATA SOURCES</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {[
              { name: 'Open-Meteo',     desc: 'Solar & Weather' },
              { name: 'EIA / ERCOT',    desc: 'Grid Demand' },
              { name: 'Forecasting',    desc: 'ML Models' },
              { name: 'Optimization',   desc: 'Battery LP' },
            ].map(({ name, desc }, i, arr) => (
              <span key={name} className="flex items-center gap-4">
                <span className="text-center">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>{name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </span>
                {i < arr.length - 1 && <span style={{ color: 'var(--text-muted)' }}>→</span>}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
