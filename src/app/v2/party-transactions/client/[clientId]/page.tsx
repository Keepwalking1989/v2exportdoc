
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
import type { Client } from '@/types/client';
import type { PerformaInvoice } from '@/types/performa-invoice';
import type { PurchaseOrder } from '@/types/purchase-order';
import type { ExportDocument } from '@/types/export-document';
import type { Product } from '@/types/product';
import type { Size } from '@/types/size';

interface LedgerItem {
    id: string;
    date: Date;
    description: string;
    amount: number;
    currency: string;
}

const ITEMS_PER_PAGE = 5;

// --- Data Fetching and Processing Functions ---

async function fetchClientDetails(clientId: string): Promise<Client | null> {
    const res = await fetch('/api/v2/client-data');
    if (!res.ok) throw new Error('Failed to fetch clients');
    const allClients: Client[] = await res.json();
    return allClients.find(c => c.id.toString() === clientId) || null;
}

async function fetchClientInvoices(clientId: string): Promise<LedgerItem[]> {
    const [docsRes, poRes, piRes, productsRes, sizesRes] = await Promise.all([
        fetch('/api/v2/export-document-data'),
        fetch('/api/v2/purchase-order-data'),
        fetch('/api/v2/performa-invoice-data'),
        fetch('/api/v2/product-data'),
        fetch('/api/v2/size-data')
    ]);

    if (!docsRes.ok || !poRes.ok || !piRes.ok || !productsRes.ok || !sizesRes.ok) {
        throw new Error('Failed to fetch all necessary documents for invoice calculation.');
    }

    const allExportDocs: ExportDocument[] = await docsRes.json();
    const allPOs: PurchaseOrder[] = await poRes.json();
    const allPIs: PerformaInvoice[] = await piRes.json();
    const allProducts: Product[] = await productsRes.json();
    const allSizes: Size[] = await sizesRes.json();

    const poToPiIdMap = new Map(allPOs.map(po => [po.id, po.sourcePiId]));
    const piIdToCurrencyMap = new Map(allPIs.map(pi => [pi.id, pi.currencyType]));

    // --- Filter directly by clientId on the export document ---
    const clientExportDocs = allExportDocs.filter(doc => doc.clientId?.toString() === clientId);

    const calculateDocTotal = (doc: ExportDocument): number => {
        let total = 0;
        doc.containerItems?.forEach(container => {
            const items = [...(container.productItems || []), ...(container.sampleItems || [])];
            items.forEach(item => {
                const product = allProducts.find(p => p.id === item.productId);
                if (!product) return;
                const size = allSizes.find(s => s.id === product.sizeId);
                if (!size) return;
                // Ensure all parts of the calculation are valid numbers
                total += (item.boxes || 0) * (size.sqmPerBox || 0) * (item.rate || 0);
            });
        });
        // Ensure freight is also treated as a number
        return total + (doc.freight || 0);
    };

    return clientExportDocs.map(doc => {
        // Find currency from PI if available, otherwise default
        const piId = doc.purchaseOrderId ? poToPiIdMap.get(doc.purchaseOrderId) : undefined;
        const currency = (piId ? piIdToCurrencyMap.get(piId) : 'USD') || 'USD';
        return {
            id: doc.id,
            date: new Date(doc.exportInvoiceDate),
            description: doc.exportInvoiceNumber,
            amount: calculateDocTotal(doc),
            currency,
        };
    }).sort((a, b) => b.date.getTime() - a.date.getTime());
}

async function fetchClientPayments(clientId: string): Promise<LedgerItem[]> {
    const res = await fetch('/api/v2/transaction-data');
    if (!res.ok) throw new Error('Failed to fetch transactions');
    const allTransactions: Transaction[] = await res.json();
    
    return allTransactions
        .filter(t => t.partyType === 'client' && t.partyId.toString() === clientId && t.type === 'debit' && !t.isDeleted)
        .map(t => ({
            id: t.id,
            date: new Date(t.date),
            description: t.description || 'Payment Received',
            amount: t.amount,
            currency: t.currency
        }))
        .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export default function ClientTransactionPageV2() {
    const router = useRouter();
    const params = useParams();
    const { clientId } = params as { clientId: string };

    const [invoicedItems, setInvoicedItems] = useState<LedgerItem[]>([]);
    const [paymentItems, setPaymentItems] = useState<LedgerItem[]>([]);
    const [client, setClient] = useState<Client | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
    const [paymentSearchTerm, setPaymentSearchTerm] = useState('');
    const [invoiceCurrentPage, setInvoiceCurrentPage] = useState(1);
    const [paymentCurrentPage, setPaymentCurrentPage] = useState(1);
    
    useEffect(() => {
        if (!clientId) return;

        const loadAllData = async () => {
            setIsLoading(true);
            try {
                 const [clientDetails, invoices, payments] = await Promise.all([
                    fetchClientDetails(clientId),
                    fetchClientInvoices(clientId),
                    fetchClientPayments(clientId)
                ]);
                setClient(clientDetails);
                setInvoicedItems(invoices);
                setPaymentItems(payments);
            } catch (error) {
                console.error("Failed to load client transaction data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadAllData();
    }, [clientId]);

    const { totalInvoiced, totalReceived, balance, currency } = useMemo(() => {
        // NOTE: Assumes single currency for simplicity.
        const firstInvoiceCurrency = invoicedItems[0]?.currency || 'USD';
        const invoicedTotal = invoicedItems.reduce((acc, item) => acc + Number(item.amount), 0);
        const receivedTotal = paymentItems.reduce((acc, item) => acc + Number(item.amount), 0);
        return {
            totalInvoiced: invoicedTotal,
            totalReceived: receivedTotal,
            balance: invoicedTotal - receivedTotal,
            currency: firstInvoiceCurrency,
        };
    }, [invoicedItems, paymentItems]);

    // Filtering and pagination
    const filteredInvoices = useMemo(() => {
        if (!invoiceSearchTerm) return invoicedItems;
        return invoicedItems.filter(t => t.description?.toLowerCase().includes(invoiceSearchTerm.toLowerCase()));
    }, [invoicedItems, invoiceSearchTerm]);
    const paginatedInvoices = useMemo(() => {
        const startIndex = (invoiceCurrentPage - 1) * ITEMS_PER_PAGE;
        return filteredInvoices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredInvoices, invoiceCurrentPage]);
    const totalInvoicePages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);

    const filteredPayments = useMemo(() => {
        if (!paymentSearchTerm) return paymentItems;
        return paymentItems.filter(t => t.description?.toLowerCase().includes(paymentSearchTerm.toLowerCase()));
    }, [paymentItems, paymentSearchTerm]);
    const paginatedPayments = useMemo(() => {
        const startIndex = (paymentCurrentPage - 1) * ITEMS_PER_PAGE;
        return filteredPayments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredPayments, paymentCurrentPage]);
    const totalPaymentPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);

    if (isLoading) {
        return <div className="flex flex-col min-h-screen bg-background"><Header /><main className="flex-grow container mx-auto px-4 py-8"><p className="text-center text-muted-foreground">Loading transaction data...</p></main></div>;
    }
    
    if (!client) {
        return <div className="flex flex-col min-h-screen bg-background"><Header /><main className="flex-grow container mx-auto px-4 py-8"><Card><CardHeader><CardTitle>Client Not Found</CardTitle></CardHeader><CardContent><Button onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4"/> Go Back</Button></CardContent></Card></main></div>;
    }

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8 space-y-8">
                <div className="flex justify-between items-center">
                     <div>
                        <h1 className="text-3xl font-bold font-headline text-primary">{client.companyName}</h1>
                        <p className="text-muted-foreground">Transaction History (V2)</p>
                    </div>
                    <Button onClick={() => router.back()} variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Button>
                </div>

                <Card>
                    <CardHeader><CardTitle>Account Summary</CardTitle></CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <div className="p-4 rounded-lg border bg-card">
                            <h3 className="text-sm font-medium text-muted-foreground">Total Invoiced</h3>
                            <p className="text-2xl font-bold text-destructive">{currency}{Number(totalInvoiced).toFixed(2)}</p>
                        </div>
                        <div className="p-4 rounded-lg border bg-card">
                            <h3 className="text-sm font-medium text-muted-foreground">Total Payments Received</h3>
                            <p className="text-2xl font-bold text-green-600">{currency}{Number(totalReceived).toFixed(2)}</p>
                        </div>
                        <div className="p-4 rounded-lg border bg-card">
                            <h3 className="text-sm font-medium text-muted-foreground">Net Balance</h3>
                            <p className={cn("text-2xl font-bold", balance > 0 ? 'text-destructive' : 'text-green-600')}>{currency}{Number(balance).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{balance > 0 ? 'Client owes you' : (balance < 0 ? 'You owe client / Overpaid' : 'Settled')}</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-8 lg:grid-cols-2">
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="text-destructive"/> Invoices Issued (Debit)</CardTitle><CardDescription>List of all invoices issued to this client.</CardDescription></CardHeader>
                        <CardContent>
                             <div className="mb-4 relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="search" placeholder="Search by invoice #" value={invoiceSearchTerm} onChange={(e) => setInvoiceSearchTerm(e.target.value)} className="pl-8 w-full"/></div>
                            <div className="rounded-md border h-96 overflow-auto">
                                <Table><TableHeader className="sticky top-0 bg-background"><TableRow><TableHead>Date</TableHead><TableHead>Invoice #</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {paginatedInvoices.length > 0 ? paginatedInvoices.map(t => (
                                            <TableRow key={t.id}><TableCell>{format(t.date, "dd/MM/yyyy")}</TableCell><TableCell>{t.description || 'N/A'}</TableCell><TableCell className="text-right font-mono text-destructive">{t.currency}{Number(t.amount).toFixed(2)}</TableCell></TableRow>
                                        )) : (<TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No invoices found.</TableCell></TableRow>)}
                                    </TableBody>
                                </Table>
                            </div>
                             {totalInvoicePages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <Button variant="outline" size="sm" onClick={() => setInvoiceCurrentPage((p) => Math.max(1, p - 1))} disabled={invoiceCurrentPage === 1}><ChevronLeft className="h-4 w-4 mr-1" />Previous</Button>
                                    <span className="text-sm text-muted-foreground">Page {invoiceCurrentPage} of {totalInvoicePages}</span>
                                    <Button variant="outline" size="sm" onClick={() => setInvoiceCurrentPage((p) => Math.min(totalInvoicePages, p + 1))} disabled={invoiceCurrentPage === totalInvoicePages}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="text-green-600"/> Payments Received (Credit)</CardTitle><CardDescription>List of all payments received from this client.</CardDescription></CardHeader>
                        <CardContent>
                            <div className="mb-4 relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="search" placeholder="Search by description..." value={paymentSearchTerm} onChange={(e) => setPaymentSearchTerm(e.target.value)} className="pl-8 w-full"/></div>
                            <div className="rounded-md border h-96 overflow-auto">
                                <Table><TableHeader className="sticky top-0 bg-background"><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {paginatedPayments.length > 0 ? paginatedPayments.map(t => (
                                            <TableRow key={t.id}><TableCell>{format(t.date, "dd/MM/yyyy")}</TableCell><TableCell>{t.description || 'N/A'}</TableCell><TableCell className="text-right font-mono text-green-600">{t.currency}{Number(t.amount).toFixed(2)}</TableCell></TableRow>
                                        )) : (<TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No payments found.</TableCell></TableRow>)}
                                    </TableBody>
                                </Table>
                            </div>
                            {totalPaymentPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <Button variant="outline" size="sm" onClick={() => setPaymentCurrentPage((p) => Math.max(1, p - 1))} disabled={paymentCurrentPage === 1}><ChevronLeft className="h-4 w-4 mr-1" />Previous</Button>
                                    <span className="text-sm text-muted-foreground">Page {paymentCurrentPage} of {totalPaymentPages}</span>
                                    <Button variant="outline" size="sm" onClick={() => setPaymentCurrentPage((p) => Math.min(totalPaymentPages, p + 1))} disabled={paymentCurrentPage === totalPaymentPages}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
             <footer className="py-6 text-center text-sm text-muted-foreground border-t">© {new Date().getFullYear()} HEMITH ERP. All rights reserved.</footer>
        </div>
    );
}
