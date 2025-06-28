
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { BankForm, type BankFormValues } from "@/components/bank-form";
import { BankList } from "@/components/bank-list";
import type { Bank } from "@/types/bank";
import type { PerformaInvoice } from "@/types/performa-invoice";
import { useToast } from "@/hooks/use-toast";

const LOCAL_STORAGE_KEY = "bizform_banks";

export default function BankPage() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankToEdit, setBankToEdit] = useState<Bank | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedBanks = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedBanks) {
          setBanks(JSON.parse(storedBanks).filter((b: Bank) => !b.isDeleted));
        }
      } catch (error) {
        console.error("Failed to parse banks from localStorage", error);
        setBanks([]);
      }
    }
  }, []);

  const handleSaveBank = (values: BankFormValues) => {
    const allBanksRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const allBanks: Bank[] = allBanksRaw ? JSON.parse(allBanksRaw) : [];

    if (bankToEdit) {
      const updatedBanks = allBanks.map(b => 
        b.id === bankToEdit.id ? { ...b, ...values } : b
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedBanks));
      setBanks(updatedBanks.filter(b => !b.isDeleted));
      toast({ title: "Bank Updated", description: `${values.bankName} has been successfully updated.` });
      setBankToEdit(null);
    } else {
      const newBank: Bank = { id: Date.now().toString(), ...values };
      const updatedBanks = [...allBanks, newBank];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedBanks));
      setBanks(updatedBanks.filter(b => !b.isDeleted));
      toast({ title: "Bank Saved", description: `${values.bankName} has been successfully saved.` });
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
    const performaInvoices: PerformaInvoice[] = JSON.parse(localStorage.getItem('bizform_performa_invoices') || '[]');
    const isUsed = performaInvoices.some(pi => pi.selectedBankId === id && !pi.isDeleted);
    
    if (isUsed) {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "This bank is used in a Performa Invoice. Please remove its references before deleting.",
      });
      return;
    }

    const allBanksRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const allBanks: Bank[] = allBanksRaw ? JSON.parse(allBanksRaw) : [];
    
    const updatedBanks = allBanks.map(b => 
      b.id === id ? { ...b, isDeleted: true } : b
    );
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedBanks));
    setBanks(updatedBanks.filter(b => !b.isDeleted));
    toast({ title: "Bank Deleted", description: "The bank has been marked as deleted." });
  };

  if (!isClient) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Loading bank data...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          <BankForm 
            onSave={handleSaveBank}
            initialData={bankToEdit}
            isEditing={!!bankToEdit}
            onCancelEdit={handleCancelEdit}
          />
        </div>
        <BankList 
          banks={banks} 
          onEditBank={handleEditBank}
          onDeleteBank={handleDeleteBank}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} HEMITH ERP. All rights reserved.
      </footer>
    </div>
  );
}
