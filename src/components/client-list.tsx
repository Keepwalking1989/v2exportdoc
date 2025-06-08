
"use client";

import { useState, useMemo, useEffect } from "react";
import type { Client } from "@/types/client";
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
import { Search, ChevronLeft, ChevronRight, ListChecks, Briefcase } from "lucide-react";

interface ClientListProps {
  clients: Client[];
}

const ITEMS_PER_PAGE = 5;

export function ClientList({ clients: initialClients }: ClientListProps) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setClients(initialClients);
    setCurrentPage(1);
  }, [initialClients]);

  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    return clients.filter(
      (client) =>
        client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.person.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.pinCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clients, searchTerm]);

  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredClients.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredClients, currentPage]);

  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);

  return (
    <Card className="w-full shadow-xl mt-8">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <ListChecks className="h-6 w-6 text-primary" />
          Registered Clients
        </CardTitle>
        <CardDescription>View, search, and manage client information.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by company, person, city, country, PIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
        </div>

        {paginatedClients.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-headline">Company Name</TableHead>
                  <TableHead className="font-headline hidden sm:table-cell">Contact Person</TableHead>
                  <TableHead className="font-headline hidden md:table-cell">Contact No.</TableHead>
                  <TableHead className="font-headline hidden lg:table-cell">Address</TableHead>
                  <TableHead className="font-headline">City</TableHead>
                  <TableHead className="font-headline hidden sm:table-cell">Country</TableHead>
                  <TableHead className="font-headline hidden md:table-cell">PIN</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.companyName}</TableCell>
                    <TableCell className="hidden sm:table-cell">{client.person}</TableCell>
                    <TableCell className="hidden md:table-cell">{client.contactNumber}</TableCell>
                    <TableCell className="hidden lg:table-cell">{client.address}</TableCell>
                    <TableCell>{client.city}</TableCell>
                    <TableCell className="hidden sm:table-cell">{client.country}</TableCell>
                    <TableCell className="hidden md:table-cell">{client.pinCode}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No clients found.
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
