import Link from 'next/link';
import { Zap, BarChart3, TrendingUp, Battery, Bot, ArrowRight, Github } from 'lucide-react';

const FEATURES = [
  {
    icon:  BarChart3,
    color: 'text-blue-400',
    bg:    'bg-blue-400/10',
    title: 'Real Analytics',
    desc:  'SQL queries against live Postgres. KPIs, daily totals, solar penetration, and cost breakdowns.',
    href:  '/analytics',
  },
  {
    icon:  TrendingUp,
    color: 'text-yellow-400',
    bg:    'bg-yellow-400/10',
    title: 'ML Forecasting',
    desc:  'XGBoost models forecast demand, solar generation, and ERCOT prices 24–168h ahead.',
    href:  '/forecast',
  },
  {
    icon:  Battery,
    color: 'text-purple-400',
    bg:    'bg-purple-400/10',
    title: 'LP Optimisation',
    desc:  'PuLP linear program minimises electricity cost by scheduling battery charge/discharge.',
    href:  '/optimizer',
  },
  {
    icon:  Bot,
    color: 'text-green-400',
    bg:    'bg-green-400/10',
    title: 'AI Copilot',
    desc:  'Natural-language interface to query your energy data. Powered by GPT-4o-mini or rule-based engine.',
    href:  '/copilot',
  },
];

const STACK = [
  { label: 'FastAPI',     color: 'bg-teal-500/20 text-teal-300' },
  { label: 'Python',      color: 'bg-yellow-500/20 text-yellow-300' },
  { label: 'XGBoost',     color: 'bg-orange-500/20 text-orange-300' },
  { label: 'PuLP LP',     color: 'bg-purple-500/20 text-purple-300' },
  { label: 'PostgreSQL',  color: 'bg-blue-500/20 text-blue-300' },
  { label: 'Next.js',     color: 'bg-gray-500/20 text-gray-300' },
  { label: 'Tailwind',    color: 'bg-cyan-500/20 text-cyan-300' },
  { label: 'Vercel',      color: 'bg-pink-500/20 text-pink-300' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Hero */}
      <section className="relative px-8 pt-24 pb-16 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#16a34a15_0%,_transparent_70%)]" />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium mb-6">
            <Zap className="w-3 h-3" />
            ERCOT · Austin TX · 100kWh Battery System
          </div>
          <h1 className="text-5xl font-extrabold text-white mb-4 leading-tight">
            EnergyFlow <span className="text-green-400">AI</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Production-grade energy analytics platform. Real SQL, real ML,
            real LP optimisation — not a mockup.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/dashboard" className="btn-primary flex items-center gap-2">
              Open Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              API Docs
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-8 pb-16 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURES.map(({ icon: Icon, color, bg, title, desc, href }) => (
            <Link key={title} href={href} className="card group hover:border-gray-600 transition-all">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2 group-hover:text-green-400 transition-colors">
                {title} <ArrowRight className="w-3 h-3 inline opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Tech stack */}
      <section className="px-8 pb-16 max-w-5xl mx-auto">
        <div className="card">
          <h2 className="text-base font-semibold text-gray-300 mb-4">Technology Stack</h2>
          <div className="flex flex-wrap gap-2">
            {STACK.map(({ label, color }) => (
              <span key={label} className={`badge ${color} px-3 py-1`}>{label}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Data pipeline */}
      <section className="px-8 pb-24 max-w-5xl mx-auto">
        <div className="card">
          <h2 className="text-base font-semibold text-gray-300 mb-4">Data Pipeline</h2>
          <div className="flex items-center gap-3 flex-wrap text-sm">
            {[
              'Synthetic / ERCOT API',
              'ETL (Python)',
              'Neon Postgres',
              'SQL Analytics',
              'ML Models',
              'LP Optimizer',
              'FastAPI',
              'Next.js Dashboard',
            ].map((step, i, arr) => (
              <span key={step} className="flex items-center gap-3">
                <span className="text-gray-300 bg-gray-800 px-2 py-1 rounded">{step}</span>
                {i < arr.length - 1 && <span className="text-gray-600">→</span>}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
