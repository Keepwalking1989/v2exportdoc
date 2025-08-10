
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { PalletFormV2, type PalletFormValues } from "@/components/v2/pallet-form";
import { PalletListV2 } from "@/components/v2/pallet-list";
import type { Pallet } from "@/types/pallet";
import { useToast } from "@/hooks/use-toast";

export default function PalletPageV2() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);
  
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [palletToEdit, setPalletToEdit] = useState<Pallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch pallets from the API
  useEffect(() => {
    const fetchPallets = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/v2/pallet-data');
        if (!response.ok) {
          throw new Error('Failed to fetch pallet suppliers');
        }
        const data: Pallet[] = await response.json();
        setPallets(data);
      } catch (error) {
        console.error("Failed to fetch pallets from API", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load pallet suppliers from the database.",
        });
        setPallets([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPallets();
  }, [toast]);

  const handleSavePallet = async (values: PalletFormValues) => {
    if (palletToEdit) {
      // TODO: Implement update logic
      console.log("Update logic to be implemented");
      toast({ title: "Pallet Supplier Updated", description: `${values.companyName} has been successfully updated.` });
    } else {
      // Create new logic
      try {
        const response = await fetch('/api/v2/pallet-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save pallet supplier');
        }
        const newPallet: Pallet = await response.json();
        setPallets(prev => [newPallet, ...prev]);
        toast({ title: "Pallet Supplier Saved", description: `${values.companyName} has been successfully saved to the database.` });
        
      } catch (error: any) {
        console.error("Failed to save pallet supplier via API", error);
        toast({
          variant: "destructive",
          title: "Error Saving Pallet Supplier",
          description: error.message || "An unknown error occurred.",
        });
      }
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
          <div className="text-center text-muted-foreground">Loading pallet supplier data from database...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          <PalletFormV2 
            onSave={handleSavePallet}
            initialData={palletToEdit}
            isEditing={!!palletToEdit}
            onCancelEdit={handleCancelEdit}
          />
        </div>
        <PalletListV2 
          pallets={pallets}
          onEditPallet={handleEditPallet}
          onDeletePallet={handleDeletePallet}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} HEMITH ERP. All rights reserved. (V2 - MySQL)
      </footer>
    </div>
  );
}

    