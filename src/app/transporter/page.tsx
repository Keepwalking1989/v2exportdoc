
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { TransporterForm, type TransporterFormValues } from "@/components/transporter-form";
import { TransporterList } from "@/components/transporter-list";
import type { Transporter } from "@/types/transporter";
import type { ExportDocument } from "@/types/export-document";
import { useToast } from "@/hooks/use-toast";

const LOCAL_STORAGE_KEY = "bizform_transporters";

export default function TransporterPage() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [transporterToEdit, setTransporterToEdit] = useState<Transporter | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedTransporters = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedTransporters) {
          setTransporters(JSON.parse(storedTransporters).filter((t: Transporter) => !t.isDeleted));
        }
      } catch (error) {
        console.error("Failed to parse transporters from localStorage", error);
        setTransporters([]);
      }
    }
  }, []);

  const handleSaveTransporter = (values: TransporterFormValues) => {
    const allTransportersRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const allTransporters: Transporter[] = allTransportersRaw ? JSON.parse(allTransportersRaw) : [];

    if (transporterToEdit) {
      const updatedTransporters = allTransporters.map(t => 
        t.id === transporterToEdit.id ? { ...t, ...values } : t
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedTransporters));
      setTransporters(updatedTransporters.filter(t => !t.isDeleted));
      toast({ title: "Transporter Updated", description: `${values.companyName} has been successfully updated.` });
      setTransporterToEdit(null);
    } else {
      const newTransporter: Transporter = { id: Date.now().toString(), ...values };
      const updatedTransporters = [...allTransporters, newTransporter];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedTransporters));
      setTransporters(updatedTransporters.filter(t => !t.isDeleted));
      toast({ title: "Transporter Saved", description: `${values.companyName} has been successfully saved.` });
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
    const exportDocuments: ExportDocument[] = JSON.parse(localStorage.getItem('bizform_export_documents_v2') || '[]');
    const isUsed = exportDocuments.some(ed => ed.transporterId === id);

    if (isUsed) {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "This transporter is used in an Export Document. Please remove its references before deleting.",
      });
      return;
    }

    const allTransportersRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const allTransporters: Transporter[] = allTransportersRaw ? JSON.parse(allTransportersRaw) : [];
    
    const updatedTransporters = allTransporters.map(t => 
      t.id === id ? { ...t, isDeleted: true } : t
    );
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedTransporters));
    setTransporters(updatedTransporters.filter(t => !t.isDeleted));
    toast({ title: "Transporter Deleted", description: "The transporter has been marked as deleted." });
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
        <div ref={formRef}>
          <TransporterForm 
            onSave={handleSaveTransporter}
            initialData={transporterToEdit}
            isEditing={!!transporterToEdit}
            onCancelEdit={handleCancelEdit}
          />
        </div>
        <TransporterList 
          transporters={transporters}
          onEditTransporter={handleEditTransporter}
          onDeleteTransporter={handleDeleteTransporter}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} BizForm. All rights reserved.
      </footer>
    </div>
  );
}
