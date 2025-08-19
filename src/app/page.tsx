"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/v2/exporter');
    }, [router]);

    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-center text-muted-foreground">Redirecting...</div>
      </div>
    );
}
