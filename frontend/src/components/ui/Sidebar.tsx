'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Zap,
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  Battery,
  Bot,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/analytics',  label: 'Analytics',  icon: BarChart3 },
  { href: '/forecast',   label: 'Forecast',   icon: TrendingUp },
  { href: '/optimizer',  label: 'Optimizer',  icon: Battery },
  { href: '/copilot',    label: 'AI Copilot', icon: Bot },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-gray-900 border-r border-gray-800">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">EnergyFlow</p>
            <p className="text-xs text-green-400 font-medium">AI</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-800">
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          API Docs (FastAPI)
        </a>
        <p className="text-xs text-gray-600 mt-2">
          ERCOT · Austin TX · 100kWh Battery
        </p>
      </div>
    </aside>
  );
}
