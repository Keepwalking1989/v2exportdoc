
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { ClientFormV2, type ClientFormValues } from "@/components/v2/client-form";
import { ClientListV2 } from "@/components/v2/client-list";
import type { Client } from "@/types/client";
import { useToast } from "@/hooks/use-toast";

export default function ClientPageV2() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v2/client-data');
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      const data: Client[] = await response.json();
      setClients(data);
    } catch (error: any) {
      console.error("Failed to fetch clients from API", error);
      toast({
        variant: "destructive",
        title: "Fetch Error",
        description: error.message || "Could not load clients from the database.",
      });
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [toast]);

  const handleSaveClient = async (values: ClientFormValues) => {
    const isEditing = !!clientToEdit;
    const url = isEditing ? `/api/v2/client-data?id=${clientToEdit!.id}` : '/api/v2/client-data';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${isEditing ? 'update' : 'save'} client.`);
      }
      
      toast({ title: `Client ${isEditing ? 'Updated' : 'Saved'}`, description: `${values.companyName} has been successfully saved.` });
      setClientToEdit(null);
      await fetchClients(); // Refetch the list to show the new/updated data
      
    } catch (error: any) {
      console.error("Failed to save client via API", error);
      toast({
        variant: "destructive",
        title: "Save Error",
        description: error.message || "An unknown error occurred.",
      });
    }
  };

  const handleEditClient = (id: string) => {
    const client = clients.find(c => c.id === id);
    if (client) {
      setClientToEdit(client);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCancelEdit = () => {
    setClientToEdit(null);
  };
  
  const handleDeleteClient = async (id: string) => {
    try {
        const response = await fetch(`/api/v2/client-data?id=${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error((await response.json()).message || 'Failed to delete client.');
        toast({ title: "Client Deleted", description: "The client has been marked as deleted." });
        await fetchClients();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Delete Error", description: error.message });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Loading client data from database...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          <ClientFormV2 
            onSave={handleSaveClient}
            initialData={clientToEdit}
            isEditing={!!clientToEdit}
            onCancelEdit={handleCancelEdit}
          />
        </div>
        <ClientListV2
          clients={clients}
          onEditClient={handleEditClient}
          onDeleteClient={handleDeleteClient}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} HEMITH ERP. All rights reserved. (V2 - MySQL)
      </footer>
    </div>
  );
}
