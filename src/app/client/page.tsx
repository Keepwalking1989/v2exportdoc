
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { ClientForm, type ClientFormValues } from "@/components/client-form";
import { ClientList } from "@/components/client-list";
import type { Client } from "@/types/client";
import type { PerformaInvoice } from "@/types/performa-invoice";
import { useToast } from "@/hooks/use-toast";

const LOCAL_STORAGE_KEY = "bizform_clients";

export default function ClientPage() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedClients = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedClients) {
          setClients(JSON.parse(storedClients).filter((c: Client) => !c.isDeleted));
        }
      } catch (error) {
        console.error("Failed to parse clients from localStorage", error);
        setClients([]);
      }
    }
  }, []);

  const handleSaveClient = (values: ClientFormValues) => {
    const allClientsRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const allClients: Client[] = allClientsRaw ? JSON.parse(allClientsRaw) : [];

    if (clientToEdit) {
      // Update logic
      const updatedClients = allClients.map(c => 
        c.id === clientToEdit.id ? { ...c, ...values } : c
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedClients));
      setClients(updatedClients.filter(c => !c.isDeleted));
      toast({ title: "Client Updated", description: `${values.companyName} has been successfully updated.` });
      setClientToEdit(null);
    } else {
      // Create new logic
      const newClient: Client = { id: Date.now().toString(), ...values };
      const updatedClients = [...allClients, newClient];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedClients));
      setClients(updatedClients.filter(c => !c.isDeleted));
      toast({ title: "Client Saved", description: `${values.companyName} has been successfully saved.` });
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
    const performaInvoices: PerformaInvoice[] = JSON.parse(localStorage.getItem('bizform_performa_invoices') || '[]');
    const isUsed = performaInvoices.some(pi => pi.clientId === id && !pi.isDeleted);

    if (isUsed) {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "This client is used in a Performa Invoice. Please remove its references before deleting.",
      });
      return;
    }
    
    const allClientsRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const allClients: Client[] = allClientsRaw ? JSON.parse(allClientsRaw) : [];
    
    const updatedClients = allClients.map(c => 
      c.id === id ? { ...c, isDeleted: true } : c
    );
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedClients));
    setClients(updatedClients.filter(c => !c.isDeleted));
    toast({ title: "Client Deleted", description: "The client has been marked as deleted." });
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
        <div ref={formRef}>
          <ClientForm 
            onSave={handleSaveClient}
            initialData={clientToEdit}
            isEditing={!!clientToEdit}
            onCancelEdit={handleCancelEdit}
          />
        </div>
        <ClientList 
          clients={clients}
          onEditClient={handleEditClient}
          onDeleteClient={handleDeleteClient}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} BizForm. All rights reserved.
      </footer>
    </div>
  );
}
