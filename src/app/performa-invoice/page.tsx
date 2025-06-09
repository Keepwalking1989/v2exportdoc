
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation"; // Import useRouter
import { Header } from "@/components/layout/header";
import { PerformaInvoiceForm } from "@/components/performa-invoice-form";
import { PerformaInvoiceList } from "@/components/performa-invoice-list";
import type { PerformaInvoice, PerformaInvoiceItem } from "@/types/performa-invoice";
import type { Company } from "@/types/company";
import type { Client } from "@/types/client";
import type { Size } from "@/types/size";
import type { Product } from "@/types/product";
import type { Bank } from "@/types/bank";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast"; // Import useToast

const LOCAL_STORAGE_PERFORMA_INVOICES_KEY = "bizform_performa_invoices";
const LOCAL_STORAGE_COMPANIES_KEY = "bizform_companies";
const LOCAL_STORAGE_CLIENTS_KEY = "bizform_clients";
const LOCAL_STORAGE_SIZES_KEY = "bizform_sizes";
const LOCAL_STORAGE_PRODUCTS_KEY = "bizform_products";
const LOCAL_STORAGE_BANKS_KEY = "bizform_banks";
const INVOICE_PREFIX = "HEM/PI/25-26/";

export default function PerformaInvoicePage() {
  const router = useRouter(); // Initialize useRouter
  const { toast } = useToast(); // Initialize useToast

  const [performaInvoices, setPerformaInvoices] = useState<PerformaInvoice[]>([]);
  const [exporters, setExporters] = useState<Company[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [invoiceToEdit, setInvoiceToEdit] = useState<PerformaInvoice | null>(null);
  const formRef = useRef<HTMLDivElement>(null);


  const getNextInvoiceNumberInternal = useCallback((invoices: PerformaInvoice[]): string => {
    if (invoices.length === 0) {
      return `${INVOICE_PREFIX}1`;
    }
    const lastInvoiceNum = invoices
      .map(inv => {
        const parts = inv.invoiceNumber.split('/');
        const numPart = parts[parts.length - 1];
        return parseInt(numPart, 10);
      })
      .filter(num => !isNaN(num))
      .sort((a, b) => b - a)[0];

    const nextNum = (lastInvoiceNum || 0) + 1;
    return `${INVOICE_PREFIX}${nextNum}`;
  }, []);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedInvoices = localStorage.getItem(LOCAL_STORAGE_PERFORMA_INVOICES_KEY);
        const currentInvoices = storedInvoices ? JSON.parse(storedInvoices) : [];
        
        const parsedInvoices: PerformaInvoice[] = currentInvoices.map((inv: any) => {
          const items: PerformaInvoiceItem[] = inv.items.map((item: any) => {
            const parsedItem: PerformaInvoiceItem = {
              id: item.id,
              sizeId: item.sizeId,
              productId: item.productId,
              boxes: Number(item.boxes) || 0,
              ratePerSqmt: Number(item.ratePerSqmt) || 0,
              commission: Number(item.commission) || 0,
            };
            if (item.quantitySqmt !== undefined && item.quantitySqmt !== null) {
              parsedItem.quantitySqmt = Number(item.quantitySqmt);
              if (isNaN(parsedItem.quantitySqmt)) parsedItem.quantitySqmt = undefined; 
            }
            if (item.amount !== undefined && item.amount !== null) {
              parsedItem.amount = Number(item.amount);
              if (isNaN(parsedItem.amount)) parsedItem.amount = undefined; 
            }
            return parsedItem;
          });

          const parsedInv: PerformaInvoice = {
            ...inv,
            invoiceDate: new Date(inv.invoiceDate),
            items,
            totalContainer: Number(inv.totalContainer) || 0,
            freight: Number(inv.freight) || 0,
            discount: Number(inv.discount) || 0,
          };

          if (inv.subTotal !== undefined && inv.subTotal !== null) {
            parsedInv.subTotal = Number(inv.subTotal);
            if (isNaN(parsedInv.subTotal)) parsedInv.subTotal = undefined;
          }
          if (inv.grandTotal !== undefined && inv.grandTotal !== null) {
            parsedInv.grandTotal = Number(inv.grandTotal);
            if (isNaN(parsedInv.grandTotal)) parsedInv.grandTotal = undefined;
          }
          return parsedInv;
        });

        setPerformaInvoices(parsedInvoices);
        setNextInvoiceNumber(getNextInvoiceNumberInternal(parsedInvoices));

        const storedExporters = localStorage.getItem(LOCAL_STORAGE_COMPANIES_KEY);
        setExporters(storedExporters ? JSON.parse(storedExporters) : []);

        const storedClients = localStorage.getItem(LOCAL_STORAGE_CLIENTS_KEY);
        setClients(storedClients ? JSON.parse(storedClients) : []);

        const storedSizes = localStorage.getItem(LOCAL_STORAGE_SIZES_KEY);
        setSizes(storedSizes ? JSON.parse(storedSizes) : []);

        const storedProducts = localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY);
        setProducts(storedProducts ? JSON.parse(storedProducts) : []);

        const storedBanks = localStorage.getItem(LOCAL_STORAGE_BANKS_KEY);
        setBanks(storedBanks ? JSON.parse(storedBanks) : []);

      } catch (error) {
        console.error("Failed to parse data from localStorage", error);
        setPerformaInvoices([]);
        setNextInvoiceNumber(getNextInvoiceNumberInternal([]));
        setExporters([]);
        setClients([]);
        setSizes([]);
        setProducts([]);
        setBanks([]);
      } finally {
        setIsLoading(false);
      }
    }
  }, [getNextInvoiceNumberInternal]);

  const handleSavePerformaInvoice = (invoiceData: PerformaInvoice) => {
    let updatedInvoices;
    if (invoiceToEdit) {
      updatedInvoices = performaInvoices.map(inv =>
        inv.id === invoiceToEdit.id ? { ...invoiceData, id: invoiceToEdit.id } : inv
      );
      setInvoiceToEdit(null); 
    } else {
      updatedInvoices = [...performaInvoices, invoiceData];
    }
    setPerformaInvoices(updatedInvoices);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_PERFORMA_INVOICES_KEY, JSON.stringify(updatedInvoices));
    }
    if (!invoiceToEdit) {
      setNextInvoiceNumber(getNextInvoiceNumberInternal(updatedInvoices));
    }
  };

  const handleDeleteInvoice = (invoiceIdToDelete: string) => {
    const updatedInvoices = performaInvoices.filter(inv => inv.id !== invoiceIdToDelete);
    setPerformaInvoices(updatedInvoices);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_PERFORMA_INVOICES_KEY, JSON.stringify(updatedInvoices));
    }
    setNextInvoiceNumber(getNextInvoiceNumberInternal(updatedInvoices));
    if (invoiceToEdit && invoiceToEdit.id === invoiceIdToDelete) {
        setInvoiceToEdit(null); 
    }
  };

  const handleEditInvoice = (invoiceIdToEdit: string) => {
    const foundInvoice = performaInvoices.find(inv => inv.id === invoiceIdToEdit);
    if (foundInvoice) {
      setInvoiceToEdit({
        ...foundInvoice,
        invoiceDate: new Date(foundInvoice.invoiceDate) 
      });
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCancelEdit = () => {
    setInvoiceToEdit(null);
  };

  const handleGeneratePO = (invoiceIdForPO: string) => {
    const sourcePI = performaInvoices.find(pi => pi.id === invoiceIdForPO);
    if (!sourcePI) {
        toast({ variant: "destructive", title: "Error", description: `Performa Invoice with ID ${invoiceIdForPO} not found.` });
        return;
    }
    if (sourcePI.items.length === 0) {
        toast({ variant: "destructive", title: "Cannot Generate PO", description: "This Performa Invoice has no items. Please add items to it first." });
        return;
    }
    // Check if at least one size is present in the items.
    // This is important because the PO form requires selecting a size from the PI's items.
    const hasItemsWithSizes = sourcePI.items.some(item => item.sizeId && item.sizeId !== "");
    if (!hasItemsWithSizes) {
       toast({ variant: "destructive", title: "Cannot Generate PO", description: "None of the items in this Performa Invoice have a size specified. Please edit the PI and assign sizes to items." });
       return;
    }

    router.push(`/purchase-order?sourcePiId=${invoiceIdForPO}`);
  };


  if (!isClient || isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Loading performa invoice data...</div>
        </main>
      </div>
    );
  }

  const canCreateOrEdit = exporters.length > 0 && clients.length > 0 && sizes.length > 0 && products.length > 0 && banks.length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          {canCreateOrEdit ? (
            <PerformaInvoiceForm
              initialDataForForm={invoiceToEdit}
              isEditing={!!invoiceToEdit}
              onSave={handleSavePerformaInvoice}
              onCancelEdit={handleCancelEdit}
              nextInvoiceNumber={nextInvoiceNumber}
              exporters={exporters}
              clients={clients}
              sizes={sizes}
              allProducts={products}
              banks={banks}
            />
          ) : (
             <Card className="w-full max-w-2xl mx-auto shadow-xl mb-8">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Cannot Create or Edit Performa Invoice</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  To create or edit a Performa Invoice, please ensure you have added at least one:
                </p>
                <ul className="list-disc list-inside mt-2 text-muted-foreground">
                  {exporters.length === 0 && <li>Exporter (on the Exporter page)</li>}
                  {clients.length === 0 && <li>Client (on the Client page)</li>}
                  {sizes.length === 0 && <li>Size (on the Size page)</li>}
                  {products.length === 0 && <li>Product (on the Product page)</li>}
                  {banks.length === 0 && <li>Bank (on the Bank page)</li>}
                </ul>
                 <p className="mt-4 text-sm text-muted-foreground">
                  Please add the required information on the respective pages under the "ADD" menu.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
        <PerformaInvoiceList
          invoices={performaInvoices}
          exporters={exporters}
          clients={clients}
          sizes={sizes}
          allProducts={products}
          banks={banks}
          onDeleteInvoice={handleDeleteInvoice}
          onEditInvoice={handleEditInvoice}
          onGeneratePO={handleGeneratePO}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} BizForm. All rights reserved.
      </footer>
    </div>
  );
}

    