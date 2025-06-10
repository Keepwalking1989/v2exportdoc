
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation"; // Import useSearchParams
import { Header } from "@/components/layout/header";
import { ExportDocumentForm } from "@/components/export-document-form";
import { ExportDocumentList } from "@/components/export-document-list";
import type { ExportDocument } from "@/types/export-document";
import type { PurchaseOrder } from "@/types/purchase-order";
import type { PerformaInvoice } from "@/types/performa-invoice";
import type { Company } from "@/types/company";
import type { Client } from "@/types/client";
import type { Manufacturer } from "@/types/manufacturer";
import type { Transporter } from "@/types/transporter"; // Import Transporter
import type { Size } from "@/types/size";
import type { Product } from "@/types/product";
import type { Bank } from "@/types/bank";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { generateExportDocumentPdf } from "@/lib/export-document-pdf";

const LOCAL_STORAGE_EXPORT_DOCS_KEY = "bizform_export_documents";
const LOCAL_STORAGE_PO_KEY = "bizform_purchase_orders";
const LOCAL_STORAGE_PI_KEY = "bizform_performa_invoices";
const LOCAL_STORAGE_COMPANIES_KEY = "bizform_companies"; // Exporters
const LOCAL_STORAGE_CLIENTS_KEY = "bizform_clients";
const LOCAL_STORAGE_MANUFACTURERS_KEY = "bizform_manufacturers";
const LOCAL_STORAGE_TRANSPORTERS_KEY = "bizform_transporters"; // Transporters
const LOCAL_STORAGE_SIZES_KEY = "bizform_sizes";
const LOCAL_STORAGE_PRODUCTS_KEY = "bizform_products";
const LOCAL_STORAGE_BANKS_KEY = "bizform_banks";

export default function ExportDocumentPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams(); // Initialize useSearchParams

  const [exportDocuments, setExportDocuments] = useState<ExportDocument[]>([]);
  // Master data states
  const [allPOs, setAllPOs] = useState<PurchaseOrder[]>([]);
  const [allPIs, setAllPIs] = useState<PerformaInvoice[]>([]);
  const [allExporters, setAllExporters] = useState<Company[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allManufacturers, setAllManufacturers] = useState<Manufacturer[]>([]);
  const [allTransporters, setAllTransporters] = useState<Transporter[]>([]); // Transporters state
  const [allSizes, setAllSizes] = useState<Size[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allBanks, setAllBanks] = useState<Bank[]>([]);

  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [docToEdit, setDocToEdit] = useState<ExportDocument | null>(null);
  const [sourcePoIdForNewDoc, setSourcePoIdForNewDoc] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedDocs = localStorage.getItem(LOCAL_STORAGE_EXPORT_DOCS_KEY);
        const currentDocs: ExportDocument[] = storedDocs ? JSON.parse(storedDocs).map((doc: any) => ({
          ...doc,
          manufacturerInvoiceDate: doc.manufacturerInvoiceDate ? new Date(doc.manufacturerInvoiceDate) : undefined,
          exportInvoiceDate: doc.exportInvoiceDate ? new Date(doc.exportInvoiceDate) : new Date(), // Ensure it's a Date
          exchangeRateDate: doc.exchangeRateDate ? new Date(doc.exchangeRateDate) : undefined,
          containers: (doc.containers || []).map((container: any) => ({
            ...container,
            weighingDateTime: container.weighingDateTime ? new Date(container.weighingDateTime) : undefined,
          })),
        })) : [];
        setExportDocuments(currentDocs);

        // Load master data
        setAllPOs(JSON.parse(localStorage.getItem(LOCAL_STORAGE_PO_KEY) || "[]").map((po:any)=>({...po, poDate: new Date(po.poDate)})));
        setAllPIs(JSON.parse(localStorage.getItem(LOCAL_STORAGE_PI_KEY) || "[]").map((pi:any)=>({...pi, invoiceDate: new Date(pi.invoiceDate)})));
        setAllExporters(JSON.parse(localStorage.getItem(LOCAL_STORAGE_COMPANIES_KEY) || "[]"));
        setAllClients(JSON.parse(localStorage.getItem(LOCAL_STORAGE_CLIENTS_KEY) || "[]"));
        setAllManufacturers(JSON.parse(localStorage.getItem(LOCAL_STORAGE_MANUFACTURERS_KEY) || "[]").map((m:any)=>({...m, stuffingPermissionDate: m.stuffingPermissionDate ? new Date(m.stuffingPermissionDate) : undefined })));
        setAllTransporters(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TRANSPORTERS_KEY) || "[]")); // Load Transporters
        setAllSizes(JSON.parse(localStorage.getItem(LOCAL_STORAGE_SIZES_KEY) || "[]"));
        setAllProducts(JSON.parse(localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY) || "[]"));
        setAllBanks(JSON.parse(localStorage.getItem(LOCAL_STORAGE_BANKS_KEY) || "[]"));

      } catch (error) {
        console.error("Failed to parse data from localStorage", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load data. Check console." });
        setExportDocuments([]);
        setAllPOs([]); setAllPIs([]); setAllExporters([]); setAllClients([]);
        setAllManufacturers([]); setAllTransporters([]); setAllSizes([]); setAllProducts([]); setAllBanks([]);
      } finally {
        setIsLoading(false);
      }
    }
  }, [toast]);
  
  useEffect(() => {
    if (isLoading) return; // Wait for master data to load

    const poIdFromUrl = searchParams.get("sourcePoId");
    const editDocIdFromUrl = searchParams.get("editDocId"); // For editing existing docs

    if (poIdFromUrl) {
      setSourcePoIdForNewDoc(poIdFromUrl);
      setDocToEdit(null); // Clear any edit state if creating from PO
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Optional: toast that form is pre-filled from PO
    } else if (editDocIdFromUrl) {
      const foundDoc = exportDocuments.find(doc => doc.id === editDocIdFromUrl);
      if (foundDoc) {
        setDocToEdit(foundDoc);
        setSourcePoIdForNewDoc(null); // Clear PO source if editing
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        toast({ title: "Editing Document", description: `Editing Export Document: ${foundDoc.exportInvoiceNumber}. Form pre-filled.`});
      } else {
        toast({ variant: "destructive", title: "Error", description: "Document not found for editing." });
      }
    } else {
      setSourcePoIdForNewDoc(null);
      setDocToEdit(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isLoading, exportDocuments]); // exportDocuments needed to find docToEdit

  const handleSaveExportDocument = (docData: ExportDocument) => {
    let updatedDocs;
    if (docToEdit) {
      updatedDocs = exportDocuments.map(doc =>
        doc.id === docToEdit.id ? { ...docData, id: docToEdit.id } : doc
      );
      setDocToEdit(null);
    } else {
      // Ensure new docs also have exportInvoiceDate as Date
      updatedDocs = [...exportDocuments, {...docData, exportInvoiceDate: new Date(docData.exportInvoiceDate)}];
    }
    setExportDocuments(updatedDocs);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_EXPORT_DOCS_KEY, JSON.stringify(updatedDocs));
    }
    // Reset sourcePoIdForNewDoc after saving to allow creating a blank new doc next
    setSourcePoIdForNewDoc(null);
    // Consider clearing form or redirecting based on UX preference
  };
  
  const handleEditDocument = (docIdToEdit: string) => {
    // Navigation to edit will be handled by router.push with query param `editDocId`
    // This function is primarily for the list item to trigger navigation
    // Or, if we want to keep state management on this page:
    const foundDoc = exportDocuments.find(doc => doc.id === docIdToEdit);
    if (foundDoc) {
      setDocToEdit(foundDoc);
      setSourcePoIdForNewDoc(null); // Clear PO source when editing
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast({ title: "Editing Document", description: `Editing Export Document: ${foundDoc.exportInvoiceNumber}. Form pre-filled.`});
    } else {
      toast({ variant: "destructive", title: "Error", description: "Document not found for editing." });
    }
  };

  const handleDeleteDocument = (docIdToDelete: string) => {
    const updatedDocs = exportDocuments.filter(doc => doc.id !== docIdToDelete);
    setExportDocuments(updatedDocs);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_EXPORT_DOCS_KEY, JSON.stringify(updatedDocs));
    }
    if (docToEdit && docToEdit.id === docIdToDelete) {
        setDocToEdit(null); 
    }
    toast({ title: "Document Deleted", description: "Export Document has been deleted." });
  };

  const handleCancelEdit = () => { 
    setDocToEdit(null); 
    setSourcePoIdForNewDoc(null); // Also clear PO source on cancel
    toast({ title: "Edit/Create Cancelled", description: "Form has been reset." });
    // Optionally, reset form fields via a key change on the form or form.reset() if form ref is available
  };

  const handleDownloadPdf = (docId: string) => {
    const docToDownload = exportDocuments.find(doc => doc.id === docId);
    if (!docToDownload) {
      toast({ variant: "destructive", title: "Error", description: "Export Document not found for download." });
      return;
    }

    const exporterDetails = allExporters.find(e => e.id === docToDownload.exporterId);
    const clientDetails = allClients.find(c => c.id === docToDownload.clientId);
    const manufacturerDetails = allManufacturers.find(m => m.id === docToDownload.manufacturerId);
    // Bank details are not part of the docData.selectedBankId anymore as per requirements
    // If bank details are still needed for PDF from PI, adjust logic here.
    // For now, passing undefined for bankDetails to the PDF generator.
    const relatedPI = allPIs.find(pi => pi.id === docToDownload.performaInvoiceId);
    const bankForPI = relatedPI ? allBanks.find(b => b.id === relatedPI.selectedBankId) : undefined;


    try {
      generateExportDocumentPdf(
        docToDownload,
        exporterDetails,
        clientDetails,
        manufacturerDetails,
        bankForPI, // Pass bank associated with the PI
        allSizes,
        allProducts
      );
      toast({ title: "PDF Generation Started", description: `PDF for ${docToDownload.exportInvoiceNumber} should begin downloading.`});
    } catch (error) {
        console.error("Error generating PDF:", error);
        toast({ variant: "destructive", title: "PDF Generation Error", description: "Could not generate PDF. See console for details."});
    }
  }


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
  
  const canCreateOrEdit = allPOs.length > 0 && allExporters.length > 0 && allClients.length > 0 && allManufacturers.length > 0 && allTransporters.length > 0 && allSizes.length > 0 && allProducts.length > 0 && allBanks.length > 0;

  // Determine if we should show the form (either creating new from PO, editing, or blank new)
  const showForm = sourcePoIdForNewDoc || docToEdit || (!sourcePoIdForNewDoc && !docToEdit); // Show form by default now

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          {showForm && canCreateOrEdit ? (
            <ExportDocumentForm
              key={docToEdit?.id || sourcePoIdForNewDoc || 'new-export-doc'} // Key to reset form when switching
              initialData={docToEdit}
              sourcePoId={sourcePoIdForNewDoc}
              isEditing={!!docToEdit}
              onSave={handleSaveExportDocument}
              onCancelEdit={handleCancelEdit}
              // Pass all necessary master data
              allPOs={allPOs}
              allPIs={allPIs}
              allExporters={allExporters}
              allClients={allClients}
              allManufacturers={allManufacturers}
              allTransporters={allTransporters}
              allSizes={allSizes}
              allProducts={allProducts}
              allBanks={allBanks}
            />
          ) : !canCreateOrEdit ? (
             <Card className="w-full max-w-2xl mx-auto shadow-xl mb-8">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Cannot Create Export Document</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  To create an Export Document, please ensure you have added at least one of each of the following:
                </p>
                <ul className="list-disc list-inside mt-2 text-muted-foreground">
                  {allPOs.length === 0 && <li>Purchase Order (on the Purchase Order page)</li>}
                  {allExporters.length === 0 && <li>Exporter (on the Exporter page)</li>}
                  {allClients.length === 0 && <li>Client (on the Client page)</li>}
                  {allManufacturers.length === 0 && <li>Manufacturer (on the Manufacturer page)</li>}
                  {allTransporters.length === 0 && <li>Transporter (on the Transporter page)</li>}
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
          ) : null /* Fallback, should not happen if showForm is true and canCreateOrEdit is true */ }
        </div>
        
        <ExportDocumentList 
          documents={exportDocuments}
          allExporters={allExporters}
          allClients={allClients}
          onDeleteDocument={handleDeleteDocument}
          onEditDocument={handleEditDocument} // For list to trigger edit mode on page
          onDownloadPdf={handleDownloadPdf}
        /> 
        
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} BizForm. All rights reserved.
      </footer>
    </div>
  );
}
    
