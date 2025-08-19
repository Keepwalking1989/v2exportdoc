
"use client";

import { useState, useMemo } from "react";
import type { TransBill } from "@/types/trans-bill";
import type { Transporter } from "@/types/transporter";
import type { ExportDocument } from "@/types/export-document";
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
import { Search, ChevronLeft, ChevronRight, Truck, Edit, Trash2, Download } from "lucide-react";
import { format } from "date-fns";

interface TransBillListV2Props {
  transBills: TransBill[];
  allTransporters: Transporter[];
  allExportDocuments: ExportDocument[];
  onEditBill: (id: string) => void;
  onDeleteBill: (id: string) => void;
}

const ITEMS_PER_PAGE = 5;

export function TransBillListV2({ transBills, allTransporters, allExportDocuments, onEditBill, onDeleteBill }: TransBillListV2Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const enrichedBills = useMemo(() => {
    return transBills.map(bill => {
      const transporter = allTransporters.find(t => t.id === bill.transporterId);
      const exportDoc = allExportDocuments.find(d => d.id === bill.exportDocumentId);
      
      // Placeholder for payment logic
      const outstandingAmount = bill.totalPayable;

      return {
        ...bill,
        transporterName: transporter?.companyName || "N/A",
        exportInvoiceNumber: exportDoc?.exportInvoiceNumber || "N/A",
        outstandingAmount,
      };
    });
  }, [transBills, allTransporters, allExportDocuments]);

  const filteredBills = useMemo(() => {
    if (!searchTerm) return enrichedBills;
    return enrichedBills.filter(
      (bill) =>
        bill.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.transporterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.exportInvoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [enrichedBills, searchTerm]);

  const paginatedBills = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBills.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredBills, currentPage]);

  const totalPages = Math.ceil(filteredBills.length / ITEMS_PER_PAGE);

  return (
    <Card className="w-full shadow-xl mt-8">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Truck className="h-6 w-6 text-primary" />
          Saved Transport Bills (MySQL)
        </CardTitle>
        <CardDescription>View, search, and manage your transport bills from the database.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by Invoice #, Transporter, or Export Doc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
        </div>

        {paginatedBills.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-headline">Invoice #</TableHead>
                  <TableHead className="font-headline hidden sm:table-cell">Date</TableHead>
                  <TableHead className="font-headline">Transporter</TableHead>
                  <TableHead className="font-headline hidden md:table-cell">Payable</TableHead>
                  <TableHead className="font-headline text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">{bill.invoiceNumber}</TableCell>
                    <TableCell className="hidden sm:table-cell">{format(new Date(bill.invoiceDate), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{bill.transporterName}</TableCell>
                    <TableCell className="hidden md:table-cell font-mono">
                      {`₹ ${Number(bill.totalPayable).toFixed(2)}`}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {bill.billDocumentUri && (
                        <Button asChild variant="ghost" size="icon" className="hover:text-blue-600">
                          <a href={bill.billDocumentUri} download={`TransBill_${bill.invoiceNumber}.pdf`}><Download className="h-4 w-4" /></a>
                        </Button>
                      )}
                      {bill.lrDocumentUri && (
                         <Button asChild variant="ghost" size="icon" className="hover:text-green-600">
                          <a href={bill.lrDocumentUri} download={`LR_${bill.invoiceNumber}.pdf`}><Download className="h-4 w-4" /></a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => onEditBill(bill.id)} className="hover:text-primary">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action will mark the bill "{bill.invoiceNumber}" as deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDeleteBill(bill.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No transport bills found in the database.
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
