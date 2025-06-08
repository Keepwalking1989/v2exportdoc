
"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { TransporterForm } from "@/components/transporter-form";
import { TransporterList } from "@/components/transporter-list";
import type { Transporter } from "@/types/transporter";

const LOCAL_STORAGE_KEY = "bizform_transporters";

export default function TransporterPage() {
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedTransporters = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedTransporters) {
          setTransporters(JSON.parse(storedTransporters));
        }
      } catch (error) {
        console.error("Failed to parse transporters from localStorage", error);
        setTransporters([]);
      }
    }
  }, []);

  const handleSaveTransporter = (newTransporter: Transporter) => {
    const updatedTransporters = [...transporters, newTransporter];
    setTransporters(updatedTransporters);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedTransporters));
    }
  };

  if (!isClient) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <TransporterForm onSave={handleSaveTransporter} />
        <TransporterList transporters={transporters} />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} BizForm. All rights reserved.
      </footer>
    </div>
  );
}
