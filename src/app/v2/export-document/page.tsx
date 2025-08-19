
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { ExportDocumentFormV2 } from "@/components/v2/export-document-form";
import { ExportDocumentListV2 } from "@/components/v2/export-document-list";
import type { ExportDocument } from "@/types/export-document";
import type { PurchaseOrder } from "@/types/purchase-order";
import type { Company } from "@/types/company";
import type { Manufacturer } from "@/types/manufacturer";
import type { Transporter } from "@/types/transporter";
import type { Product } from "@/types/product";
import type { Size } from "@/types/size";
import type { Client } from "@/types/client";
import type { PerformaInvoice } from "@/types/performa-invoice";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ExportDocumentPageV2() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Data states
  const [exportDocuments, setExportDocuments] = useState<ExportDocument[]>([]);
  const [docToEdit, setDocToEdit] = useState<ExportDocument | null>(null);
  const [sourcePoIdForNew, setSourcePoIdForNew] = useState<string | null>(null);
  const [nextExportInvoiceNumber, setNextExportInvoiceNumber] = useState("");
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  // Dependency data
  const [allExporters, setAllExporters] = useState<Company[]>([]);
  const [allManufacturers, setAllManufacturers] = useState<Manufacturer[]>([]);
  const [allTransporters, setAllTransporters] = useState<Transporter[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allSizes, setAllSizes] = useState<Size[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allPerformaInvoices, setAllPerformaInvoices] = useState<PerformaInvoice[]>([]);
  const [allPurchaseOrders, setAllPurchaseOrders] = useState<PurchaseOrder[]>([]);

  const getNextExportInvoiceNumberInternal = useCallback((currentDocs: ExportDocument[], financialYear: string): string => {
    const prefix = `EXP/HEM/`;
    const yearSuffix = `/${financialYear}`;
    const invoiceNumbersThisYear = currentDocs
      .map(doc => doc.exportInvoiceNumber)
      .filter(num => num && num.startsWith(prefix) && num.endsWith(yearSuffix))
      .map(num => parseInt(num.substring(prefix.length, num.length - yearSuffix.length), 10))
      .filter(num => !isNaN(num))
      .sort((a, b) => b - a);
    const nextNum = (invoiceNumbersThisYear[0] || 0) + 1;
    return `${prefix}${nextNum.toString().padStart(3, '0')}${yearSuffix}`;
  }, []);
  
  const getCurrentIndianFinancialYear = (): string => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    return currentMonth >= 3 ? `${currentYear.toString().slice(-2)}-${(currentYear + 1).toString().slice(-2)}` : `${(currentYear - 1).toString().slice(-2)}-${currentYear.toString().slice(-2)}`;
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const responses = await Promise.all([
        fetch('/api/v2/export-document-data'), fetch('/api/v2/exporter-data'),
        fetch('/api/v2/manufacturer-data'), fetch('/api/v2/transporter-data'),
        fetch('/api/v2/product-data'), fetch('/api/v2/size-data'),
        fetch('/api/v2/client-data'), fetch('/api/v2/performa-invoice-data'),
        fetch('/api/v2/purchase-order-data')
      ]);
      const data = await Promise.all(responses.map(res => res.json()));
      
      const [docs, exporters, manufacturers, transporters, products, sizes, clients, performaInvoices, purchaseOrders] = data;
      
      setExportDocuments(docs);
      setAllExporters(exporters);
      setAllManufacturers(manufacturers);
      setAllTransporters(transporters);
      setAllProducts(products);
      setAllSizes(sizes);
      setAllClients(clients);
      setAllPerformaInvoices(performaInvoices);
      setAllPurchaseOrders(purchaseOrders);

      setNextExportInvoiceNumber(getNextExportInvoiceNumberInternal(docs, getCurrentIndianFinancialYear()));

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error loading data", description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast, getNextExportInvoiceNumberInternal]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const poId = searchParams.get("sourcePoId");
    const editId = searchParams.get("editDocId");
    
    if (poId) {
      setSourcePoIdForNew(poId);
      setDocToEdit(null);
      setShowForm(true);
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (editId) {
      const doc = exportDocuments.find(d => d.id === editId);
      if (doc) {
        setDocToEdit(doc);
        setSourcePoIdForNew(null);
        setShowForm(true);
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        toast({ variant: "destructive", title: "Not Found", description: "Export document to edit was not found." });
        router.replace('/v2/export-document');
      }
    } else {
      setDocToEdit(null);
      setSourcePoIdForNew(null);
      setShowForm(false);
    }
  }, [searchParams, exportDocuments, router, toast]);

  const handleSaveDocument = async (doc: ExportDocument) => {
    const isEditing = !!docToEdit;
    const url = isEditing ? `/api/v2/export-document-data?id=${docToEdit!.id}` : '/api/v2/export-document-data';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(doc) });
      if (!response.ok) throw new Error((await response.json()).message || 'Failed to save document');
      
      toast({ title: `Document ${isEditing ? 'Updated' : 'Created'}`, description: `Document ${doc.exportInvoiceNumber} saved successfully.` });
      router.replace('/v2/export-document', { scroll: false });
      await fetchData(); // Refresh data
    } catch (error: any) {
      toast({ variant: "destructive", title: "Save Failed", description: error.message });
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
        const response = await fetch(`/api/v2/export-document-data?id=${docId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error((await response.json()).message || 'Failed to delete document');
        toast({ title: "Document Deleted", description: "The export document has been marked as deleted." });
        await fetchData();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Delete Failed", description: error.message });
    }
  };

  const handleAddNewClick = () => {
    router.replace('/v2/export-document', { scroll: false });
    setShowForm(true);
    setDocToEdit(null);
    setSourcePoIdForNew(null);
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleCancelForm = () => {
    setShowForm(false);
    setDocToEdit(null);
    setSourcePoIdForNew(null);
    router.replace('/v2/export-document', { scroll: false });
  };

  const canCreateOrEdit = allExporters.length > 0 && allManufacturers.length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          {showForm ? (
            canCreateOrEdit ? (
              <ExportDocumentFormV2
                key={docToEdit?.id || sourcePoIdForNew || 'new-export-doc-v2'}
                initialData={docToEdit}
                isEditing={!!docToEdit}
                onSave={handleSaveDocument}
                onCancelEdit={handleCancelForm}
                nextExportInvoiceNumber={nextExportInvoiceNumber}
                allExporters={allExporters}
                allManufacturers={allManufacturers}
                allTransporters={allTransporters}
                allProducts={allProducts}
                allSizes={allSizes}
                allClients={allClients}
                allPerformaInvoices={allPerformaInvoices}
                allPurchaseOrders={allPurchaseOrders}
                sourcePoId={sourcePoIdForNew}
              />
            ) : (
              <Card className="w-full max-w-2xl mx-auto shadow-xl mb-8">
                <CardHeader><CardTitle className="font-headline text-2xl">Cannot Create Export Document</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">To create an Export Document, please ensure you have added at least one Exporter and one Manufacturer in the V2 sections.</p>
                </CardContent>
              </Card>
            )
          ) : (
            <div className="flex justify-end mb-4">
                <Button onClick={handleAddNewClick}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Export Document
                </Button>
            </div>
          )}
        </div>

        <ExportDocumentListV2
          documents={exportDocuments}
          allExporters={allExporters}
          allClients={allClients}
          allManufacturers={allManufacturers}
          onDeleteDocument={handleDeleteDocument}
          onEditDocument={(docId) => router.push(`/v2/export-document?editDocId=${docId}`)}
          onDownloadPdf={() => toast({ title: "PDF Generation", description: "PDF generation is handled on the Document Data page." })}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {currentYear} HEMITH ERP. All rights reserved. (V2 - MySQL)
      </footer>
    </div>
  );
}
