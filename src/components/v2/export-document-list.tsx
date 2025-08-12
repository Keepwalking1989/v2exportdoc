
"use client";

import Link from "next/link";
import type { ExportDocument } from "@/types/export-document";
import type { Company } from "@/types/company";
import type { Manufacturer } from "@/types/manufacturer";
import type { Transporter } from "@/types/transporter";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FileText, Edit, Trash2, Download, FileType } from "lucide-react";

interface ExportDocumentListV2Props {
  documents: ExportDocument[];
  allExporters: Company[];
  allManufacturers: Manufacturer[];
  allTransporters: Transporter[];
  onEditDocument: (docId: string) => void;
  onDeleteDocument: (docId: string) => void;
  onDownloadPdf: (docId: string) => void;
}

export function ExportDocumentListV2({
  documents,
  allExporters,
  allManufacturers,
  allTransporters,
  onEditDocument,
  onDeleteDocument,
  onDownloadPdf,
}: ExportDocumentListV2Props) {

  if (!documents || documents.length === 0) {
    return (
      <Card className="w-full shadow-xl mt-8">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Saved Export Documents (MySQL)
          </CardTitle>
          <CardDescription>No export documents found in the database.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            Once documents are created in the database, they will appear here.
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
          Saved Export Documents (MySQL)
        </CardTitle>
        <CardDescription>View and manage your saved export documents from the database.</CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-headline">Doc ID</TableHead>
                  <TableHead className="font-headline">Export Invoice #</TableHead>
                  <TableHead className="font-headline">Exporter</TableHead>
                  <TableHead className="font-headline">Manufacturers</TableHead>
                  <TableHead className="font-headline">Transporter</TableHead>
                  <TableHead className="font-headline">PO ID</TableHead>
                  <TableHead className="font-headline text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const exporterName = allExporters.find(e => e.id === doc.exporterId)?.companyName || "N/A";
                  const manufacturerNames = doc.manufacturerDetails
                    ?.map(md => allManufacturers.find(m => m.id === md.manufacturerId)?.companyName)
                    .filter(Boolean)
                    .join(", ") || "N/A";
                  const transporterName = doc.transporterId ? (allTransporters.find(t => t.id === doc.transporterId)?.companyName || "N/A") : "N/A";
                  
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">ED-{doc.id.slice(-6)}</TableCell>
                      <TableCell>{doc.exportInvoiceNumber}</TableCell>
                      <TableCell>{exporterName}</TableCell>
                      <TableCell>{manufacturerNames}</TableCell>
                      <TableCell>{transporterName}</TableCell>
                      <TableCell>{doc.purchaseOrderId ? `PO-${doc.purchaseOrderId.slice(-6)}` : "N/A"}</TableCell>
                      <TableCell className="text-right space-x-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => onEditDocument(doc.id)} className="hover:text-primary">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Edit Document</p></TooltipContent>
                        </Tooltip>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Tooltip>
                                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></TooltipTrigger>
                                <TooltipContent><p>Delete</p></TooltipContent>
                              </Tooltip>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action will mark Export Document ED-{doc.id.slice(-6)} as deleted.
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
                        <Tooltip>
                          <TooltipTrigger asChild>
                              <Button asChild variant="ghost" size="icon" className="hover:text-purple-600">
                                  <Link href={`/v2/export-document/${doc.id}`}>
                                      <FileType className="h-4 w-4" />
                                  </Link>
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Document Data</p></TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

    