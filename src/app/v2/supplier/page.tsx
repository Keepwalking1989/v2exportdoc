
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

  // Fetch suppliers from the API
  useEffect(() => {
    const fetchSuppliers = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/v2/supplier-data');
        if (!response.ok) {
          throw new Error('Failed to fetch suppliers');
        }
        const data: Supplier[] = await response.json();
        setSuppliers(data);
      } catch (error) {
        console.error("Failed to fetch suppliers from API", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load suppliers from the database.",
        });
        setSuppliers([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSuppliers();
  }, [toast]);

  const handleSaveSupplier = async (values: SupplierFormValues) => {
    if (supplierToEdit) {
      // TODO: Implement update logic
      console.log("Update logic to be implemented");
      toast({ title: "Supplier Updated", description: `${values.companyName} has been successfully updated.` });
    } else {
      // Create new logic
      try {
        const response = await fetch('/api/v2/supplier-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save supplier');
        }
        const newSupplier: Supplier = await response.json();
        setSuppliers(prev => [newSupplier, ...prev]);
        toast({ title: "Supplier Saved", description: `${values.companyName} has been successfully saved to the database.` });
        
      } catch (error: any) {
        console.error("Failed to save supplier via API", error);
        toast({
          variant: "destructive",
          title: "Error Saving Supplier",
          description: error.message || "An unknown error occurred.",
        });
      }
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
  
  const handleDeleteSupplier = (id: string) => {
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
