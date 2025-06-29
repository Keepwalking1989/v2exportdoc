
"use client";

import { useState, useMemo, useEffect } from "react";
import type { PerformaInvoice } from "@/types/performa-invoice";
import type { Company } from "@/types/company";
import type { Client } from "@/types/client";
import type { Size } from "@/types/size";
import type { Product } from "@/types/product";
import type { Bank } from "@/types/bank"; // Import Bank
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, ChevronLeft, ChevronRight, FileText, FilePenLine, Trash2, FileSymlink, Download } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { generatePerformaInvoicePdf } from "@/lib/performa-invoice-pdf"; // Import PDF generator

interface PerformaInvoiceListProps {
  invoices: PerformaInvoice[];
  exporters: Company[];
  clients: Client[];
  sizes: Size[];
  allProducts: Product[];
  banks: Bank[]; // Add banks prop
  onDeleteInvoice: (invoiceId: string) => void;
  onEditInvoice: (invoiceId: string) => void;
  onGeneratePO: (invoiceId: string) => void;
}

const ITEMS_PER_PAGE = 5;

export function PerformaInvoiceList({
  invoices: initialInvoices,
  exporters,
  clients,
  sizes,
  allProducts,
  banks, // Destructure banks
  onDeleteInvoice,
  onEditInvoice,
  onGeneratePO,
}: PerformaInvoiceListProps) {
  const [invoices, setInvoices] = useState<PerformaInvoice[]>(initialInvoices);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    setInvoices(initialInvoices);
    setCurrentPage(1);
  }, [initialInvoices]);

  const enrichedInvoices = useMemo(() => {
    return invoices.map((invoice) => {
      const exporter = exporters.find((e) => e.id === invoice.exporterId);
      const client = clients.find((c) => c.id === invoice.clientId);
      return {
        ...invoice,
        exporterName: exporter?.companyName || "N/A",
        clientName: client?.companyName || "N/A",
      };
    });
  }, [invoices, exporters, clients]);

  const filteredInvoices = useMemo(() => {
    if (!searchTerm) return enrichedInvoices;
    return enrichedInvoices.filter(
      (invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.exporterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.grandTotal?.toString() ?? "").includes(searchTerm)
    );
  }, [enrichedInvoices, searchTerm]);

  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInvoices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredInvoices, currentPage]);

  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);

  const handleDelete = (invoiceId: string, invoiceNumber: string) => {
    onDeleteInvoice(invoiceId);
    toast({
      title: "Performa Invoice Deleted",
      description: `Invoice ${invoiceNumber} has been successfully deleted.`,
    });
  };

  const handleDownloadPdf = async (invoice: PerformaInvoice) => {
    const exporter = exporters.find(e => e.id === invoice.exporterId);
    const client = clients.find(c => c.id === invoice.clientId);
    const selectedBank = banks.find(b => b.id === invoice.selectedBankId); // Find selected bank

    if (!exporter || !client) {
      toast({
        variant: "destructive",
        title: "Error generating PDF",
        description: "Exporter or Client data missing for this invoice.",
      });
      return;
    }
    // Note: selectedBank can be optional if not made mandatory in the form yet
    // If selectedBank is not found and it's mandatory, you might want to show an error

    await generatePerformaInvoicePdf(invoice, exporter, client, sizes, allProducts, selectedBank);
  };

  return (
    <Card className="w-full shadow-xl mt-8">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Saved Performa Invoices
        </CardTitle>
        <CardDescription>View, search, and manage your performa invoices.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by Invoice #, Exporter, Client, Total..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
        </div>

        {paginatedInvoices.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-headline">Invoice #</TableHead>
                  <TableHead className="font-headline hidden sm:table-cell">Date</TableHead>
                  <TableHead className="font-headline">Exporter</TableHead>
                  <TableHead className="font-headline">Client</TableHead>
                  <TableHead className="font-headline hidden md:table-cell">Grand Total</TableHead>
                  <TableHead className="font-headline text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell className="hidden sm:table-cell">{format(new Date(invoice.invoiceDate), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{invoice.exporterName}</TableCell>
                    <TableCell>{invoice.clientName}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {invoice.grandTotal?.toFixed(2)} {invoice.currencyType}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => onEditInvoice(invoice.id)} className="hover:text-primary">
                        <FilePenLine className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="icon" className="hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the performa invoice "{invoice.invoiceNumber}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(invoice.id, invoice.invoiceNumber)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button variant="ghost" size="icon" onClick={() => onGeneratePO(invoice.id)} className="hover:text-green-600">
                        <FileSymlink className="h-4 w-4" />
                         <span className="sr-only">Generate PO</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDownloadPdf(invoice)} className="hover:text-blue-600">
                        <Download className="h-4 w-4" />
                        <span className="sr-only">Download PDF</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No performa invoices found.
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
