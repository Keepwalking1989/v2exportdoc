"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { ExporterFormV2, type ExporterFormValues } from "@/components/v2/exporter-form";
import { ExporterListV2 } from "@/components/v2/exporter-list";
import type { Company } from "@/types/company";
import { useToast } from "@/hooks/use-toast";

export default function ExporterPageV2() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchExporters = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v2/exporter-data');
      if (!response.ok) throw new Error('Failed to fetch exporters');
      const data: Company[] = await response.json();
      setCompanies(data);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Fetch Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExporters();
  }, []);

  const handleSaveCompany = async (values: ExporterFormValues) => {
    const isEditing = !!companyToEdit;
    const url = isEditing ? `/api/v2/exporter-data?id=${companyToEdit!.id}` : '/api/v2/exporter-data';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${isEditing ? 'update' : 'save'} exporter.`);
      }

      toast({ title: `Exporter ${isEditing ? 'Updated' : 'Saved'}`, description: `${values.companyName} has been successfully saved.` });
      setCompanyToEdit(null);
      await fetchExporters(); // Refetch the list
    } catch (error: any) {
      toast({ variant: "destructive", title: "Save Error", description: error.message });
    }
  };

  const handleEditCompany = (id: string) => {
    const company = companies.find(c => c.id === id);
    if (company) {
      setCompanyToEdit(company);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCancelEdit = () => {
    setCompanyToEdit(null);
  };

  const handleDeleteCompany = async (id: string) => {
    try {
        const response = await fetch(`/api/v2/exporter-data?id=${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error((await response.json()).message || 'Failed to delete exporter.');
        toast({ title: "Exporter Deleted", description: "The exporter has been marked as deleted." });
        await fetchExporters();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Delete Error", description: error.message });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Loading exporter data...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          <ExporterFormV2 
            onSave={handleSaveCompany}
            initialData={companyToEdit}
            isEditing={!!companyToEdit}
            onCancelEdit={handleCancelEdit}
          />
        </div>
        <ExporterListV2
          companies={companies}
          onEditCompany={handleEditCompany}
          onDeleteCompany={handleDeleteCompany}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} HEMITH ERP. All rights reserved.
      </footer>
    </div>
  );
}
