
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { SizeFormV2, type SizeFormValues } from "@/components/v2/size-form";
import { SizeListV2 } from "@/components/v2/size-list";
import type { Size } from "@/types/size";
import { useToast } from "@/hooks/use-toast";

export default function SizePageV2() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [sizes, setSizes] = useState<Size[]>([]);
  const [sizeToEdit, setSizeToEdit] = useState<Size | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSizes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v2/size-data');
      if (!response.ok) {
        throw new Error('Failed to fetch sizes');
      }
      const data: Size[] = await response.json();
      setSizes(data);
    } catch (error: any) {
      console.error("Failed to fetch sizes from API", error);
      toast({
        variant: "destructive",
        title: "Fetch Error",
        description: error.message || "Could not load sizes from the database.",
      });
      setSizes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSizes();
  }, [toast]);

  const handleSaveSize = async (values: SizeFormValues) => {
    const isEditing = !!sizeToEdit;
    const url = isEditing ? `/api/v2/size-data?id=${sizeToEdit!.id}` : '/api/v2/size-data';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${isEditing ? 'update' : 'save'} size.`);
      }
      
      toast({ title: `Size ${isEditing ? 'Updated' : 'Saved'}`, description: `Size ${values.size} has been successfully saved.` });
      setSizeToEdit(null);
      await fetchSizes();
      
    } catch (error: any) {
      console.error("Failed to save size via API", error);
      toast({
        variant: "destructive",
        title: "Save Error",
        description: error.message || "An unknown error occurred.",
      });
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
  
  const handleDeleteSize = async (id: string) => {
    try {
        const response = await fetch(`/api/v2/size-data?id=${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error((await response.json()).message || 'Failed to delete size.');
        toast({ title: "Size Deleted", description: "The size has been marked as deleted." });
        await fetchSizes();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Delete Error", description: error.message });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Loading size data from database...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          <SizeFormV2 
            onSave={handleSaveSize}
            initialData={sizeToEdit}
            isEditing={!!sizeToEdit}
            onCancelEdit={handleCancelEdit}
          />
        </div>
        <SizeListV2 
          sizes={sizes}
          onEditSize={handleEditSize}
          onDeleteSize={handleDeleteSize}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} HEMITH ERP. All rights reserved. (V2 - MySQL)
      </footer>
    </div>
  );
}
