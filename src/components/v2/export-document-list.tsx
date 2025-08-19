
"use client";

import Link from "next/link";
import type { ExportDocument } from "@/types/export-document";
import type { Company } from "@/types/company";
import type { Client } from "@/types/client";
import type { Manufacturer } from "@/types/manufacturer";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FileText, Edit, Trash2, FileType } from "lucide-react";
import { format } from "date-fns";

interface ExportDocumentListProps {
  documents: ExportDocument[];
  allExporters: Company[];
  allClients: Client[];
  allManufacturers: Manufacturer[];
  onEditDocument: (docId: string) => void;
  onDeleteDocument: (docId: string) => void;
  onDownloadPdf: (docId: string) => void;
}

export function ExportDocumentListV2({
  documents,
  allExporters,
  allClients,
  allManufacturers,
  onEditDocument,
  onDeleteDocument,
}: ExportDocumentListProps) {

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
                  <TableHead className="font-headline">Export Invoice #</TableHead>
                  <TableHead className="font-headline">Date</TableHead>
                  <TableHead className="font-headline">Exporter</TableHead>
                  <TableHead className="font-headline">Client</TableHead>
                  <TableHead className="font-headline">Manufacturer</TableHead>
                  <TableHead className="font-headline text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const exporterName = allExporters.find(e => e.id === doc.exporterId)?.companyName || "N/A";
                  const clientName = allClients.find(c => c.id === doc.clientId)?.companyName || "N/A";
                  const manufacturerName = allManufacturers.find(m => m.id === (doc.manufacturerId || doc.manufacturerDetails?.[0]?.manufacturerId))?.companyName || "N/A";

                  return (
                    <TableRow key={doc.id}>
                      <TableCell>{doc.exportInvoiceNumber}</TableCell>
                      <TableCell>{format(new Date(doc.exportInvoiceDate), "dd-MMM-yyyy")}</TableCell>
                      <TableCell>{exporterName}</TableCell>
                      <TableCell>{clientName}</TableCell>
                      <TableCell>{manufacturerName}</TableCell>
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
                                This action will mark Export Document {doc.exportInvoiceNumber} as deleted.
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
