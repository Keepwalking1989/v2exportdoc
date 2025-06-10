
"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { ExportDocumentForm, type ExportDocumentFormValues } from "@/components/export-document-form";
import { ExportDocumentList } from "@/components/export-document-list";
import type { ExportDocument } from "@/types/export-document";
import type { PurchaseOrder } from "@/types/purchase-order";
import type { Company } from "@/types/company"; // Exporters
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
        setDocToEdit(null); 
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        toast({ title: "New Export Document", description: `Source Purchase Order ID: ${poIdFromUrl}. Select an exporter.`});
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
    let updatedDocs;
    const finalDocData: ExportDocument = {
        exporterId: formData.exporterId,
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
    toast({ title: `Document ${action}`, description: `Export Document ED-${finalDocData.id.slice(-6)} has been successfully ${action}.` });
    
    setDocToEdit(null);
    setSourcePoIdForNewDoc(null); 
    router.replace('/export-document', { scroll: false }); 
  };
  
  const handleEditDocument = (docIdToEdit: string) => {
    router.push(`/export-document?editDocId=${docIdToEdit}`, { scroll: false });
  };

  const handleDeleteDocument = (docIdToDelete: string) => {
    const deletedDocIdShort = docIdToDelete.slice(-6);
    const updatedDocs = exportDocuments.filter(doc => doc.id !== docIdToDelete);
    setExportDocuments(updatedDocs);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_EXPORT_DOCS_KEY_V2, JSON.stringify(updatedDocs));
    }
    if (docToEdit && docToEdit.id === docIdToDelete) {
        setDocToEdit(null); 
        router.replace('/export-document', { scroll: false });
    }
    toast({ title: "Document Deleted", description: `Export Document ED-${deletedDocIdShort} has been deleted.` });
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
  
  const canCreateOrEdit = allExporters.length > 0;
  // Show form if creating new (with or without PO ID) or if editing
  const showForm = sourcePoIdForNewDoc || docToEdit || (!sourcePoIdForNewDoc && !docToEdit);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          {showForm && canCreateOrEdit ? (
            <ExportDocumentForm
              key={docToEdit?.id || sourcePoIdForNewDoc || 'new-export-doc-v2-simplified'}
              initialData={docToEdit}
              sourcePoId={sourcePoIdForNewDoc}
              isEditing={!!docToEdit}
              onSave={handleSaveExportDocument}
              onCancelEdit={handleCancelEdit}
              allExporters={allExporters}
            />
          ) : !canCreateOrEdit && showForm ? ( // Only show "cannot create" if the form was supposed to be shown but deps are missing
             <Card className="w-full max-w-2xl mx-auto shadow-xl mb-8">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Cannot Create or Edit Export Document</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  To create or edit an Export Document, please ensure you have added at least one Exporter.
                </p>
                 <p className="mt-4 text-sm text-muted-foreground">
                  Please add Exporter information on the main (Exporter) page.
                </p>
              </CardContent>
            </Card>
          ) : null }
        </div>
        
        <ExportDocumentList 
          documents={exportDocuments}
          allExporters={allExporters}
          onDeleteDocument={handleDeleteDocument}
          onEditDocument={handleEditDocument}
          onDownloadPdf={handleDownloadPdf}
        />
        
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} BizForm. All rights reserved.
      </footer>
    </div>
  );
}
