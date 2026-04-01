'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const isAuth = !!session;
      setIsAuthenticated(isAuth);
      if (!isAuth && pathname !== '/login') {
        router.push('/login');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const isAuth = !!session;
      setIsAuthenticated(isAuth);
      if (!isAuth && pathname !== '/login') {
        router.push('/login');
      } else if (isAuth && pathname === '/login') {
        router.push('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col">
         <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
         <p className="text-gray-500 font-medium">Loading session...</p>
      </div>
    );
  }

  if (!isAuthenticated && pathname === '/login') {
    return <>{children}</>;
  }

  if (isAuthenticated && pathname === '/login') {
    return null;
  }

  return (
    <div className="flex w-full min-h-screen">
      <Sidebar />
      <main className="flex-1 w-full overflow-y-auto">
        <div className="px-8 py-8 w-full max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
