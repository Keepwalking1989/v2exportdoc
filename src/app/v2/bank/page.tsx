
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

  const fetchBanks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v2/bank-data');
      if (!response.ok) {
        throw new Error('Failed to fetch banks');
      }
      const data: Bank[] = await response.json();
      setBanks(data);
    } catch (error: any) {
      console.error("Failed to fetch banks from API", error);
      toast({
        variant: "destructive",
        title: "Fetch Error",
        description: error.message || "Could not load banks from the database.",
      });
      setBanks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, [toast]);

  const handleSaveBank = async (values: BankFormValues) => {
    const isEditing = !!bankToEdit;
    const url = isEditing ? `/api/v2/bank-data?id=${bankToEdit!.id}` : '/api/v2/bank-data';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${isEditing ? 'update' : 'save'} bank.`);
      }
      
      toast({ title: `Bank ${isEditing ? 'Updated' : 'Saved'}`, description: `${values.bankName} has been successfully saved.` });
      setBankToEdit(null);
      await fetchBanks(); // Refetch the list to show the new/updated data
      
    } catch (error: any) {
      console.error("Failed to save bank via API", error);
      toast({
        variant: "destructive",
        title: "Save Error",
        description: error.message || "An unknown error occurred.",
      });
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
  
  const handleDeleteBank = async (id: string) => {
    try {
        const response = await fetch(`/api/v2/bank-data?id=${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error((await response.json()).message || 'Failed to delete bank.');
        toast({ title: "Bank Deleted", description: "The bank has been marked as deleted." });
        await fetchBanks();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Delete Error", description: error.message });
    }
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
