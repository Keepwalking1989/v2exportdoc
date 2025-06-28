
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { ManufacturerForm, type ManufacturerFormValues } from "@/components/manufacturer-form";
import { ManufacturerList } from "@/components/manufacturer-list";
import type { Manufacturer } from "@/types/manufacturer";
import type { PurchaseOrder } from "@/types/purchase-order";
import type { ExportDocument } from "@/types/export-document";
import { useToast } from "@/hooks/use-toast";

const LOCAL_STORAGE_KEY = "bizform_manufacturers";

export default function ManufacturerPage() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);
  
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [manufacturerToEdit, setManufacturerToEdit] = useState<Manufacturer | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedManufacturers = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedManufacturers) {
          const allManufacturers = JSON.parse(storedManufacturers);
          setManufacturers(allManufacturers.filter((m: Manufacturer) => !m.isDeleted).map((m: any) => ({
            ...m,
            stuffingPermissionDate: m.stuffingPermissionDate ? new Date(m.stuffingPermissionDate) : undefined,
          })));
        }
      } catch (error) {
        console.error("Failed to parse manufacturers from localStorage", error);
        setManufacturers([]); 
      }
    }
  }, []);

  const handleSaveManufacturer = (values: ManufacturerFormValues) => {
    const allManufacturersRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const allManufacturers: Manufacturer[] = allManufacturersRaw ? JSON.parse(allManufacturersRaw) : [];

    if (manufacturerToEdit) {
      // Update logic
      const updatedManufacturers = allManufacturers.map(m => 
        m.id === manufacturerToEdit.id ? { ...m, ...values } : m
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedManufacturers));
      setManufacturers(updatedManufacturers.filter(m => !m.isDeleted).map((m: any) => ({...m, stuffingPermissionDate: m.stuffingPermissionDate ? new Date(m.stuffingPermissionDate) : undefined})));
      toast({ title: "Manufacturer Updated", description: `${values.companyName} has been successfully updated.` });
      setManufacturerToEdit(null);
    } else {
      // Create new logic
      const newManufacturer: Manufacturer = { id: Date.now().toString(), ...values };
      const updatedManufacturers = [...allManufacturers, newManufacturer];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedManufacturers));
      setManufacturers(updatedManufacturers.filter(m => !m.isDeleted).map((m: any) => ({...m, stuffingPermissionDate: m.stuffingPermissionDate ? new Date(m.stuffingPermissionDate) : undefined})));
      toast({ title: "Manufacturer Saved", description: `${values.companyName} has been successfully saved.` });
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

  const handleDeleteManufacturer = (id: string) => {
    // Dependency checks
    const purchaseOrders: PurchaseOrder[] = JSON.parse(localStorage.getItem('bizform_purchase_orders') || '[]');
    const exportDocuments: ExportDocument[] = JSON.parse(localStorage.getItem('bizform_export_documents_v2') || '[]');

    const isUsed = 
      purchaseOrders.some(po => po.manufacturerId === id && !po.isDeleted) ||
      exportDocuments.some(ed => ed.manufacturerId === id); // Assuming export docs are not soft deleted

    if (isUsed) {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "This manufacturer is used in a Purchase Order or Export Document. Please remove its references before deleting.",
      });
      return;
    }

    const allManufacturersRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const allManufacturers: Manufacturer[] = allManufacturersRaw ? JSON.parse(allManufacturersRaw) : [];
    
    const updatedManufacturers = allManufacturers.map(m => 
      m.id === id ? { ...m, isDeleted: true } : m
    );
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedManufacturers));
    setManufacturers(updatedManufacturers.filter(m => !m.isDeleted).map((m: any) => ({...m, stuffingPermissionDate: m.stuffingPermissionDate ? new Date(m.stuffingPermissionDate) : undefined})));
    toast({ title: "Manufacturer Deleted", description: "The manufacturer has been marked as deleted." });
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
          <ManufacturerForm 
            onSave={handleSaveManufacturer}
            initialData={manufacturerToEdit}
            isEditing={!!manufacturerToEdit}
            onCancelEdit={handleCancelEdit}
          />
        </div>
        <ManufacturerList 
          manufacturers={manufacturers} 
          onEditManufacturer={handleEditManufacturer}
          onDeleteManufacturer={handleDeleteManufacturer}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} HEMITH ERP. All rights reserved.
      </footer>
    </div>
  );
}
