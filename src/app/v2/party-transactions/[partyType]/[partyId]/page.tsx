
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Banknote, Search, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Input } from "@/components/ui/input";

import type { Transaction } from '@/types/transaction';
import type { Manufacturer } from '@/types/manufacturer';
import type { Transporter } from '@/types/transporter';
import type { Supplier } from '@/types/supplier';
import type { Pallet } from '@/types/pallet';
import type { ManuBill } from '@/types/manu-bill';
import type { TransBill } from '@/types/trans-bill';
import type { SupplyBill } from '@/types/supply-bill';

type Party = Manufacturer | Transporter | Supplier | Pallet;
type LedgerItem = {
    id: string;
    date: Date;
    description: string;
    amount: number;
    currency: string;
}

const ITEMS_PER_PAGE = 5;

async function fetchPartyData(partyType: string, partyId: string): Promise<any> {
    const res = await fetch(`/api/v2/${partyType}-data`);
    if (!res.ok) throw new Error(`Failed to fetch ${partyType} data`);
    const allParties: any[] = await res.json();
    return allParties.find(p => p.id.toString() === partyId) || null;
}

async function fetchBills(partyType: string, partyId: string): Promise<LedgerItem[]> {
    let endpoint = '';
    if (partyType === 'manufacturer') endpoint = '/api/v2/manu-bill-data';
    else if (partyType === 'transporter') endpoint = '/api/v2/trans-bill-data';
    else if (partyType === 'supplier' || partyType === 'pallet') endpoint = '/api/v2/supply-bill-data';
    else return [];

    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`Failed to fetch bills for ${partyType}`);
    const bills: any[] = await res.json();
    
    const partyIdField = partyType === 'manufacturer' ? 'manufacturerId' : (partyType === 'transporter' ? 'transporterId' : 'supplierId');

    return bills
        .filter(b => b[partyIdField].toString() === partyId && !b.isDeleted)
        .map(b => ({
            id: `bill_${b.id}`,
            date: new Date(b.invoiceDate),
            description: `Bill - ${b.invoiceNumber}`,
            amount: b.grandTotal || b.totalPayable || 0,
            currency: 'INR'
        }));
}

async function fetchPayments(partyType: string, partyId: string): Promise<LedgerItem[]> {
    const res = await fetch('/api/v2/transaction-data');
    if (!res.ok) throw new Error('Failed to fetch transactions');
    const allTransactions: Transaction[] = await res.json();
    return allTransactions
        .filter(t => t.partyType === partyType && t.partyId.toString() === partyId && t.type === 'credit' && !t.isDeleted)
        .map(t => ({
            id: t.id,
            date: new Date(t.date),
            description: t.description || 'Payment',
            amount: t.amount,
            currency: t.currency
        }));
}


export default function PartyTransactionPageV2() {
    const router = useRouter();
    const params = useParams();
    const { partyType, partyId } = params as { partyType: string; partyId: string };

    const [debitItems, setDebitItems] = useState<LedgerItem[]>([]);
    const [creditItems, setCreditItems] = useState<LedgerItem[]>([]);
    const [party, setParty] = useState<Party | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // State for search and pagination
    const [debitSearchTerm, setDebitSearchTerm] = useState('');
    const [creditSearchTerm, setCreditSearchTerm] = useState('');
    const [debitCurrentPage, setDebitCurrentPage] = useState(1);
    const [creditCurrentPage, setCreditCurrentPage] = useState(1);

    useEffect(() => {
        if (!partyType || !partyId) return;

        const loadAllData = async () => {
            setIsLoading(true);
            try {
                const [partyDetails, bills, payments] = await Promise.all([
                    fetchPartyData(partyType, partyId),
                    fetchBills(partyType, partyId),
                    fetchPayments(partyType, partyId)
                ]);

                setParty(partyDetails);
                setDebitItems(bills.sort((a,b) => b.date.getTime() - a.date.getTime()));
                setCreditItems(payments.sort((a,b) => b.date.getTime() - a.date.getTime()));

            } catch (error) {
                console.error("Failed to load transaction data:", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadAllData();
    }, [partyType, partyId]);

    const { totalCredit, totalDebit, balance } = useMemo(() => {
        const debitTotal = debitItems.reduce((acc, t) => acc + Number(t.amount), 0);
        const creditTotal = creditItems.reduce((acc, t) => acc + Number(t.amount), 0);
        return {
            totalDebit: debitTotal,
            totalCredit: creditTotal,
            balance: debitTotal - creditTotal, // Debits (Bills) - Credits (Payments) = Balance Owed
        };
    }, [debitItems, creditItems]);

    // Debit filtering and pagination
    const filteredDebits = useMemo(() => {
        if (!debitSearchTerm) return debitItems;
        return debitItems.filter(t => t.description?.toLowerCase().includes(debitSearchTerm.toLowerCase()));
    }, [debitItems, debitSearchTerm]);

    const paginatedDebits = useMemo(() => {
        const startIndex = (debitCurrentPage - 1) * ITEMS_PER_PAGE;
        return filteredDebits.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredDebits, debitCurrentPage]);
    
    const totalDebitPages = Math.ceil(filteredDebits.length / ITEMS_PER_PAGE);

    // Credit filtering and pagination
    const filteredCredits = useMemo(() => {
        if (!creditSearchTerm) return creditItems;
        return creditItems.filter(t => t.description?.toLowerCase().includes(creditSearchTerm.toLowerCase()));
    }, [creditItems, creditSearchTerm]);

    const paginatedCredits = useMemo(() => {
        const startIndex = (creditCurrentPage - 1) * ITEMS_PER_PAGE;
        return filteredCredits.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredCredits, creditCurrentPage]);

    const totalCreditPages = Math.ceil(filteredCredits.length / ITEMS_PER_PAGE);
    
    const partyTypeName = partyType.charAt(0).toUpperCase() + partyType.slice(1);

    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen bg-background">
                <Header />
                <main className="flex-grow container mx-auto px-4 py-8">
                    <p className="text-center text-muted-foreground">Loading transaction data...</p>
                </main>
            </div>
        );
    }
    
    if (!party) {
         return (
            <div className="flex flex-col min-h-screen bg-background">
                <Header />
                <main className="flex-grow container mx-auto px-4 py-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Party Not Found</CardTitle>
                            <CardDescription>Could not find the requested company.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={() => router.back()}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                            </Button>
                        </CardContent>
                    </Card>
                </main>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8 space-y-8">
                <div className="flex justify-between items-center">
                     <div>
                        <h1 className="text-3xl font-bold font-headline text-primary">{party.companyName}</h1>
                        <p className="text-muted-foreground">Transaction History for {partyTypeName}</p>
                    </div>
                    <Button onClick={() => router.back()} variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Account Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <div className="p-4 rounded-lg border bg-card">
                            <h3 className="text-sm font-medium text-muted-foreground">Total Bills (Debit)</h3>
                            <p className="text-2xl font-bold text-destructive">₹{Number(totalDebit).toFixed(2)}</p>
                        </div>
                        <div className="p-4 rounded-lg border bg-card">
                            <h3 className="text-sm font-medium text-muted-foreground">Total Payments (Credit)</h3>
                            <p className="text-2xl font-bold text-green-600">₹{Number(totalCredit).toFixed(2)}</p>
                        </div>
                        <div className="p-4 rounded-lg border bg-card">
                            <h3 className="text-sm font-medium text-muted-foreground">Net Balance</h3>
                            <p className={cn("text-2xl font-bold", balance > 0 ? 'text-destructive' : 'text-green-600')}>
                                ₹{Number(balance).toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">{balance > 0 ? 'You owe them' : (balance < 0 ? 'They owe you / Overpaid' : 'Settled')}</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-8 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><FileText className="text-destructive"/> Bill Entry</CardTitle>
                            <CardDescription>A list of all bills received from this company, increasing the amount you owe.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Search by description..."
                                        value={debitSearchTerm}
                                        onChange={(e) => setDebitSearchTerm(e.target.value)}
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
                                            <TableHead className="text-right">Amount (INR)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedDebits.length > 0 ? paginatedDebits.map(t => (
                                            <TableRow key={t.id}>
                                                <TableCell>{format(t.date, "dd/MM/yyyy")}</TableCell>
                                                <TableCell>{t.description || 'N/A'}</TableCell>
                                                <TableCell className="text-right font-mono text-destructive">
                                                    ₹{Number(t.amount).toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center text-muted-foreground">No bills found.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                             {totalDebitPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setDebitCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={debitCurrentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" />
                                        Previous
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        Page {debitCurrentPage} of {totalDebitPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setDebitCurrentPage((p) => Math.min(totalDebitPages, p + 1))}
                                        disabled={debitCurrentPage === totalDebitPages}
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
                            <CardTitle className="flex items-center gap-2"><Banknote className="text-green-600"/> Payments Made (Credit)</CardTitle>
                            <CardDescription>A list of all payments made to this company, reducing the amount you owe.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Search by description..."
                                        value={creditSearchTerm}
                                        onChange={(e) => setCreditSearchTerm(e.target.value)}
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
                                            <TableHead className="text-right">Amount (INR)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedCredits.length > 0 ? paginatedCredits.map(t => (
                                            <TableRow key={t.id}>
                                                <TableCell>{format(t.date, "dd/MM/yyyy")}</TableCell>
                                                <TableCell>{t.description || 'N/A'}</TableCell>
                                                <TableCell className="text-right font-mono text-green-600">
                                                    ₹{Number(t.amount).toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center text-muted-foreground">No payments found.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            {totalCreditPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCreditCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={creditCurrentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" />
                                        Previous
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        Page {creditCurrentPage} of {totalCreditPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCreditCurrentPage((p) => Math.min(totalCreditPages, p + 1))}
                                        disabled={creditCurrentPage === totalCreditPages}
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
