
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
import { generatePurchaseOrderPdf } from "@/lib/purchase-order-pdf"; // Import PDF generator

const LOCAL_STORAGE_PO_KEY = "bizform_purchase_orders";
const LOCAL_STORAGE_PI_KEY = "bizform_performa_invoices";
const LOCAL_STORAGE_COMPANIES_KEY = "bizform_companies";
const LOCAL_STORAGE_MANUFACTURERS_KEY = "bizform_manufacturers";
const LOCAL_STORAGE_SIZES_KEY = "bizform_sizes";
const LOCAL_STORAGE_PRODUCTS_KEY = "bizform_products";

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
    if (isLoading) return; 

    const sourcePiIdParam = searchParams.get("sourcePiId");
    const editPoIdParam = searchParams.get("editPoId");

    if (sourcePiIdParam) {
      const pi = allPerformaInvoices.find(p => p.id === sourcePiIdParam);
      if (pi) {
        if (pi.items.length === 0 || !pi.items.some(item => item.sizeId && item.sizeId !== "")) {
           toast({ variant: "destructive", title: "Cannot Generate PO", description: "Source Performa Invoice has no items with sizes. Please edit the PI." });
           setSourcePiForNewPo(null);
           router.replace('/purchase-order', { scroll: false }); 
           return;
        }
        setSourcePiForNewPo(pi);
        setPoToEdit(null); 
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        toast({ variant: "destructive", title: "Error", description: `Performa Invoice with ID ${sourcePiIdParam} not found.` });
        setSourcePiForNewPo(null);
        router.replace('/purchase-order', { scroll: false }); 
      }
    } else if (editPoIdParam) {
      const po = purchaseOrders.find(p => p.id === editPoIdParam);
      if (po) {
        setPoToEdit({...po, poDate: new Date(po.poDate)});
        setSourcePiForNewPo(null); 
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        toast({ variant: "destructive", title: "Error", description: `Purchase Order with ID ${editPoIdParam} not found.` });
        setPoToEdit(null);
        router.replace('/purchase-order', { scroll: false }); 
      }
    } else {
      // Clear form state if no relevant query params
      setSourcePiForNewPo(null);
      setPoToEdit(null);
    }
  }, [searchParams, allPerformaInvoices, purchaseOrders, router, toast, isLoading]);


  const handleSavePurchaseOrder = (poData: PurchaseOrder) => {
    let updatedPOs;
    const isEditingMode = !!poToEdit;

    if (isEditingMode) {
      updatedPOs = purchaseOrders.map(po =>
        po.id === poToEdit!.id ? { ...poData, id: poToEdit!.id, sourcePiId: poToEdit!.sourcePiId } : po 
      );
    } else {
      updatedPOs = [...purchaseOrders, poData];
    }
    setPurchaseOrders(updatedPOs);
    localStorage.setItem(LOCAL_STORAGE_PO_KEY, JSON.stringify(updatedPOs));
    
    setPoToEdit(null);
    setSourcePiForNewPo(null);
    router.replace('/purchase-order', { scroll: false });

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
        setPoToEdit(null); 
        router.replace('/purchase-order', { scroll: false });
    }
  };
  
  const handleCancelForm = () => {
    setPoToEdit(null);
    setSourcePiForNewPo(null);
    router.replace('/purchase-order', { scroll: false }); 
  };

  const handleDownloadPoPdf = (poId: string) => {
    const poToPrint = purchaseOrders.find(po => po.id === poId);
    if (!poToPrint) {
      toast({ variant: "destructive", title: "Error", description: "Purchase Order not found." });
      return;
    }
    const exporter = allExporters.find(e => e.id === poToPrint.exporterId);
    const manufacturer = allManufacturers.find(m => m.id === poToPrint.manufacturerId);
    const poSizeDetails = globalSizes.find(s => s.id === poToPrint.sizeId);
    const sourcePiDetails = allPerformaInvoices.find(pi => pi.id === poToPrint.sourcePiId);

    if (!exporter || !manufacturer || !poSizeDetails) {
      toast({ variant: "destructive", title: "Error Generating PDF", description: "Missing data (Exporter, Manufacturer, or Size) for this PO." });
      return;
    }
    
    generatePurchaseOrderPdf(poToPrint, exporter, manufacturer, poSizeDetails, globalProducts, sourcePiDetails);
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

  const showForm = !!sourcePiForNewPo || !!poToEdit;
  const canCreateOrEdit = allExporters.length > 0 && allManufacturers.length > 0 && globalSizes.length > 0 && globalProducts.length > 0;
  
  let distinctSizesFromSourcePi: Size[] = [];
  let productsInSourcePi: Product[] = [];

  const piForForm = poToEdit ? allPerformaInvoices.find(pi => pi.id === poToEdit.sourcePiId) : sourcePiForNewPo;

  if (piForForm && piForForm.items) {
    const sizeIdsInPi = new Set(piForForm.items.map(item => item.sizeId).filter(id => id && id !== ""));
    distinctSizesFromSourcePi = globalSizes.filter(s => sizeIdsInPi.has(s.id));
    
    productsInSourcePi = piForForm.items.reduce((acc: Product[], piItem) => {
      const productDetail = globalProducts.find(gp => gp.id === piItem.productId && gp.sizeId === piItem.sizeId);
      if (productDetail) {
        // Ensure we only add unique products, even if they appear multiple times in PI items (e.g. for different rates, though unlikely)
        if (!acc.find(p => p.id === productDetail.id)) {
          acc.push(productDetail);
        }
      }
      return acc;
    }, []);
  }


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          {showForm && (
            canCreateOrEdit ? (
              <PurchaseOrderForm
                key={poToEdit?.id || sourcePiForNewPo?.id || 'new'} 
                initialData={poToEdit}
                sourcePi={piForForm} 
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
                  {sourcePiForNewPo && (piForForm?.items.length === 0 || !piForForm?.items.some(item => item.sizeId && item.sizeId !== "")) && (
                     <p className="mt-4 text-sm text-destructive">
                        The selected Performa Invoice has no items with sizes. Please edit the Performa Invoice to add items with valid sizes before generating a Purchase Order.
                    </p>
                  )}
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

    