
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, ArrowDown, ArrowUp, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import type { ManuBill } from '@/types/manu-bill';
import type { TransBill } from '@/types/trans-bill';
import type { SupplyBill } from '@/types/supply-bill';
import type { Transaction } from '@/types/transaction';
import type { Manufacturer } from '@/types/manufacturer';
import type { Transporter } from '@/types/transporter';
import type { Supplier } from '@/types/supplier';
import type { Pallet } from '@/types/pallet';

// Local Storage Keys
const LOCAL_STORAGE_MANU_BILLS_KEY = "bizform_manu_bills";
const LOCAL_STORAGE_TRANS_BILLS_KEY = "bizform_trans_bills";
const LOCAL_STORAGE_SUPPLY_BILLS_KEY = "bizform_supply_bills";
const LOCAL_STORAGE_TRANSACTIONS_KEY = "bizform_transactions";
const LOCAL_STORAGE_MANUFACTURERS_KEY = "bizform_manufacturers";
const LOCAL_STORAGE_TRANSPORTERS_KEY = "bizform_transporters";
const LOCAL_STORAGE_SUPPLIERS_KEY = "bizform_suppliers";
const LOCAL_STORAGE_PALLETS_KEY = "bizform_pallets";

interface GstPaidItem {
  id: string;
  date: Date;
  invoiceNumber: string;
  partyName: string;
  gstAmount: number;
  type: 'Manufacturer' | 'Transport' | 'Supply';
}

const ITEMS_PER_PAGE = 5;

const StatCard = ({ title, value, icon, description, colorClass }: { title: string; value: string; icon: React.ReactNode; description: string; colorClass?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className={`text-2xl font-bold ${colorClass || ''}`}>{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);

export default function GstPage() {
    const [isClient, setIsClient] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [allGstPaid, setAllGstPaid] = useState<GstPaidItem[]>([]);
    const [allGstReceived, setAllGstReceived] = useState<Transaction[]>([]);

    const [totalGstPaid, setTotalGstPaid] = useState(0);
    const [totalGstReceived, setTotalGstReceived] = useState(0);

    // State for GST Paid list
    const [gstPaidSearchTerm, setGstPaidSearchTerm] = useState('');
    const [gstPaidCurrentPage, setGstPaidCurrentPage] = useState(1);

    // State for GST Received list
    const [gstReceivedSearchTerm, setGstReceivedSearchTerm] = useState('');
    const [gstReceivedCurrentPage, setGstReceivedCurrentPage] = useState(1);

    useEffect(() => {
        setIsClient(true);
        if (typeof window !== "undefined") {
            try {
                // Fetch all data from localStorage
                const manuBills: ManuBill[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_MANU_BILLS_KEY) || "[]");
                const transBills: TransBill[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_TRANS_BILLS_KEY) || "[]");
                const supplyBills: SupplyBill[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_SUPPLY_BILLS_KEY) || "[]");
                const transactions: Transaction[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_TRANSACTIONS_KEY) || "[]");
                
                const manufacturers: Manufacturer[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_MANUFACTURERS_KEY) || "[]");
                const transporters: Transporter[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_TRANSPORTERS_KEY) || "[]");
                const suppliers: Supplier[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_SUPPLIERS_KEY) || "[]");
                const pallets: Pallet[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_PALLETS_KEY) || "[]");
                const allSupplierLike = [...suppliers, ...pallets];

                // Process GST Paid
                const gstPaidItems: GstPaidItem[] = [];
                
                manuBills.forEach(bill => {
                    const gstAmount = (bill.centralTaxAmount || 0) + (bill.stateTaxAmount || 0);
                    if (gstAmount > 1) {
                        const party = manufacturers.find(m => m.id === bill.manufacturerId);
                        gstPaidItems.push({
                            id: bill.id,
                            date: new Date(bill.invoiceDate),
                            invoiceNumber: bill.invoiceNumber,
                            partyName: party?.companyName || 'Unknown',
                            gstAmount,
                            type: 'Manufacturer'
                        });
                    }
                });

                transBills.forEach(bill => {
                    const gstAmount = bill.totalTax || 0;
                     if (gstAmount > 1) {
                        const party = transporters.find(t => t.id === bill.transporterId);
                        gstPaidItems.push({
                            id: bill.id,
                            date: new Date(bill.invoiceDate),
                            invoiceNumber: bill.invoiceNumber,
                            partyName: party?.companyName || 'Unknown',
                            gstAmount,
                            type: 'Transport'
                        });
                    }
                });
                
                supplyBills.forEach(bill => {
                     const gstAmount = (bill.centralTaxAmount || 0) + (bill.stateTaxAmount || 0);
                     if (gstAmount > 1) {
                        const party = allSupplierLike.find(s => s.id === bill.supplierId);
                        gstPaidItems.push({
                            id: bill.id,
                            date: new Date(bill.invoiceDate),
                            invoiceNumber: bill.invoiceNumber,
                            partyName: party?.companyName || 'Unknown',
                            gstAmount,
                            type: 'Supply'
                        });
                    }
                });

                gstPaidItems.sort((a, b) => b.date.getTime() - a.date.getTime());
                setAllGstPaid(gstPaidItems);
                setTotalGstPaid(gstPaidItems.reduce((acc, item) => acc + item.gstAmount, 0));

                // Process GST Received
                const gstReceivedTransactions = transactions.filter(t => t.type === 'credit' && t.partyType === 'gst' && !t.isDeleted);
                gstReceivedTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setAllGstReceived(gstReceivedTransactions);
                setTotalGstReceived(gstReceivedTransactions.reduce((acc, item) => acc + item.amount, 0));

            } catch (error) {
                console.error("Failed to load GST data from localStorage", error);
            } finally {
                setIsLoading(false);
            }
        }
    }, []);

    const remainingGst = useMemo(() => totalGstPaid - totalGstReceived, [totalGstPaid, totalGstReceived]);

    // GST Paid filtering and pagination
    const filteredGstPaid = useMemo(() => {
        if (!gstPaidSearchTerm) return allGstPaid;
        return allGstPaid.filter(
            item =>
                item.partyName.toLowerCase().includes(gstPaidSearchTerm.toLowerCase()) ||
                item.invoiceNumber.toLowerCase().includes(gstPaidSearchTerm.toLowerCase())
        );
    }, [allGstPaid, gstPaidSearchTerm]);

    const paginatedGstPaid = useMemo(() => {
        const startIndex = (gstPaidCurrentPage - 1) * ITEMS_PER_PAGE;
        return filteredGstPaid.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredGstPaid, gstPaidCurrentPage]);

    const totalGstPaidPages = Math.ceil(filteredGstPaid.length / ITEMS_PER_PAGE);

    // GST Received filtering and pagination
    const filteredGstReceived = useMemo(() => {
        if (!gstReceivedSearchTerm) return allGstReceived;
        return allGstReceived.filter(
            item =>
                item.description?.toLowerCase().includes(gstReceivedSearchTerm.toLowerCase())
        );
    }, [allGstReceived, gstReceivedSearchTerm]);

    const paginatedGstReceived = useMemo(() => {
        const startIndex = (gstReceivedCurrentPage - 1) * ITEMS_PER_PAGE;
        return filteredGstReceived.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredGstReceived, gstReceivedCurrentPage]);

    const totalGstReceivedPages = Math.ceil(filteredGstReceived.length / ITEMS_PER_PAGE);


    if (!isClient || isLoading) {
      return (
        <div className="flex flex-col min-h-screen bg-background">
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            <div className="text-center text-muted-foreground">Loading GST data...</div>
          </main>
        </div>
      );
    }
    
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-3xl">GST Summary</CardTitle>
                        <CardDescription>An overview of your Goods and Services Tax input and refunds.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <StatCard 
                            title="Total GST Paid (Input)"
                            value={`₹ ${totalGstPaid.toFixed(2)}`}
                            icon={<ArrowDown className="h-4 w-4 text-destructive" />}
                            description="Total tax paid on purchases."
                            colorClass="text-destructive"
                        />
                         <StatCard 
                            title="Total GST Received (Refund)"
                            value={`₹ ${totalGstReceived.toFixed(2)}`}
                            icon={<ArrowUp className="h-4 w-4 text-green-600" />}
                            description="Total refunds received from government."
                            colorClass="text-green-600"
                        />
                         <StatCard 
                            title="Net Receivable"
                            value={`₹ ${remainingGst.toFixed(2)}`}
                            icon={<IndianRupee className="h-4 w-4 text-primary" />}
                            description="Amount pending to be received."
                            colorClass="text-primary"
                        />
                    </CardContent>
                </Card>

                <div className="grid gap-8 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>GST Paid Details</CardTitle>
                            <CardDescription>List of all bills with GST paid.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Search by Party or Invoice #"
                                        value={gstPaidSearchTerm}
                                        onChange={(e) => setGstPaidSearchTerm(e.target.value)}
                                        className="pl-8 w-full"
                                    />
                                </div>
                            </div>
                            <div className="rounded-md border h-96 overflow-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background">
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Party</TableHead>
                                            <TableHead>Invoice #</TableHead>
                                            <TableHead className="text-right">GST Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedGstPaid.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell>{format(item.date, "dd/MM/yy")}</TableCell>
                                                <TableCell>
                                                    {item.partyName}
                                                    <Badge variant="secondary" className="ml-2">{item.type}</Badge>
                                                </TableCell>
                                                <TableCell>{item.invoiceNumber}</TableCell>
                                                <TableCell className="text-right font-mono">₹ {item.gstAmount.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {totalGstPaidPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setGstPaidCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={gstPaidCurrentPage === 1}
                                    >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Previous
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                    Page {gstPaidCurrentPage} of {totalGstPaidPages}
                                    </span>
                                    <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setGstPaidCurrentPage((p) => Math.min(totalGstPaidPages, p + 1))}
                                    disabled={gstPaidCurrentPage === totalGstPaidPages}
                                    >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>GST Received Details</CardTitle>
                             <CardDescription>List of all GST refund transactions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <div className="mb-4">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Search by description..."
                                        value={gstReceivedSearchTerm}
                                        onChange={(e) => setGstReceivedSearchTerm(e.target.value)}
                                        className="pl-8 w-full"
                                    />
                                </div>
                            </div>
                           <div className="rounded-md border h-96 overflow-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background">
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedGstReceived.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell>{format(new Date(item.date), "dd/MM/yy")}</TableCell>
                                                <TableCell>{item.description || 'GST Refund'}</TableCell>
                                                <TableCell className="text-right font-mono text-green-600">₹ {item.amount.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                           </div>
                            {totalGstReceivedPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setGstReceivedCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={gstReceivedCurrentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" />
                                        Previous
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        Page {gstReceivedCurrentPage} of {totalGstReceivedPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setGstReceivedCurrentPage((p) => Math.min(totalGstReceivedPages, p + 1))}
                                        disabled={gstReceivedCurrentPage === totalGstReceivedPages}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
             <footer className="py-6 text-center text-sm text-muted-foreground border-t">
                © {new Date().getFullYear()} HEMITH ERP. All rights reserved.
            </footer>
        </div>
    );
}

