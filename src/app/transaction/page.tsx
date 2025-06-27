
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { TransactionForm, type TransactionFormValues } from "@/components/transaction-form";
import { TransactionList } from "@/components/transaction-list";
import type { Transaction } from "@/types/transaction";
import type { Client } from "@/types/client";
import type { Manufacturer } from "@/types/manufacturer";
import type { Transporter } from "@/types/transporter";
import type { Supplier } from "@/types/supplier";
import type { Pallet } from "@/types/pallet";
import type { ExportDocument } from "@/types/export-document";
import type { ManuBill } from "@/types/manu-bill";
import type { TransBill } from "@/types/trans-bill";
import type { SupplyBill } from "@/types/supply-bill";
import { useToast } from "@/hooks/use-toast";

const LOCAL_STORAGE_TRANSACTIONS_KEY = "bizform_transactions";
const LOCAL_STORAGE_CLIENTS_KEY = "bizform_clients";
const LOCAL_STORAGE_MANUFACTURERS_KEY = "bizform_manufacturers";
const LOCAL_STORAGE_TRANSPORTERS_KEY = "bizform_transporters";
const LOCAL_STORAGE_SUPPLIERS_KEY = "bizform_suppliers";
const LOCAL_STORAGE_PALLETS_KEY = "bizform_pallets";
const LOCAL_STORAGE_EXPORT_DOCS_KEY_V2 = "bizform_export_documents_v2";
const LOCAL_STORAGE_MANU_BILLS_KEY = "bizform_manu_bills";
const LOCAL_STORAGE_TRANS_BILLS_KEY = "bizform_trans_bills";
const LOCAL_STORAGE_SUPPLY_BILLS_KEY = "bizform_supply_bills";

export default function TransactionPage() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Data for dependencies
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allManufacturers, setAllManufacturers] = useState<Manufacturer[]>([]);
  const [allTransporters, setAllTransporters] = useState<Transporter[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [allPallets, setAllPallets] = useState<Pallet[]>([]);
  const [allExportDocuments, setAllExportDocuments] = useState<ExportDocument[]>([]);
  const [allManuBills, setAllManuBills] = useState<ManuBill[]>([]);
  const [allTransBills, setAllTransBills] = useState<TransBill[]>([]);
  const [allSupplyBills, setAllSupplyBills] = useState<SupplyBill[]>([]);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedTransactions = localStorage.getItem(LOCAL_STORAGE_TRANSACTIONS_KEY);
        const parsedTransactions = storedTransactions ? JSON.parse(storedTransactions) : [];
        setTransactions(parsedTransactions.filter((t: Transaction) => !t.isDeleted).map((t: any) => ({
          ...t,
          date: new Date(t.date),
        })));
        
        setAllClients(JSON.parse(localStorage.getItem(LOCAL_STORAGE_CLIENTS_KEY) || "[]").filter((c: Client) => !c.isDeleted));
        setAllManufacturers(JSON.parse(localStorage.getItem(LOCAL_STORAGE_MANUFACTURERS_KEY) || "[]").filter((m: Manufacturer) => !m.isDeleted));
        setAllTransporters(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TRANSPORTERS_KEY) || "[]").filter((t: Transporter) => !t.isDeleted));
        setAllSuppliers(JSON.parse(localStorage.getItem(LOCAL_STORAGE_SUPPLIERS_KEY) || "[]").filter((s: Supplier) => !s.isDeleted));
        setAllPallets(JSON.parse(localStorage.getItem(LOCAL_STORAGE_PALLETS_KEY) || "[]").filter((p: Pallet) => !p.isDeleted));
        setAllExportDocuments(JSON.parse(localStorage.getItem(LOCAL_STORAGE_EXPORT_DOCS_KEY_V2) || "[]").filter((d: ExportDocument) => !d.isDeleted));
        setAllManuBills(JSON.parse(localStorage.getItem(LOCAL_STORAGE_MANU_BILLS_KEY) || "[]").filter((b: ManuBill) => !b.isDeleted));
        setAllTransBills(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TRANS_BILLS_KEY) || "[]").filter((b: TransBill) => !b.isDeleted));
        setAllSupplyBills(JSON.parse(localStorage.getItem(LOCAL_STORAGE_SUPPLY_BILLS_KEY) || "[]").filter((b: SupplyBill) => !b.isDeleted));
        
      } catch (error) {
        console.error("Failed to parse data from localStorage", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to load transaction data." });
      }
    }
  }, [toast]);

  const handleSaveTransaction = (values: TransactionFormValues) => {
    const allTransactionsRaw = localStorage.getItem(LOCAL_STORAGE_TRANSACTIONS_KEY);
    const allTransactions: Transaction[] = allTransactionsRaw ? JSON.parse(allTransactionsRaw) : [];

    if (transactionToEdit) {
      const updatedTransactions = allTransactions.map(t =>
        t.id === transactionToEdit.id ? { ...t, ...values } : t
      );
      localStorage.setItem(LOCAL_STORAGE_TRANSACTIONS_KEY, JSON.stringify(updatedTransactions));
      setTransactions(updatedTransactions.filter(t => !t.isDeleted).map((t: any) => ({...t, date: new Date(t.date)})));
      toast({ title: "Transaction Updated", description: "The transaction has been successfully updated." });
      setTransactionToEdit(null);
    } else {
      const newTransaction: Transaction = { id: Date.now().toString(), ...values };
      const updatedTransactions = [...allTransactions, newTransaction];
      localStorage.setItem(LOCAL_STORAGE_TRANSACTIONS_KEY, JSON.stringify(updatedTransactions));
      setTransactions(updatedTransactions.filter(t => !t.isDeleted).map((t: any) => ({...t, date: new Date(t.date)})));
      toast({ title: "Transaction Saved", description: "The transaction has been successfully saved." });
    }
  };

  const handleEditTransaction = (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
      setTransactionToEdit(transaction);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCancelEdit = () => {
    setTransactionToEdit(null);
  };

  const handleDeleteTransaction = (id: string) => {
    const allTransactionsRaw = localStorage.getItem(LOCAL_STORAGE_TRANSACTIONS_KEY);
    const allTransactions: Transaction[] = allTransactionsRaw ? JSON.parse(allTransactionsRaw) : [];
    
    const updatedTransactions = allTransactions.map(t => 
      t.id === id ? { ...t, isDeleted: true } : t
    );
    
    localStorage.setItem(LOCAL_STORAGE_TRANSACTIONS_KEY, JSON.stringify(updatedTransactions));
    setTransactions(updatedTransactions.filter(t => !t.isDeleted).map((t: any) => ({...t, date: new Date(t.date)})));
    toast({ title: "Transaction Deleted", description: "The transaction has been marked as deleted." });
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

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          <TransactionForm
            key={transactionToEdit?.id ?? 'new'}
            initialData={transactionToEdit}
            isEditing={!!transactionToEdit}
            onSave={handleSaveTransaction}
            onCancelEdit={handleCancelEdit}
            allClients={allClients}
            allManufacturers={allManufacturers}
            allTransporters={allTransporters}
            allSuppliers={allSuppliers}
            allPallets={allPallets}
            allExportDocuments={allExportDocuments}
            allManuBills={allManuBills}
            allTransBills={allTransBills}
            allSupplyBills={allSupplyBills}
            allTransactions={transactions}
          />
        </div>
        <TransactionList 
          transactions={transactions}
          onEditTransaction={handleEditTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          allClients={allClients}
          allManufacturers={allManufacturers}
          allTransporters={allTransporters}
          allSuppliers={allSuppliers}
          allPallets={allPallets}
          allExportDocuments={allExportDocuments}
          allManuBills={allManuBills}
          allTransBills={allTransBills}
          allSupplyBills={allSupplyBills}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} HEMITH ERP. All rights reserved.
      </footer>
    </div>
  );
}
