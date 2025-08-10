
"use client";

import { useState, useMemo, useEffect } from "react";
import type { SupplyBill } from "@/types/supply-bill";
import type { Supplier } from "@/types/supplier";
import type { Pallet } from "@/types/pallet";
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
import { Search, ChevronLeft, ChevronRight, BookOpen, Edit, Trash2, Download } from "lucide-react";
import { format } from "date-fns";

interface SupplyBillListProps {
  supplyBills: SupplyBill[];
  allSuppliers: Supplier[];
  allPallets: Pallet[];
  allExportDocuments: ExportDocument[];
  onEditBill: (id: string) => void;
  onDeleteBill: (id: string) => void;
}

const ITEMS_PER_PAGE = 5;

export function SupplyBillListV2({ supplyBills, allSuppliers, allPallets, allExportDocuments, onEditBill, onDeleteBill }: SupplyBillListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const combinedSuppliers = useMemo(() => {
    const suppliers = allSuppliers.map(s => ({ id: s.id, name: s.companyName }));
    const pallets = allPallets.map(p => ({ id: p.id, name: p.companyName }));
    return [...suppliers, ...pallets];
  }, [allSuppliers, allPallets]);


  const enrichedBills = useMemo(() => {
    return supplyBills.map(bill => {
      const supplier = combinedSuppliers.find(s => s.id === bill.supplierId);
      const exportDoc = allExportDocuments.find(d => d.id === bill.exportDocumentId);

      // Placeholder for payment logic
      const outstandingAmount = bill.grandTotal;

      return {
        ...bill,
        supplierName: supplier?.name || "N/A",
        exportInvoiceNumber: exportDoc?.exportInvoiceNumber || "N/A",
        outstandingAmount,
      };
    });
  }, [supplyBills, combinedSuppliers, allExportDocuments]);

  const filteredBills = useMemo(() => {
    if (!searchTerm) return enrichedBills;
    return enrichedBills.filter(
      (bill) =>
        bill.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
          <BookOpen className="h-6 w-6 text-primary" />
          Saved Supply Bills (MySQL)
        </CardTitle>
        <CardDescription>View, search, and manage your supply bills from the database.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by Invoice #, Supplier, or Export Doc..."
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
                  <TableHead className="font-headline">Supplier/Pallet Co.</TableHead>
                  <TableHead className="font-headline hidden md:table-cell">Payable</TableHead>
                  <TableHead className="font-headline text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">{bill.invoiceNumber}</TableCell>
                    <TableCell className="hidden sm:table-cell">{format(new Date(bill.invoiceDate), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{bill.supplierName}</TableCell>
                    <TableCell className="hidden md:table-cell font-mono">
                      {`₹ ${bill.grandTotal.toFixed(2)}`}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {bill.billDocumentUri && (
                        <Button asChild variant="ghost" size="icon" className="hover:text-blue-600">
                          <a href={bill.billDocumentUri} download={`SupplyBill_${bill.invoiceNumber}.pdf`}><Download className="h-4 w-4" /></a>
                        </Button>
                      )}
                      {bill.ewayBillDocumentUri && (
                         <Button asChild variant="ghost" size="icon" className="hover:text-green-600">
                          <a href={bill.ewayBillDocumentUri} download={`EwayBill_${bill.invoiceNumber}.pdf`}><Download className="h-4 w-4" /></a>
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
            No supply bills found in the database.
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
