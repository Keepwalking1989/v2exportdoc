
"use client";

import { useState, useMemo, useEffect } from "react";
import type { Size } from "@/types/size";
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
import { Search, ChevronLeft, ChevronRight, ListChecks, Ruler } from "lucide-react";

interface SizeListProps {
  sizes: Size[];
}

const ITEMS_PER_PAGE = 5;

export function SizeList({ sizes: initialSizes }: SizeListProps) {
  const [sizes, setSizes] = useState<Size[]>(initialSizes);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setSizes(initialSizes);
    setCurrentPage(1);
  }, [initialSizes]);

  const filteredSizes = useMemo(() => {
    if (!searchTerm) return sizes;
    return sizes.filter(
      (size) =>
        size.size.toLowerCase().includes(searchTerm.toLowerCase()) ||
        size.hsnCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        size.palletDetails.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sizes, searchTerm]);

  const paginatedSizes = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSizes.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSizes, currentPage]);

  const totalPages = Math.ceil(filteredSizes.length / ITEMS_PER_PAGE);

  return (
    <Card className="w-full shadow-xl mt-8">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Ruler className="h-6 w-6 text-primary" />
          Registered Sizes
        </CardTitle>
        <CardDescription>View, search, and manage product size information.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by size, HSN, or pallet details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
        </div>

        {paginatedSizes.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-headline">Size</TableHead>
                  <TableHead className="font-headline hidden sm:table-cell">SQM/Box</TableHead>
                  <TableHead className="font-headline hidden sm:table-cell">Box Wt.</TableHead>
                  <TableHead className="font-headline hidden md:table-cell">Purchase Price</TableHead>
                  <TableHead className="font-headline hidden md:table-cell">Sales Price</TableHead>
                  <TableHead className="font-headline">HSN Code</TableHead>
                  <TableHead className="font-headline hidden lg:table-cell">Pallet Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSizes.map((size) => (
                  <TableRow key={size.id}>
                    <TableCell className="font-medium">{size.size}</TableCell>
                    <TableCell className="hidden sm:table-cell">{size.sqmPerBox}</TableCell>
                    <TableCell className="hidden sm:table-cell">{size.boxWeight}</TableCell>
                    <TableCell className="hidden md:table-cell">{size.purchasePrice}</TableCell>
                    <TableCell className="hidden md:table-cell">{size.salesPrice}</TableCell>
                    <TableCell>{size.hsnCode}</TableCell>
                    <TableCell className="hidden lg:table-cell">{size.palletDetails}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No sizes found.
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
