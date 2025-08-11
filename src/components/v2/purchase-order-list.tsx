
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PurchaseOrder } from "@/types/purchase-order";
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
import { Search, ChevronLeft, ChevronRight, FileText, FilePenLine, Trash2, Download, FilePlus2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type EnrichedPurchaseOrder = PurchaseOrder & {
  exporterName: string;
  manufacturerName: string;
};

interface PurchaseOrderListProps {
  purchaseOrders: EnrichedPurchaseOrder[];
  onEditPo: (poId: string) => void;
  onDeletePo: (poId: string) => void;
  onDownloadPdf: (poId: string) => void; 
  onGenerateExportDoc: (poId: string) => void;
}

const ITEMS_PER_PAGE = 5;

export function PurchaseOrderListV2({
  purchaseOrders: initialPurchaseOrders,
  onEditPo,
  onDeletePo,
  onDownloadPdf,
  onGenerateExportDoc
}: PurchaseOrderListProps) {
  const router = useRouter(); 
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredPurchaseOrders = useMemo(() => {
    if (!searchTerm) return initialPurchaseOrders;
    return initialPurchaseOrders.filter(
      (po) =>
        po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.exporterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.manufacturerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [initialPurchaseOrders, searchTerm]);

  useEffect(() => {
    if (filteredPurchaseOrders.length <= (currentPage - 1) * ITEMS_PER_PAGE && currentPage > 1) {
      setCurrentPage(1);
    }
  }, [filteredPurchaseOrders, currentPage]);

  const paginatedPurchaseOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPurchaseOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPurchaseOrders, currentPage]);

  const totalPages = Math.ceil(filteredPurchaseOrders.length / ITEMS_PER_PAGE);

  const handleDelete = (poId: string, poNumber: string) => {
    onDeletePo(poId);
    toast({
      title: "Purchase Order Deleted",
      description: `PO ${poNumber} has been successfully deleted.`,
    });
  };

  return (
    <Card className="w-full shadow-xl mt-8">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Saved Purchase Orders (MySQL)
        </CardTitle>
        <CardDescription>View, search, and manage your purchase orders from the database.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by PO #, Exporter, Manufacturer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
        </div>

        {paginatedPurchaseOrders.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-headline">PO #</TableHead>
                  <TableHead className="font-headline hidden sm:table-cell">Date</TableHead>
                  <TableHead className="font-headline">Exporter</TableHead>
                  <TableHead className="font-headline hidden md:table-cell">Manufacturer</TableHead>
                  <TableHead className="font-headline text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPurchaseOrders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.poNumber}</TableCell>
                    <TableCell className="hidden sm:table-cell">{format(new Date(po.poDate), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{po.exporterName}</TableCell>
                    <TableCell className="hidden md:table-cell">{po.manufacturerName}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => onEditPo(po.id)} className="hover:text-primary" title="Edit PO">
                        <FilePenLine className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="icon" className="hover:text-destructive" title="Delete PO">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete Purchase Order "{po.poNumber}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(po.id, po.poNumber)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button variant="ghost" size="icon" onClick={() => onDownloadPdf(po.id)} className="hover:text-blue-600" title="Download PO PDF">
                        <Download className="h-4 w-4" />
                        <span className="sr-only">Download PDF</span>
                      </Button>
                       <Button variant="ghost" size="icon" onClick={() => onGenerateExportDoc(po.id)} className="hover:text-green-600" title="Create Export Document">
                        <FilePlus2 className="h-4 w-4" />
                         <span className="sr-only">Create Export Document</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No purchase orders found. Generate one from a Performa Invoice.
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
