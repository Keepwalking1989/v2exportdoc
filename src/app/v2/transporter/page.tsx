
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { TransporterFormV2, type TransporterFormValues } from "@/components/v2/transporter-form";
import { TransporterListV2 } from "@/components/v2/transporter-list";
import type { Transporter } from "@/types/transporter";
import { useToast } from "@/hooks/use-toast";

export default function TransporterPageV2() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [transporterToEdit, setTransporterToEdit] = useState<Transporter | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTransporters = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v2/transporter-data');
      if (!response.ok) {
        throw new Error('Failed to fetch transporters');
      }
      const data: Transporter[] = await response.json();
      setTransporters(data);
    } catch (error: any) {
      console.error("Failed to fetch transporters from API", error);
      toast({
        variant: "destructive",
        title: "Fetch Error",
        description: error.message || "Could not load transporters from the database.",
      });
      setTransporters([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransporters();
  }, [toast]);

  const handleSaveTransporter = async (values: TransporterFormValues) => {
    const isEditing = !!transporterToEdit;
    const url = isEditing ? `/api/v2/transporter-data?id=${transporterToEdit!.id}` : '/api/v2/transporter-data';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${isEditing ? 'update' : 'save'} transporter.`);
      }
      
      toast({ title: `Transporter ${isEditing ? 'Updated' : 'Saved'}`, description: `${values.companyName} has been successfully saved.` });
      setTransporterToEdit(null);
      await fetchTransporters();
      
    } catch (error: any) {
      console.error("Failed to save transporter via API", error);
      toast({
        variant: "destructive",
        title: "Save Error",
        description: error.message || "An unknown error occurred.",
      });
    }
  };

  const handleEditTransporter = (id: string) => {
    const transporter = transporters.find(t => t.id === id);
    if (transporter) {
      setTransporterToEdit(transporter);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  
  const handleCancelEdit = () => {
    setTransporterToEdit(null);
  };
  
  const handleDeleteTransporter = async (id: string) => {
    try {
        const response = await fetch(`/api/v2/transporter-data?id=${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error((await response.json()).message || 'Failed to delete transporter.');
        toast({ title: "Transporter Deleted", description: "The transporter has been marked as deleted." });
        await fetchTransporters();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Delete Error", description: error.message });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Loading transporter data from database...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          <TransporterFormV2 
            onSave={handleSaveTransporter}
            initialData={transporterToEdit}
            isEditing={!!transporterToEdit}
            onCancelEdit={handleCancelEdit}
          />
        </div>
        <TransporterListV2 
          transporters={transporters}
          onEditTransporter={handleEditTransporter}
          onDeleteTransporter={handleDeleteTransporter}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} HEMITH ERP. All rights reserved. (V2 - MySQL)
      </footer>
    </div>
  );
}
