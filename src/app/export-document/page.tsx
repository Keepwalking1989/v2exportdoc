
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation"; // Added useRouter
import { Header } from "@/components/layout/header";
// import { ExportDocumentForm } from "@/components/export-document-form"; // Will be created next
// import { ExportDocumentList } from "@/components/export-document-list"; // Will be created next
import type { ExportDocument } from "@/types/export-document";
import type { PurchaseOrder } from "@/types/purchase-order";
import type { Company } from "@/types/company"; // Exporters / Exporters
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const LOCAL_STORAGE_EXPORT_DOCS_KEY_V2 = "bizform_export_documents_v2";
const LOCAL_STORAGE_PO_KEY = "bizform_purchase_orders";
const LOCAL_STORAGE_COMPANIES_KEY = "bizform_companies"; // Exporters

export default function ExportDocumentPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);

  const [exportDocuments, setExportDocuments] = useState<ExportDocument[]>([]);
  // Master data states
  const [allPOs, setAllPOs] = useState<PurchaseOrder[]>([]);
  const [allExporters, setAllExporters] = useState<Company[]>([]);
  
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [docToEdit, setDocToEdit] = useState<ExportDocument | null>(null);
  const [sourcePoIdForNewDoc, setSourcePoIdForNewDoc] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedDocs = localStorage.getItem(LOCAL_STORAGE_EXPORT_DOCS_KEY_V2);
        const currentDocs: ExportDocument[] = storedDocs ? JSON.parse(storedDocs) : [];
        setExportDocuments(currentDocs);

        // Load minimal master data
        setAllPOs(JSON.parse(localStorage.getItem(LOCAL_STORAGE_PO_KEY) || "[]").map((po:any)=>({...po, poDate: new Date(po.poDate)})));
        setAllExporters(JSON.parse(localStorage.getItem(LOCAL_STORAGE_COMPANIES_KEY) || "[]"));

      } catch (error) {
        console.error("Failed to parse data from localStorage", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load data. Check console." });
        setExportDocuments([]);
        setAllPOs([]); 
        setAllExporters([]);
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
        setDocToEdit(null); // Ensure not in edit mode if creating from PO
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        toast({ title: "New Export Document", description: `Source Purchase Order ID: ${poIdFromUrl}.`});
      } else {
        toast({ variant: "destructive", title: "Error", description: `Source Purchase Order ID ${poIdFromUrl} not found.` });
        router.replace('/export-document', { scroll: false }); // Clear invalid param
      }
    } else if (editDocIdFromUrl) {
      const foundDoc = exportDocuments.find(doc => doc.id === editDocIdFromUrl);
      if (foundDoc) {
        setDocToEdit(foundDoc);
        setSourcePoIdForNewDoc(null); // Ensure not in new PO mode if editing
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        toast({ title: "Editing Document", description: `Editing Export Document ID: ${foundDoc.id}.`});
      } else {
        toast({ variant: "destructive", title: "Error", description: "Document not found for editing." });
        router.replace('/export-document', { scroll: false }); // Clear invalid param
      }
    } else {
      setSourcePoIdForNewDoc(null);
      setDocToEdit(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isLoading, isClient, exportDocuments, allPOs, router]);

  const handleSaveExportDocument = (docData: Omit<ExportDocument, 'id' | 'purchaseOrderId'> & { exporterId: string }) => {
    let updatedDocs;
    const finalDocData: ExportDocument = {
        ...docData,
        id: docToEdit ? docToEdit.id : Date.now().toString(),
        purchaseOrderId: docToEdit ? docToEdit.purchaseOrderId : sourcePoIdForNewDoc || undefined,
    };

    if (docToEdit) {
      updatedDocs = exportDocuments.map(doc =>
        doc.id === finalDocData.id ? finalDocData : doc
      );
    } else {
      updatedDocs = [...exportDocuments, finalDocData];
    }
    setExportDocuments(updatedDocs);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_EXPORT_DOCS_KEY_V2, JSON.stringify(updatedDocs));
    }
    
    const action = docToEdit ? "updated" : "saved";
    toast({ title: `Document ${action}`, description: `Export Document has been successfully ${action}.` });
    
    setDocToEdit(null);
    setSourcePoIdForNewDoc(null); 
    router.replace('/export-document', { scroll: false }); // Clear params from URL
  };
  
  const handleEditDocument = (docIdToEdit: string) => {
    router.push(`/export-document?editDocId=${docIdToEdit}`);
  };

  const handleDeleteDocument = (docIdToDelete: string) => {
    const updatedDocs = exportDocuments.filter(doc => doc.id !== docIdToDelete);
    setExportDocuments(updatedDocs);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_EXPORT_DOCS_KEY_V2, JSON.stringify(updatedDocs));
    }
    if (docToEdit && docToEdit.id === docIdToDelete) {
        setDocToEdit(null); 
        router.replace('/export-document', { scroll: false });
    }
    toast({ title: "Document Deleted", description: "Export Document has been deleted." });
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
    toast({ title: "PDF Generation", description: "PDF generation for export documents is not yet implemented."});
    // PDF generation logic will be added later based on the simplified structure
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
  
  const canCreateOrEdit = allExporters.length > 0;
  const showForm = sourcePoIdForNewDoc || docToEdit || (!sourcePoIdForNewDoc && !docToEdit);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          {showForm && canCreateOrEdit ? (
            // <ExportDocumentForm
            //   key={docToEdit?.id || sourcePoIdForNewDoc || 'new-export-doc-v2-simplified'}
            //   initialData={docToEdit} // Will pass { exporterId, purchaseOrderId } if editing
            //   sourcePoId={sourcePoIdForNewDoc} // Pass the source PO ID for new docs
            //   isEditing={!!docToEdit}
            //   onSave={handleSaveExportDocument} // Expects { exporterId }
            //   onCancelEdit={handleCancelEdit}
            //   allExporters={allExporters}
            // />
            <Card><CardHeader><CardTitle>Export Document Form Placeholder (Simplified)</CardTitle></CardHeader><CardContent><p>The ExportDocumentForm component (simplified) will be created and integrated here.</p></CardContent></Card>
          ) : !canCreateOrEdit ? (
             <Card className="w-full max-w-2xl mx-auto shadow-xl mb-8">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Cannot Create or Edit Export Document</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  To create or edit an Export Document, please ensure you have added at least one Exporter.
                </p>
                <ul className="list-disc list-inside mt-2 text-muted-foreground">
                  {allExporters.length === 0 && <li>Exporter (on the main page)</li>}
                </ul>
                 <p className="mt-4 text-sm text-muted-foreground">
                  Please add Exporter information on the main page.
                </p>
              </CardContent>
            </Card>
          ) : null }
        </div>
        
        {/* <ExportDocumentList 
          documents={exportDocuments}
          allExporters={allExporters} // Pass necessary data for display
          onDeleteDocument={handleDeleteDocument}
          onEditDocument={handleEditDocument} // Uses router.push
          onDownloadPdf={handleDownloadPdf}
        />  */}
        <Card className="mt-8"><CardHeader><CardTitle>Export Document List Placeholder (Simplified)</CardTitle></CardHeader><CardContent><p>The ExportDocumentList component (simplified) will be created and integrated here later.</p></CardContent></Card>
        
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} BizForm. All rights reserved.
      </footer>
    </div>
  );
}
