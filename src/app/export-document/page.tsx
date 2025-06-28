
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { ExportDocumentForm, type ExportDocumentFormValues } from "@/components/export-document-form";
import { ExportDocumentList } from "@/components/export-document-list";
import type { ExportDocument } from "@/types/export-document";
import type { PurchaseOrder } from "@/types/purchase-order";
import type { Company } from "@/types/company"; // Exporters
import type { Manufacturer } from "@/types/manufacturer"; // Import Manufacturer
import type { Transporter } from "@/types/transporter"; // Import Transporter
import type { Product } from "@/types/product";
import type { Size } from "@/types/size";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const LOCAL_STORAGE_EXPORT_DOCS_KEY_V2 = "bizform_export_documents_v2";
const LOCAL_STORAGE_PO_KEY = "bizform_purchase_orders";
const LOCAL_STORAGE_COMPANIES_KEY = "bizform_companies"; // Exporters
const LOCAL_STORAGE_MANUFACTURERS_KEY = "bizform_manufacturers"; // Manufacturers
const LOCAL_STORAGE_TRANSPORTERS_KEY = "bizform_transporters"; // Transporters
const LOCAL_STORAGE_PRODUCTS_KEY = "bizform_products";
const LOCAL_STORAGE_SIZES_KEY = "bizform_sizes";

function getCurrentIndianFinancialYear(): string {
  const now = new Date();
  const currentMonth = now.getMonth(); 
  const currentYear = now.getFullYear();

  if (currentMonth >= 3) { 
    return `${currentYear.toString().slice(-2)}-${(currentYear + 1).toString().slice(-2)}`;
  } else { 
    return `${(currentYear - 1).toString().slice(-2)}-${currentYear.toString().slice(-2)}`;
  }
}

const getNextExportInvoiceNumberInternal = (currentDocs: ExportDocument[], financialYear: string): string => {
    const prefix = `EXP/HEM/`;
    const yearSuffix = `/${financialYear}`;

    const invoiceNumbersThisYear = currentDocs
      .map(doc => doc.exportInvoiceNumber)
      .filter(num => num && num.startsWith(prefix) && num.endsWith(yearSuffix))
      .map(num => {
        const numberPart = num.substring(prefix.length, num.length - yearSuffix.length);
        return parseInt(numberPart, 10);
      })
      .filter(num => !isNaN(num))
      .sort((a, b) => b - a);

    const nextNum = (invoiceNumbersThisYear[0] || 0) + 1;
    return `${prefix}${nextNum.toString().padStart(3, '0')}${yearSuffix}`;
};


export default function ExportDocumentPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);

  const [exportDocuments, setExportDocuments] = useState<ExportDocument[]>([]);
  const [nextExportInvoiceNumber, setNextExportInvoiceNumber] = useState<string>("");
  const [allPOs, setAllPOs] = useState<PurchaseOrder[]>([]);
  const [allExporters, setAllExporters] = useState<Company[]>([]);
  const [allManufacturers, setAllManufacturers] = useState<Manufacturer[]>([]); // State for manufacturers
  const [allTransporters, setAllTransporters] = useState<Transporter[]>([]); // State for transporters
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allSizes, setAllSizes] = useState<Size[]>([]);
  
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [docToEdit, setDocToEdit] = useState<ExportDocument | null>(null);
  const [sourcePoIdForNewDoc, setSourcePoIdForNewDoc] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedDocs = localStorage.getItem(LOCAL_STORAGE_EXPORT_DOCS_KEY_V2);
        const allDocs: ExportDocument[] = storedDocs ? JSON.parse(storedDocs) : [];

        const activeDocs = allDocs.filter(doc => !doc.isDeleted);
        
        const currentDocs = activeDocs.map((doc: any) => ({
            ...doc,
            exportInvoiceDate: doc.exportInvoiceDate ? new Date(doc.exportInvoiceDate) : new Date(),
            exchangeDate: doc.exchangeDate ? new Date(doc.exchangeDate) : undefined,
            manufacturerDetails: (doc.manufacturerDetails || []).map((md: any) => ({
                ...md,
                invoiceDate: md.invoiceDate ? new Date(md.invoiceDate) : undefined,
            })),
            containerItems: (doc.containerItems || []).map((item: any) => ({
                ...item,
                weighingDateTime: item.weighingDateTime ? new Date(item.weighingDateTime) : undefined,
                productItems: item.productItems || [],
                sampleItems: item.sampleItems || [],
            })),
        }));
        setExportDocuments(currentDocs);
        setNextExportInvoiceNumber(getNextExportInvoiceNumberInternal(currentDocs, getCurrentIndianFinancialYear()));


        setAllPOs(JSON.parse(localStorage.getItem(LOCAL_STORAGE_PO_KEY) || "[]").map((po:any)=>({...po, poDate: new Date(po.poDate)})));
        setAllExporters(JSON.parse(localStorage.getItem(LOCAL_STORAGE_COMPANIES_KEY) || "[]"));
        setAllManufacturers(JSON.parse(localStorage.getItem(LOCAL_STORAGE_MANUFACTURERS_KEY) || "[]").map((m: any) => ({
            ...m,
            stuffingPermissionDate: m.stuffingPermissionDate ? new Date(m.stuffingPermissionDate) : undefined,
          }))); // Load manufacturers and parse date
        setAllTransporters(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TRANSPORTERS_KEY) || "[]")); // Load transporters
        setAllProducts(JSON.parse(localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY) || "[]"));
        setAllSizes(JSON.parse(localStorage.getItem(LOCAL_STORAGE_SIZES_KEY) || "[]"));

      } catch (error) {
        console.error("Failed to parse data from localStorage", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load data. Check console." });
        setExportDocuments([]);
        setAllPOs([]); 
        setAllExporters([]);
        setAllManufacturers([]); // Initialize manufacturers on error
        setAllTransporters([]); // Initialize transporters on error
        setAllProducts([]);
        setAllSizes([]);
      } finally {
        setIsLoading(false);
      }
    }
  }, [toast]);
  
  useEffect(() => {
    if (isLoading || !isClient) return;

    const poIdFromUrl = searchParams.get("sourcePoId");
    const editDocIdFromUrl = searchParams.get("editDocId");

    if (poIdFromUrl) {
      const poExists = allPOs.find(po => po.id === poIdFromUrl);
      if (poExists) {
        setSourcePoIdForNewDoc(poIdFromUrl);
        setDocToEdit(null); 
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        toast({ title: "New Export Document", description: `Source Purchase Order ID: ${poIdFromUrl}. Select an exporter and manufacturer.`});
      } else {
        toast({ variant: "destructive", title: "Error", description: `Source Purchase Order ID ${poIdFromUrl} not found.` });
        router.replace('/export-document', { scroll: false }); 
      }
    } else if (editDocIdFromUrl) {
      const foundDoc = exportDocuments.find(doc => doc.id === editDocIdFromUrl);
      if (foundDoc) {
        setDocToEdit(foundDoc);
        setSourcePoIdForNewDoc(null); 
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        toast({ title: "Editing Document", description: `Editing Export Document ID: ED-${foundDoc.id.slice(-6)}.`});
      } else {
        toast({ variant: "destructive", title: "Error", description: "Document not found for editing." });
        router.replace('/export-document', { scroll: false }); 
      }
    } else {
      setSourcePoIdForNewDoc(null);
      setDocToEdit(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isLoading, isClient, exportDocuments, allPOs, router]);

  const handleSaveExportDocument = (formData: ExportDocumentFormValues) => {
    const allDocsRaw = localStorage.getItem(LOCAL_STORAGE_EXPORT_DOCS_KEY_V2);
    const allDocs: ExportDocument[] = allDocsRaw ? JSON.parse(allDocsRaw) : [];
    
    const finalDocData: ExportDocument = {
        ...formData,
        id: docToEdit ? docToEdit.id : Date.now().toString(),
        purchaseOrderId: docToEdit ? docToEdit.purchaseOrderId : sourcePoIdForNewDoc || undefined,
        isDeleted: docToEdit ? docToEdit.isDeleted : false,
        manufacturerDetails: formData.manufacturerDetails?.map(md => ({...md, id: md.id || Math.random().toString(36).substring(2,9)})),
        containerItems: formData.containerItems?.map(item => ({
            ...item, 
            id: item.id || Math.random().toString(36).substring(2,9),
            productItems: item.productItems?.map(p => ({...p, id: p.id || Math.random().toString(36).substring(2,9)})),
            sampleItems: item.sampleItems?.map(s => ({...s, id: s.id || Math.random().toString(36).substring(2,9)})),
        })) || [],
    };

    let updatedDocs;
    if (docToEdit) {
      updatedDocs = allDocs.map(doc =>
        doc.id === finalDocData.id ? finalDocData : doc
      );
    } else {
      updatedDocs = [...allDocs, finalDocData];
    }
    
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_EXPORT_DOCS_KEY_V2, JSON.stringify(updatedDocs));
    }

    const activeDocs = updatedDocs.filter(d => !d.isDeleted);
    const parsedDocs = activeDocs.map((doc: any) => ({
        ...doc,
        exportInvoiceDate: doc.exportInvoiceDate ? new Date(doc.exportInvoiceDate) : new Date(),
        exchangeDate: doc.exchangeDate ? new Date(doc.exchangeDate) : undefined,
        manufacturerDetails: (doc.manufacturerDetails || []).map((md: any) => ({...md, invoiceDate: md.invoiceDate ? new Date(md.invoiceDate) : undefined})),
        containerItems: (doc.containerItems || []).map((item: any) => ({...item, weighingDateTime: item.weighingDateTime ? new Date(item.weighingDateTime) : undefined})),
    }));
    setExportDocuments(parsedDocs);

    if (!docToEdit) {
        setNextExportInvoiceNumber(getNextExportInvoiceNumberInternal(updatedDocs, getCurrentIndianFinancialYear()));
    }
    
    const action = docToEdit ? "updated" : "saved";
    toast({ title: `Document ${action}`, description: `Export Document ED-${finalDocData.id.slice(-6)} has been successfully ${action}.` });
    
    setDocToEdit(null);
    setSourcePoIdForNewDoc(null); 
    router.replace('/export-document', { scroll: false }); 
  };
  
  const handleEditDocument = (docIdToEdit: string) => {
    router.push(`/export-document?editDocId=${docIdToEdit}`);
  };

  const handleDeleteDocument = (docIdToDelete: string) => {
    const allDocsRaw = localStorage.getItem(LOCAL_STORAGE_EXPORT_DOCS_KEY_V2);
    const allDocs: ExportDocument[] = allDocsRaw ? JSON.parse(allDocsRaw) : [];

    const updatedDocs = allDocs.map(doc => 
      doc.id === docIdToDelete ? { ...doc, isDeleted: true } : doc
    );
    
    localStorage.setItem(LOCAL_STORAGE_EXPORT_DOCS_KEY_V2, JSON.stringify(updatedDocs));
    setExportDocuments(updatedDocs.filter(d => !d.isDeleted));
    
    if (docToEdit && docToEdit.id === docIdToDelete) {
        setDocToEdit(null); 
        router.replace('/export-document', { scroll: false });
    }
    
    const deletedDocIdShort = docIdToDelete.slice(-6);
    toast({ title: "Document Deleted", description: `Export Document ED-${deletedDocIdShort} has been marked as deleted.` });
  };

  const handleCancelEdit = () => { 
    setDocToEdit(null); 
    setSourcePoIdForNewDoc(null);
    router.replace('/export-document', { scroll: false });
    toast({ title: "Action Cancelled", description: "Form has been reset." });
  };

  const handleDownloadPdf = (docId: string) => {
    const docToDownload = exportDocuments.find(doc => doc.id === docId);
    if (!docToDownload) {
      toast({ variant: "destructive", title: "Error", description: "Export Document not found for download." });
      return;
    }
    toast({ title: "PDF Generation (Simplified)", description: `PDF generation for ED-${docId.slice(-6)} is not yet implemented.`});
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
  
  const canCreateOrEdit = allExporters.length > 0 && allManufacturers.length > 0;
  const showForm = sourcePoIdForNewDoc || docToEdit || (!sourcePoIdForNewDoc && !docToEdit);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          {showForm && canCreateOrEdit ? (
            <ExportDocumentForm
              key={docToEdit?.id || sourcePoIdForNewDoc || 'new-export-doc-v2-manufacturer'}
              initialData={docToEdit}
              isEditing={!!docToEdit}
              onSave={handleSaveExportDocument}
              onCancelEdit={handleCancelEdit}
              nextExportInvoiceNumber={nextExportInvoiceNumber}
              allExporters={allExporters}
              allManufacturers={allManufacturers}
              allTransporters={allTransporters}
              allProducts={allProducts}
              allSizes={allSizes}
            />
          ) : !canCreateOrEdit && showForm ? (
             <Card className="w-full max-w-2xl mx-auto shadow-xl mb-8">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Cannot Create or Edit Export Document</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  To create or edit an Export Document, please ensure you have added at least one:
                </p>
                 <ul className="list-disc list-inside mt-2 text-muted-foreground">
                  {allExporters.length === 0 && <li>Exporter (on the Exporter page)</li>}
                  {allManufacturers.length === 0 && <li>Manufacturer (on the Manufacturer page)</li>}
                </ul>
                 <p className="mt-4 text-sm text-muted-foreground">
                  Please add the required information on the respective pages.
                </p>
              </CardContent>
            </Card>
          ) : null }
        </div>
        
        <ExportDocumentList 
          documents={exportDocuments}
          allExporters={allExporters}
          allManufacturers={allManufacturers}
          allTransporters={allTransporters}
          onDeleteDocument={handleDeleteDocument}
          onEditDocument={handleEditDocument}
          onDownloadPdf={handleDownloadPdf}
        />
        
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} HEMITH ERP. All rights reserved.
      </footer>
    </div>
  );
}
