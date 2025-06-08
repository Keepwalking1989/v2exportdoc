
"use client";

import { useState, useMemo, useEffect } from "react";
import type { Bank } from "@/types/bank";
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
import { Search, ChevronLeft, ChevronRight, Landmark, ListChecks } from "lucide-react";

interface BankListProps {
  banks: Bank[];
}

const ITEMS_PER_PAGE = 5;

export function BankList({ banks: initialBanks }: BankListProps) {
  const [banks, setBanks] = useState<Bank[]>(initialBanks);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setBanks(initialBanks);
    setCurrentPage(1);
  }, [initialBanks]);

  const filteredBanks = useMemo(() => {
    if (!searchTerm) return banks;
    return banks.filter(
      (bank) =>
        bank.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bank.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bank.swiftCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bank.ifscCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [banks, searchTerm]);

  const paginatedBanks = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBanks.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredBanks, currentPage]);

  const totalPages = Math.ceil(filteredBanks.length / ITEMS_PER_PAGE);

  return (
    <Card className="w-full shadow-xl mt-8">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <ListChecks className="h-6 w-6 text-primary" />
          Registered Banks
        </CardTitle>
        <CardDescription>View, search, and manage bank information.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, A/C, SWIFT, or IFSC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
        </div>

        {paginatedBanks.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-headline">Bank Name</TableHead>
                  <TableHead className="font-headline hidden md:table-cell">Address</TableHead>
                  <TableHead className="font-headline">A/C No.</TableHead>
                  <TableHead className="font-headline hidden sm:table-cell">SWIFT</TableHead>
                  <TableHead className="font-headline hidden sm:table-cell">IFSC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBanks.map((bank) => (
                  <TableRow key={bank.id}>
                    <TableCell className="font-medium">{bank.bankName}</TableCell>
                    <TableCell className="hidden md:table-cell">{bank.bankAddress}</TableCell>
                    <TableCell>{bank.accountNumber}</TableCell>
                    <TableCell className="hidden sm:table-cell">{bank.swiftCode}</TableCell>
                    <TableCell className="hidden sm:table-cell">{bank.ifscCode}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No banks found.
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
