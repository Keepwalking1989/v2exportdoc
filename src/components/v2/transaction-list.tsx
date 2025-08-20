
"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, ChevronLeft, ChevronRight, Edit, Trash2, ArrowUpCircle, ArrowDownCircle, User, Building2, Truck, Package, Palette, Landmark, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";
import type { Client } from "@/types/client";
import type { Manufacturer } from "@/types/manufacturer";
import type { Transporter } from "@/types/transporter";
import type { Supplier } from "@/types/supplier";
import type { Pallet } from "@/types/pallet";
import type { ExportDocument } from "@/types/export-document";
import type { ManuBill } from "@/types/manu-bill";
import type { TransBill } from "@/types/trans-bill";
import type { SupplyBill } from "@/types/supply-bill";

interface TransactionListProps {
  transactions: Transaction[];
  onEditTransaction: (id: string) => void;
  onDeleteTransaction: (id: string) => void;
  allClients: Client[];
  allManufacturers: Manufacturer[];
  allTransporters: Transporter[];
  allSuppliers: Supplier[];
  allPallets: Pallet[];
  allExportDocuments: ExportDocument[];
  allManuBills: ManuBill[];
  allTransBills: TransBill[];
  allSupplyBills: SupplyBill[];
}

const ITEMS_PER_PAGE = 10;

export function TransactionListV2({ 
  transactions, 
  onEditTransaction, 
  onDeleteTransaction,
  allClients,
  allManufacturers,
  allTransporters,
  allSuppliers,
  allPallets,
  allExportDocuments,
  allManuBills,
  allTransBills,
  allSupplyBills,
}: TransactionListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const getPartyDetails = (type: Transaction['partyType'], id: string): { name: string; icon: React.ElementType } => {
    switch (type) {
      case 'client': return { name: allClients.find(c => c.id.toString() === id)?.companyName || 'Unknown Client', icon: User };
      case 'manufacturer': return { name: allManufacturers.find(m => m.id.toString() === id)?.companyName || 'Unknown Manufacturer', icon: Building2 };
      case 'transporter': return { name: allTransporters.find(t => t.id.toString() === id)?.companyName || 'Unknown Transporter', icon: Truck };
      case 'supplier': return { name: allSuppliers.find(s => s.id.toString() === id)?.companyName || 'Unknown Supplier', icon: Package };
      case 'pallet': return { name: allPallets.find(p => p.id.toString() === id)?.companyName || 'Unknown Pallet Co.', icon: Palette };
      case 'gst': return { name: 'Government (GST)', icon: Landmark };
      case 'duty_drawback': return { name: 'Government (Duty Drawback)', icon: Landmark };
      case 'road_tp': return { name: 'Government (Road TP)', icon: Landmark };
      default: return { name: 'Unknown Party', icon: User };
    }
  };

  const enrichedTransactions = useMemo(() => {
    return transactions.map(t => {
      const exportDoc = t.exportDocumentId ? allExportDocuments.find(d => d.id.toString() === t.exportDocumentId) : undefined;
      const relatedInvoiceNumbers = t.relatedInvoices?.map(inv => {
        let bill;
        if(inv.type === 'manu') bill = allManuBills.find(b => b.id === inv.id);
        else if(inv.type === 'trans') bill = allTransBills.find(b => b.id === inv.id);
        else if(inv.type === 'supply') bill = allSupplyBills.find(b => b.id === inv.id);
        return bill?.invoiceNumber || 'Unknown Bill';
      }).join(', ');
      
      return {
        ...t,
        partyDetails: getPartyDetails(t.partyType, t.partyId),
        exportInvoiceNumber: exportDoc?.exportInvoiceNumber,
        relatedInvoiceNumbers: relatedInvoiceNumbers
      };
    });
  }, [transactions, allClients, allManufacturers, allTransporters, allSuppliers, allPallets, allExportDocuments, allManuBills, allTransBills, allSupplyBills]);

  const filteredTransactions = useMemo(() => {
    if (!searchTerm) return enrichedTransactions;
    const lowercasedFilter = searchTerm.toLowerCase();
    return enrichedTransactions.filter(t =>
      t.partyDetails.name.toLowerCase().includes(lowercasedFilter) ||
      t.description?.toLowerCase().includes(lowercasedFilter) ||
      t.relatedInvoiceNumbers?.toLowerCase().includes(lowercasedFilter) ||
      t.amount.toString().includes(lowercasedFilter)
    );
  }, [enrichedTransactions, searchTerm]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);

  return (
    <Card className="w-full shadow-xl mt-8">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Transaction History (DB)</CardTitle>
        <CardDescription>View, search, and manage your financial transactions from the database.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by party, amount, description, invoice #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
        </div>

        {paginatedTransactions.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((t) => {
                  const PartyIcon = t.partyDetails.icon;
                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        {t.type === 'debit' ? 
                          <span className="flex items-center gap-1 text-green-600"><ArrowUpCircle/> Debit</span> : 
                          <span className="flex items-center gap-1 text-red-600"><ArrowDownCircle/> Credit</span>
                        }
                      </TableCell>
                      <TableCell>{format(new Date(t.date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PartyIcon className="h-4 w-4 text-muted-foreground" />
                          {t.partyDetails.name}
                        </div>
                        {(t.exportInvoiceNumber || t.relatedInvoiceNumbers) && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {t.exportInvoiceNumber || t.relatedInvoiceNumbers}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{t.description}</TableCell>
                      <TableCell className={cn("text-right font-mono", t.type === 'debit' ? 'text-green-600' : 'text-red-600')}>
                          {Number(t.amount).toLocaleString(undefined, { style: 'currency', currency: t.currency, minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                         <Button variant="ghost" size="icon" onClick={() => onEditTransaction(t.id)} className="hover:text-primary">
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
                                This action will mark this transaction as deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDeleteTransaction(t.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No transactions found.
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
