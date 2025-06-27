
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { PalletForm, type PalletFormValues } from "@/components/pallet-form";
import { PalletList } from "@/components/pallet-list";
import type { Pallet } from "@/types/pallet";
import { useToast } from "@/hooks/use-toast";

const LOCAL_STORAGE_KEY = "bizform_pallets";

export default function PalletPage() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);
  
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [palletToEdit, setPalletToEdit] = useState<Pallet | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedPallets = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedPallets) {
          setPallets(JSON.parse(storedPallets).filter((p: Pallet) => !p.isDeleted));
        }
      } catch (error) {
        console.error("Failed to parse pallets from localStorage", error);
        setPallets([]);
      }
    }
  }, []);

  const handleSavePallet = (values: PalletFormValues) => {
    const allPalletsRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const allPallets: Pallet[] = allPalletsRaw ? JSON.parse(allPalletsRaw) : [];

    if (palletToEdit) {
      const updatedPallets = allPallets.map(p => 
        p.id === palletToEdit.id ? { ...p, ...values } : p
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedPallets));
      setPallets(updatedPallets.filter(p => !p.isDeleted));
      toast({ title: "Pallet Company Updated", description: `${values.companyName} has been successfully updated.` });
      setPalletToEdit(null);
    } else {
      const newPallet: Pallet = { id: Date.now().toString(), ...values };
      const updatedPallets = [...allPallets, newPallet];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedPallets));
      setPallets(updatedPallets.filter(p => !p.isDeleted));
      toast({ title: "Pallet Company Saved", description: `${values.companyName} has been successfully saved.` });
    }
  };
  
  const handleEditPallet = (id: string) => {
    const pallet = pallets.find(p => p.id === id);
    if (pallet) {
      setPalletToEdit(pallet);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCancelEdit = () => {
    setPalletToEdit(null);
  };
  
  const handleDeletePallet = (id: string) => {
    // No dependency checks for Pallet yet
    const allPalletsRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const allPallets: Pallet[] = allPalletsRaw ? JSON.parse(allPalletsRaw) : [];
    
    const updatedPallets = allPallets.map(p => 
      p.id === id ? { ...p, isDeleted: true } : p
    );
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedPallets));
    setPallets(updatedPallets.filter(p => !p.isDeleted));
    toast({ title: "Pallet Company Deleted", description: "The pallet company has been marked as deleted." });
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
          <PalletForm 
            onSave={handleSavePallet} 
            initialData={palletToEdit}
            isEditing={!!palletToEdit}
            onCancelEdit={handleCancelEdit}
          />
        </div>
        <PalletList 
          pallets={pallets}
          onEditPallet={handleEditPallet}
          onDeletePallet={handleDeletePallet}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} BizForm. All rights reserved.
      </footer>
    </div>
  );
}
