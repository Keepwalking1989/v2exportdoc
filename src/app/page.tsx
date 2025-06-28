
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { Calendar as CalendarIcon, IndianRupee, HandCoins, Handshake, Ship, TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import all required types
import type { Transaction } from '@/types/transaction';
import type { ExportDocument } from '@/types/export-document';
import type { ManuBill } from '@/types/manu-bill';
import type { TransBill } from '@/types/trans-bill';
import type { SupplyBill } from '@/types/supply-bill';
import type { Product } from '@/types/product';
import type { Size } from '@/types/size';

const LOCAL_STORAGE_KEYS = {
    TRANSACTIONS: "bizform_transactions",
    EXPORT_DOCS: "bizform_export_documents_v2",
    MANU_BILLS: "bizform_manu_bills",
    TRANS_BILLS: "bizform_trans_bills",
    SUPPLY_BILLS: "bizform_supply_bills",
    PRODUCTS: "bizform_products",
    SIZES: "bizform_sizes",
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

export default function DashboardPage() {
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

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
        
        const totalInvoiced = relevantExportDocs.reduce((sum, doc) => sum + calculateDocTotal(doc), 0);
        const totalReceived = clientPayments.reduce((sum, t) => sum + t.amount, 0);
        const totalReceivables = totalInvoiced - totalReceived;

        const relevantManuBills = manuBills.filter(b => !b.isDeleted && isWithinRange(b.invoiceDate));
        const relevantTransBills = transBills.filter(b => !b.isDeleted && isWithinRange(b.invoiceDate));
        const relevantSupplyBills = supplyBills.filter(b => !b.isDeleted && isWithinRange(b.invoiceDate));
        const supplierPayments = transactions.filter(t => !t.isDeleted && ['manufacturer', 'transporter', 'supplier', 'pallet'].includes(t.partyType) && t.type === 'credit' && isWithinRange(t.date));
        
        const totalBilled = 
            relevantManuBills.reduce((sum, b) => sum + b.grandTotal, 0) +
            relevantTransBills.reduce((sum, b) => sum + b.totalPayable, 0) +
            relevantSupplyBills.reduce((sum, b) => sum + b.grandTotal, 0);
        const totalPaid = supplierPayments.reduce((sum, t) => sum + t.amount, 0);
        const totalPayables = totalBilled - totalPaid;

        const totalContainers = relevantExportDocs.reduce((sum, doc) => sum + (doc.containerItems?.length || 0), 0);

        return {
            totalReceivables,
            totalPayables,
            netPosition: totalReceivables - totalPayables,
            totalExportValue: totalInvoiced,
            totalContainers,
        };
    }, [date, exportDocuments, transactions, manuBills, transBills, supplyBills, products, sizes]);
    
    const chartData = [{ name: 'Financials', receivables: dashboardData.totalReceivables, payables: dashboardData.totalPayables }];
    const chartConfig = {
        receivables: { label: "Receivables", color: "hsl(var(--chart-2))" },
        payables: { label: "Payables", color: "hsl(var(--destructive))" },
    } satisfies ChartConfig

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

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <StatCard 
                        title="Total Receivables"
                        value={`$ ${dashboardData.totalReceivables.toFixed(2)}`}
                        icon={<TrendingUp className="h-4 w-4 text-green-600" />}
                        description="Money to be collected from clients."
                        colorClass="text-green-600"
                        onClick={() => router.push('/client')}
                    />
                    <StatCard 
                        title="Total Payables"
                        value={`₹ ${dashboardData.totalPayables.toFixed(2)}`}
                        icon={<TrendingDown className="h-4 w-4 text-destructive" />}
                        description="Money owed to suppliers."
                        colorClass="text-destructive"
                        onClick={() => router.push('/transaction')}
                    />
                     <StatCard 
                        title="Net Position"
                        value={`${dashboardData.netPosition >= 0 ? '$' : '-$'} ${Math.abs(dashboardData.netPosition).toFixed(2)}`}
                        icon={<ArrowLeftRight className="h-4 w-4 text-primary" />}
                        description="Receivables minus Payables."
                        colorClass="text-primary"
                    />
                     <StatCard 
                        title="Total Export Value"
                        value={`$ ${dashboardData.totalExportValue.toFixed(2)}`}
                        icon={<Handshake className="h-4 w-4 text-blue-500" />}
                        description="Total value of invoices generated."
                        onClick={() => router.push('/export-document')}
                    />
                     <StatCard 
                        title="Containers Shipped"
                        value={dashboardData.totalContainers.toString()}
                        icon={<Ship className="h-4 w-4 text-orange-500" />}
                        description="Total containers in export docs."
                        onClick={() => router.push('/export-document')}
                    />
                </div>

                <div className="grid gap-8 md:grid-cols-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Financial Overview</CardTitle>
                            <CardDescription>A visual comparison of your receivables and payables for the selected period.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                            <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                                <BarChart accessibilityLayer data={chartData}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} stroke="" />
                                    <YAxis stroke="" tickFormatter={(value) => `$${Number(value) / 1000}k`} />
                                    <RechartsTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                    <ChartLegend content={<ChartLegendContent />} />
                                    <Bar dataKey="receivables" fill="var(--color-receivables)" radius={4} />
                                    <Bar dataKey="payables" fill="var(--color-payables)" radius={4} />
                                </BarChart>
                            </ChartContainer>
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
