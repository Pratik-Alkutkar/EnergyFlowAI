'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Zap, LayoutDashboard, TrendingUp,
  Battery, Bot, FileText, Settings,
  CheckCircle,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/forecast',  label: 'Forecast',   icon: TrendingUp },
  { href: '/optimizer', label: 'Optimizer',  icon: Battery },
  { href: '/copilot',   label: 'Copilot',    icon: Bot },
  { href: '/analytics', label: 'Reports',    icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 flex flex-col h-screen sticky top-0" style={{ background: 'var(--bg-1)', borderRight: '1px solid var(--border)' }}>
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center glow-green" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>EnergyFlow</span>
            <span className="text-sm font-bold ml-1" style={{ color: 'var(--accent)' }}>AI</span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={active ? {
                background: 'rgba(34,197,94,0.12)',
                color: 'var(--accent)',
                border: '1px solid rgba(34,197,94,0.2)',
              } : {
                color: 'var(--text-muted)',
                border: '1px solid transparent',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Status */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--accent)' }}>System Status</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>All Systems Operational</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
