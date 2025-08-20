
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import {
  ChartContainer,
  ChartTooltip as RechartsTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon, IndianRupee, HandCoins, Handshake, Ship, TrendingUp, TrendingDown, ArrowLeftRight, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import all required types
import type { Transaction } from '@/types/transaction';
import type { ExportDocument } from '@/types/export-document';
import type { ManuBill } from '@/types/manu-bill';
import type { TransBill } from '@/types/trans-bill';
import type { SupplyBill } from '@/types/supply-bill';
import type { Product } from '@/types/product';
import type { Size } from '@/types/size';
import type { Manufacturer } from '@/types/manufacturer';
import type { Transporter } from '@/types/transporter';
import type { Supplier } from '@/types/supplier';
import type { Pallet } from '@/types/pallet';
import type { PerformaInvoice } from '@/types/performa-invoice';
import type { PurchaseOrder } from '@/types/purchase-order';
import type { Client } from '@/types/client';


const LOCAL_STORAGE_KEYS = {
    TRANSACTIONS: "bizform_transactions",
    EXPORT_DOCS: "bizform_export_documents_v2",
    MANU_BILLS: "bizform_manu_bills",
    TRANS_BILLS: "bizform_trans_bills",
    SUPPLY_BILLS: "bizform_supply_bills",
    PRODUCTS: "bizform_products",
    SIZES: "bizform_sizes",
    MANUFACTURERS: "bizform_manufacturers",
    TRANSPORTERS: "bizform_transporters",
    SUPPLIERS: "bizform_suppliers",
    PALLETS: "bizform_pallets",
    PERFORMA_INVOICES: "bizform_performa_invoices",
    PURCHASE_ORDERS: "bizform_purchase_orders",
    CLIENTS: "bizform_clients",
};

const StatCard = ({ title, value, icon, description, colorClass, onClick }: { title: string; value: string; icon: React.ReactNode; description: string; colorClass?: string, onClick?: () => void }) => (
    <Card className={cn("hover:shadow-lg transition-shadow", onClick && "cursor-pointer")} onClick={onClick}>
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

const DashboardDetailModal = ({ open, onOpenChange, title, children }: { open: boolean, onOpenChange: (open: boolean) => void, title: string, children: React.ReactNode }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            A detailed breakdown for the selected metric. This dialog provides more information.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          {children}
        </ScrollArea>
      </DialogContent>
    </Dialog>
);

export default function DashboardPage() {
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [modalState, setModalState] = useState<{ open: boolean, title: string, content: React.ReactNode | null }>({ open: false, title: '', content: null });

    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(),
    });

    // States for all data
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [exportDocuments, setExportDocuments] = useState<ExportDocument[]>([]);
    const [manuBills, setManuBills] = useState<ManuBill[]>([]);
    const [transBills, setTransBills] = useState<TransBill[]>([]);
    const [supplyBills, setSupplyBills] = useState<SupplyBill[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [sizes, setSizes] = useState<Size[]>([]);
    const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
    const [transporters, setTransporters] = useState<Transporter[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [pallets, setPallets] = useState<Pallet[]>([]);
    const [allPerformaInvoices, setAllPerformaInvoices] = useState<PerformaInvoice[]>([]);
    const [allPurchaseOrders, setAllPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [allClients, setAllClients] = useState<Client[]>([]);


    useEffect(() => {
        setIsClient(true);
        if (typeof window !== "undefined") {
            try {
                setTransactions(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.TRANSACTIONS) || '[]'));
                setExportDocuments(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.EXPORT_DOCS) || '[]'));
                setManuBills(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.MANU_BILLS) || '[]'));
                setTransBills(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.TRANS_BILLS) || '[]'));
                setSupplyBills(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.SUPPLY_BILLS) || '[]'));
                setProducts(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.PRODUCTS) || '[]'));
                setSizes(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.SIZES) || '[]'));
                setManufacturers(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.MANUFACTURERS) || '[]'));
                setTransporters(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.TRANSPORTERS) || '[]'));
                setSuppliers(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.SUPPLIERS) || '[]'));
                setPallets(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.PALLETS) || '[]'));
                setAllPerformaInvoices(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.PERFORMA_INVOICES) || '[]'));
                setAllPurchaseOrders(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.PURCHASE_ORDERS) || '[]'));
                setAllClients(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.CLIENTS) || '[]'));

            } catch (error) {
                console.error("Failed to load dashboard data from localStorage", error);
            } finally {
                setIsLoading(false);
            }
        }
    }, []);

    const dashboardData = useMemo(() => {
        const fromDate = date?.from;
        const toDate = date?.to ? new Date(date.to.setHours(23, 59, 59, 999)) : undefined;

        const isWithinRange = (checkDateStr: Date | string) => {
            if (!fromDate || !toDate) return true;
            const d = new Date(checkDateStr);
            return d >= fromDate && d <= toDate;
        };
        
        const relevantExportDocs = exportDocuments.filter(doc => !doc.isDeleted && isWithinRange(doc.exportInvoiceDate));
        const clientPayments = transactions.filter(t => !t.isDeleted && t.partyType === 'client' && t.type === 'debit' && isWithinRange(t.date));
        
        const calculateDocTotal = (doc: ExportDocument): number => {
            let total = 0;
            doc.containerItems?.forEach(container => {
                const items = [...(container.productItems || []), ...(container.sampleItems || [])];
                items.forEach(item => {
                    const product = products.find(p => p.id === item.productId);
                    if (!product) return;
                    const size = sizes.find(s => s.id === product.sizeId);
                    if (!size || !size.sqmPerBox) return;
                    total += (item.boxes || 0) * size.sqmPerBox * (item.rate || 0);
                });
            });
            return total + (doc.freight || 0);
        };
        
        const relevantManuBills = manuBills.filter(b => !b.isDeleted && isWithinRange(b.invoiceDate));
        const relevantTransBills = transBills.filter(b => !b.isDeleted && isWithinRange(b.invoiceDate));
        const relevantSupplyBills = supplyBills.filter(b => !b.isDeleted && isWithinRange(b.invoiceDate));
        const supplierPayments = transactions.filter(t => !t.isDeleted && ['manufacturer', 'transporter', 'supplier', 'pallet'].includes(t.partyType) && t.type === 'credit' && isWithinRange(t.date));
        
        // PAYABLES
        const totalBilledInr = 
            relevantManuBills.reduce((sum, b) => sum + b.grandTotal, 0) +
            relevantTransBills.reduce((sum, b) => sum + b.totalPayable, 0) +
            relevantSupplyBills.reduce((sum, b) => sum + b.grandTotal, 0);
        const totalPaidInr = supplierPayments.reduce((sum, t) => sum + t.amount, 0);
        const totalPayablesInr = totalBilledInr - totalPaidInr;

        // GST
        const totalGstPaid = relevantManuBills.reduce((sum, bill) => sum + (bill.centralTaxAmount || 0) + (bill.stateTaxAmount || 0), 0) +
            relevantTransBills.reduce((sum, bill) => sum + bill.totalTax, 0) +
            relevantSupplyBills.reduce((sum, bill) => sum + (bill.centralTaxAmount || 0) + (bill.stateTaxAmount || 0), 0);
        
        const gstReceivedTransactions = transactions.filter(t => !t.isDeleted && t.partyType === 'gst' && t.type === 'credit' && isWithinRange(t.date));
        const totalGstReceived = gstReceivedTransactions.reduce((sum, t) => sum + t.amount, 0);
        const netGstReceivable = totalGstPaid - totalGstReceived;

        // RECEIVABLES
        const totalInvoicedUsd = relevantExportDocs.reduce((sum, doc) => sum + calculateDocTotal(doc), 0);
        const totalReceivedUsd = clientPayments.reduce((sum, t) => sum + t.amount, 0);
        const totalReceivablesUsd = totalInvoicedUsd - totalReceivedUsd;

        const CONVERSION_RATE = 84;
        const totalReceivablesInr = totalReceivablesUsd * CONVERSION_RATE;

        // Breakdown data for modals
        const piToClientMap = new Map(allPerformaInvoices.map(pi => [pi.id, pi.clientId]));
        const poToPiMap = new Map(allPurchaseOrders.map(po => [po.id, po.sourcePiId]));

        const receivablesBreakdown = allClients.map(client => {
            const clientExportDocs = relevantExportDocs.filter(doc => {
                if (!doc.purchaseOrderId) return false;
                const piId = poToPiMap.get(doc.purchaseOrderId);
                return piId ? piToClientMap.get(piId) === client.id : false;
            });

            const invoiced = clientExportDocs.reduce((sum, doc) => sum + calculateDocTotal(doc), 0);
            const received = clientPayments.filter(p => p.partyId === client.id).reduce((sum, p) => sum + p.amount, 0);
            return { id: client.id, name: client.companyName, balance: invoiced - received };
        }).filter(c => c.balance > 0.01);

        const safeManufacturers = Array.isArray(manufacturers) ? manufacturers : [];
        const safeTransporters = Array.isArray(transporters) ? transporters : [];
        const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];
        const safePallets = Array.isArray(pallets) ? pallets : [];

        const allPayableParties = [
            ...safeManufacturers.map(p => ({ ...p, partyType: 'manufacturer' })),
            ...safeTransporters.map(p => ({ ...p, partyType: 'transporter' })),
            ...safeSuppliers.map(p => ({ ...p, partyType: 'supplier' })),
            ...safePallets.map(p => ({ ...p, partyType: 'pallet' }))
        ];

        const payablesBreakdown = allPayableParties.map(party => {
            let billed = 0;
            if (party.partyType === 'manufacturer') billed = relevantManuBills.filter(b => b.manufacturerId === party.id).reduce((sum, b) => sum + b.grandTotal, 0);
            else if (party.partyType === 'transporter') billed = relevantTransBills.filter(b => b.transporterId === party.id).reduce((sum, b) => sum + b.totalPayable, 0);
            else if (party.partyType === 'supplier' || party.partyType === 'pallet') billed = relevantSupplyBills.filter(b => b.supplierId === party.id).reduce((sum, b) => sum + b.grandTotal, 0);

            const paid = supplierPayments.filter(p => p.partyId === party.id).reduce((sum, p) => sum + p.amount, 0);
            return { id: party.id, name: party.companyName, balance: billed - paid, partyType: party.partyType };
        }).filter(p => p.balance > 0.01);

        const exportValueBreakdown = relevantExportDocs.map(doc => {
            const piId = poToPiMap.get(doc.purchaseOrderId || '');
            const clientId = piId ? piToClientMap.get(piId) : undefined;
            const client = clientId ? allClients.find(c => c.id === clientId) : undefined;
            return { id: doc.id, invoiceNumber: doc.exportInvoiceNumber, clientName: client?.companyName || 'N/A', value: calculateDocTotal(doc) };
        });

        return {
            totalReceivables: totalReceivablesUsd,
            totalPayables: totalPayablesInr,
            netPosition: totalReceivablesInr - totalPayablesInr,
            totalExportValue: totalInvoicedUsd,
            totalContainers: relevantExportDocs.reduce((sum, doc) => sum + (doc.containerItems?.length || 0), 0),
            netGstReceivable,
            totalGstPaid,
            totalGstReceived,
            receivablesForChart: totalReceivablesInr,
            receivablesBreakdown,
            payablesBreakdown,
            exportValueBreakdown
        };
    }, [date, exportDocuments, transactions, manuBills, transBills, supplyBills, products, sizes, allClients, allPerformaInvoices, allPurchaseOrders, manufacturers, transporters, suppliers, pallets]);
    
    const chartData = [{ name: 'Financials', receivables: dashboardData.receivablesForChart, payables: dashboardData.totalPayables }];
    const chartConfig = {
        receivables: { label: "Receivables (INR)", color: "hsl(var(--chart-2))" },
        payables: { label: "Payables (INR)", color: "hsl(var(--destructive))" },
    } satisfies ChartConfig

    const openModal = (type: 'receivables' | 'payables' | 'exportValue' | 'gst' | 'netPosition') => {
        let title = '';
        let content: React.ReactNode = null;

        switch (type) {
            case 'receivables':
                title = 'Outstanding Receivables (USD)';
                content = (
                    <Table>
                        <TableHeader><TableRow><TableHead>Client</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {dashboardData.receivablesBreakdown.map(item => <TableRow key={item.id}><TableCell>{item.name}</TableCell><TableCell className="text-right font-mono">$ {item.balance.toFixed(2)}</TableCell></TableRow>)}
                        </TableBody>
                    </Table>
                );
                break;
            case 'payables':
                title = 'Outstanding Payables (INR)';
                content = (
                     <Table>
                        <TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {dashboardData.payablesBreakdown.map(item => <TableRow key={item.id}><TableCell>{item.name}</TableCell><TableCell className="text-right font-mono">₹ {item.balance.toFixed(2)}</TableCell></TableRow>)}
                        </TableBody>
                    </Table>
                );
                break;
             case 'exportValue':
                title = 'Export Invoices (USD)';
                content = (
                     <Table>
                        <TableHeader><TableRow><TableHead>Invoice #</TableHead><TableHead>Client</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {dashboardData.exportValueBreakdown.map(item => <TableRow key={item.id}><TableCell>{item.invoiceNumber}</TableCell><TableCell>{item.clientName}</TableCell><TableCell className="text-right font-mono">$ {item.value.toFixed(2)}</TableCell></TableRow>)}
                        </TableBody>
                    </Table>
                );
                break;
            case 'gst':
                title = 'GST Summary (INR)';
                content = (
                     <Table>
                        <TableBody>
                            <TableRow><TableCell>Total GST Paid (Input)</TableCell><TableCell className="text-right font-mono text-destructive">₹ {Number(dashboardData.totalGstPaid).toFixed(2)}</TableCell></TableRow>
                            <TableRow><TableCell>Total GST Received (Refund)</TableCell><TableCell className="text-right font-mono text-green-600">₹ {Number(dashboardData.totalGstReceived).toFixed(2)}</TableCell></TableRow>
                            <TableRow className="font-bold"><TableCell>Net Receivable</TableCell><TableCell className="text-right font-mono text-primary">₹ {Number(dashboardData.netGstReceivable).toFixed(2)}</TableCell></TableRow>
                        </TableBody>
                    </Table>
                );
                break;
             case 'netPosition':
                title = 'Net Position Breakdown (INR)';
                content = (
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-bold mb-2">Receivables</h3>
                            <Table>
                                <TableHeader><TableRow><TableHead>Client</TableHead><TableHead className="text-right">Balance (INR)</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {dashboardData.receivablesBreakdown.map(item => <TableRow key={item.id}><TableCell>{item.name}</TableCell><TableCell className="text-right font-mono text-green-600">₹ {(item.balance * 84).toFixed(2)}</TableCell></TableRow>)}
                                </TableBody>
                            </Table>
                        </div>
                         <div>
                            <h3 className="font-bold mb-2">Payables</h3>
                            <Table>
                                <TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead className="text-right">Balance (INR)</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {dashboardData.payablesBreakdown.map(item => <TableRow key={item.id}><TableCell>{item.name}</TableCell><TableCell className="text-right font-mono text-destructive">₹ {item.balance.toFixed(2)}</TableCell></TableRow>)}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                );
                break;
        }
        setModalState({ open: true, title, content });
    };

    if (!isClient || isLoading) {
        return (
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-grow container mx-auto px-4 py-8">
                <div className="text-center text-muted-foreground">Loading dashboard...</div>
              </main>
            </div>
          );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8 space-y-8">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold font-headline text-primary">Dashboard</h1>
                        <p className="text-muted-foreground">A summary of your business activities.</p>
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn("w-full sm:w-[300px] justify-start text-left font-normal", !date && "text-muted-foreground")}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? ( date.to ? (<> {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")} </>) : (format(date.from, "LLL dd, y"))) : (<span>Pick a date</span>)}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                        <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2}/>
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                    <StatCard 
                        title="Total Receivables"
                        value={`$ ${dashboardData.totalReceivables.toFixed(2)}`}
                        icon={<TrendingUp className="h-4 w-4 text-green-600" />}
                        description="Money to be collected (in USD)."
                        colorClass="text-green-600"
                        onClick={() => openModal('receivables')}
                    />
                    <StatCard 
                        title="Total Payables"
                        value={`₹ ${dashboardData.totalPayables.toFixed(2)}`}
                        icon={<TrendingDown className="h-4 w-4 text-destructive" />}
                        description="Money owed to suppliers (in INR)."
                        colorClass="text-destructive"
                        onClick={() => openModal('payables')}
                    />
                     <StatCard 
                        title="Net Position"
                        value={`₹ ${dashboardData.netPosition.toFixed(2)}`}
                        icon={<ArrowLeftRight className="h-4 w-4 text-primary" />}
                        description="Receivables - Payables (in INR)."
                        colorClass={dashboardData.netPosition >= 0 ? "text-primary" : "text-destructive"}
                        onClick={() => openModal('netPosition')}
                    />
                     <StatCard 
                        title="Total Export Value"
                        value={`$ ${dashboardData.totalExportValue.toFixed(2)}`}
                        icon={<Handshake className="h-4 w-4 text-blue-500" />}
                        description="Total value of invoices (in USD)."
                        onClick={() => openModal('exportValue')}
                    />
                     <StatCard 
                        title="Containers Shipped"
                        value={dashboardData.totalContainers.toString()}
                        icon={<Ship className="h-4 w-4 text-orange-500" />}
                        description="Total containers in export docs."
                        onClick={() => router.push('/export-document')}
                    />
                     <StatCard 
                        title="GST Receivable"
                        value={`₹ ${Number(dashboardData.netGstReceivable).toFixed(2)}`}
                        icon={<Percent className="h-4 w-4 text-indigo-500" />}
                        description="GST Paid minus GST Received."
                        colorClass="text-indigo-500"
                        onClick={() => openModal('gst')}
                    />
                </div>

                <div className="grid gap-8 md:grid-cols-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Financial Overview (in INR)</CardTitle>
                            <CardDescription>A visual comparison of your receivables and payables for the selected period.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                            <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                                <BarChart accessibilityLayer data={chartData}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} stroke="" />
                                    <YAxis stroke="" tickFormatter={(value) => `₹${Number(value) / 1000}k`} />
                                    <RechartsTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                    <ChartLegend content={<ChartLegendContent />} />
                                    <Bar dataKey="receivables" fill="var(--color-receivables)" radius={4} />
                                    <Bar dataKey="payables" fill="var(--color-payables)" radius={4} />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>
                
                {modalState.open && (
                  <DashboardDetailModal
                      open={modalState.open}
                      onOpenChange={(isOpen) => setModalState({ ...modalState, open: isOpen })}
                      title={modalState.title}
                  >
                      {modalState.content}
                  </DashboardDetailModal>
                )}

            </main>
            <footer className="py-6 text-center text-sm text-muted-foreground border-t">
                © {new Date().getFullYear()} HEMITH ERP. All rights reserved.
            </footer>
        </div>
    );
}
