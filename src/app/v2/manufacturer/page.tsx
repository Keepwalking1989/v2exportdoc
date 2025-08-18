
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { ManufacturerFormV2, type ManufacturerFormValues } from "@/components/v2/manufacturer-form";
import { ManufacturerListV2 } from "@/components/v2/manufacturer-list";
import type { Manufacturer } from "@/types/manufacturer";
import { useToast } from "@/hooks/use-toast";

export default function ManufacturerPageV2() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);
  
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [manufacturerToEdit, setManufacturerToEdit] = useState<Manufacturer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchManufacturers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v2/manufacturer-data');
      if (!response.ok) {
        throw new Error('Failed to fetch manufacturers');
      }
      const data: Manufacturer[] = await response.json();
      setManufacturers(data.map(m => ({
        ...m,
        stuffingPermissionDate: new Date(m.stuffingPermissionDate),
      })));
    } catch (error: any) {
      console.error("Failed to fetch manufacturers from API", error);
      toast({
        variant: "destructive",
        title: "Fetch Error",
        description: error.message || "Could not load manufacturers from the database.",
      });
      setManufacturers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchManufacturers();
  }, [toast]);

  const handleSaveManufacturer = async (values: ManufacturerFormValues) => {
    const isEditing = !!manufacturerToEdit;
    const url = isEditing ? `/api/v2/manufacturer-data?id=${manufacturerToEdit!.id}` : '/api/v2/manufacturer-data';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${isEditing ? 'update' : 'save'} manufacturer.`);
      }
      
      toast({ title: `Manufacturer ${isEditing ? 'Updated' : 'Saved'}`, description: `${values.companyName} has been successfully saved.` });
      setManufacturerToEdit(null);
      await fetchManufacturers(); // Refetch the list
      
    } catch (error: any) {
      console.error("Failed to save manufacturer via API", error);
      toast({
        variant: "destructive",
        title: "Save Error",
        description: error.message || "An unknown error occurred.",
      });
    }
  };

  const handleEditManufacturer = (id: string) => {
    const manufacturer = manufacturers.find(m => m.id === id);
    if (manufacturer) {
      setManufacturerToEdit(manufacturer);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCancelEdit = () => {
    setManufacturerToEdit(null);
  };
  
  const handleDeleteManufacturer = async (id: string) => {
    try {
        const response = await fetch(`/api/v2/manufacturer-data?id=${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error((await response.json()).message || 'Failed to delete manufacturer.');
        toast({ title: "Manufacturer Deleted", description: "The manufacturer has been marked as deleted." });
        await fetchManufacturers();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Delete Error", description: error.message });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Loading manufacturer data from database...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          <ManufacturerFormV2 
            onSave={handleSaveManufacturer}
            initialData={manufacturerToEdit}
            isEditing={!!manufacturerToEdit}
            onCancelEdit={handleCancelEdit}
          />
        </div>
        <ManufacturerListV2
          manufacturers={manufacturers}
          onEditManufacturer={handleEditManufacturer}
          onDeleteManufacturer={handleDeleteManufacturer}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} HEMITH ERP. All rights reserved. (V2 - MySQL)
      </footer>
    </div>
  );
}
