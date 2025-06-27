
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { SupplyBillForm } from "@/components/supply-bill-form";
import { SupplyBillList } from "@/components/supply-bill-list";
import type { SupplyBill } from "@/types/supply-bill";
import type { ExportDocument } from "@/types/export-document";
import type { Supplier } from "@/types/supplier";
import type { Pallet } from "@/types/pallet";
import type { Transaction } from "@/types/transaction";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const LOCAL_STORAGE_SUPPLY_BILLS_KEY = "bizform_supply_bills";
const LOCAL_STORAGE_EXPORT_DOCS_KEY_V2 = "bizform_export_documents_v2";
const LOCAL_STORAGE_SUPPLIERS_KEY = "bizform_suppliers";
const LOCAL_STORAGE_PALLETS_KEY = "bizform_pallets";
const LOCAL_STORAGE_TRANSACTIONS_KEY = "bizform_transactions";


export default function SupplyBillPage() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [supplyBills, setSupplyBills] = useState<SupplyBill[]>([]);
  const [billToEdit, setBillToEdit] = useState<SupplyBill | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Data for dependencies
  const [allExportDocuments, setAllExportDocuments] = useState<ExportDocument[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [allPallets, setAllPallets] = useState<Pallet[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedBills = localStorage.getItem(LOCAL_STORAGE_SUPPLY_BILLS_KEY);
        const parsedBills = storedBills ? JSON.parse(storedBills) : [];
        setSupplyBills(parsedBills.filter((b: SupplyBill) => !b.isDeleted).map((b: any) => ({
          ...b,
          invoiceDate: new Date(b.invoiceDate),
          ackDate: b.ackDate ? new Date(b.ackDate) : undefined,
        })));
        
        setAllExportDocuments(JSON.parse(localStorage.getItem(LOCAL_STORAGE_EXPORT_DOCS_KEY_V2) || "[]"));
        setAllSuppliers(JSON.parse(localStorage.getItem(LOCAL_STORAGE_SUPPLIERS_KEY) || "[]"));
        setAllPallets(JSON.parse(localStorage.getItem(LOCAL_STORAGE_PALLETS_KEY) || "[]"));
        setAllTransactions(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TRANSACTIONS_KEY) || "[]"));

      } catch (error) {
        console.error("Failed to parse data from localStorage", error);
        setSupplyBills([]);
        setAllExportDocuments([]);
        setAllSuppliers([]);
        setAllPallets([]);
        setAllTransactions([]);
      }
    }
  }, []);

  const createOrUpdateBillTransaction = (bill: SupplyBill, allTransactions: Transaction[]) => {
    const isSupplier = allSuppliers.some(s => s.id === bill.supplierId);
    const partyType = isSupplier ? 'supplier' : 'pallet';

    const transaction: Transaction = {
      id: `supply_bill_${bill.id}`,
      date: bill.invoiceDate,
      type: 'debit', // A bill from a supplier is a debit on their account (increases what is owed to them)
      partyType: partyType,
      partyId: bill.supplierId,
      sourceBillId: bill.id,
      sourceBillType: 'supply',
      currency: 'INR',
      amount: bill.grandTotal,
      description: `Bill - ${bill.invoiceNumber}`,
      isDeleted: bill.isDeleted,
    };

    const existingIndex = allTransactions.findIndex(t => t.id === transaction.id);
    if (existingIndex > -1) {
      allTransactions[existingIndex] = transaction;
    } else {
      allTransactions.push(transaction);
    }
    localStorage.setItem(LOCAL_STORAGE_TRANSACTIONS_KEY, JSON.stringify(allTransactions));
  };


  const handleSaveBill = (values: SupplyBill) => {
    const allBillsRaw = localStorage.getItem(LOCAL_STORAGE_SUPPLY_BILLS_KEY);
    const allBills: SupplyBill[] = allBillsRaw ? JSON.parse(allBillsRaw) : [];
    
    const billToSave: SupplyBill = {
      ...values,
      id: billToEdit ? billToEdit.id : Date.now().toString(),
    };

    if (billToEdit) {
      const updatedBills = allBills.map(b => 
        b.id === billToEdit.id ? { ...billToSave } : b
      );
      localStorage.setItem(LOCAL_STORAGE_SUPPLY_BILLS_KEY, JSON.stringify(updatedBills));
      setSupplyBills(updatedBills.filter(b => !b.isDeleted).map((b: any) => ({...b, invoiceDate: new Date(b.invoiceDate), ackDate: b.ackDate ? new Date(b.ackDate) : undefined})));
      toast({ title: "Bill Updated", description: `Invoice ${values.invoiceNumber} has been updated.` });
      setBillToEdit(null);
    } else {
      const updatedBills = [...allBills, billToSave];
      localStorage.setItem(LOCAL_STORAGE_SUPPLY_BILLS_KEY, JSON.stringify(updatedBills));
      setSupplyBills(updatedBills.filter(b => !b.isDeleted).map((b: any) => ({...b, invoiceDate: new Date(b.invoiceDate), ackDate: b.ackDate ? new Date(b.ackDate) : undefined})));
      toast({ title: "Bill Saved", description: `Invoice ${values.invoiceNumber} has been saved.` });
    }

    const allTransactions: Transaction[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_TRANSACTIONS_KEY) || '[]');
    createOrUpdateBillTransaction(billToSave, allTransactions);
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

  const handleDeleteBill = (id: string) => {
    const allBillsRaw = localStorage.getItem(LOCAL_STORAGE_SUPPLY_BILLS_KEY);
    const allBills: SupplyBill[] = allBillsRaw ? JSON.parse(allBillsRaw) : [];
    const billToDelete = allBills.find(b => b.id === id);
    
    if (billToDelete) {
        billToDelete.isDeleted = true;
        const updatedBills = allBills.map(b => b.id === id ? billToDelete : b);
        localStorage.setItem(LOCAL_STORAGE_SUPPLY_BILLS_KEY, JSON.stringify(updatedBills));
        setSupplyBills(updatedBills.filter(b => !b.isDeleted).map((b: any) => ({...b, invoiceDate: new Date(b.invoiceDate), ackDate: b.ackDate ? new Date(b.ackDate) : undefined})));
        
        const allTransactions: Transaction[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_TRANSACTIONS_KEY) || '[]');
        createOrUpdateBillTransaction(billToDelete, allTransactions);

        toast({ title: "Bill Deleted", description: "The supply bill has been marked as deleted." });
    }
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

  const canCreate = allExportDocuments.length > 0 && (allSuppliers.length > 0 || allPallets.length > 0);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          {canCreate ? (
             <SupplyBillForm
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
                  To create a supply bill, please ensure you have added at least one:
                </p>
                <ul className="list-disc list-inside mt-2 text-muted-foreground">
                  {allExportDocuments.length === 0 && <li>Export Document</li>}
                  {(allSuppliers.length === 0 && allPallets.length === 0) && <li>Supplier or Pallet Company</li>}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
        <SupplyBillList 
          supplyBills={supplyBills}
          allSuppliers={allSuppliers}
          allPallets={allPallets}
          allExportDocuments={allExportDocuments}
          allTransactions={allTransactions}
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
