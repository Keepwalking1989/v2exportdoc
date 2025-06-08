
"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { ManufacturerForm } from "@/components/manufacturer-form";
import { ManufacturerList } from "@/components/manufacturer-list";
import type { Manufacturer } from "@/types/manufacturer";

const LOCAL_STORAGE_KEY = "bizform_manufacturers";

export default function ManufacturerPage() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedManufacturers = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedManufacturers) {
          // Ensure dates are parsed correctly
          const parsedManufacturers = JSON.parse(storedManufacturers).map((m: any) => ({
            ...m,
            stuffingPermissionDate: m.stuffingPermissionDate ? new Date(m.stuffingPermissionDate) : undefined,
          }));
          setManufacturers(parsedManufacturers);
        }
      } catch (error) {
        console.error("Failed to parse manufacturers from localStorage", error);
        setManufacturers([]); 
      }
    }
  }, []);

  const handleSaveManufacturer = (newManufacturer: Manufacturer) => {
    const updatedManufacturers = [...manufacturers, newManufacturer];
    setManufacturers(updatedManufacturers);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedManufacturers));
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
        <ManufacturerForm onSave={handleSaveManufacturer} />
        <ManufacturerList manufacturers={manufacturers} />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} BizForm. All rights reserved.
      </footer>
    </div>
  );
}
