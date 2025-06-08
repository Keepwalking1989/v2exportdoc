"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { CompanyForm } from "@/components/company-form";
import { CompanyList } from "@/components/company-list";
import type { Company } from "@/types/company";

const LOCAL_STORAGE_KEY = "bizform_companies";

export default function Home() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      const storedCompanies = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedCompanies) {
        setCompanies(JSON.parse(storedCompanies));
      }
    }
  }, []);

  const handleSaveCompany = (newCompany: Company) => {
    const updatedCompanies = [...companies, newCompany];
    setCompanies(updatedCompanies);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedCompanies));
    }
  };
  
  // Render an empty state or loading indicator until client-side hydration is complete
  // to avoid hydration mismatch with localStorage.
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
        <CompanyForm onSave={handleSaveCompany} />
        <CompanyList companies={companies} />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} BizForm. All rights reserved.
      </footer>
    </div>
  );
}
