
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, Controller } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Save, XCircle, ArrowLeftRight, Landmark, Truck, Building2, User, Palette, Package, DollarSign, NotebookText, Link as LinkIcon, FileText, ArrowUp, ArrowDown } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";

const formSchema = z.object({
  date: z.date(),
  type: z.enum(['credit', 'debit']),
  partyType: z.enum(['client', 'manufacturer', 'transporter', 'supplier', 'pallet', 'gst', 'duty_drawback', 'road_tp']),
  partyId: z.string().min(1, "Please select a party."),
  exportDocumentId: z.string().optional(),
  relatedInvoices: z.array(z.object({ type: z.string(), id: z.string() })).optional(),
  currency: z.enum(['USD', 'EUR', 'INR']),
  amount: z.coerce.number().positive("Amount must be a positive number.").default(0),
  description: z.string().optional(),
});

export type TransactionFormValues = z.infer<typeof formSchema>;

interface TransactionFormProps {
  initialData?: Transaction | null;
  isEditing: boolean;
  onSave: (data: TransactionFormValues) => void;
  onCancelEdit: () => void;
  allClients: Client[];
  allManufacturers: Manufacturer[];
  allTransporters: Transporter[];
  allSuppliers: Supplier[];
  allPallets: Pallet[];
  allExportDocuments: ExportDocument[];
  allManuBills: ManuBill[];
  allTransBills: TransBill[];
  allSupplyBills: SupplyBill[];
  allTransactions: Transaction[];
}

const defaultValues: TransactionFormValues = {
  date: new Date(),
  type: 'credit',
  partyType: 'manufacturer',
  partyId: "",
  exportDocumentId: "",
  relatedInvoices: [],
  currency: 'INR',
  amount: 0,
  description: ""
};

type BillType = 'manu' | 'trans' | 'supply';
type UnpaidBill = (ManuBill | TransBill | SupplyBill) & { billType: BillType };

export function TransactionForm({
  initialData,
  isEditing,
  onSave,
  onCancelEdit,
  allClients,
  allManufacturers,
  allTransporters,
  allSuppliers,
  allPallets,
  allExportDocuments,
  allManuBills,
  allTransBills,
  allSupplyBills,
  allTransactions
}: TransactionFormProps) {
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const [unpaidBills, setUnpaidBills] = useState<UnpaidBill[]>([]);

  const transactionType = useWatch({ control: form.control, name: 'type' });
  const partyType = useWatch({ control: form.control, name: 'partyType' });
  const partyId = useWatch({ control: form.control, name: 'partyId' });
  const selectedInvoices = useWatch({ control: form.control, name: 'relatedInvoices' });

  const isGovernmentParty = useMemo(() => ['gst', 'duty_drawback', 'road_tp'].includes(partyType), [partyType]);
  const isGovPartyWithDocLink = useMemo(() => ['gst', 'duty_drawback'].includes(partyType), [partyType]);
  const isPayableParty = useMemo(() => ['manufacturer', 'transporter', 'supplier', 'pallet'].includes(partyType), [partyType]);

  useEffect(() => {
    if (isEditing && initialData) {
      form.reset({ ...initialData, date: new Date(initialData.date), relatedInvoices: initialData.relatedInvoices || [] });
    } else {
      form.reset(defaultValues);
    }
  }, [isEditing, initialData, form]);

  useEffect(() => {
    if (isEditing) return;

    const currentPartyType = form.getValues('partyType');
    const isValidForCredit = ['manufacturer', 'transporter', 'supplier', 'pallet'].includes(currentPartyType);
    const isValidForDebit = ['client', 'gst', 'duty_drawback', 'road_tp'].includes(currentPartyType);

    if (transactionType === 'credit' && !isValidForCredit) {
      form.setValue('partyType', 'manufacturer');
    } else if (transactionType === 'debit' && !isValidForDebit) {
      form.setValue('partyType', 'client');
    }
  }, [transactionType, form, isEditing]);


  useEffect(() => {
    if (isEditing && !form.formState.isDirty) return;
    
    form.setValue('partyId', '');
    form.setValue('relatedInvoices', []);

    if (isGovernmentParty) {
      form.setValue('partyId', partyType);
      form.setValue('currency', 'INR');
    } else if (partyType === 'client') {
      form.setValue('currency', 'USD');
    } else {
      form.setValue('currency', 'INR');
    }

    if (!isGovPartyWithDocLink) {
      form.setValue('exportDocumentId', '');
    }
  }, [partyType, isGovernmentParty, form, isEditing, isGovPartyWithDocLink]);
  
  // Effect to find unpaid bills for the selected party
  useEffect(() => {
    if (!partyId || !isPayableParty) {
      setUnpaidBills([]);
      return;
    }

    // For now, we consider all bills as potentially "unpaid".
    // A future enhancement would be to track payment status on each bill.
    let bills: UnpaidBill[] = [];
    if (partyType === 'manufacturer') {
      bills = allManuBills
        .filter(b => b.manufacturerId === partyId)
        .map(b => ({ ...b, billType: 'manu' }));
    } else if (partyType === 'transporter') {
      bills = allTransBills
        .filter(b => b.transporterId === partyId)
        .map(b => ({ ...b, billType: 'trans' }));
    } else if (partyType === 'supplier' || partyType === 'pallet') {
        bills = allSupplyBills
        .filter(b => b.supplierId === partyId)
        .map(b => ({...b, billType: 'supply'}));
    }
    setUnpaidBills(bills);

  }, [partyId, partyType, isPayableParty, allManuBills, allTransBills, allSupplyBills]);

  // Effect to calculate total amount from selected invoices
  useEffect(() => {
    if (!selectedInvoices) {
      if (!isEditing) form.setValue('amount', 0);
      return;
    };
    
    let total = 0;
    selectedInvoices.forEach(inv => {
      let bill;
      if (inv.type === 'manu') bill = allManuBills.find(b => b.id === inv.id);
      else if (inv.type === 'trans') bill = allTransBills.find(b => b.id === inv.id);
      else if (inv.type === 'supply') bill = allSupplyBills.find(b => b.id === inv.id);
      
      if (bill) {
        total += bill.grandTotal || bill.totalPayable || 0;
      }
    });
    form.setValue('amount', parseFloat(total.toFixed(2)));

  }, [selectedInvoices, allManuBills, allTransBills, allSupplyBills, form, isEditing]);


  const partyOptions = useMemo((): ComboboxOption[] => {
    switch (partyType) {
      case 'client':
        return allClients.map(c => ({ value: c.id, label: c.companyName }));
      case 'manufacturer':
        return allManufacturers.map(m => ({ value: m.id, label: m.companyName }));
      case 'transporter':
        return allTransporters.map(t => ({ value: t.id, label: t.companyName }));
      case 'supplier':
        return allSuppliers.map(s => ({ value: s.id, label: s.companyName }));
      case 'pallet':
        return allPallets.map(p => ({ value: p.id, label: p.companyName }));
      default:
        return [];
    }
  }, [partyType, allClients, allManufacturers, allTransporters, allSuppliers, allPallets]);

  const exportDocOptions = useMemo((): ComboboxOption[] => 
    allExportDocuments.map(d => ({ value: d.id, label: d.exportInvoiceNumber }))
  , [allExportDocuments]);
  
  function onSubmit(values: TransactionFormValues) {
    onSave(values);
    if (!isEditing) {
      form.reset();
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl mb-8">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <ArrowLeftRight className="h-6 w-6 text-primary" />
          {isEditing ? "Edit Transaction" : "New Transaction"}
        </CardTitle>
        <CardDescription>Record a payment made or received.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Transaction Type *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="credit" />
                        </FormControl>
                        <FormLabel className="font-normal flex items-center gap-2"><ArrowDown className="text-red-600"/> Payment Made</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="debit" />
                        </FormControl>
                        <FormLabel className="font-normal flex items-center gap-2"><ArrowUp className="text-green-600" /> Payment Received</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                  control={form.control}
                  name="partyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Party Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a party type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {transactionType === 'credit' ? ( // Payment Made To
                             <>
                              <SelectItem value="manufacturer"><Building2 className="inline-block mr-2 h-4 w-4"/>Manufacturer</SelectItem>
                              <SelectItem value="transporter"><Truck className="inline-block mr-2 h-4 w-4"/>Transporter</SelectItem>
                              <SelectItem value="supplier"><Package className="inline-block mr-2 h-4 w-4"/>Supplier</SelectItem>
                              <SelectItem value="pallet"><Palette className="inline-block mr-2 h-4 w-4"/>Pallet</SelectItem>
                             </>
                          ) : ( // Payment Received From
                            <>
                              <SelectItem value="client"><User className="inline-block mr-2 h-4 w-4"/>Client</SelectItem>
                              <SelectItem value="gst"><Landmark className="inline-block mr-2 h-4 w-4"/>Government (GST)</SelectItem>
                              <SelectItem value="duty_drawback"><Landmark className="inline-block mr-2 h-4 w-4"/>Government (Duty Drawback)</SelectItem>
                              <SelectItem value="road_tp"><Landmark className="inline-block mr-2 h-4 w-4"/>Government (Road TP)</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              {!isGovernmentParty && (
                 <FormField
                    control={form.control}
                    name="partyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Party *</FormLabel>
                        <Combobox
                          options={partyOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select a party..."
                          disabled={partyOptions.length === 0}
                          emptySearchMessage="No parties of this type found."
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              )}
              {isGovPartyWithDocLink && (
                  <FormField
                    control={form.control}
                    name="exportDocumentId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center gap-2"><LinkIcon className="h-4 w-4 text-muted-foreground"/>Link to Export Document</FormLabel>
                        <Combobox
                        options={exportDocOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select an export document..."
                        disabled={exportDocOptions.length === 0}
                        emptySearchMessage="No export documents found."
                        />
                        <FormMessage />
                    </FormItem>
                    )}
                />
              )}
            </div>
            
            {transactionType === 'credit' && isPayableParty && unpaidBills.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Select Invoices to Pay</CardTitle>
                        <CardDescription>Select one or more invoices. The total amount will be suggested automatically, but can be edited for partial payments.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FormField
                            control={form.control}
                            name="relatedInvoices"
                            render={({ field }) => (
                                <FormItem>
                                    <ScrollArea className="h-48 w-full rounded-md border p-4">
                                        {unpaidBills.map((bill) => (
                                            <FormField
                                                key={bill.id}
                                                control={form.control}
                                                name="relatedInvoices"
                                                render={({ field }) => {
                                                    return (
                                                        <FormItem
                                                        key={bill.id}
                                                        className="flex flex-row items-start space-x-3 space-y-0 mb-2"
                                                        >
                                                        <FormControl>
                                                            <Checkbox
                                                            checked={field.value?.some(item => item.id === bill.id)}
                                                            onCheckedChange={(checked) => {
                                                                return checked
                                                                ? field.onChange([...(field.value || []), { type: bill.billType, id: bill.id }])
                                                                : field.onChange(
                                                                    field.value?.filter(
                                                                    (value) => value.id !== bill.id
                                                                    )
                                                                )
                                                            }}
                                                            />
                                                        </FormControl>
                                                        <FormLabel className="font-normal w-full flex justify-between">
                                                            <span>{bill.invoiceNumber} ({format(new Date(bill.invoiceDate), 'dd-MMM-yy')})</span>
                                                            <span className="font-medium">₹ {(bill.grandTotal || bill.totalPayable || 0).toFixed(2)}</span>
                                                        </FormLabel>
                                                        </FormItem>
                                                    )
                                                }}
                                            />
                                        ))}
                                    </ScrollArea>
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
            )}

             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Date *</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50"/></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent></Popover><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Amount *</FormLabel><FormControl><Input type="number" {...field} step="0.01" /></FormControl><FormMessage /></FormItem>)} />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="INR">INR</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><NotebookText/>Description</FormLabel><FormControl><Textarea {...field} placeholder="e.g., Advance payment for PI-001" /></FormControl></FormItem>)} />

          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            {isEditing && (<Button type="button" variant="ghost" onClick={onCancelEdit}><XCircle className="mr-2 h-4 w-4"/> Cancel</Button>)}
            <Button type="submit"><Save className="mr-2 h-4 w-4"/> {isEditing ? "Save Changes" : "Save Transaction"}</Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
