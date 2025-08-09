
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

  // Fetch clients from the API
  useEffect(() => {
    const fetchClients = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/v2/clients');
        if (!response.ok) {
          throw new Error('Failed to fetch clients');
        }
        const data: Client[] = await response.json();
        setClients(data);
      } catch (error) {
        console.error("Failed to fetch clients from API", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load clients from the database.",
        });
        setClients([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClients();
  }, [toast]);

  const handleSaveClient = async (values: ClientFormValues) => {
    // For V2, this will handle both Create and Update
    if (clientToEdit) {
      // TODO: Implement update logic
      console.log("Update logic to be implemented");
      toast({ title: "Client Updated", description: `${values.companyName} has been successfully updated.` });
    } else {
      // Create new logic
      try {
        const response = await fetch('/api/v2/clients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          throw new Error('Failed to save client');
        }
        const newClient: Client = await response.json();
        setClients(prevClients => [newClient, ...prevClients]);
        toast({ title: "Client Saved", description: `${values.companyName} has been successfully saved to the database.` });
      } catch (error) {
        console.error("Failed to save client via API", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not save the new client.",
        });
      }
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
  
  const handleDeleteClient = (id: string) => {
    // TODO: Implement delete logic
    console.log("Delete logic to be implemented");
    toast({
        variant: "destructive",
        title: "Deletion Pending",
        description: "Delete functionality is not yet implemented for the database.",
      });
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
