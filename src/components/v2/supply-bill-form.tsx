
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
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
import { CalendarIcon, PlusCircle, Trash2, Save, XCircle, FileUp, DollarSign, BookOpen, Link as LinkIcon, NotebookText, Truck } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import type { SupplyBill, SupplyBillItem } from "@/types/supply-bill";
import type { ExportDocument } from "@/types/export-document";
import type { Supplier } from "@/types/supplier";
import type { Pallet } from "@/types/pallet";
import { useToast } from "@/hooks/use-toast";

const supplyBillItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1, "Unit is required"),
  rate: z.coerce.number().positive(),
  discountPercentage: z.coerce.number().min(0).max(100).default(0),
});

const formSchema = z.object({
  exportDocumentId: z.string().min(1, "Please link an Export Document"),
  supplierId: z.string().min(1, "Supplier/Pallet Co. is required"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.date(),
  ackNo: z.string().optional(),
  ackDate: z.date().optional(),
  items: z.array(supplyBillItemSchema).min(1, "At least one item is required"),
  remarks: z.string().optional(),
  centralTaxRate: z.coerce.number().min(0).default(9),
  stateTaxRate: z.coerce.number().min(0).default(9),
  discountAmount: z.coerce.number().min(0).optional().default(0),
  insuranceAmount: z.coerce.number().min(0).optional().default(0),
  freightAmount: z.coerce.number().min(0).optional().default(0),
  roundOff: z.coerce.number().optional().default(0),
  billDocumentUri: z.string().optional(),
  ewayBillDocumentUri: z.string().optional(),
});

export type SupplyBillFormValues = z.infer<typeof formSchema>;

interface SupplyBillFormProps {
  initialData?: SupplyBill | null;
  isEditing: boolean;
  onSave: (data: SupplyBill) => void;
  onCancelEdit: () => void;
  allExportDocuments: ExportDocument[];
  allSuppliers: Supplier[];
  allPallets: Pallet[];
}

const defaultFormValues: SupplyBillFormValues = {
    exportDocumentId: "",
    supplierId: "",
    invoiceNumber: "",
    invoiceDate: new Date(),
    ackNo: "",
    ackDate: undefined,
    items: [{ description: "", quantity: 0, unit: "SQM", rate: 0, discountPercentage: 0 }],
    remarks: "",
    centralTaxRate: 9,
    stateTaxRate: 9,
    discountAmount: 0,
    insuranceAmount: 0,
    freightAmount: 0,
    roundOff: 0,
    billDocumentUri: "",
    ewayBillDocumentUri: "",
};


export function SupplyBillFormV2({
  initialData,
  isEditing,
  onSave,
  onCancelEdit,
  allExportDocuments,
  allSuppliers,
  allPallets,
}: SupplyBillFormProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  
  const form = useForm<SupplyBillFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    if (isEditing && initialData) {
      form.reset({
        ...defaultFormValues,
        ...initialData,
      });
    } else {
      form.reset(defaultFormValues);
    }
  }, [isEditing, initialData, form]);

  const watchedItems = useWatch({ control: form.control, name: "items" });
  const watchedTaxesAndCharges = useWatch({ control: form.control, name: ["centralTaxRate", "stateTaxRate", "discountAmount", "insuranceAmount", "freightAmount", "roundOff"] });

  const { subTotal, finalSubTotal, centralTaxAmount, stateTaxAmount, grandTotal } = useMemo(() => {
    let sub = 0;
    (watchedItems || []).forEach(item => {
      const taxableAmount = (item.quantity * item.rate) * (1 - (item.discountPercentage / 100));
      sub += taxableAmount;
    });

    const [centralTaxRate, stateTaxRate, discount, insurance, freight, roundOff] = watchedTaxesAndCharges;
    const finalSub = sub - (discount || 0) + (insurance || 0) + (freight || 0);
    const cTax = finalSub * ((centralTaxRate || 0) / 100);
    const sTax = finalSub * ((stateTaxRate || 0) / 100);
    const grand = finalSub + cTax + sTax + (roundOff || 0);

    return {
      subTotal: sub,
      finalSubTotal: finalSub,
      centralTaxAmount: cTax,
      stateTaxAmount: sTax,
      grandTotal: grand,
    };
  }, [watchedItems, watchedTaxesAndCharges]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'billDocumentUri' | 'ewayBillDocumentUri') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    toast({ title: "Uploading...", description: `Uploading ${file.name}. Please wait.` });

    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const fileData = reader.result;
            const response = await fetch('/api/v2/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileData, fileName: file.name }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'File upload failed');
            }

            const { filePath } = await response.json();
            form.setValue(fieldName, filePath, { shouldValidate: true });
            toast({ title: "Upload Successful", description: `File saved to: ${filePath}` });
        };
    } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Error", description: error.message });
    } finally {
        setIsUploading(false);
    }
  };

  function onSubmit(values: SupplyBillFormValues) {
    const finalBill: SupplyBill = {
      id: '', // Will be set in parent
      ...values,
      items: (values.items || []).map(item => {
        const taxableAmount = (item.quantity * item.rate) * (1 - (item.discountPercentage / 100));
        return { ...item, id: item.id || Math.random().toString(36).substring(2, 9), taxableAmount };
      }),
      subTotal,
      finalSubTotal,
      centralTaxAmount,
      stateTaxAmount,
      grandTotal,
    };
    onSave(finalBill);
  }

  const exportDocOptions: ComboboxOption[] = allExportDocuments.map(doc => ({
    value: doc.id,
    label: `ED-${doc.id.slice(-6)} (${doc.exportInvoiceNumber})`
  }));
  
  const supplierOptions: ComboboxOption[] = useMemo(() => {
    const suppliers = allSuppliers.map(s => ({ value: s.id, label: `${s.companyName} (Supplier)` }));
    const pallets = allPallets.map(p => ({ value: p.id, label: `${p.companyName} (Pallet)` }));
    return [...suppliers, ...pallets];
  }, [allSuppliers, allPallets]);

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-xl mb-8">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          {isEditing ? "Edit Supply Bill (DB)" : "Add New Supply Bill (DB)"}
        </CardTitle>
        <CardDescription>Record the bill received from a supplier. Start by linking it to an Export Document.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="exportDocumentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><LinkIcon className="h-4 w-4 text-muted-foreground" />Link to Export Document *</FormLabel>
                    <Combobox options={exportDocOptions} {...field} placeholder="Select an Export Document..."/>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Truck className="h-4 w-4 text-muted-foreground" />Supplier / Pallet Co. *</FormLabel>
                      <Combobox
                        options={supplierOptions}
                        {...field}
                        onChange={field.onChange}
                        placeholder="Select a Supplier or Pallet Co..."
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            
            <Card>
              <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="invoiceNumber" render={({ field }) => (<FormItem><FormLabel>Invoice No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="invoiceDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Invoice Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick date</span>}<CalendarIcon className="ml-auto h-4 w-4"/></Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value} onSelect={field.onChange}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex justify-between">Items<Button type="button" size="sm" onClick={() => append({ description: "", quantity: 0, unit: "SQM", rate: 0, discountPercentage: 0 })}><PlusCircle className="mr-2 h-4 w-4"/>Add Item</Button></CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-md space-y-2 relative">
                     <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => remove(index)}><Trash2 className="h-3 w-3" /></Button>
                     <FormField control={form.control} name={`items.${index}.description`} render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (<FormItem><FormLabel>Qty</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                        <FormField
                          control={form.control}
                          name={`items.${index}.unit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} defaultValue="SQM">
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select unit" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="SQM">SQM</SelectItem>
                                  <SelectItem value="PCS">PCS</SelectItem>
                                  <SelectItem value="BOX">BOX</SelectItem>
                                  <SelectItem value="KGS">KGS</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField control={form.control} name={`items.${index}.rate`} render={({ field }) => (<FormItem><FormLabel>Rate</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                     </div>
                  </div>
                ))}
              </CardContent>
            </Card>

             <Card>
                <CardHeader><CardTitle>Totals & Taxes</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <FormItem><FormLabel className="flex items-center gap-2"><DollarSign/>Sub Total</FormLabel><Input readOnly value={subTotal.toFixed(2)} className="bg-muted/50"/></FormItem>
                        <FormField control={form.control} name="discountAmount" render={({ field }) => (<FormItem><FormLabel>Discount</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="insuranceAmount" render={({ field }) => (<FormItem><FormLabel>Insurance</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="freightAmount" render={({ field }) => (<FormItem><FormLabel>Freight</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                        <FormItem><FormLabel className="flex items-center gap-2"><DollarSign/>Final Sub Total</FormLabel><Input readOnly value={finalSubTotal.toFixed(2)} className="bg-muted/50"/></FormItem>
                        <FormField control={form.control} name="centralTaxRate" render={({ field }) => (<FormItem><FormLabel>Central Tax %</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                        <FormItem><FormLabel>Central Tax Amt</FormLabel><Input readOnly value={centralTaxAmount.toFixed(2)} className="bg-muted/50"/></FormItem>
                        <div></div>
                        <FormField control={form.control} name="stateTaxRate" render={({ field }) => (<FormItem><FormLabel>State Tax %</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                        <FormItem><FormLabel>State Tax Amt</FormLabel><Input readOnly value={stateTaxAmount.toFixed(2)} className="bg-muted/50"/></FormItem>
                        <FormField control={form.control} name="roundOff" render={({ field }) => (<FormItem><FormLabel>Round Off</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                    </div>
                    <div className="text-right text-xl font-bold">
                        <FormLabel>Grand Total</FormLabel>
                        <p>₹ {grandTotal.toFixed(2)}</p>
                    </div>
                </CardContent>
             </Card>
             <Card>
                <CardHeader><CardTitle>Remarks & Attachments</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                   <FormField control={form.control} name="remarks" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><NotebookText />Remarks</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="billDocumentUri" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><FileUp/>Upload Bill PDF/Image</FormLabel><FormControl><Input type="file" onChange={(e) => handleFileChange(e, 'billDocumentUri')} accept=".pdf,.jpg,.jpeg,.png" disabled={isUploading}/></FormControl><FormMessage/></FormItem>)} />
                        <FormField control={form.control} name="ewayBillDocumentUri" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><FileUp/>Upload E-Way Bill PDF/Image</FormLabel><FormControl><Input type="file" onChange={(e) => handleFileChange(e, 'ewayBillDocumentUri')} accept=".pdf,.jpg,.jpeg,.png" disabled={isUploading} /></FormControl><FormMessage/></FormItem>)} />
                   </div>
                </CardContent>
             </Card>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            {isEditing && (<Button type="button" variant="ghost" onClick={onCancelEdit}><XCircle/> Cancel</Button>)}
            <Button type="submit" disabled={isUploading}><Save /> {isUploading ? "Uploading..." : (isEditing ? "Save Changes" : "Save Bill")}</Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
