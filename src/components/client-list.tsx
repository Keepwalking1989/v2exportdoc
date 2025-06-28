
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, ChevronLeft, ChevronRight, ListChecks, Edit, Trash2, ArrowLeftRight } from "lucide-react";
import Link from "next/link";

interface ClientListProps {
  clients: Client[];
  onEditClient: (id: string) => void;
  onDeleteClient: (id: string) => void;
}

const ITEMS_PER_PAGE = 5;

export function ClientList({ clients: initialClients, onEditClient, onDeleteClient }: ClientListProps) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setClients(initialClients);
    if (initialClients.length <= (currentPage - 1) * ITEMS_PER_PAGE && currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [initialClients, currentPage]);

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
                  <TableHead className="font-headline hidden sm:table-cell">Contact</TableHead>
                  <TableHead className="font-headline">City</TableHead>
                  <TableHead className="font-headline hidden sm:table-cell">Country</TableHead>
                  <TableHead className="font-headline text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.companyName}</TableCell>
                    <TableCell className="hidden sm:table-cell">{client.person}</TableCell>
                    <TableCell>{client.city}</TableCell>
                    <TableCell className="hidden sm:table-cell">{client.country}</TableCell>
                    <TableCell className="text-right space-x-1">
                       <Button asChild variant="ghost" size="icon" className="hover:text-purple-600">
                          <Link href={`/party-transactions/client/${client.id}`}>
                              <ArrowLeftRight className="h-4 w-4" />
                          </Link>
                      </Button>
                       <Button variant="ghost" size="icon" onClick={() => onEditClient(client.id)} className="hover:text-primary">
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
                                    This action will mark the client "{client.companyName}" as deleted. It won't be permanently removed but will be hidden from lists.
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => onDeleteClient(client.id)}>
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
