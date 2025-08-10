
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { SupplyBillFormV2 } from "@/components/v2/supply-bill-form";
import { SupplyBillListV2 } from "@/components/v2/supply-bill-list";
import type { SupplyBill } from "@/types/supply-bill";
import type { ExportDocument } from "@/types/export-document";
import type { Supplier } from "@/types/supplier";
import type { Pallet } from "@/types/pallet";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SupplyBillPageV2() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [supplyBills, setSupplyBills] = useState<SupplyBill[]>([]);
  const [billToEdit, setBillToEdit] = useState<SupplyBill | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Data for dependencies
  const [allExportDocuments, setAllExportDocuments] = useState<ExportDocument[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [allPallets, setAllPallets] = useState<Pallet[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [billsRes, docsRes, suppliersRes, palletsRes] = await Promise.all([
        fetch('/api/v2/supply-bill-data'),
        fetch('/api/v2/export-document-data'),
        fetch('/api/v2/supplier-data'),
        fetch('/api/v2/pallet-data'),
      ]);

      if (!billsRes.ok) throw new Error('Failed to fetch supply bills');
      if (!docsRes.ok) throw new Error('Failed to fetch export documents');
      if (!suppliersRes.ok) throw new Error('Failed to fetch suppliers');
      if (!palletsRes.ok) throw new Error('Failed to fetch pallets');

      const billsData = await billsRes.json();
      setSupplyBills(billsData.map((b: any) => ({
        ...b,
        invoiceDate: new Date(b.invoiceDate),
        ackDate: b.ackDate ? new Date(b.ackDate) : undefined,
      })));
      setAllExportDocuments(await docsRes.json());
      setAllSuppliers(await suppliersRes.json());
      setAllPallets(await palletsRes.json());

    } catch (error) {
      console.error("Failed to load data from database", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load required data." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  
  const handleSaveBill = async (values: SupplyBill) => {
    const apiEndpoint = billToEdit ? `/api/v2/supply-bill-data?id=${billToEdit.id}` : '/api/v2/supply-bill-data';
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
        await fetchData();

    } catch (error: any) {
        toast({ variant: "destructive", title: "Error Saving Bill", description: error.message });
    }
  };

  const handleEditBill = (id: string) => {
    const bill = supplyBills.find(b => b.id === id);
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
        const response = await fetch(`/api/v2/supply-bill-data?id=${id}`, { method: 'DELETE' });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete bill');
        }
        toast({ title: "Bill Deleted", description: "The supply bill has been marked as deleted." });
        await fetchData();
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

  const canCreate = allExportDocuments.length > 0 && (allSuppliers.length > 0 || allPallets.length > 0);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          {canCreate ? (
             <SupplyBillFormV2
              key={billToEdit?.id ?? 'new-supply-bill'}
              initialData={billToEdit}
              isEditing={!!billToEdit}
              onSave={handleSaveBill}
              onCancelEdit={handleCancelEdit}
              allExportDocuments={allExportDocuments}
              allSuppliers={allSuppliers}
              allPallets={allPallets}
            />
          ) : (
            <Card className="w-full max-w-2xl mx-auto shadow-xl mb-8">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Cannot Create Supply Bill</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  To create a supply bill, please ensure you have created at least one:
                </p>
                <ul className="list-disc list-inside mt-2 text-muted-foreground">
                  {allExportDocuments.length === 0 && <li>Export Document</li>}
                  {(allSuppliers.length === 0 && allPallets.length === 0) && <li>Supplier or Pallet Company</li>}
                </ul>
                 <p className="text-muted-foreground mt-2">Please add these from the V2 {'->'} ADD menu.</p>
              </CardContent>
            </Card>
          )}
        </div>
        <SupplyBillListV2
          supplyBills={supplyBills}
          allSuppliers={allSuppliers}
          allPallets={allPallets}
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
