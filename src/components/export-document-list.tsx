
"use client";

import type { ExportDocument } from "@/types/export-document";
// Import other necessary types for displaying related data (e.g., Company for Exporter, Client)
// import type { Company } from "@/types/company";
// import type { Client } from "@/types/client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, Edit, Trash2, Download } from "lucide-react"; // Added Download
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ExportDocumentListProps {
  documents: ExportDocument[];
  // Pass lookup data if needed for display, e.g.:
  // allExporters: Company[];
  // allClients: Client[];
  // onEditDocument: (docId: string) => void;
  // onDeleteDocument: (docId: string) => void;
  // onDownloadPdf: (docId: string) => void; // Placeholder for PDF download
}

export function ExportDocumentList({
  documents,
  // allExporters,
  // allClients,
  // onEditDocument,
  // onDeleteDocument,
  // onDownloadPdf,
}: ExportDocumentListProps) {
  const { toast } = useToast();

  const handleEdit = (docId: string) => {
    // onEditDocument(docId);
    toast({ title: "Edit Action", description: `Edit for document ID ${docId} to be implemented.` });
  };

  const handleDelete = (docId: string, docNumber: string) => {
    // onDeleteDocument(docId);
    toast({ title: "Delete Action", description: `Delete for document ${docNumber} to be implemented.` });
  };

  const handleDownload = (docId: string, docNumber: string) => {
    // onDownloadPdf(docId);
    toast({ title: "Download PDF", description: `PDF download for document ${docNumber} to be implemented.` });
  };

  if (!documents || documents.length === 0) {
    return (
      <Card className="w-full shadow-xl mt-8">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Saved Export Documents
          </CardTitle>
          <CardDescription>No export documents found.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            Create an export document using the form above to see it listed here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-xl mt-8">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Saved Export Documents
        </CardTitle>
        <CardDescription>View and manage your saved export documents.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-headline">Export Inv #</TableHead>
                <TableHead className="font-headline hidden sm:table-cell">Date</TableHead>
                <TableHead className="font-headline">PO #</TableHead>
                <TableHead className="font-headline hidden md:table-cell">Client</TableHead>
                <TableHead className="font-headline hidden lg:table-cell">Destination</TableHead>
                <TableHead className="font-headline text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => {
                // const clientName = allClients.find(c => c.id === doc.clientId)?.companyName || "N/A";
                // For now, clientName and PO# are placeholders as we are not passing full lookup data yet.
                return (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.exportInvoiceNumber}</TableCell>
                    <TableCell className="hidden sm:table-cell">{format(new Date(doc.exportInvoiceDate), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{doc.purchaseOrderId ? `PO-${doc.purchaseOrderId.slice(-4)}` : "N/A"}</TableCell>
                    <TableCell className="hidden md:table-cell">{doc.clientId ? `Client-${doc.clientId.slice(-4)}` : "N/A"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{doc.finalDestination || "N/A"}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(doc.id)} className="hover:text-primary" title="Edit">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id, doc.exportInvoiceNumber)} className="hover:text-destructive" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDownload(doc.id, doc.exportInvoiceNumber)} className="hover:text-blue-600" title="Download PDF">
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
