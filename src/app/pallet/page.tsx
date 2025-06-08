
"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { PalletForm } from "@/components/pallet-form";
import { PalletList } from "@/components/pallet-list";
import type { Pallet } from "@/types/pallet";

const LOCAL_STORAGE_KEY = "bizform_pallets";

export default function PalletPage() {
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedPallets = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedPallets) {
          setPallets(JSON.parse(storedPallets));
        }
      } catch (error) {
        console.error("Failed to parse pallets from localStorage", error);
        setPallets([]);
      }
    }
  }, []);

  const handleSavePallet = (newPallet: Pallet) => {
    const updatedPallets = [...pallets, newPallet];
    setPallets(updatedPallets);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedPallets));
    }
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
        <PalletForm onSave={handleSavePallet} />
        <PalletList pallets={pallets} />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} BizForm. All rights reserved.
      </footer>
    </div>
  );
}
