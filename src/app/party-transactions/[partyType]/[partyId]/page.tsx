
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

import type { Transaction } from '@/types/transaction';
import type { Manufacturer } from '@/types/manufacturer';
import type { Transporter } from '@/types/transporter';
import type { Supplier } from '@/types/supplier';
import type { Pallet } from '@/types/pallet';

// Local Storage Keys
const LOCAL_STORAGE_TRANSACTIONS_KEY = "bizform_transactions";
const LOCAL_STORAGE_MANUFACTURERS_KEY = "bizform_manufacturers";
const LOCAL_STORAGE_TRANSPORTERS_KEY = "bizform_transporters";
const LOCAL_STORAGE_SUPPLIERS_KEY = "bizform_suppliers";
const LOCAL_STORAGE_PALLETS_KEY = "bizform_pallets";

type Party = Manufacturer | Transporter | Supplier | Pallet;

export default function PartyTransactionPage() {
    const router = useRouter();
    const params = useParams();
    const { partyType, partyId } = params as { partyType: string; partyId: string };

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [party, setParty] = useState<Party | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!partyType || !partyId) return;

        try {
            // Load transactions
            const storedTransactions = localStorage.getItem(LOCAL_STORAGE_TRANSACTIONS_KEY);
            const allTransactions: Transaction[] = storedTransactions ? JSON.parse(storedTransactions) : [];
            const partyTransactions = allTransactions.filter(
                t => t.partyType === partyType && t.partyId === partyId && !t.isDeleted
            ).map(t => ({...t, date: new Date(t.date)})).sort((a,b) => b.date.getTime() - a.date.getTime());
            setTransactions(partyTransactions);

            // Load party details
            let partyData: Party | null = null;
            let storageKey = "";
            if (partyType === 'manufacturer') storageKey = LOCAL_STORAGE_MANUFACTURERS_KEY;
            else if (partyType === 'transporter') storageKey = LOCAL_STORAGE_TRANSPORTERS_KEY;
            else if (partyType === 'supplier') storageKey = LOCAL_STORAGE_SUPPLIERS_KEY;
            else if (partyType === 'pallet') storageKey = LOCAL_STORAGE_PALLETS_KEY;

            if (storageKey) {
                const storedParties = localStorage.getItem(storageKey);
                const allParties: Party[] = storedParties ? JSON.parse(storedParties) : [];
                partyData = allParties.find(p => p.id === partyId) || null;
            }
            setParty(partyData);
        } catch (error) {
            console.error("Failed to load transaction data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [partyType, partyId]);

    const { totalCredit, totalDebit, balance } = useMemo(() => {
        let credit = 0;
        let debit = 0;
        transactions.forEach(t => {
            // Assuming all transactions for these parties are in INR as per previous logic.
            if (t.type === 'credit') credit += t.amount;
            if (t.type === 'debit') debit += t.amount;
        });
        return { totalCredit: credit, totalDebit: debit, balance: credit - debit };
    }, [transactions]);
    
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
                            <h3 className="text-sm font-medium text-muted-foreground">Total Paid to Them (Debit)</h3>
                            <p className="text-2xl font-bold text-destructive">₹{totalDebit.toFixed(2)}</p>
                        </div>
                        <div className="p-4 rounded-lg border bg-card">
                            <h3 className="text-sm font-medium text-muted-foreground">Total Received from Them (Credit)</h3>
                            <p className="text-2xl font-bold text-green-600">₹{totalCredit.toFixed(2)}</p>
                        </div>
                        <div className="p-4 rounded-lg border bg-card">
                            <h3 className="text-sm font-medium text-muted-foreground">Net Balance</h3>
                            <p className={cn("text-2xl font-bold", balance >= 0 ? 'text-green-600' : 'text-destructive')}>
                                ₹{balance.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">{balance >= 0 ? 'You have a credit' : 'You have a debit'}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Transactions</CardTitle>
                        <CardDescription>A list of all financial transactions with this company.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Amount (INR)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.length > 0 ? transactions.map(t => (
                                         <TableRow key={t.id}>
                                            <TableCell>
                                                <Badge variant={t.type === 'credit' ? 'default' : 'secondary'} className={cn(t.type === 'credit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700')}>
                                                    {t.type === 'credit' ? <ArrowUpCircle className="mr-1"/> : <ArrowDownCircle className="mr-1"/>}
                                                    {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{format(t.date, "dd/MM/yyyy")}</TableCell>
                                            <TableCell>{t.description || 'N/A'}</TableCell>
                                            <TableCell className={cn("text-right font-mono", t.type === 'credit' ? 'text-green-600' : 'text-red-600')}>
                                                ₹{t.amount.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground">No transactions found for this company.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </main>
             <footer className="py-6 text-center text-sm text-muted-foreground border-t">
                © {new Date().getFullYear()} HEMITH ERP. All rights reserved.
            </footer>
        </div>
    );
}
