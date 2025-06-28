
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { CompanyForm, type CompanyFormValues } from "@/components/company-form";
import { CompanyList } from "@/components/company-list";
import type { Company } from "@/types/company";
import type { PerformaInvoice } from "@/types/performa-invoice";
import type { PurchaseOrder } from "@/types/purchase-order";
import type { ExportDocument } from "@/types/export-document";
import { useToast } from "@/hooks/use-toast";

const LOCAL_STORAGE_KEY = "bizform_companies";

export default function ExporterPage() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      const storedCompanies = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedCompanies) {
        setCompanies(JSON.parse(storedCompanies).filter((c: Company) => !c.isDeleted));
      }
    }
  }, []);

  const handleSaveCompany = (values: CompanyFormValues) => {
    const allCompaniesRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const allCompanies: Company[] = allCompaniesRaw ? JSON.parse(allCompaniesRaw) : [];

    if (companyToEdit) {
      // Update logic
      const updatedCompanies = allCompanies.map(c => 
        c.id === companyToEdit.id ? { ...c, ...values } : c
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedCompanies));
      setCompanies(updatedCompanies.filter(c => !c.isDeleted));
      toast({ title: "Company Updated", description: `${values.companyName} has been successfully updated.` });
      setCompanyToEdit(null);
    } else {
      // Create new logic
      const newCompany: Company = { id: Date.now().toString(), ...values };
      const updatedCompanies = [...allCompanies, newCompany];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedCompanies));
      setCompanies(updatedCompanies.filter(c => !c.isDeleted));
      toast({ title: "Company Saved", description: `${values.companyName} has been successfully saved.` });
    }
  };

  const handleEditCompany = (id: string) => {
    const company = companies.find(c => c.id === id);
    if (company) {
      setCompanyToEdit(company);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCancelEdit = () => {
    setCompanyToEdit(null);
  };

  const handleDeleteCompany = (id: string) => {
    // Dependency checks
    const performaInvoices: PerformaInvoice[] = JSON.parse(localStorage.getItem('bizform_performa_invoices') || '[]');
    const purchaseOrders: PurchaseOrder[] = JSON.parse(localStorage.getItem('bizform_purchase_orders') || '[]');
    const exportDocuments: ExportDocument[] = JSON.parse(localStorage.getItem('bizform_export_documents_v2') || '[]');

    const isUsed = 
      performaInvoices.some(pi => pi.exporterId === id && !pi.isDeleted) ||
      purchaseOrders.some(po => po.exporterId === id && !po.isDeleted) ||
      exportDocuments.some(ed => ed.exporterId === id && !ed.isDeleted);
    
    if (isUsed) {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "This exporter is being used in a Performa Invoice, Purchase Order, or Export Document. Please remove its references before deleting.",
      });
      return;
    }

    const allCompaniesRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const allCompanies: Company[] = allCompaniesRaw ? JSON.parse(allCompaniesRaw) : [];
    
    const updatedCompanies = allCompanies.map(c => 
      c.id === id ? { ...c, isDeleted: true } : c
    );
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedCompanies));
    setCompanies(updatedCompanies.filter(c => !c.isDeleted));
    toast({ title: "Company Deleted", description: "The company has been marked as deleted." });
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
        <div ref={formRef}>
          <CompanyForm 
            onSave={handleSaveCompany}
            initialData={companyToEdit}
            isEditing={!!companyToEdit}
            onCancelEdit={handleCancelEdit}
          />
        </div>
        <CompanyList 
          companies={companies}
          onEditCompany={handleEditCompany}
          onDeleteCompany={handleDeleteCompany}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} HEMITH ERP. All rights reserved.
      </footer>
    </div>
  );
}
