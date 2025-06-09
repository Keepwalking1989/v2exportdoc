
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { PurchaseOrderForm, type PurchaseOrderFormValues } from "@/components/purchase-order-form";
import { PurchaseOrderList } from "@/components/purchase-order-list";
import type { PurchaseOrder, PurchaseOrderItem } from "@/types/purchase-order";
import type { PerformaInvoice } from "@/types/performa-invoice";
import type { Company } from "@/types/company";
import type { Manufacturer } from "@/types/manufacturer";
import type { Size } from "@/types/size";
import type { Product } from "@/types/product";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const LOCAL_STORAGE_PO_KEY = "bizform_purchase_orders";
const LOCAL_STORAGE_PI_KEY = "bizform_performa_invoices";
const LOCAL_STORAGE_COMPANIES_KEY = "bizform_companies";
const LOCAL_STORAGE_MANUFACTURERS_KEY = "bizform_manufacturers";
const LOCAL_STORAGE_SIZES_KEY = "bizform_sizes";
const LOCAL_STORAGE_PRODUCTS_KEY = "bizform_products";

const PO_PREFIX = "HEM/PO/";

// Helper to get current Indian financial year string (e.g., "24-25")
function getCurrentIndianFinancialYear(): string {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11 (Jan-Dec)
  const currentYear = now.getFullYear();

  if (currentMonth >= 3) { // April onwards (e.g., April 2024 is part of FY 24-25)
    return `${currentYear.toString().slice(-2)}-${(currentYear + 1).toString().slice(-2)}`;
  } else { // Jan, Feb, March (e.g., Feb 2024 is part of FY 23-24)
    return `${(currentYear - 1).toString().slice(-2)}-${currentYear.toString().slice(-2)}`;
  }
}

export default function PurchaseOrderPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [allPerformaInvoices, setAllPerformaInvoices] = useState<PerformaInvoice[]>([]);
  const [allExporters, setAllExporters] = useState<Company[]>([]);
  const [allManufacturers, setAllManufacturers] = useState<Manufacturer[]>([]);
  const [globalSizes, setGlobalSizes] = useState<Size[]>([]);
  const [globalProducts, setGlobalProducts] = useState<Product[]>([]);

  const [poToEdit, setPoToEdit] = useState<PurchaseOrder | null>(null);
  const [sourcePiForNewPo, setSourcePiForNewPo] = useState<PerformaInvoice | null>(null);
  
  const [nextPoNumber, setNextPoNumber] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const formRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedPOs = localStorage.getItem(LOCAL_STORAGE_PO_KEY);
        const currentPOs: PurchaseOrder[] = storedPOs ? JSON.parse(storedPOs).map((po: any) => ({
          ...po,
          poDate: new Date(po.poDate) 
        })) : [];
        setPurchaseOrders(currentPOs);
        setNextPoNumber(getNextPoNumberInternal(currentPOs, getCurrentIndianFinancialYear()));

        const storedPIs = localStorage.getItem(LOCAL_STORAGE_PI_KEY);
        setAllPerformaInvoices(storedPIs ? JSON.parse(storedPIs).map((pi:any) => ({...pi, invoiceDate: new Date(pi.invoiceDate)})) : []);
        
        const storedExporters = localStorage.getItem(LOCAL_STORAGE_COMPANIES_KEY);
        setAllExporters(storedExporters ? JSON.parse(storedExporters) : []);
        
        const storedManufacturers = localStorage.getItem(LOCAL_STORAGE_MANUFACTURERS_KEY);
        setAllManufacturers(storedManufacturers ? JSON.parse(storedManufacturers) : []);

        const storedSizes = localStorage.getItem(LOCAL_STORAGE_SIZES_KEY);
        setGlobalSizes(storedSizes ? JSON.parse(storedSizes) : []);

        const storedProducts = localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY);
        setGlobalProducts(storedProducts ? JSON.parse(storedProducts) : []);

      } catch (error) {
        console.error("Failed to parse data from localStorage", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load data. Check console." });
      } finally {
        setIsLoading(false);
      }
    }
  }, [toast, getNextPoNumberInternal]);

  useEffect(() => {
    if (isLoading) return; // Wait for data to load

    const sourcePiId = searchParams.get("sourcePiId");
    const editPoId = searchParams.get("editPoId");

    if (sourcePiId) {
      const pi = allPerformaInvoices.find(p => p.id === sourcePiId);
      if (pi) {
        setSourcePiForNewPo(pi);
        setPoToEdit(null); // Clear any edit state
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        toast({ variant: "destructive", title: "Error", description: `Performa Invoice with ID ${sourcePiId} not found.` });
        setSourcePiForNewPo(null);
        router.replace('/purchase-order', undefined); // Remove query param
      }
    } else if (editPoId) {
      const po = purchaseOrders.find(p => p.id === editPoId);
      if (po) {
        setPoToEdit({...po, poDate: new Date(po.poDate)});
        setSourcePiForNewPo(null); // Clear any new PO state
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        toast({ variant: "destructive", title: "Error", description: `Purchase Order with ID ${editPoId} not found.` });
        setPoToEdit(null);
        router.replace('/purchase-order', undefined); // Remove query param
      }
    } else {
      // No params, ensure form is hidden
      setSourcePiForNewPo(null);
      setPoToEdit(null);
    }
  }, [searchParams, allPerformaInvoices, purchaseOrders, router, toast, isLoading]);


  const handleSavePurchaseOrder = (poData: PurchaseOrder) => {
    let updatedPOs;
    const isEditingMode = !!poToEdit;

    if (isEditingMode) {
      updatedPOs = purchaseOrders.map(po =>
        po.id === poToEdit!.id ? { ...poData, id: poToEdit!.id, sourcePiId: poToEdit!.sourcePiId } : po // Preserve sourcePiId on edit
      );
    } else {
      updatedPOs = [...purchaseOrders, poData];
    }
    setPurchaseOrders(updatedPOs);
    localStorage.setItem(LOCAL_STORAGE_PO_KEY, JSON.stringify(updatedPOs));
    
    // Reset form states
    setPoToEdit(null);
    setSourcePiForNewPo(null);
    router.replace('/purchase-order', undefined); // Clear query params

    // Update next PO number only if it was a new PO and it might affect the sequence
    // or if the PO number was manually changed during edit in a way that affects sequence.
    // For simplicity, always update based on the current list.
    setNextPoNumber(getNextPoNumberInternal(updatedPOs, getCurrentIndianFinancialYear()));
  };

  const handleEditPo = (poId: string) => {
    router.push(`/purchase-order?editPoId=${poId}`);
  };

  const handleDeletePo = (poIdToDelete: string) => {
    const updatedPOs = purchaseOrders.filter(po => po.id !== poIdToDelete);
    setPurchaseOrders(updatedPOs);
    localStorage.setItem(LOCAL_STORAGE_PO_KEY, JSON.stringify(updatedPOs));
    setNextPoNumber(getNextPoNumberInternal(updatedPOs, getCurrentIndianFinancialYear()));
    if (poToEdit && poToEdit.id === poIdToDelete) {
        setPoToEdit(null); // Clear edit state if the edited PO is deleted
        router.replace('/purchase-order', undefined);
    }
  };
  
  const handleCancelForm = () => {
    setPoToEdit(null);
    setSourcePiForNewPo(null);
    router.replace('/purchase-order', undefined); // Clear query params
  };

  // Placeholder actions for list items
  const handleDownloadPoPdf = (poId: string) => {
    console.log("Download PDF for PO:", poId);
    toast({ title: "Not Implemented", description: "PDF generation for Purchase Orders is not yet available." });
  };
  const handleGeneratePoDoc = (poId: string) => {
    console.log("Generate DOC for PO:", poId);
    toast({ title: "Not Implemented", description: "DOC generation for Purchase Orders is not yet available." });
  };

  if (!isClient || isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Loading purchase order data...</div>
        </main>
      </div>
    );
  }

  // Determine if form should be shown
  const showForm = !!sourcePiForNewPo || !!poToEdit;

  const canCreateOrEdit = allExporters.length > 0 && allManufacturers.length > 0 && globalSizes.length > 0 && globalProducts.length > 0;
  
  // Data for the form
  let distinctSizesFromSourcePi: Size[] = [];
  let productsInSourcePi: Product[] = [];

  const piForForm = poToEdit ? allPerformaInvoices.find(pi => pi.id === poToEdit.sourcePiId) : sourcePiForNewPo;

  if (piForForm && piForForm.items) {
    const sizeIdsInPi = new Set(piForForm.items.map(item => item.sizeId));
    distinctSizesFromSourcePi = globalSizes.filter(s => sizeIdsInPi.has(s.id));
    // Products in source PI (these are already associated with a size in the PI item)
    productsInSourcePi = piForForm.items.map(piItem => {
        const productDetail = globalProducts.find(gp => gp.id === piItem.productId && gp.sizeId === piItem.sizeId);
        return productDetail ? productDetail : {id: piItem.productId, designName: "Unknown Product from PI", sizeId: piItem.sizeId }; // Fallback
    }).filter(p => p !== null) as Product[]; // Filter out nulls if any
  }


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          {showForm && (
            canCreateOrEdit ? (
              <PurchaseOrderForm
                key={poToEdit?.id || sourcePiForNewPo?.id || 'new'} // Key to force re-render/reset
                initialData={poToEdit}
                sourcePi={piForForm} // Pass the correct PI context for the form
                isEditing={!!poToEdit}
                onSave={handleSavePurchaseOrder}
                onCancelEdit={handleCancelForm}
                defaultPoNumber={poToEdit ? poToEdit.poNumber : nextPoNumber}
                allExporters={allExporters}
                allManufacturers={allManufacturers}
                distinctSizesFromSourcePi={distinctSizesFromSourcePi}
                productsInSourcePi={productsInSourcePi}
                globalSizes={globalSizes}
                globalProducts={globalProducts}
              />
            ) : (
              <Card className="w-full max-w-2xl mx-auto shadow-xl mb-8">
                <CardHeader>
                  <CardTitle className="font-headline text-2xl">Cannot Create or Edit Purchase Order</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    To create or edit a Purchase Order, please ensure you have added at least one:
                  </p>
                  <ul className="list-disc list-inside mt-2 text-muted-foreground">
                    {allExporters.length === 0 && <li>Exporter (on the Exporter page)</li>}
                    {allManufacturers.length === 0 && <li>Manufacturer (on the Manufacturer page)</li>}
                    {globalSizes.length === 0 && <li>Size (on the Size page)</li>}
                    {globalProducts.length === 0 && <li>Product (on the Product page)</li>}
                  </ul>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Please add the required information on the respective pages under the "ADD" menu.
                  </p>
                </CardContent>
              </Card>
            )
          )}
        </div>

        <PurchaseOrderList
          purchaseOrders={purchaseOrders}
          allExporters={allExporters}
          allManufacturers={allManufacturers}
          onEditPo={handleEditPo}
          onDeletePo={handleDeletePo}
          onDownloadPdf={handleDownloadPoPdf}
          onGenerateDoc={handleGeneratePoDoc}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} BizForm. All rights reserved.
      </footer>
    </div>
  );
}

