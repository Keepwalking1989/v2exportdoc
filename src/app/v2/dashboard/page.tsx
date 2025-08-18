
"use client";

import { Header } from "@/components/layout/header";

export default function DashboardPageV2() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex flex-grow items-center justify-center">
        <h1 className="text-4xl font-bold font-headline text-primary">
          welcome to Hemith Tiles
        </h1>
      </main>
    </div>
  );
}
