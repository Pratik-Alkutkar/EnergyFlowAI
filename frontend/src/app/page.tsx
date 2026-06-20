import Link from 'next/link';
import { Zap, BarChart3, TrendingUp, Battery, Bot, ArrowRight, ArrowUpRight } from 'lucide-react';

const FEATURES = [
  {
    icon: BarChart3,
    accent: '#22c55e',
    label: 'Analytics',
    title: 'Full visibility into your energy stack.',
    desc: 'Real-time demand, solar output, and grid pricing on a single screen. Know exactly where your energy spend is going — before the bill arrives.',
    href: '/analytics',
    delay: 'delay-200',
  },
  {
    icon: TrendingUp,
    accent: '#f59e0b',
    label: 'Forecasting',
    title: 'Know what's coming before it does.',
    desc: 'Predict demand, solar generation, and ERCOT prices up to 48 hours ahead. Built for procurement teams and dispatch engineers.',
    href: '/forecast',
    delay: 'delay-300',
  },
  {
    icon: Battery,
    accent: '#22c55e',
    label: 'Optimization',
    title: 'Automated battery dispatch. Zero manual work.',
    desc: 'Schedule charge and discharge cycles around price signals automatically. Reduce peak demand charges and maximize your asset ROI.',
    href: '/optimizer',
    delay: 'delay-400',
  },
  {
    icon: Bot,
    accent: '#f59e0b',
    label: 'AI Copilot',
    title: 'Ask your data anything.',
    desc: 'Natural language interface to your live energy data. Get answers in seconds — no dashboards to build, no queries to write.',
    href: '/copilot',
    delay: 'delay-500',
  },
];

const STATS = [
  { value: '90',    unit: 'days',  label: 'Historical data' },
  { value: '48h',   unit: '',      label: 'Forecast horizon' },
  { value: 'Live',  unit: '',      label: 'ERCOT grid feed' },
  { value: '100',   unit: 'kWh',  label: 'Battery modelled' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden" style={{ background: 'var(--bg-0)' }}>

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-10 animate-spin-slow"
          style={{ background: 'radial-gradient(circle, #22c55e 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }} />
        <div className="absolute -bottom-20 left-1/3 w-[400px] h-[400px] rounded-full opacity-6"
          style={{ background: 'radial-gradient(circle, #22c55e 0%, transparent 70%)' }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-10 py-6 animate-fade-in">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center animate-pulse-glow"
            style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <Zap className="w-4 h-4" style={{ color: '#22c55e' }} />
          </div>
          <span className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>
            EnergyFlow <span style={{ color: '#22c55e' }}>AI</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm px-4 py-2 rounded-lg transition-all"
            style={{ color: 'var(--text-muted)' }}>
            Dashboard
          </Link>
          <Link href="/dashboard"
            className="text-sm px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-1.5"
            style={{ background: '#22c55e', color: '#000' }}>
            Get Started <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 text-center px-6 pt-16 pb-20 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-8 animate-fade-in-up"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
          ERCOT · Austin, TX · Live Data
        </div>

        <h1 className="text-6xl font-extrabold leading-tight mb-6 animate-fade-in-up delay-100"
          style={{ color: 'var(--text-1)' }}>
          Energy intelligence<br />
          <span style={{
            background: 'linear-gradient(135deg, #22c55e 0%, #f59e0b 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            that acts for you.
          </span>
        </h1>

        <p className="text-lg max-w-xl mx-auto mb-10 animate-fade-in-up delay-200 leading-relaxed"
          style={{ color: 'var(--text-muted)' }}>
          Monitor consumption, forecast demand, and optimize battery dispatch —
          automatically, from a single platform built on live grid data.
        </p>

        <div className="flex items-center justify-center gap-4 animate-fade-in-up delay-300">
          <Link href="/dashboard"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#000' }}>
            Open Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/analytics"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)', border: '1px solid rgba(255,255,255,0.08)' }}>
            View Reports <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 px-10 pb-16 max-w-4xl mx-auto animate-fade-in-up delay-400">
        <div className="glass grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5 rounded-2xl overflow-hidden">
          {STATS.map(({ value, unit, label }) => (
            <div key={label} className="px-8 py-6 text-center">
              <p className="text-2xl font-bold mb-1">
                <span style={{ color: '#f59e0b' }}>{value}</span>
                {unit && <span className="text-sm font-medium ml-1" style={{ color: 'var(--text-muted)' }}>{unit}</span>}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-10 pb-24 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, accent, label, title, desc, href, delay }) => (
            <Link key={label} href={href}
              className={`glass group p-6 hover:border-white/10 transition-all duration-300 animate-fade-in-up ${delay}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${accent}15`, border: `1px solid ${accent}25` }}>
                  <Icon className="w-5 h-5" style={{ color: accent }} />
                </div>
                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: accent }} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: accent }}>{label}</p>
              <h3 className="text-sm font-semibold mb-2 leading-snug" style={{ color: 'var(--text-1)' }}>{title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-10 py-8 text-center animate-fade-in"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          EnergyFlow AI · Powered by live ERCOT & Open-Meteo data
        </p>
      </footer>
    </div>
  );
}
