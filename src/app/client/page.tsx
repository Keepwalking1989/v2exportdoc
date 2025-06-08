
"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { ClientForm } from "@/components/client-form";
import { ClientList } from "@/components/client-list";
import type { Client } from "@/types/client";

const LOCAL_STORAGE_KEY = "bizform_clients";

export default function ClientPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedClients = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedClients) {
          setClients(JSON.parse(storedClients));
        }
      } catch (error) {
        console.error("Failed to parse clients from localStorage", error);
        setClients([]);
      }
    }
  }, []);

  const handleSaveClient = (newClient: Client) => {
    const updatedClients = [...clients, newClient];
    setClients(updatedClients);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedClients));
    }
  };

  if (!isClient) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Loading client data...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <ClientForm onSave={handleSaveClient} />
        <ClientList clients={clients} />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} BizForm. All rights reserved.
      </footer>
    </div>
  );
}
