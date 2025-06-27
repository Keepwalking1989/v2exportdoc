
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { ManuBillForm, type ManuBillFormValues } from "@/components/manu-bill-form";
import { ManuBillList } from "@/components/manu-bill-list";
import type { ManuBill } from "@/types/manu-bill";
import type { ExportDocument } from "@/types/export-document";
import type { Manufacturer } from "@/types/manufacturer";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const LOCAL_STORAGE_MANU_BILLS_KEY = "bizform_manu_bills";
const LOCAL_STORAGE_EXPORT_DOCS_KEY_V2 = "bizform_export_documents_v2";
const LOCAL_STORAGE_MANUFACTURERS_KEY = "bizform_manufacturers";

export default function ManuBillPage() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [manuBills, setManuBills] = useState<ManuBill[]>([]);
  const [billToEdit, setBillToEdit] = useState<ManuBill | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Data for dependencies
  const [allExportDocuments, setAllExportDocuments] = useState<ExportDocument[]>([]);
  const [allManufacturers, setAllManufacturers] = useState<Manufacturer[]>([]);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedBills = localStorage.getItem(LOCAL_STORAGE_MANU_BILLS_KEY);
        const parsedBills = storedBills ? JSON.parse(storedBills) : [];
        setManuBills(parsedBills.filter((b: ManuBill) => !b.isDeleted).map((b: any) => ({
          ...b,
          invoiceDate: new Date(b.invoiceDate),
          ackDate: b.ackDate ? new Date(b.ackDate) : undefined,
        })));
        
        setAllExportDocuments(JSON.parse(localStorage.getItem(LOCAL_STORAGE_EXPORT_DOCS_KEY_V2) || "[]"));
        setAllManufacturers(JSON.parse(localStorage.getItem(LOCAL_STORAGE_MANUFACTURERS_KEY) || "[]"));

      } catch (error) {
        console.error("Failed to parse data from localStorage", error);
        setManuBills([]);
        setAllExportDocuments([]);
        setAllManufacturers([]);
      }
    }
  }, []);

  const handleSaveBill = (values: ManuBillFormValues) => {
    const allBillsRaw = localStorage.getItem(LOCAL_STORAGE_MANU_BILLS_KEY);
    const allBills: ManuBill[] = allBillsRaw ? JSON.parse(allBillsRaw) : [];
    
    const billToSave: ManuBill = {
      ...values,
      id: billToEdit ? billToEdit.id : Date.now().toString(),
    };

    if (billToEdit) {
      const updatedBills = allBills.map(b => 
        b.id === billToEdit.id ? { ...billToSave } : b
      );
      localStorage.setItem(LOCAL_STORAGE_MANU_BILLS_KEY, JSON.stringify(updatedBills));
      setManuBills(updatedBills.filter(b => !b.isDeleted).map((b: any) => ({...b, invoiceDate: new Date(b.invoiceDate), ackDate: b.ackDate ? new Date(b.ackDate) : undefined})));
      toast({ title: "Bill Updated", description: `Invoice ${values.invoiceNumber} has been updated.` });
      setBillToEdit(null);
    } else {
      const updatedBills = [...allBills, billToSave];
      localStorage.setItem(LOCAL_STORAGE_MANU_BILLS_KEY, JSON.stringify(updatedBills));
      setManuBills(updatedBills.filter(b => !b.isDeleted).map((b: any) => ({...b, invoiceDate: new Date(b.invoiceDate), ackDate: b.ackDate ? new Date(b.ackDate) : undefined})));
      toast({ title: "Bill Saved", description: `Invoice ${values.invoiceNumber} has been saved.` });
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

  const handleDeleteBill = (id: string) => {
    // No dependency checks needed for ManuBill as it's a record, not a dependency itself.
    const allBillsRaw = localStorage.getItem(LOCAL_STORAGE_MANU_BILLS_KEY);
    const allBills: ManuBill[] = allBillsRaw ? JSON.parse(allBillsRaw) : [];
    
    const updatedBills = allBills.map(b => 
      b.id === id ? { ...b, isDeleted: true } : b
    );
    
    localStorage.setItem(LOCAL_STORAGE_MANU_BILLS_KEY, JSON.stringify(updatedBills));
    setManuBills(updatedBills.filter(b => !b.isDeleted).map((b: any) => ({...b, invoiceDate: new Date(b.invoiceDate), ackDate: b.ackDate ? new Date(b.ackDate) : undefined})));
    toast({ title: "Bill Deleted", description: "The manufacturer bill has been marked as deleted." });
  };

  if (!isClient) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Loading...</div>
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
             <ManuBillForm
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
                  To create a manufacturer bill, please ensure you have added at least one:
                </p>
                <ul className="list-disc list-inside mt-2 text-muted-foreground">
                  {allExportDocuments.length === 0 && <li>Export Document (on the Export Document page)</li>}
                  {allManufacturers.length === 0 && <li>Manufacturer (on the Manufacturer page)</li>}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
        <ManuBillList 
          manuBills={manuBills}
          allManufacturers={allManufacturers}
          allExportDocuments={allExportDocuments}
          onEditBill={handleEditBill}
          onDeleteBill={handleDeleteBill}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} HEMITH ERP. All rights reserved.
      </footer>
    </div>
  );
}
