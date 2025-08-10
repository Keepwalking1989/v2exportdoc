
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { TransBillFormV2 } from "@/components/v2/trans-bill-form";
import { TransBillListV2 } from "@/components/v2/trans-bill-list";
import type { TransBill } from "@/types/trans-bill";
import type { ExportDocument } from "@/types/export-document";
import type { Transporter } from "@/types/transporter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function TransBillPageV2() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [transBills, setTransBills] = useState<TransBill[]>([]);
  const [billToEdit, setBillToEdit] = useState<TransBill | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Data for dependencies
  const [allExportDocuments, setAllExportDocuments] = useState<ExportDocument[]>([]);
  const [allTransporters, setAllTransporters] = useState<Transporter[]>([]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [billsRes, docsRes, transportersRes] = await Promise.all([
          fetch('/api/v2/trans-bill-data'),
          fetch('/api/v2/export-document-data'),
          fetch('/api/v2/transporter-data'),
        ]);

        if (!billsRes.ok) throw new Error('Failed to fetch transport bills');
        if (!docsRes.ok) throw new Error('Failed to fetch export documents');
        if (!transportersRes.ok) throw new Error('Failed to fetch transporters');

        const billsData = await billsRes.json();
        setTransBills(billsData.map((b: any) => ({
          ...b,
          invoiceDate: new Date(b.invoiceDate),
        })));
        setAllExportDocuments(await docsRes.json());
        setAllTransporters(await transportersRes.json());

      } catch (error) {
        console.error("Failed to load data from database", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load required data." });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);
  
  const refetchBills = async () => {
    try {
        const response = await fetch('/api/v2/trans-bill-data');
        if (!response.ok) throw new Error('Failed to refetch bills');
        const data = await response.json();
        setTransBills(data.map((b: any) => ({
          ...b,
          invoiceDate: new Date(b.invoiceDate),
        })));
    } catch (error) {
         toast({ variant: "destructive", title: "Error", description: "Could not refresh bill list." });
    }
  }

  const handleSaveBill = async (values: TransBill) => {
    const apiEndpoint = billToEdit ? `/api/v2/trans-bill-data?id=${billToEdit.id}` : '/api/v2/trans-bill-data';
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
    const bill = transBills.find(b => b.id === id);
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
        const response = await fetch(`/api/v2/trans-bill-data?id=${id}`, { method: 'DELETE' });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete bill');
        }
        toast({ title: "Bill Deleted", description: "The transport bill has been marked as deleted." });
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
          <div className="text-center text-muted-foreground">Loading transport bill data from database...</div>
        </main>
      </div>
    );
  }

  const canCreate = allExportDocuments.length > 0 && allTransporters.length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          {canCreate ? (
             <TransBillFormV2
              key={billToEdit?.id ?? 'new-trans-bill'}
              initialData={billToEdit}
              isEditing={!!billToEdit}
              onSave={handleSaveBill}
              onCancelEdit={handleCancelEdit}
              allExportDocuments={allExportDocuments}
              allTransporters={allTransporters}
            />
          ) : (
            <Card className="w-full max-w-2xl mx-auto shadow-xl mb-8">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Cannot Create Transport Bill</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  To create a transport bill, please ensure you have created at least one:
                </p>
                <ul className="list-disc list-inside mt-2 text-muted-foreground">
                  {allExportDocuments.length === 0 && <li>Export Document</li>}
                  {allTransporters.length === 0 && <li>Transporter</li>}
                </ul>
                 <p className="text-muted-foreground mt-2">Please add these from the V2 {'->'} ADD menu.</p>
              </CardContent>
            </Card>
          )}
        </div>
        <TransBillListV2 
          transBills={transBills}
          allTransporters={allTransporters}
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
