
"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { PerformaInvoiceForm } from "@/components/performa-invoice-form";
// import { PerformaInvoiceList } from "@/components/performa-invoice-list"; // If you create a list component
import type { PerformaInvoice } from "@/types/performa-invoice";
import type { Company } from "@/types/company";
import type { Client } from "@/types/client";
import type { Size } from "@/types/size";
import type { Product } from "@/types/product";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const LOCAL_STORAGE_PERFORMA_INVOICES_KEY = "bizform_performa_invoices";
const LOCAL_STORAGE_COMPANIES_KEY = "bizform_companies";
const LOCAL_STORAGE_CLIENTS_KEY = "bizform_clients";
const LOCAL_STORAGE_SIZES_KEY = "bizform_sizes";
const LOCAL_STORAGE_PRODUCTS_KEY = "bizform_products";
const INVOICE_PREFIX = "HEM/PI/25-26/";

export default function PerformaInvoicePage() {
  const [performaInvoices, setPerformaInvoices] = useState<PerformaInvoice[]>([]);
  const [exporters, setExporters] = useState<Company[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getNextInvoiceNumber = useCallback((invoices: PerformaInvoice[]): string => {
    if (invoices.length === 0) {
      return `${INVOICE_PREFIX}1`;
    }
    const lastInvoice = invoices
      .map(inv => {
        const parts = inv.invoiceNumber.split('/');
        return parseInt(parts[parts.length - 1], 10);
      })
      .filter(num => !isNaN(num))
      .sort((a, b) => b - a)[0];
      
    const nextNum = (lastInvoice || 0) + 1;
    return `${INVOICE_PREFIX}${nextNum}`;
  }, []);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedInvoices = localStorage.getItem(LOCAL_STORAGE_PERFORMA_INVOICES_KEY);
        const currentInvoices = storedInvoices ? JSON.parse(storedInvoices) : [];
        setPerformaInvoices(currentInvoices);
        setNextInvoiceNumber(getNextInvoiceNumber(currentInvoices));

        const storedExporters = localStorage.getItem(LOCAL_STORAGE_COMPANIES_KEY);
        setExporters(storedExporters ? JSON.parse(storedExporters) : []);

        const storedClients = localStorage.getItem(LOCAL_STORAGE_CLIENTS_KEY);
        setClients(storedClients ? JSON.parse(storedClients) : []);

        const storedSizes = localStorage.getItem(LOCAL_STORAGE_SIZES_KEY);
        setSizes(storedSizes ? JSON.parse(storedSizes) : []);
        
        const storedProducts = localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY);
        setProducts(storedProducts ? JSON.parse(storedProducts) : []);

      } catch (error) {
        console.error("Failed to parse data from localStorage", error);
        // Initialize with empty arrays and default next invoice number if parsing fails
        setPerformaInvoices([]);
        setNextInvoiceNumber(getNextInvoiceNumber([]));
        setExporters([]);
        setClients([]);
        setSizes([]);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    }
  }, [getNextInvoiceNumber]);

  const handleSavePerformaInvoice = (newInvoice: PerformaInvoice) => {
    const updatedInvoices = [...performaInvoices, newInvoice];
    setPerformaInvoices(updatedInvoices);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_PERFORMA_INVOICES_KEY, JSON.stringify(updatedInvoices));
    }
    setNextInvoiceNumber(getNextInvoiceNumber(updatedInvoices)); // Update for the next form
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
  
  const canCreateInvoice = exporters.length > 0 && clients.length > 0 && sizes.length > 0 && products.length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        {canCreateInvoice ? (
          <PerformaInvoiceForm
            onSave={handleSavePerformaInvoice}
            nextInvoiceNumber={nextInvoiceNumber}
            exporters={exporters}
            clients={clients}
            sizes={sizes}
            allProducts={products}
          />
        ) : (
           <Card className="w-full max-w-2xl mx-auto shadow-xl">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Cannot Create Performa Invoice</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                To create a Performa Invoice, please ensure you have added at least one:
              </p>
              <ul className="list-disc list-inside mt-2 text-muted-foreground">
                {exporters.length === 0 && <li>Exporter (on the Exporter page)</li>}
                {clients.length === 0 && <li>Client (on the Client page)</li>}
                {sizes.length === 0 && <li>Size (on the Size page)</li>}
                {products.length === 0 && <li>Product (on the Product page)</li>}
              </ul>
               <p className="mt-4 text-sm text-muted-foreground">
                Please add the required information on the respective pages under the "ADD" menu.
              </p>
            </CardContent>
          </Card>
        )}
        {/* <PerformaInvoiceList invoices={performaInvoices} />  Placeholder for a list component */}
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} BizForm. All rights reserved.
      </footer>
    </div>
  );
}
