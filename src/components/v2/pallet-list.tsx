
"use client";

import { useState, useMemo, useEffect } from "react";
import type { Pallet } from "@/types/pallet";
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
import { Search, ChevronLeft, ChevronRight, ListChecks, Edit, Trash2, ArrowLeftRight } from "lucide-react";
import Link from "next/link";

interface PalletListProps {
  pallets: Pallet[];
  onEditPallet: (id: string) => void;
  onDeletePallet: (id: string) => void;
}

const ITEMS_PER_PAGE = 5;

export function PalletListV2({ pallets: initialPallets, onEditPallet, onDeletePallet }: PalletListProps) {
  const [pallets, setPallets] = useState<Pallet[]>(initialPallets);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setPallets(initialPallets);
    if (initialPallets.length <= (currentPage - 1) * ITEMS_PER_PAGE && currentPage > 1) {
      setCurrentPage(1);
    }
  }, [initialPallets, currentPage]);

  const filteredPallets = useMemo(() => {
    if (!searchTerm) return pallets;
    return pallets.filter(
      (pallet) =>
        pallet.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pallet.gstNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pallet.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [pallets, searchTerm]);

  const paginatedPallets = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPallets.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPallets, currentPage]);

  const totalPages = Math.ceil(filteredPallets.length / ITEMS_PER_PAGE);

  return (
    <Card className="w-full shadow-xl mt-8">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <ListChecks className="h-6 w-6 text-primary" />
          Registered Pallet Suppliers (MySQL)
        </CardTitle>
        <CardDescription>View, search, and manage pallet supplier information from the database.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, GST, or contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
        </div>

        {paginatedPallets.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-headline">Company Name</TableHead>
                  <TableHead className="font-headline">GST No.</TableHead>
                  <TableHead className="font-headline hidden md:table-cell">Contact</TableHead>
                  <TableHead className="font-headline text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPallets.map((pallet) => (
                  <TableRow key={pallet.id}>
                    <TableCell className="font-medium">{pallet.companyName}</TableCell>
                    <TableCell>{pallet.gstNumber}</TableCell>
                    <TableCell className="hidden md:table-cell">{pallet.contactPerson}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button asChild variant="ghost" size="icon" className="hover:text-purple-600" title="View Transactions">
                          <Link href={`/v2/party-transactions/pallet/${pallet.id}`}>
                              <ArrowLeftRight className="h-4 w-4" />
                          </Link>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onEditPallet(pallet.id)} className="hover:text-primary">
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
                              This action will mark the pallet supplier "{pallet.companyName}" as deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDeletePallet(pallet.id)}>
                              Delete
                            </AlertDialogAction>
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
            No pallet suppliers found in the database.
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
