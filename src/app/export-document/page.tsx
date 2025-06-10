
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/layout/header";
import { ExportDocumentForm } from "@/components/export-document-form";
// We'll add ExportDocumentList later if needed, for now, just the form.
import type { ExportDocument } from "@/types/export-document";
import type { PurchaseOrder } from "@/types/purchase-order";
import type { PerformaInvoice } from "@/types/performa-invoice";
import type { Company } from "@/types/company";
import type { Client } from "@/types/client";
import type { Manufacturer } from "@/types/manufacturer";
import type { Size } from "@/types/size";
import type { Product } from "@/types/product";
import type { Bank } from "@/types/bank";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const LOCAL_STORAGE_EXPORT_DOCS_KEY = "bizform_export_documents";
const LOCAL_STORAGE_PO_KEY = "bizform_purchase_orders";
const LOCAL_STORAGE_PI_KEY = "bizform_performa_invoices";
const LOCAL_STORAGE_COMPANIES_KEY = "bizform_companies"; // Exporters
const LOCAL_STORAGE_CLIENTS_KEY = "bizform_clients";
const LOCAL_STORAGE_MANUFACTURERS_KEY = "bizform_manufacturers";
const LOCAL_STORAGE_SIZES_KEY = "bizform_sizes";
const LOCAL_STORAGE_PRODUCTS_KEY = "bizform_products";
const LOCAL_STORAGE_BANKS_KEY = "bizform_banks";

export default function ExportDocumentPage() {
  const { toast } = useToast();

  const [exportDocuments, setExportDocuments] = useState<ExportDocument[]>([]);
  // Master data states
  const [allPOs, setAllPOs] = useState<PurchaseOrder[]>([]);
  const [allPIs, setAllPIs] = useState<PerformaInvoice[]>([]);
  const [allExporters, setAllExporters] = useState<Company[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allManufacturers, setAllManufacturers] = useState<Manufacturer[]>([]);
  const [allSizes, setAllSizes] = useState<Size[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allBanks, setAllBanks] = useState<Bank[]>([]);

  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [docToEdit, setDocToEdit] = useState<ExportDocument | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Placeholder for next invoice number generation if needed
  // const getNextExportInvoiceNumber = useCallback((docs: ExportDocument[]): string => {
  //   // Implement logic if auto-numbering is desired, e.g., EXP/24-25/001
  //   return `EXP/${new Date().getFullYear().toString().slice(-2)}-${(new Date().getFullYear() + 1).toString().slice(-2)}/${docs.length + 1}`;
  // }, []);
  // const [nextExportInvoiceNumber, setNextExportInvoiceNumber] = useState("");


  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedDocs = localStorage.getItem(LOCAL_STORAGE_EXPORT_DOCS_KEY);
        const currentDocs: ExportDocument[] = storedDocs ? JSON.parse(storedDocs).map((doc: any) => ({
          ...doc,
          exportInvoiceDate: new Date(doc.exportInvoiceDate),
          containers: (doc.containers || []).map((container: any) => ({
            ...container,
            weighingDateTime: container.weighingDateTime ? new Date(container.weighingDateTime) : undefined,
          })),
        })) : [];
        setExportDocuments(currentDocs);
        // setNextExportInvoiceNumber(getNextExportInvoiceNumber(currentDocs));

        // Load master data
        setAllPOs(JSON.parse(localStorage.getItem(LOCAL_STORAGE_PO_KEY) || "[]").map((po:any)=>({...po, poDate: new Date(po.poDate)})));
        setAllPIs(JSON.parse(localStorage.getItem(LOCAL_STORAGE_PI_KEY) || "[]").map((pi:any)=>({...pi, invoiceDate: new Date(pi.invoiceDate)})));
        setAllExporters(JSON.parse(localStorage.getItem(LOCAL_STORAGE_COMPANIES_KEY) || "[]"));
        setAllClients(JSON.parse(localStorage.getItem(LOCAL_STORAGE_CLIENTS_KEY) || "[]"));
        setAllManufacturers(JSON.parse(localStorage.getItem(LOCAL_STORAGE_MANUFACTURERS_KEY) || "[]").map((m:any)=>({...m, stuffingPermissionDate: m.stuffingPermissionDate ? new Date(m.stuffingPermissionDate) : undefined })));
        setAllSizes(JSON.parse(localStorage.getItem(LOCAL_STORAGE_SIZES_KEY) || "[]"));
        setAllProducts(JSON.parse(localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY) || "[]"));
        setAllBanks(JSON.parse(localStorage.getItem(LOCAL_STORAGE_BANKS_KEY) || "[]"));

      } catch (error) {
        console.error("Failed to parse data from localStorage", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load data. Check console." });
        setExportDocuments([]);
        // setNextExportInvoiceNumber(getNextExportInvoiceNumber([]));
        // Reset master data states on error
        setAllPOs([]); setAllPIs([]); setAllExporters([]); setAllClients([]);
        setAllManufacturers([]); setAllSizes([]); setAllProducts([]); setAllBanks([]);
      } finally {
        setIsLoading(false);
      }
    }
  }, [toast]); // Removed getNextExportInvoiceNumber from deps for now

  const handleSaveExportDocument = (docData: ExportDocument) => {
    let updatedDocs;
    if (docToEdit) {
      updatedDocs = exportDocuments.map(doc =>
        doc.id === docToEdit.id ? { ...docData, id: docToEdit.id } : doc
      );
      setDocToEdit(null);
    } else {
      updatedDocs = [...exportDocuments, docData];
    }
    setExportDocuments(updatedDocs);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_EXPORT_DOCS_KEY, JSON.stringify(updatedDocs));
    }
    // if (!docToEdit) {
    //   setNextExportInvoiceNumber(getNextExportInvoiceNumber(updatedDocs));
    // }
  };
  
  // Placeholder for Edit/Delete logic if a list is added later
  // const handleEditDocument = (docIdToEdit: string) => { ... };
  // const handleDeleteDocument = (docIdToDelete: string) => { ... };
  // const handleCancelEdit = () => { setDocToEdit(null); };

  if (!isClient || isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Loading export document data...</div>
        </main>
      </div>
    );
  }
  
  // Check if essential master data for form is available
  const canCreateOrEdit = allPOs.length > 0 && allExporters.length > 0 && allClients.length > 0 && allManufacturers.length > 0 && allSizes.length > 0 && allProducts.length > 0 && allBanks.length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          {canCreateOrEdit ? (
            <ExportDocumentForm
              // initialData={docToEdit} // Enable when edit functionality is complete
              // isEditing={!!docToEdit} // Enable when edit functionality is complete
              initialData={null} // For now, always new
              isEditing={false} // For now, always new
              onSave={handleSaveExportDocument}
              // onCancelEdit={handleCancelEdit} // Enable when edit functionality is complete
              // nextExportInvoiceNumber={nextExportInvoiceNumber} // Pass if auto-numbering is used
            />
          ) : (
             <Card className="w-full max-w-2xl mx-auto shadow-xl mb-8">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Cannot Create Export Document</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  To create an Export Document, please ensure you have added at least one of each of the following:
                </p>
                <ul className="list-disc list-inside mt-2 text-muted-foreground">
                  {allPOs.length === 0 && <li>Purchase Order (on the Purchase Order page, from a Performa Invoice)</li>}
                  {allExporters.length === 0 && <li>Exporter (on the Exporter page)</li>}
                  {allClients.length === 0 && <li>Client (on the Client page)</li>}
                  {allManufacturers.length === 0 && <li>Manufacturer (on the Manufacturer page)</li>}
                  {allSizes.length === 0 && <li>Size (on the Size page)</li>}
                  {allProducts.length === 0 && <li>Product (on the Product page)</li>}
                  {allBanks.length === 0 && <li>Bank (on the Bank page)</li>}
                </ul>
                 <p className="mt-4 text-sm text-muted-foreground">
                  Please add the required information on the respective pages under the "ADD" or "SALE" menu.
                  Export Documents are typically initiated by selecting an existing Purchase Order.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
        {/* 
        <ExportDocumentList 
          documents={exportDocuments}
          // Pass necessary lookup data (exporters, clients, etc.)
          // onDeleteDocument={handleDeleteDocument}
          // onEditDocument={handleEditDocument}
        /> 
        */}
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} BizForm. All rights reserved.
      </footer>
    </div>
  );
}
    