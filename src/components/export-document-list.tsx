
"use client";

import type { ExportDocument } from "@/types/export-document";
import type { Company } from "@/types/company"; // For Exporter
// No longer need PurchaseOrder type here if just displaying the ID from ExportDocument

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FileText, Edit, Trash2, Download } from "lucide-react";

interface ExportDocumentListProps {
  documents: ExportDocument[];
  allExporters: Company[];
  onEditDocument: (docId: string) => void;
  onDeleteDocument: (docId: string) => void;
  onDownloadPdf: (docId: string) => void;
}

export function ExportDocumentList({
  documents,
  allExporters,
  onEditDocument,
  onDeleteDocument,
  onDownloadPdf,
}: ExportDocumentListProps) {

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
                <TableHead className="font-headline">Doc ID</TableHead>
                <TableHead className="font-headline">Exporter</TableHead>
                <TableHead className="font-headline">PO ID</TableHead>
                <TableHead className="font-headline text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => {
                const exporterName = allExporters.find(e => e.id === doc.exporterId)?.companyName || "N/A";
                return (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">ED-{doc.id.slice(-6)}</TableCell>
                    <TableCell>{exporterName}</TableCell>
                    <TableCell>{doc.purchaseOrderId ? `PO-${doc.purchaseOrderId.slice(-6)}` : "N/A"}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => onEditDocument(doc.id)} className="hover:text-primary" title="Edit">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="icon" className="hover:text-destructive" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the Export Document ED-{doc.id.slice(-6)}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDeleteDocument(doc.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button variant="ghost" size="icon" onClick={() => onDownloadPdf(doc.id)} className="hover:text-blue-600" title="Download PDF">
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
