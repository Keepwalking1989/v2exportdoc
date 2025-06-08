
"use client";

import { useState, useMemo, useEffect } from "react";
import type { Transporter } from "@/types/transporter";
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
import { Search, ChevronLeft, ChevronRight, ListChecks } from "lucide-react";

interface TransporterListProps {
  transporters: Transporter[];
}

const ITEMS_PER_PAGE = 5;

export function TransporterList({ transporters: initialTransporters }: TransporterListProps) {
  const [transporters, setTransporters] = useState<Transporter[]>(initialTransporters);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setTransporters(initialTransporters);
    setCurrentPage(1);
  }, [initialTransporters]);

  const filteredTransporters = useMemo(() => {
    if (!searchTerm) return transporters;
    return transporters.filter(
      (transporter) =>
        transporter.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transporter.gstNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transporter.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transporters, searchTerm]);

  const paginatedTransporters = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransporters.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTransporters, currentPage]);

  const totalPages = Math.ceil(filteredTransporters.length / ITEMS_PER_PAGE);

  return (
    <Card className="w-full shadow-xl mt-8">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <ListChecks className="h-6 w-6 text-primary" />
          Registered Transporter Companies
        </CardTitle>
        <CardDescription>View, search, and manage transporter company information.</CardDescription>
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

        {paginatedTransporters.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-headline">Company Name</TableHead>
                  <TableHead className="font-headline">GST No.</TableHead>
                  <TableHead className="font-headline hidden md:table-cell">Contact Person</TableHead>
                  <TableHead className="font-headline hidden sm:table-cell">Contact No.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransporters.map((transporter) => (
                  <TableRow key={transporter.id}>
                    <TableCell className="font-medium">{transporter.companyName}</TableCell>
                    <TableCell>{transporter.gstNumber}</TableCell>
                    <TableCell className="hidden md:table-cell">{transporter.contactPerson}</TableCell>
                    <TableCell className="hidden sm:table-cell">{transporter.contactNumber}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No transporter companies found.
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
