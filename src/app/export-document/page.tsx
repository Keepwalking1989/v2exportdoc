
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
// import { ExportDocumentForm } from "@/components/export-document-form"; // Will be created next
// import { ExportDocumentList } from "@/components/export-document-list"; // Will be created next
import type { ExportDocument } from "@/types/export-document";
import type { PurchaseOrder } from "@/types/purchase-order";
import type { PerformaInvoice } from "@/types/performa-invoice";
import type { Company } from "@/types/company"; // Exporters
import type { Client } from "@/types/client";
import type { Manufacturer } from "@/types/manufacturer";
import type { Transporter } from "@/types/transporter";
import type { Size } from "@/types/size";
import type { Product } from "@/types/product";
import type { Bank } from "@/types/bank";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
// import { generateExportDocumentPdf } from "@/lib/export-document-pdf"; // Will be created/updated later

const LOCAL_STORAGE_EXPORT_DOCS_KEY_V2 = "bizform_export_documents_v2";
const LOCAL_STORAGE_PO_KEY = "bizform_purchase_orders";
const LOCAL_STORAGE_PI_KEY = "bizform_performa_invoices";
const LOCAL_STORAGE_COMPANIES_KEY = "bizform_companies"; // Exporters
const LOCAL_STORAGE_CLIENTS_KEY = "bizform_clients";
const LOCAL_STORAGE_MANUFACTURERS_KEY = "bizform_manufacturers";
const LOCAL_STORAGE_TRANSPORTERS_KEY = "bizform_transporters";
const LOCAL_STORAGE_SIZES_KEY = "bizform_sizes";
const LOCAL_STORAGE_PRODUCTS_KEY = "bizform_products";
const LOCAL_STORAGE_BANKS_KEY = "bizform_banks";

export default function ExportDocumentPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);

  const [exportDocuments, setExportDocuments] = useState<ExportDocument[]>([]);
  // Master data states
  const [allPOs, setAllPOs] = useState<PurchaseOrder[]>([]);
  const [allPIs, setAllPIs] = useState<PerformaInvoice[]>([]);
  const [allExporters, setAllExporters] = useState<Company[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allManufacturers, setAllManufacturers] = useState<Manufacturer[]>([]);
  const [allTransporters, setAllTransporters] = useState<Transporter[]>([]);
  const [allSizes, setAllSizes] = useState<Size[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allBanks, setAllBanks] = useState<Bank[]>([]);

  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [docToEdit, setDocToEdit] = useState<ExportDocument | null>(null);
  const [sourcePoIdForNewDoc, setSourcePoIdForNewDoc] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedDocs = localStorage.getItem(LOCAL_STORAGE_EXPORT_DOCS_KEY_V2);
        const currentDocs: ExportDocument[] = storedDocs ? JSON.parse(storedDocs).map((doc: any) => ({
          ...doc,
          manufacturerInvoiceDate: doc.manufacturerInvoiceDate ? new Date(doc.manufacturerInvoiceDate) : undefined,
          exportInvoiceDate: new Date(doc.exportInvoiceDate), // Mandatory
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
        setAllManufacturers(JSON.parse(localStorage.getItem(LOCAL_STORAGE_MANUFACTURERS_KEY) || "[]").map((m:any)=>({...m, stuffingPermissionDate: new Date(m.stuffingPermissionDate) })));
        setAllTransporters(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TRANSPORTERS_KEY) || "[]"));
        setAllSizes(JSON.parse(localStorage.getItem(LOCAL_STORAGE_SIZES_KEY) || "[]"));
        setAllProducts(JSON.parse(localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY) || "[]"));
        setAllBanks(JSON.parse(localStorage.getItem(LOCAL_STORAGE_BANKS_KEY) || "[]"));

      } catch (error) {
        console.error("Failed to parse data from localStorage", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load data. Check console." });
        setExportDocuments([]);
        // Reset all master data states on error as well
        setAllPOs([]); setAllPIs([]); setAllExporters([]); setAllClients([]);
        setAllManufacturers([]); setAllTransporters([]); setAllSizes([]); setAllProducts([]); setAllBanks([]);
      } finally {
        setIsLoading(false);
      }
    }
  }, [toast]);
  
  useEffect(() => {
    if (isLoading) return;

    const poIdFromUrl = searchParams.get("sourcePoId");
    const editDocIdFromUrl = searchParams.get("editDocId");

    if (poIdFromUrl) {
      setSourcePoIdForNewDoc(poIdFromUrl);
      setDocToEdit(null);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast({ title: "New Export Document", description: `Pre-filling form from Purchase Order ID: ${poIdFromUrl}.`});
    } else if (editDocIdFromUrl) {
      const foundDoc = exportDocuments.find(doc => doc.id === editDocIdFromUrl);
      if (foundDoc) {
        setDocToEdit(foundDoc);
        setSourcePoIdForNewDoc(null);
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        toast({ title: "Editing Document", description: `Editing Export Document: ${foundDoc.exportInvoiceNumber}.`});
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
    } else {
      updatedDocs = [...exportDocuments, { ...docData, id: Date.now().toString() }];
    }
    setExportDocuments(updatedDocs);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_EXPORT_DOCS_KEY_V2, JSON.stringify(updatedDocs));
    }
    setDocToEdit(null);
    setSourcePoIdForNewDoc(null); 
    toast({ title: docToEdit ? "Document Updated" : "Document Saved", description: `Export Document ${docData.exportInvoiceNumber} has been ${docToEdit ? 'updated' : 'saved'}.` });
  };
  
  const handleEditDocument = (docIdToEdit: string) => {
    const foundDoc = exportDocuments.find(doc => doc.id === docIdToEdit);
    if (foundDoc) {
      setDocToEdit(foundDoc);
      setSourcePoIdForNewDoc(null);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Navigation will update searchParams, which useEffect will handle for toast/form state
    } else {
      toast({ variant: "destructive", title: "Error", description: "Document not found for editing." });
    }
  };

  const handleDeleteDocument = (docIdToDelete: string) => {
    const updatedDocs = exportDocuments.filter(doc => doc.id !== docIdToDelete);
    setExportDocuments(updatedDocs);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_EXPORT_DOCS_KEY_V2, JSON.stringify(updatedDocs));
    }
    if (docToEdit && docToEdit.id === docIdToDelete) {
        setDocToEdit(null); 
    }
    toast({ title: "Document Deleted", description: "Export Document has been deleted." });
  };

  const handleCancelEdit = () => { 
    setDocToEdit(null); 
    setSourcePoIdForNewDoc(null);
    toast({ title: "Action Cancelled", description: "Form has been reset." });
    // Form reset will be handled by key change or internal form logic
  };

  const handleDownloadPdf = (docId: string) => {
    const docToDownload = exportDocuments.find(doc => doc.id === docId);
    if (!docToDownload) {
      toast({ variant: "destructive", title: "Error", description: "Export Document not found for download." });
      return;
    }
    toast({ title: "PDF Generation", description: "PDF generation for export documents is not yet fully implemented in this version."});
    // Placeholder for actual PDF generation call:
    // const exporterDetails = allExporters.find(e => e.id === docToDownload.exporterId);
    // const clientDetails = allClients.find(c => c.id === docToDownload.clientId);
    // const manufacturerDetails = allManufacturers.find(m => m.id === docToDownload.manufacturerId);
    // const transporterDetails = allTransporters.find(t => t.id === docToDownload.transporterId);
    // const relatedPI = allPIs.find(pi => pi.id === docToDownload.performaInvoiceId); // if PI data is needed
    // const bankForPI = relatedPI ? allBanks.find(b => b.id === relatedPI.selectedBankId) : undefined;
    // try {
    //   generateExportDocumentPdf(docToDownload, exporterDetails, clientDetails, manufacturerDetails, transporterDetails, bankForPI, allSizes, allProducts);
    // } catch (error) { ... }
  }

  if (!isClient || isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Loading export document data...</div>
        </main>
      </div>
    );
  }
  
  const canCreateOrEdit = allPOs.length > 0 && allPIs.length > 0 && allExporters.length > 0 && allClients.length > 0 && allManufacturers.length > 0 && allTransporters.length > 0 && allSizes.length > 0 && allProducts.length > 0 && allBanks.length > 0;
  const showForm = sourcePoIdForNewDoc || docToEdit || (!sourcePoIdForNewDoc && !docToEdit); // Show form by default

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          {showForm && canCreateOrEdit ? (
            // <ExportDocumentForm
            //   key={docToEdit?.id || sourcePoIdForNewDoc || 'new-export-doc-v2'}
            //   initialData={docToEdit}
            //   sourcePoId={sourcePoIdForNewDoc}
            //   isEditing={!!docToEdit}
            //   onSave={handleSaveExportDocument}
            //   onCancelEdit={handleCancelEdit}
            //   allPOs={allPOs}
            //   allPIs={allPIs}
            //   allExporters={allExporters}
            //   allClients={allClients}
            //   allManufacturers={allManufacturers}
            //   allTransporters={allTransporters}
            //   allSizes={allSizes}
            //   allProducts={allProducts}
            //   allBanks={allBanks}
            // />
            <Card><CardHeader><CardTitle>Export Document Form Placeholder</CardTitle></CardHeader><CardContent><p>The ExportDocumentForm component will be created and integrated here in the next step.</p></CardContent></Card>
          ) : !canCreateOrEdit ? (
             <Card className="w-full max-w-2xl mx-auto shadow-xl mb-8">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Cannot Create or Edit Export Document</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  To create or edit an Export Document, please ensure you have added at least one of each:
                </p>
                <ul className="list-disc list-inside mt-2 text-muted-foreground">
                  {allPOs.length === 0 && <li>Purchase Order</li>}
                  {allPIs.length === 0 && <li>Performa Invoice</li>}
                  {allExporters.length === 0 && <li>Exporter</li>}
                  {allClients.length === 0 && <li>Client</li>}
                  {allManufacturers.length === 0 && <li>Manufacturer</li>}
                  {allTransporters.length === 0 && <li>Transporter</li>}
                  {allSizes.length === 0 && <li>Size</li>}
                  {allProducts.length === 0 && <li>Product</li>}
                  {allBanks.length === 0 && <li>Bank</li>}
                </ul>
                 <p className="mt-4 text-sm text-muted-foreground">
                  Please add the required information on the respective pages. Export Documents are typically initiated from a Purchase Order.
                </p>
              </CardContent>
            </Card>
          ) : null }
        </div>
        
        {/* <ExportDocumentList 
          documents={exportDocuments}
          allExporters={allExporters} // Pass necessary data for display
          allClients={allClients}
          onDeleteDocument={handleDeleteDocument}
          onEditDocument={(docId) => router.push(`/export-document?editDocId=${docId}`)} // Use router.push for edit navigation
          onDownloadPdf={handleDownloadPdf}
        />  */}
        <Card className="mt-8"><CardHeader><CardTitle>Export Document List Placeholder</CardTitle></CardHeader><CardContent><p>The ExportDocumentList component will be created and integrated here later.</p></CardContent></Card>
        
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} BizForm. All rights reserved.
      </footer>
    </div>
  );
}
    

    