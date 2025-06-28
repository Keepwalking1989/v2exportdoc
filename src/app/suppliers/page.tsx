
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { SupplierForm, type SupplierFormValues } from "@/components/supplier-form";
import { SupplierList } from "@/components/supplier-list";
import type { Supplier } from "@/types/supplier";
import { useToast } from "@/hooks/use-toast";

const LOCAL_STORAGE_KEY = "bizform_suppliers";

export default function SupplierPage() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedSuppliers = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedSuppliers) {
          setSuppliers(JSON.parse(storedSuppliers).filter((s: Supplier) => !s.isDeleted));
        }
      } catch (error) {
        console.error("Failed to parse suppliers from localStorage", error);
        setSuppliers([]);
      }
    }
  }, []);

  const handleSaveSupplier = (values: SupplierFormValues) => {
    const allSuppliersRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const allSuppliers: Supplier[] = allSuppliersRaw ? JSON.parse(allSuppliersRaw) : [];

    if (supplierToEdit) {
      const updatedSuppliers = allSuppliers.map(s => 
        s.id === supplierToEdit.id ? { ...s, ...values } : s
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedSuppliers));
      setSuppliers(updatedSuppliers.filter(s => !s.isDeleted));
      toast({ title: "Supplier Company Updated", description: `${values.companyName} has been successfully updated.` });
      setSupplierToEdit(null);
    } else {
      const newSupplier: Supplier = { id: Date.now().toString(), ...values };
      const updatedSuppliers = [...allSuppliers, newSupplier];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedSuppliers));
      setSuppliers(updatedSuppliers.filter(s => !s.isDeleted));
      toast({ title: "Supplier Company Saved", description: `${values.companyName} has been successfully saved.` });
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
    // No dependency checks for Supplier yet.
    // When a feature uses a supplier, a check should be added here.
    // e.g. const someDocs = JSON.parse(localStorage.getItem('some_docs_key') || '[]');
    // const isUsed = someDocs.some(doc => doc.supplierId === id);
    // if (isUsed) { ... toast error and return ... }
    
    const allSuppliersRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const allSuppliers: Supplier[] = allSuppliersRaw ? JSON.parse(allSuppliersRaw) : [];
    
    const updatedSuppliers = allSuppliers.map(s => 
      s.id === id ? { ...s, isDeleted: true } : s
    );
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedSuppliers));
    setSuppliers(updatedSuppliers.filter(s => !s.isDeleted));
    toast({ title: "Supplier Company Deleted", description: "The supplier company has been marked as deleted." });
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
          <SupplierForm 
            onSave={handleSaveSupplier} 
            initialData={supplierToEdit}
            isEditing={!!supplierToEdit}
            onCancelEdit={handleCancelEdit}
          />
        </div>
        <SupplierList 
          suppliers={suppliers}
          onEditSupplier={handleEditSupplier}
          onDeleteSupplier={handleDeleteSupplier}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} HEMITH ERP. All rights reserved.
      </footer>
    </div>
  );
}
