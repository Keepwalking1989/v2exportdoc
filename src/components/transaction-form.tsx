
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
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
import { CalendarIcon, Save, XCircle, ArrowLeftRight, CreditCard, Landmark, Truck, Building2, User, Palette, Package, DollarSign, NotebookText, Link as LinkIcon } from "lucide-react";
import React, { useEffect, useMemo } from "react";
import type { Transaction } from "@/types/transaction";
import type { Client } from "@/types/client";
import type { Manufacturer } from "@/types/manufacturer";
import type { Transporter } from "@/types/transporter";
import type { Supplier } from "@/types/supplier";
import type { Pallet } from "@/types/pallet";
import type { ExportDocument } from "@/types/export-document";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

const formSchema = z.object({
  date: z.date(),
  type: z.enum(['credit', 'debit']),
  partyType: z.enum(['client', 'manufacturer', 'transporter', 'supplier', 'pallet', 'gst', 'duty_drawback', 'road_tp']),
  partyId: z.string().min(1, "Please select a party."),
  exportDocumentId: z.string().optional(),
  currency: z.enum(['USD', 'EUR', 'INR']),
  amount: z.coerce.number().positive("Amount must be a positive number."),
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
}

const defaultValues: TransactionFormValues = {
  date: new Date(),
  type: 'credit',
  partyType: 'client',
  partyId: "",
  exportDocumentId: "",
  currency: 'USD',
  amount: 0,
  description: ""
};

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
  allExportDocuments
}: TransactionFormProps) {
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const transactionType = useWatch({ control: form.control, name: 'type' });
  const partyType = useWatch({ control: form.control, name: 'partyType' });

  const isGovernmentParty = useMemo(() => ['gst', 'duty_drawback', 'road_tp'].includes(partyType), [partyType]);
  const isGovPartyWithDocLink = useMemo(() => ['gst', 'duty_drawback'].includes(partyType), [partyType]);

  useEffect(() => {
    if (isEditing && initialData) {
      form.reset({ ...initialData, date: new Date(initialData.date) });
    } else {
      form.reset(defaultValues);
    }
  }, [isEditing, initialData, form]);

  useEffect(() => {
    if (isEditing) return; // Don't auto-reset when editing

    const currentPartyType = form.getValues('partyType');
    const isValidForCredit = ['client', 'gst', 'duty_drawback', 'road_tp'].includes(currentPartyType);
    const isValidForDebit = ['manufacturer', 'transporter', 'supplier', 'pallet'].includes(currentPartyType);

    if (transactionType === 'credit' && !isValidForCredit) {
      form.setValue('partyType', 'client');
    } else if (transactionType === 'debit' && !isValidForDebit) {
      form.setValue('partyType', 'manufacturer');
    }
  }, [transactionType, form, isEditing]);

  useEffect(() => {
    // When party type changes, reset the selected party and adjust currency
    if (isEditing && !form.formState.isDirty) {
      // Don't run on initial load of an edit form
    } else {
      form.setValue('partyId', '');
    }

    if (isGovernmentParty) {
      form.setValue('partyId', partyType); // Auto-set ID for gov types
      form.setValue('currency', 'INR');
    } else if (partyType === 'client') {
      form.setValue('currency', 'USD');
    } else { // It's a debit to a company
      form.setValue('currency', 'INR');
    }

    if (!isGovPartyWithDocLink) {
        form.setValue('exportDocumentId', '');
    }
  }, [partyType, isGovernmentParty, form, isEditing, isGovPartyWithDocLink]);


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
        <CardDescription>Record a credit (payment received) or debit (payment made).</CardDescription>
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
                        <FormLabel className="font-normal flex items-center gap-2"><CreditCard /> Credit (Received)</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="debit" />
                        </FormControl>
                        <FormLabel className="font-normal flex items-center gap-2"><Landmark/> Debit (Paid)</FormLabel>
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
                          {transactionType === 'credit' ? (
                             <>
                                <SelectItem value="client"><User className="inline-block mr-2 h-4 w-4"/>Client</SelectItem>
                                <SelectItem value="gst"><Landmark className="inline-block mr-2 h-4 w-4"/>Government (GST)</SelectItem>
                                <SelectItem value="duty_drawback"><Landmark className="inline-block mr-2 h-4 w-4"/>Government (Duty Drawback)</SelectItem>
                                <SelectItem value="road_tp"><Landmark className="inline-block mr-2 h-4 w-4"/>Government (Road TP)</SelectItem>
                             </>
                          ) : (
                            <>
                              <SelectItem value="manufacturer"><Building2 className="inline-block mr-2 h-4 w-4"/>Manufacturer</SelectItem>
                              <SelectItem value="transporter"><Truck className="inline-block mr-2 h-4 w-4"/>Transporter</SelectItem>
                              <SelectItem value="supplier"><Package className="inline-block mr-2 h-4 w-4"/>Supplier</SelectItem>
                              <SelectItem value="pallet"><Palette className="inline-block mr-2 h-4 w-4"/>Pallet</SelectItem>
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
            
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Date *</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50"/></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent></Popover><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Amount *</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
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
