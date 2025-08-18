
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { SupplierFormV2, type SupplierFormValues } from "@/components/v2/supplier-form";
import { SupplierListV2 } from "@/components/v2/supplier-list";
import type { Supplier } from "@/types/supplier";
import { useToast } from "@/hooks/use-toast";

export default function SupplierPageV2() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v2/supplier-data');
      if (!response.ok) {
        throw new Error('Failed to fetch suppliers');
      }
      const data: Supplier[] = await response.json();
      setSuppliers(data);
    } catch (error: any) {
      console.error("Failed to fetch suppliers from API", error);
      toast({
        variant: "destructive",
        title: "Fetch Error",
        description: error.message || "Could not load suppliers from the database.",
      });
      setSuppliers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [toast]);

  const handleSaveSupplier = async (values: SupplierFormValues) => {
    const isEditing = !!supplierToEdit;
    const url = isEditing ? `/api/v2/supplier-data?id=${supplierToEdit!.id}` : '/api/v2/supplier-data';
    const method = isEditing ? 'PUT' : 'POST';
    
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${isEditing ? 'update' : 'save'} supplier.`);
      }
      
      toast({ title: `Supplier ${isEditing ? 'Updated' : 'Saved'}`, description: `${values.companyName} has been successfully saved.` });
      setSupplierToEdit(null);
      await fetchSuppliers();
      
    } catch (error: any) {
      console.error("Failed to save supplier via API", error);
      toast({
        variant: "destructive",
        title: "Save Error",
        description: error.message || "An unknown error occurred.",
      });
    }
  };

  const handleEditSupplier = (id: string) => {
    const supplier = suppliers.find(s => s.id === id);
    if (supplier) {
      setSupplierToEdit(supplier);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  
  const handleCancelEdit = () => {
    setSupplierToEdit(null);
  };
  
  const handleDeleteSupplier = async (id: string) => {
    try {
        const response = await fetch(`/api/v2/supplier-data?id=${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error((await response.json()).message || 'Failed to delete supplier.');
        toast({ title: "Supplier Deleted", description: "The supplier has been marked as deleted." });
        await fetchSuppliers();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Delete Error", description: error.message });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Loading supplier data from database...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          <SupplierFormV2 
            onSave={handleSaveSupplier}
            initialData={supplierToEdit}
            isEditing={!!supplierToEdit}
            onCancelEdit={handleCancelEdit}
          />
        </div>
        <SupplierListV2 
          suppliers={suppliers}
          onEditSupplier={handleEditSupplier}
          onDeleteSupplier={handleDeleteSupplier}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} HEMITH ERP. All rights reserved. (V2 - MySQL)
      </footer>
    </div>
  );
}
