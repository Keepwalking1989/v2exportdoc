
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { TransactionFormV2 } from "@/components/v2/transaction-form";
import { TransactionListV2 } from "@/components/v2/transaction-list";
import type { Transaction } from "@/types/transaction";
import { useToast } from "@/hooks/use-toast";

// Import all required types for dependencies
import type { Client } from "@/types/client";
import type { Manufacturer } from "@/types/manufacturer";
import type { Transporter } from "@/types/transporter";
import type { Supplier } from "@/types/supplier";
import type { Pallet } from "@/types/pallet";
import type { ExportDocument } from "@/types/export-document";
import type { ManuBill } from "@/types/manu-bill";
import type { TransBill } from "@/types/trans-bill";
import type { SupplyBill } from "@/types/supply-bill";

export default function TransactionPageV2() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  // States for all dependency data
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allManufacturers, setAllManufacturers] = useState<Manufacturer[]>([]);
  const [allTransporters, setAllTransporters] = useState<Transporter[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [allPallets, setAllPallets] = useState<Pallet[]>([]);
  const [allExportDocuments, setAllExportDocuments] = useState<ExportDocument[]>([]);
  const [allManuBills, setAllManuBills] = useState<ManuBill[]>([]);
  const [allTransBills, setAllTransBills] = useState<TransBill[]>([]);
  const [allSupplyBills, setAllSupplyBills] = useState<SupplyBill[]>([]);
  
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const apiEndpoints = [
        { key: 'transactions', url: '/api/v2/transaction-data' },
        { key: 'clients', url: '/api/v2/client-data' },
        { key: 'manufacturers', url: '/api/v2/manufacturer-data' },
        { key: 'transporters', url: '/api/v2/transporter-data' },
        { key: 'suppliers', url: '/api/v2/supplier-data' },
        { key: 'pallets', url: '/api/v2/pallet-data' },
        { key: 'exportDocuments', url: '/api/v2/export-document-data' },
        { key: 'manuBills', url: '/api/v2/manu-bill-data' },
        { key: 'transBills', url: '/api/v2/trans-bill-data' },
        { key: 'supplyBills', url: '/api/v2/supply-bill-data' },
      ];
      
      const responses = await Promise.all(apiEndpoints.map(e => fetch(e.url)));
      const data = await Promise.all(responses.map(res => res.ok ? res.json() : []));

      setTransactions(data[0] || []);
      setAllClients(data[1] || []);
      setAllManufacturers(data[2] || []);
      setAllTransporters(data[3] || []);
      setAllSuppliers(data[4] || []);
      setAllPallets(data[5] || []);
      setAllExportDocuments(data[6] || []);
      setAllManuBills(data[7] || []);
      setAllTransBills(data[8] || []);
      setAllSupplyBills(data[9] || []);

    } catch (error) {
      console.error("Failed to fetch data", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load required data for transactions." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [toast]);

  const handleSaveTransaction = async (values: Transaction) => {
    const isEditing = !!transactionToEdit;
    const url = isEditing ? `/api/v2/transaction-data?id=${values.id}` : '/api/v2/transaction-data';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save transaction');
      }
      
      toast({ title: `Transaction ${isEditing ? 'Updated' : 'Saved'}`, description: 'The transaction has been successfully saved.' });
      setTransactionToEdit(null);
      await fetchData(); // Refetch to get the latest list
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Save Error', description: error.message });
    }
  };

  const handleEditTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (tx) {
      setTransactionToEdit(tx);
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const response = await fetch(`/api/v2/transaction-data?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete transaction');
      toast({ title: 'Transaction Deleted', description: 'Transaction has been marked as deleted.' });
      await fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Delete Error', description: error.message });
    }
  };

  const handleCancelEdit = () => {
    setTransactionToEdit(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Loading transactions...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          <TransactionFormV2
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
          />
        </div>
        <TransactionListV2 
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
        © {currentYear} HEMITH ERP. All rights reserved.
      </footer>
    </div>
  );
}

    