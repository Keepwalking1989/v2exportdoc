
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

  // Fetch transporters from the API
  useEffect(() => {
    const fetchTransporters = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/v2/transporter-data');
        if (!response.ok) {
          throw new Error('Failed to fetch transporters');
        }
        const data: Transporter[] = await response.json();
        setTransporters(data);
      } catch (error) {
        console.error("Failed to fetch transporters from API", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load transporters from the database.",
        });
        setTransporters([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTransporters();
  }, [toast]);

  const handleSaveTransporter = async (values: TransporterFormValues) => {
    if (transporterToEdit) {
      // TODO: Implement update logic
      console.log("Update logic to be implemented");
      toast({ title: "Transporter Updated", description: `${values.companyName} has been successfully updated.` });
    } else {
      // Create new logic
      try {
        const response = await fetch('/api/v2/transporter-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save transporter');
        }
        const newTransporter: Transporter = await response.json();
        setTransporters(prev => [newTransporter, ...prev]);
        toast({ title: "Transporter Saved", description: `${values.companyName} has been successfully saved to the database.` });
        
      } catch (error: any) {
        console.error("Failed to save transporter via API", error);
        toast({
          variant: "destructive",
          title: "Error Saving Transporter",
          description: error.message || "An unknown error occurred.",
        });
      }
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
  
  const handleDeleteTransporter = (id: string) => {
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
