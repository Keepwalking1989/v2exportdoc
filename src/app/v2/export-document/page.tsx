
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { ExportDocumentListV2 } from "@/components/v2/export-document-list";
import type { ExportDocument } from "@/types/export-document";
import type { Company } from "@/types/company";
import type { Manufacturer } from "@/types/manufacturer";
import type { Transporter } from "@/types/transporter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function ExportDocumentPageV2() {
  const { toast } = useToast();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [exportDocuments, setExportDocuments] = useState<ExportDocument[]>([]);
  const [allExporters, setAllExporters] = useState<Company[]>([]);
  const [allManufacturers, setAllManufacturers] = useState<Manufacturer[]>([]);
  const [allTransporters, setAllTransporters] = useState<Transporter[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [docsRes, exportersRes, manufacturersRes, transportersRes] = await Promise.all([
          fetch('/api/v2/export-document-data'),
          fetch('/api/v2/exporter-data'),
          fetch('/api/v2/manufacturer-data'),
          fetch('/api/v2/transporter-data'),
        ]);

        if (!docsRes.ok) throw new Error('Failed to fetch export documents');
        if (!exportersRes.ok) throw new Error('Failed to fetch exporters');
        if (!manufacturersRes.ok) throw new Error('Failed to fetch manufacturers');
        if (!transportersRes.ok) throw new Error('Failed to fetch transporters');

        setExportDocuments(await docsRes.json());
        setAllExporters(await exportersRes.json());
        setAllManufacturers(await manufacturersRes.json());
        setAllTransporters(await transportersRes.json());

      } catch (error: any) {
        toast({ variant: "destructive", title: "Error loading data", description: error.message });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const handleEditDocument = (docId: string) => {
    // For now, this will redirect to the old editing page as the V2 form is not built
    toast({ title: "Redirecting...", description: "V2 document editing form not yet implemented. Redirecting to LocalStorage version for editing."});
    router.push(`/export-document?editDocId=${docId}`);
  };

  const handleDeleteDocument = async (docId: string) => {
    // Implement V2 delete logic
    toast({ variant: "destructive", title: "Deletion Pending", description: "Delete functionality is not yet implemented."});
  };

  const handleDownloadPdf = (docId: string) => {
     toast({ title: "PDF Generation", description: "PDF generation for this document is not yet available in V2."});
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Loading export document data...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-end mb-4">
            <Button onClick={() => router.push('/export-document')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Document (LocalStorage)
            </Button>
        </div>
        <ExportDocumentListV2
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
        © {new Date().getFullYear()} HEMITH ERP. All rights reserved. (V2 - MySQL)
      </footer>
    </div>
  );
}
