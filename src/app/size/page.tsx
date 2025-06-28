
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { SizeForm, type SizeFormValues } from "@/components/size-form";
import { SizeList } from "@/components/size-list";
import type { Size } from "@/types/size";
import type { Product } from "@/types/product";
import type { PerformaInvoice } from "@/types/performa-invoice";
import type { PurchaseOrder } from "@/types/purchase-order";
import { useToast } from "@/hooks/use-toast";

const LOCAL_STORAGE_KEY = "bizform_sizes";

export default function SizePage() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [sizes, setSizes] = useState<Size[]>([]);
  const [sizeToEdit, setSizeToEdit] = useState<Size | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedSizes = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedSizes) {
          setSizes(JSON.parse(storedSizes).filter((s: Size) => !s.isDeleted));
        }
      } catch (error) {
        console.error("Failed to parse sizes from localStorage", error);
        setSizes([]);
      }
    }
  }, []);

  const handleSaveSize = (values: SizeFormValues) => {
    const allSizesRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const allSizes: Size[] = allSizesRaw ? JSON.parse(allSizesRaw) : [];

    if (sizeToEdit) {
      const updatedSizes = allSizes.map(s => 
        s.id === sizeToEdit.id ? { ...s, ...values } : s
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedSizes));
      setSizes(updatedSizes.filter(s => !s.isDeleted));
      toast({ title: "Size Updated", description: `Size ${values.size} has been successfully updated.` });
      setSizeToEdit(null);
    } else {
      const newSize: Size = { id: Date.now().toString(), ...values };
      const updatedSizes = [...allSizes, newSize];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedSizes));
      setSizes(updatedSizes.filter(s => !s.isDeleted));
      toast({ title: "Size Saved", description: `Size ${values.size} has been successfully saved.` });
    }
  };
  
  const handleEditSize = (id: string) => {
    const size = sizes.find(s => s.id === id);
    if (size) {
      setSizeToEdit(size);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCancelEdit = () => {
    setSizeToEdit(null);
  };

  const handleDeleteSize = (id: string) => {
    const products: Product[] = JSON.parse(localStorage.getItem('bizform_products') || '[]');
    const performaInvoices: PerformaInvoice[] = JSON.parse(localStorage.getItem('bizform_performa_invoices') || '[]');
    const purchaseOrders: PurchaseOrder[] = JSON.parse(localStorage.getItem('bizform_purchase_orders') || '[]');

    const isUsed = 
      products.some(p => p.sizeId === id && !p.isDeleted) ||
      performaInvoices.some(pi => pi.items.some(item => item.sizeId === id) && !pi.isDeleted) ||
      purchaseOrders.some(po => po.sizeId === id && !po.isDeleted);

    if (isUsed) {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "This size is used in a Product, Performa Invoice, or Purchase Order. Please remove its references before deleting.",
      });
      return;
    }

    const allSizesRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const allSizes: Size[] = allSizesRaw ? JSON.parse(allSizesRaw) : [];
    
    const updatedSizes = allSizes.map(s => 
      s.id === id ? { ...s, isDeleted: true } : s
    );
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedSizes));
    setSizes(updatedSizes.filter(s => !s.isDeleted));
    toast({ title: "Size Deleted", description: "The size has been marked as deleted." });
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
          <SizeForm 
            onSave={handleSaveSize}
            initialData={sizeToEdit}
            isEditing={!!sizeToEdit}
            onCancelEdit={handleCancelEdit}
          />
        </div>
        <SizeList 
          sizes={sizes} 
          onEditSize={handleEditSize}
          onDeleteSize={handleDeleteSize}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} HEMITH ERP. All rights reserved.
      </footer>
    </div>
  );
}
