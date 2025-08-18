
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { PerformaInvoiceFormV2 } from "@/components/v2/performa-invoice-form";
import { PerformaInvoiceListV2 } from "@/components/v2/performa-invoice-list";
import type { PerformaInvoice } from "@/types/performa-invoice";
import type { Company } from "@/types/company";
import type { Client } from "@/types/client";
import type { Size } from "@/types/size";
import type { Product } from "@/types/product";
import type { Bank } from "@/types/bank";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { generatePerformaInvoicePdf } from "@/lib/performa-invoice-pdf";

const INVOICE_PREFIX = "HEM/PI/25-26/";

export default function PerformaInvoicePageV2() {
  const router = useRouter();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [performaInvoices, setPerformaInvoices] = useState<PerformaInvoice[]>([]);
  const [exporters, setExporters] = useState<Company[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState("");
  const [invoiceToEdit, setInvoiceToEdit] = useState<PerformaInvoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getNextInvoiceNumberInternal = useCallback((invoices: PerformaInvoice[]): string => {
    if (invoices.length === 0) return `${INVOICE_PREFIX}1`;
    const lastNum = Math.max(
      0,
      ...invoices.map(inv => parseInt(inv.invoiceNumber.split('/').pop() || '0', 10))
    );
    return `${INVOICE_PREFIX}${lastNum + 1}`;
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [piRes, expRes, cliRes, sizeRes, prodRes, bankRes] = await Promise.all([
        fetch('/api/v2/performa-invoice-data'),
        fetch('/api/v2/exporter-data'),
        fetch('/api/v2/client-data'),
        fetch('/api/v2/size-data'),
        fetch('/api/v2/product-data'),
        fetch('/api/v2/bank-data'),
      ]);

      if (!piRes.ok || !expRes.ok || !cliRes.ok || !sizeRes.ok || !prodRes.ok || !bankRes.ok) {
        throw new Error('Failed to fetch initial data for Performa Invoices.');
      }

      const piData = await piRes.json();
      const parsedInvoices = piData.map((inv: any) => ({
        ...inv,
        invoiceDate: new Date(inv.invoiceDate),
      }));
      setPerformaInvoices(parsedInvoices);
      setNextInvoiceNumber(getNextInvoiceNumberInternal(parsedInvoices));
      setExporters(await expRes.json());
      setClients(await cliRes.json());
      setSizes(await sizeRes.json());
      setProducts(await prodRes.json());
      setBanks(await bankRes.json());

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast, getNextInvoiceNumberInternal]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSavePerformaInvoice = async (invoiceData: PerformaInvoice) => {
    const isEditing = !!invoiceToEdit;
    const url = isEditing ? `/api/v2/performa-invoice-data?id=${invoiceToEdit!.id}` : '/api/v2/performa-invoice-data';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save invoice.');
      }
      
      toast({ title: `Invoice ${isEditing ? 'Updated' : 'Saved'}`, description: `Invoice ${invoiceData.invoiceNumber} has been successfully saved.` });
      setInvoiceToEdit(null);
      await fetchData(); // Refetch all data to update the list
    } catch (error: any) {
      toast({ variant: "destructive", title: "Save Error", description: error.message });
    }
  };
  
  const handleDeleteInvoice = async (invoiceId: string) => {
    const originalInvoices = [...performaInvoices];
    // Optimistically update the UI
    setPerformaInvoices(prev => prev.filter(inv => inv.id !== invoiceId));

    try {
      const response = await fetch(`/api/v2/performa-invoice-data?id=${invoiceId}`, { method: 'DELETE' });
      
      if (!response.ok) {
        // If the API call fails, revert the UI and show an error
        setPerformaInvoices(originalInvoices);
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete invoice.');
      }
      
      toast({ title: "Invoice Deleted", description: "The performa invoice has been marked as deleted." });
      if (invoiceToEdit?.id === invoiceId) setInvoiceToEdit(null);
      // No need to refetch, UI is already updated.
    } catch (error: any) {
      toast({ variant: "destructive", title: "Delete Error", description: error.message });
    }
  };

  const handleEditInvoice = (invoiceId: string) => {
    const foundInvoice = performaInvoices.find(inv => inv.id === invoiceId);
    if (foundInvoice) {
      setInvoiceToEdit(foundInvoice);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCancelEdit = () => setInvoiceToEdit(null);

  const handleGeneratePO = (invoiceIdForPO: string) => {
    router.push(`/v2/purchase-order?sourcePiId=${invoiceIdForPO}`);
    toast({ title: "Redirecting...", description: "Opening Purchase Order form." });
  };
  
  const handleDownloadPdf = async (invoice: PerformaInvoice) => {
    const exporter = exporters.find(e => e.id.toString() === invoice.exporterId.toString());
    const client = clients.find(c => c.id.toString() === invoice.clientId.toString());
    const selectedBank = banks.find(b => b.id.toString() === invoice.selectedBankId?.toString());

    if (!exporter || !client) {
      toast({ variant: "destructive", title: "Error", description: "Exporter or Client data missing for this invoice." });
      return;
    }
    await generatePerformaInvoicePdf(invoice, exporter, client, sizes, products, selectedBank);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Loading Performa Invoice data from database...</div>
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
            <PerformaInvoiceFormV2
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
                <CardTitle className="font-headline text-2xl">Cannot Create Performa Invoice</CardTitle>
                <CardDescription>To create a Performa Invoice, please ensure you have added at least one of each of the following to the database via the V2 menus:</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside mt-2 text-muted-foreground">
                  {exporters.length === 0 && <li>Exporter</li>}
                  {clients.length === 0 && <li>Client</li>}
                  {sizes.length === 0 && <li>Size</li>}
                  {products.length === 0 && <li>Product</li>}
                  {banks.length === 0 && <li>Bank</li>}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
        <PerformaInvoiceListV2
          invoices={performaInvoices}
          exporters={exporters}
          clients={clients}
          onDeleteInvoice={handleDeleteInvoice}
          onEditInvoice={handleEditInvoice}
          onGeneratePO={handleGeneratePO}
          onDownloadPdf={handleDownloadPdf}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} HEMITH ERP. All rights reserved. (V2 - MySQL)
      </footer>
    </div>
  );
}
