
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { TransBillForm, type TransBillFormValues } from "@/components/trans-bill-form";
import { TransBillList } from "@/components/trans-bill-list";
import type { TransBill } from "@/types/trans-bill";
import type { ExportDocument } from "@/types/export-document";
import type { Transporter } from "@/types/transporter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const LOCAL_STORAGE_TRANS_BILLS_KEY = "bizform_trans_bills";
const LOCAL_STORAGE_EXPORT_DOCS_KEY_V2 = "bizform_export_documents_v2";
const LOCAL_STORAGE_TRANSPORTERS_KEY = "bizform_transporters";

export default function TransBillPage() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [transBills, setTransBills] = useState<TransBill[]>([]);
  const [billToEdit, setBillToEdit] = useState<TransBill | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Data for dependencies
  const [allExportDocuments, setAllExportDocuments] = useState<ExportDocument[]>([]);
  const [allTransporters, setAllTransporters] = useState<Transporter[]>([]);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedBills = localStorage.getItem(LOCAL_STORAGE_TRANS_BILLS_KEY);
        const parsedBills = storedBills ? JSON.parse(storedBills) : [];
        setTransBills(parsedBills.filter((b: TransBill) => !b.isDeleted).map((b: any) => ({
          ...b,
          invoiceDate: new Date(b.invoiceDate),
          jobDate: b.jobDate ? new Date(b.jobDate) : undefined,
        })));
        
        setAllExportDocuments(JSON.parse(localStorage.getItem(LOCAL_STORAGE_EXPORT_DOCS_KEY_V2) || "[]"));
        setAllTransporters(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TRANSPORTERS_KEY) || "[]"));

      } catch (error) {
        console.error("Failed to parse data from localStorage", error);
        setTransBills([]);
        setAllExportDocuments([]);
        setAllTransporters([]);
      }
    }
  }, []);

  const handleSaveBill = (values: TransBill) => {
    const allBillsRaw = localStorage.getItem(LOCAL_STORAGE_TRANS_BILLS_KEY);
    const allBills: TransBill[] = allBillsRaw ? JSON.parse(allBillsRaw) : [];
    
    const billToSave: TransBill = {
      ...values,
      id: billToEdit ? billToEdit.id : Date.now().toString(),
    };

    if (billToEdit) {
      const updatedBills = allBills.map(b => 
        b.id === billToEdit.id ? { ...billToSave } : b
      );
      localStorage.setItem(LOCAL_STORAGE_TRANS_BILLS_KEY, JSON.stringify(updatedBills));
      setTransBills(updatedBills.filter(b => !b.isDeleted).map((b: any) => ({...b, invoiceDate: new Date(b.invoiceDate), jobDate: b.jobDate ? new Date(b.jobDate) : undefined})));
      toast({ title: "Bill Updated", description: `Invoice ${values.invoiceNumber} has been updated.` });
      setBillToEdit(null);
    } else {
      const updatedBills = [...allBills, billToSave];
      localStorage.setItem(LOCAL_STORAGE_TRANS_BILLS_KEY, JSON.stringify(updatedBills));
      setTransBills(updatedBills.filter(b => !b.isDeleted).map((b: any) => ({...b, invoiceDate: new Date(b.invoiceDate), jobDate: b.jobDate ? new Date(b.jobDate) : undefined})));
      toast({ title: "Bill Saved", description: `Invoice ${values.invoiceNumber} has been saved.` });
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

  const handleDeleteBill = (id: string) => {
    const allBillsRaw = localStorage.getItem(LOCAL_STORAGE_TRANS_BILLS_KEY);
    const allBills: TransBill[] = allBillsRaw ? JSON.parse(allBillsRaw) : [];
    
    const updatedBills = allBills.map(b => 
      b.id === id ? { ...b, isDeleted: true } : b
    );
    
    localStorage.setItem(LOCAL_STORAGE_TRANS_BILLS_KEY, JSON.stringify(updatedBills));
    setTransBills(updatedBills.filter(b => !b.isDeleted).map((b: any) => ({...b, invoiceDate: new Date(b.invoiceDate), jobDate: b.jobDate ? new Date(b.jobDate) : undefined})));
    toast({ title: "Bill Deleted", description: "The transport bill has been marked as deleted." });
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

  const canCreate = allExportDocuments.length > 0 && allTransporters.length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          {canCreate ? (
             <TransBillForm
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
                  To create a transport bill, please ensure you have added at least one:
                </p>
                <ul className="list-disc list-inside mt-2 text-muted-foreground">
                  {allExportDocuments.length === 0 && <li>Export Document (on the Export Document page)</li>}
                  {allTransporters.length === 0 && <li>Transporter (on the Transporter page)</li>}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
        <TransBillList 
          transBills={transBills}
          allTransporters={allTransporters}
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
