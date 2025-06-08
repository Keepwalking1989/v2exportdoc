
"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { SizeForm } from "@/components/size-form";
import { SizeList } from "@/components/size-list";
import type { Size } from "@/types/size";

const LOCAL_STORAGE_KEY = "bizform_sizes";

export default function SizePage() {
  const [sizes, setSizes] = useState<Size[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedSizes = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedSizes) {
          setSizes(JSON.parse(storedSizes));
        }
      } catch (error) {
        console.error("Failed to parse sizes from localStorage", error);
        setSizes([]);
      }
    }
  }, []);

  const handleSaveSize = (newSize: Size) => {
    const updatedSizes = [...sizes, newSize];
    setSizes(updatedSizes);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedSizes));
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
        <SizeForm onSave={handleSaveSize} />
        <SizeList sizes={sizes} />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} BizForm. All rights reserved.
      </footer>
    </div>
  );
}
