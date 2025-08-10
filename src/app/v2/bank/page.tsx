
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { BankFormV2, type BankFormValues } from "@/components/v2/bank-form";
import { BankListV2 } from "@/components/v2/bank-list";
import type { Bank } from "@/types/bank";
import { useToast } from "@/hooks/use-toast";

export default function BankPageV2() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);
  
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankToEdit, setBankToEdit] = useState<Bank | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch banks from the API
  useEffect(() => {
    const fetchBanks = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/v2/bank-data');
        if (!response.ok) {
          throw new Error('Failed to fetch banks');
        }
        const data: Bank[] = await response.json();
        setBanks(data);
      } catch (error) {
        console.error("Failed to fetch banks from API", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load banks from the database.",
        });
        setBanks([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBanks();
  }, [toast]);

  const handleSaveBank = async (values: BankFormValues) => {
    if (bankToEdit) {
      // TODO: Implement update logic
      console.log("Update logic to be implemented");
      toast({ title: "Bank Updated", description: `${values.bankName} has been successfully updated.` });
    } else {
      // Create new logic
      try {
        const response = await fetch('/api/v2/bank-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save bank');
        }
        const newBank: Bank = await response.json();
        setBanks(prev => [newBank, ...prev]);
        toast({ title: "Bank Saved", description: `${values.bankName} has been successfully saved to the database.` });
        
      } catch (error: any) {
        console.error("Failed to save bank via API", error);
        toast({
          variant: "destructive",
          title: "Error Saving Bank",
          description: error.message || "An unknown error occurred.",
        });
      }
    }
  };

  const handleEditBank = (id: string) => {
    const bank = banks.find(b => b.id === id);
    if (bank) {
      setBankToEdit(bank);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  
  const handleCancelEdit = () => {
    setBankToEdit(null);
  };
  
  const handleDeleteBank = (id: string) => {
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
          <div className="text-center text-muted-foreground">Loading bank data from database...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          <BankFormV2 
            onSave={handleSaveBank}
            initialData={bankToEdit}
            isEditing={!!bankToEdit}
            onCancelEdit={handleCancelEdit}
          />
        </div>
        <BankListV2 
          banks={banks}
          onEditBank={handleEditBank}
          onDeleteBank={handleDeleteBank}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} HEMITH ERP. All rights reserved. (V2 - MySQL)
      </footer>
    </div>
  );
}
