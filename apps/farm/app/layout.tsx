'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import './globals.css';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/devices', label: 'Devices', icon: '📷' },
  { href: '/plots', label: 'Plots', icon: '🌱' },
  { href: '/members', label: 'Members', icon: '👥' },
  { href: '/commands', label: 'Commands', icon: '⚡' },
  { href: '/content', label: 'Content', icon: '🖼️' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="zh-CN">
      <body className="bg-[var(--background)] text-[var(--foreground)]">
        <QueryClientProvider client={queryClient}>
          <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="w-56 bg-white border-r border-[var(--border)] flex flex-col">
              <div className="p-4 border-b border-[var(--border)]">
                <h1 className="text-lg font-bold text-[var(--primary)]">🌾 My Farm</h1>
              </div>
              <nav className="flex-1 py-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        isActive
                          ? 'bg-green-50 text-[var(--primary)] font-medium border-r-2 border-[var(--primary)]'
                          : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 overflow-auto">
              {children}
            </main>
          </div>
        </QueryClientProvider>
      </body>
    </html>
  );
}
