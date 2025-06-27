
"use client";

import { useState, useMemo, useEffect } from "react";
import type { Manufacturer } from "@/types/manufacturer";
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
import { Search, ChevronLeft, ChevronRight, ListChecks, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface ManufacturerListProps {
  manufacturers: Manufacturer[];
  onEditManufacturer: (id: string) => void;
  onDeleteManufacturer: (id: string) => void;
}

const ITEMS_PER_PAGE = 5;

export function ManufacturerList({ manufacturers: initialManufacturers, onEditManufacturer, onDeleteManufacturer }: ManufacturerListProps) {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>(initialManufacturers);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setManufacturers(initialManufacturers);
    if (initialManufacturers.length <= (currentPage - 1) * ITEMS_PER_PAGE && currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [initialManufacturers, currentPage]);

  const filteredManufacturers = useMemo(() => {
    if (!searchTerm) return manufacturers;
    return manufacturers.filter(
      (manufacturer) =>
        manufacturer.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manufacturer.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manufacturer.gstNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manufacturer.pinCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [manufacturers, searchTerm]);

  const paginatedManufacturers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredManufacturers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredManufacturers, currentPage]);

  const totalPages = Math.ceil(filteredManufacturers.length / ITEMS_PER_PAGE);

  return (
    <Card className="w-full shadow-xl mt-8">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <ListChecks className="h-6 w-6 text-primary" />
          Registered Manufacturers
        </CardTitle>
        <CardDescription>View, search, and manage manufacturer information.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, contact, GST, or PIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
        </div>

        {paginatedManufacturers.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-headline">Company Name</TableHead>
                  <TableHead className="font-headline hidden md:table-cell">Contact</TableHead>
                  <TableHead className="font-headline">GST No.</TableHead>
                  <TableHead className="font-headline hidden sm:table-cell">Stuffing Date</TableHead>
                  <TableHead className="font-headline text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedManufacturers.map((manufacturer) => (
                  <TableRow key={manufacturer.id}>
                    <TableCell className="font-medium">{manufacturer.companyName}</TableCell>
                    <TableCell className="hidden md:table-cell">{manufacturer.contactPerson}</TableCell>
                    <TableCell>{manufacturer.gstNumber}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {format(new Date(manufacturer.stuffingPermissionDate), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => onEditManufacturer(manufacturer.id)} className="hover:text-primary">
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
                              This action will mark the manufacturer "{manufacturer.companyName}" as deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDeleteManufacturer(manufacturer.id)}>
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
            No manufacturers found.
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
