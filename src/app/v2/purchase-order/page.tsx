
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { PurchaseOrderFormV2 } from "@/components/v2/purchase-order-form";
import { PurchaseOrderListV2 } from "@/components/v2/purchase-order-list";
import type { PurchaseOrder } from "@/types/purchase-order";
import type { PerformaInvoice } from "@/types/performa-invoice";
import type { Company } from "@/types/company";
import type { Manufacturer } from "@/types/manufacturer";
import type { Size } from "@/types/size";
import type { Product } from "@/types/product";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { generatePurchaseOrderPdf } from "@/lib/purchase-order-pdf";

const PO_PREFIX = "HEM/PO/";

function getCurrentIndianFinancialYear(): string {
  const now = new Date();
  const currentMonth = now.getMonth(); 
  const currentYear = now.getFullYear();

  if (currentMonth >= 3) { 
    return `${currentYear.toString().slice(-2)}-${(currentYear + 1).toString().slice(-2)}`;
  } else { 
    return `${(currentYear - 1).toString().slice(-2)}-${currentYear.toString().slice(-2)}`;
  }
}

export default function PurchaseOrderPageV2() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [poToEdit, setPoToEdit] = useState<PurchaseOrder | null>(null);
  const [sourcePiIdForNewPo, setSourcePiIdForNewPo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Data for dependencies
  const [allPerformaInvoices, setAllPerformaInvoices] = useState<PerformaInvoice[]>([]);
  const [allExporters, setAllExporters] = useState<Company[]>([]);
  const [allManufacturers, setAllManufacturers] = useState<Manufacturer[]>([]);
  const [allSizes, setAllSizes] = useState<Size[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [nextPoNumber, setNextPoNumber] = useState("");

  const getNextPoNumberInternal = useCallback((currentPOs: PurchaseOrder[], financialYear: string): string => {
    const yearPrefix = `${PO_PREFIX}${financialYear}/`;
    const poNumbersThisYear = currentPOs
      .filter(po => po.poNumber.startsWith(yearPrefix))
      .map(po => {
        const numPart = po.poNumber.substring(yearPrefix.length);
        return parseInt(numPart, 10);
      })
      .filter(num => !isNaN(num))
      .sort((a, b) => b - a);

    const nextNum = (poNumbersThisYear[0] || 0) + 1;
    return `${yearPrefix}${nextNum.toString().padStart(3, '0')}`;
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
        const [poRes, piRes, expRes, manuRes, sizeRes, prodRes] = await Promise.all([
            fetch('/api/v2/purchase-order-data'),
            fetch('/api/v2/performa-invoice-data'),
            fetch('/api/v2/exporter-data'),
            fetch('/api/v2/manufacturer-data'),
            fetch('/api/v2/size-data'),
            fetch('/api/v2/product-data')
        ]);

        if (!poRes.ok || !piRes.ok || !expRes.ok || !manuRes.ok || !sizeRes.ok || !prodRes.ok) {
            throw new Error('Failed to fetch required data for Purchase Orders.');
        }

        const poData = await poRes.json();
        const piData = await piRes.json();
        
        const parsedPOs = poData.map((po: any) => ({ ...po, poDate: new Date(po.poDate) }));
        setPurchaseOrders(parsedPOs);
        setNextPoNumber(getNextPoNumberInternal(parsedPOs, getCurrentIndianFinancialYear()));

        setAllPerformaInvoices(piData.map((pi: any) => ({ ...pi, invoiceDate: new Date(pi.invoiceDate) })));
        setAllExporters(await expRes.json());
        setAllManufacturers(await manuRes.json());
        setAllSizes(await sizeRes.json());
        setAllProducts(await prodRes.json());

    } catch (error: any) {
        toast({ variant: "destructive", title: "Data Loading Error", description: error.message });
    } finally {
        setIsLoading(false);
    }
  }, [toast, getNextPoNumberInternal]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  useEffect(() => {
    if (isLoading) return;
    const poIdFromUrl = searchParams.get("editPoId");
    const piIdFromUrl = searchParams.get("sourcePiId");

    if (poIdFromUrl) {
      const foundPO = purchaseOrders.find(po => po.id.toString() === poIdFromUrl);
      if (foundPO) {
        setPoToEdit(foundPO);
        setSourcePiIdForNewPo(null);
        toast({ title: "Editing Purchase Order", description: `Editing PO: ${foundPO.poNumber}.` });
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Purchase Order not found for editing." });
        router.replace('/v2/purchase-order', { scroll: false });
      }
    } else if (piIdFromUrl) {
        setSourcePiIdForNewPo(piIdFromUrl);
        setPoToEdit(null);
        toast({ title: "New Purchase Order", description: `Generating from Performa Invoice.` });
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        setPoToEdit(null);
        setSourcePiIdForNewPo(null);
    }
  }, [searchParams, purchaseOrders, isLoading, router, toast]);

  const handleSavePurchaseOrder = async (poData: PurchaseOrder) => {
    const isEditing = !!poToEdit;
    const url = isEditing ? `/api/v2/purchase-order-data?id=${poToEdit!.id}` : '/api/v2/purchase-order-data';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(poData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save Purchase Order.');
      }
      
      toast({ title: `Purchase Order ${isEditing ? 'Updated' : 'Saved'}`, description: `PO ${poData.poNumber} has been successfully saved.` });
      setPoToEdit(null);
      setSourcePiIdForNewPo(null);
      router.replace('/v2/purchase-order', { scroll: false });
      await fetchData(); // Refetch data to show the new/updated PO
    } catch (error: any) {
      toast({ variant: "destructive", title: "Save Error", description: error.message });
    }
  };
  
  const handleDeletePurchaseOrder = async (poId: string) => {
    try {
        const response = await fetch(`/api/v2/purchase-order-data?id=${poId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete Purchase Order.');

        toast({ title: "Purchase Order Deleted", description: "The PO has been marked as deleted." });
        if (poToEdit?.id.toString() === poId) {
            setPoToEdit(null);
            router.replace('/v2/purchase-order', { scroll: false });
        }
        await fetchData();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Delete Error", description: error.message });
    }
  };
  
  const handleCancelEdit = () => {
    setPoToEdit(null);
    setSourcePiIdForNewPo(null);
    router.replace('/v2/purchase-order', { scroll: false });
  };
  
  const handleDownloadPdf = (poId: string) => {
    const poToPrint = purchaseOrders.find(po => po.id.toString() === poId);
    if (!poToPrint) {
      toast({ variant: "destructive", title: "Error", description: "Purchase Order not found." });
      return;
    }
    const exporter = allExporters.find(e => e.id.toString() === poToPrint.exporterId.toString());
    const manufacturer = allManufacturers.find(m => m.id.toString() === poToPrint.manufacturerId.toString());
    const poSizeDetails = allSizes.find(s => s.id.toString() === poToPrint.sizeId.toString());
    const sourcePiDetails = allPerformaInvoices.find(pi => pi.id.toString() === poToPrint.sourcePiId.toString());

    if (!exporter || !manufacturer) {
      toast({ variant: "destructive", title: "Error Generating PDF", description: "Missing Exporter or Manufacturer data." });
      return;
    }
    
    generatePurchaseOrderPdf(poToPrint, exporter, manufacturer, poSizeDetails, allProducts, sourcePiDetails);
  };
  
  const handleGenerateExportDoc = (poId: string) => {
     router.push(`/v2/export-document?sourcePoId=${poId}`);
  };

  const canCreateOrEdit = allExporters.length > 0 && allManufacturers.length > 0 && allSizes.length > 0 && allProducts.length > 0 && allPerformaInvoices.length > 0;
  const showForm = !!poToEdit || !!sourcePiIdForNewPo;

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Loading purchase order data...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          {showForm && (
            canCreateOrEdit ? (
              <PurchaseOrderFormV2
                key={poToEdit?.id || sourcePiIdForNewPo || 'new'}
                initialData={poToEdit}
                sourcePi={allPerformaInvoices.find(pi => pi.id.toString() === sourcePiIdForNewPo)}
                isEditing={!!poToEdit}
                onSave={handleSavePurchaseOrder}
                onCancelEdit={handleCancelEdit}
                defaultPoNumber={nextPoNumber}
                allExporters={allExporters}
                allManufacturers={allManufacturers}
                allPerformaInvoices={allPerformaInvoices}
                allSizes={allSizes}
                allProducts={allProducts}
              />
            ) : (
              <Card className="w-full max-w-2xl mx-auto shadow-xl mb-8">
                <CardHeader>
                  <CardTitle className="font-headline text-2xl">Cannot Create or Edit Purchase Order</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">To create or edit a Purchase Order, please ensure data exists for Exporters, Manufacturers, Sizes, Products, and Performa Invoices in the database.</p>
                </CardContent>
              </Card>
            )
          )}
        </div>
        <PurchaseOrderListV2
          purchaseOrders={purchaseOrders}
          allExporters={allExporters}
          allManufacturers={allManufacturers}
          onEditPo={(id) => router.push(`/v2/purchase-order?editPoId=${id}`)}
          onDeletePo={handleDeletePurchaseOrder}
          onDownloadPdf={handleDownloadPdf}
          onGenerateExportDoc={handleGenerateExportDoc}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} HEMITH ERP. All rights reserved. (V2 - MySQL)
      </footer>
    </div>
  );
}
