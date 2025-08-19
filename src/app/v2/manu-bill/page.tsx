
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { ManuBillFormV2, type ManuBillFormValues } from "@/components/v2/manu-bill-form";
import { ManuBillListV2 } from "@/components/v2/manu-bill-list";
import type { ManuBill } from "@/types/manu-bill";
import type { ExportDocument } from "@/types/export-document";
import type { Manufacturer } from "@/types/manufacturer";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ManuBillPageV2() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [manuBills, setManuBills] = useState<ManuBill[]>([]);
  const [billToEdit, setBillToEdit] = useState<ManuBill | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Data for dependencies
  const [allExportDocuments, setAllExportDocuments] = useState<ExportDocument[]>([]);
  const [allManufacturers, setAllManufacturers] = useState<Manufacturer[]>([]);

  const fetchData = async () => {
      setIsLoading(true);
      try {
        const [billsRes, docsRes, manufacturersRes] = await Promise.all([
          fetch('/api/v2/manu-bill-data'),
          fetch('/api/v2/export-document-data'),
          fetch('/api/v2/manufacturer-data'),
        ]);

        if (!billsRes.ok) throw new Error('Failed to fetch manufacturer bills');
        if (!docsRes.ok) throw new Error('Failed to fetch export documents');
        if (!manufacturersRes.ok) throw new Error('Failed to fetch manufacturers');

        const billsData = await billsRes.json();
        const docsData = await docsRes.json();
        const manufacturersData = await manufacturersRes.json();

        // Ensure all IDs are strings for consistency
        setManuBills(billsData.map((b: any) => ({
          ...b,
          id: String(b.id),
          exportDocumentId: String(b.exportDocumentId),
          manufacturerId: String(b.manufacturerId),
          invoiceDate: new Date(b.invoiceDate),
          ackDate: b.ackDate ? new Date(b.ackDate) : undefined,
        })));
        setAllExportDocuments(docsData.map((d: any) => ({ ...d, id: String(d.id) })));
        setAllManufacturers(manufacturersData.map((m: any) => ({ ...m, id: String(m.id) })));

      } catch (error) {
        console.error("Failed to load data from database", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load required data." });
      } finally {
        setIsLoading(false);
      }
    };

  // Fetch initial data
  useEffect(() => {
    fetchData();
  }, [toast]);
  
  const refetchBills = async () => {
    await fetchData(); // Just refetch all data for simplicity and consistency
  }

  const handleSaveBill = async (values: ManuBill) => {
    const apiEndpoint = billToEdit ? `/api/v2/manu-bill-data?id=${billToEdit.id}` : '/api/v2/manu-bill-data';
    const method = billToEdit ? 'PUT' : 'POST';

    try {
        const response = await fetch(apiEndpoint, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to save bill');
        }

        toast({ title: `Bill ${billToEdit ? 'Updated' : 'Saved'}`, description: `Invoice ${values.invoiceNumber} has been successfully saved.` });
        setBillToEdit(null);
        await refetchBills();

    } catch (error: any) {
        toast({ variant: "destructive", title: "Error Saving Bill", description: error.message });
    }
  };

  const handleEditBill = (id: string) => {
    const bill = manuBills.find(b => b.id === id);
    if (bill) {
      setBillToEdit(bill);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCancelEdit = () => {
    setBillToEdit(null);
  };

  const handleDeleteBill = async (id: string) => {
    try {
        const response = await fetch(`/api/v2/manu-bill-data?id=${id}`, { method: 'DELETE' });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete bill');
        }
        toast({ title: "Bill Deleted", description: "The manufacturer bill has been marked as deleted." });
        await refetchBills();
    } catch (error: any) {
         toast({ variant: "destructive", title: "Error Deleting Bill", description: error.message });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Loading bill data from database...</div>
        </main>
      </div>
    );
  }

  const canCreate = allExportDocuments.length > 0 && allManufacturers.length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          {canCreate ? (
             <ManuBillFormV2
              key={billToEdit?.id ?? 'new-bill'}
              initialData={billToEdit}
              isEditing={!!billToEdit}
              onSave={handleSaveBill}
              onCancelEdit={handleCancelEdit}
              allExportDocuments={allExportDocuments}
              allManufacturers={allManufacturers}
            />
          ) : (
            <Card className="w-full max-w-2xl mx-auto shadow-xl mb-8">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Cannot Create Manufacturer Bill</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  To create a manufacturer bill, please ensure you have created at least one:
                </p>
                <ul className="list-disc list-inside mt-2 text-muted-foreground">
                  {allExportDocuments.length === 0 && <li>Export Document</li>}
                  {allManufacturers.length === 0 && <li>Manufacturer</li>}
                </ul>
                 <p className="text-muted-foreground mt-2">Please add these from the V2 {'->'} ADD menu.</p>
              </CardContent>
            </Card>
          )}
        </div>
        <ManuBillListV2 
          manuBills={manuBills}
          allManufacturers={allManufacturers}
          allExportDocuments={allExportDocuments}
          onEditBill={handleEditBill}
          onDeleteBill={handleDeleteBill}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} HEMITH ERP. All rights reserved. (V2 - MySQL)
      </footer>
    </div>
  );
}
