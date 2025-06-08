
"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { BankForm } from "@/components/bank-form";
import { BankList } from "@/components/bank-list";
import type { Bank } from "@/types/bank";

const LOCAL_STORAGE_KEY = "bizform_banks";

export default function BankPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedBanks = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedBanks) {
          setBanks(JSON.parse(storedBanks));
        }
      } catch (error) {
        console.error("Failed to parse banks from localStorage", error);
        setBanks([]);
      }
    }
  }, []);

  const handleSaveBank = (newBank: Bank) => {
    const updatedBanks = [...banks, newBank];
    setBanks(updatedBanks);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedBanks));
    }
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
        <BankForm onSave={handleSaveBank} />
        <BankList banks={banks} />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} BizForm. All rights reserved.
      </footer>
    </div>
  );
}
