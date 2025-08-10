
"use client";

// This page now redirects to the V2 dashboard.
// All the old localStorage logic has been removed.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';

export default function DashboardRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/v2/dashboard');
    }, [router]);

    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Redirecting to the dashboard...</div>
        </main>
      </div>
    );
}
