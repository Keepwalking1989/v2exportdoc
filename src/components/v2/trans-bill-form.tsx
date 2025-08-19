
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
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, PlusCircle, Trash2, Save, XCircle, FileUp, DollarSign, BookOpen, Link as LinkIcon, NotebookText, Truck, Building, Layers } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import type { TransBill, TransBillItem } from "@/types/trans-bill";
import type { ExportDocument } from "@/types/export-document";
import type { Transporter } from "@/types/transporter";
import { useToast } from "@/hooks/use-toast";

const transBillItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().positive(),
  rate: z.coerce.number().positive(),
  gstRate: z.coerce.number().min(0).max(100).default(18),
});

const formSchema = z.object({
  exportDocumentId: z.string().min(1, "Please link an Export Document"),
  transporterId: z.string().min(1, "Transporter is required"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.date(),
  shippingLine: z.string().optional(),
  portOfLoading: z.string().optional(),
  portOfDischarge: z.string().optional(),
  items: z.array(transBillItemSchema).min(1, "At least one item is required"),
  remarks: z.string().optional(),
  cgstRate: z.coerce.number().min(0).default(9),
  sgstRate: z.coerce.number().min(0).default(9),
  roundOff: z.coerce.number().optional().default(0),
  billDocumentUri: z.string().optional(),
  lrDocumentUri: z.string().optional(),
});

export type TransBillFormValues = z.infer<typeof formSchema>;

const defaultFormValues: TransBillFormValues = {
    exportDocumentId: "",
    transporterId: "",
    invoiceNumber: "",
    invoiceDate: new Date(),
    shippingLine: "",
    portOfLoading: "",
    portOfDischarge: "",
    items: [{ description: "", quantity: 1, rate: 0, gstRate: 18 }],
    remarks: "",
    cgstRate: 9,
    sgstRate: 9,
    roundOff: 0,
    billDocumentUri: "",
    lrDocumentUri: "",
};


export function TransBillFormV2({
  initialData,
  isEditing,
  onSave,
  onCancelEdit,
  allExportDocuments,
  allTransporters,
}: {
  initialData?: TransBill | null;
  isEditing: boolean;
  onSave: (data: TransBill) => void;
  onCancelEdit: () => void;
  allExportDocuments: ExportDocument[];
  allTransporters: Transporter[];
}) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  
  const form = useForm<TransBillFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const selectedExportDocId = useWatch({ control: form.control, name: 'exportDocumentId' });

  useEffect(() => {
    if (selectedExportDocId) {
      const doc = allExportDocuments.find(d => d.id === selectedExportDocId);
      if (doc) {
        if(doc.transporterId) form.setValue('transporterId', doc.transporterId);
        if(doc.vesselFlightNo) form.setValue('shippingLine', doc.vesselFlightNo);
        if(doc.portOfLoading) form.setValue('portOfLoading', doc.portOfLoading);
        if(doc.portOfDischarge) form.setValue('portOfDischarge', doc.portOfDischarge);
      }
    }
  }, [selectedExportDocId, allExportDocuments, form]);

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
  const watchedTaxesAndCharges = useWatch({ control: form.control, name: ["cgstRate", "sgstRate", "roundOff"] });

  const { subTotal, cgstAmount, sgstAmount, totalTax, totalAfterTax, totalPayable } = useMemo(() => {
    let sub = 0;
    let totalTaxAmount = 0;

    (watchedItems || []).forEach(item => {
      const itemAmount = item.quantity * item.rate;
      sub += itemAmount;
      const itemGst = itemAmount * (item.gstRate / 100);
      totalTaxAmount += itemGst;
    });

    const [cgstRate, sgstRate, roundOff] = watchedTaxesAndCharges;
    const finalCgstAmount = sub * (cgstRate / 100);
    const finalSgstAmount = sub * (sgstRate / 100);
    const finalTotalTax = finalCgstAmount + finalSgstAmount;

    const finalTotalAfterTax = sub + finalTotalTax;
    const finalTotalPayable = finalTotalAfterTax + (roundOff || 0);

    return {
      subTotal: sub,
      cgstAmount: finalCgstAmount,
      sgstAmount: finalSgstAmount,
      totalTax: finalTotalTax,
      totalAfterTax: finalTotalAfterTax,
      totalPayable: finalTotalPayable
    };
  }, [watchedItems, watchedTaxesAndCharges]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'billDocumentUri' | 'lrDocumentUri') => {
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

  function onSubmit(values: TransBillFormValues) {
    const finalBill: TransBill = {
      id: isEditing ? initialData!.id : '', 
      ...values,
      items: (values.items || []).map(item => ({
        ...item,
        id: item.id || Math.random().toString(36).substring(2, 9),
        amount: item.quantity * item.rate,
      })),
      subTotal,
      cgstAmount,
      sgstAmount,
      totalTax,
      totalAfterTax,
      totalPayable,
    };
    onSave(finalBill);
  }

  const exportDocOptions: ComboboxOption[] = allExportDocuments.map(doc => ({
    value: doc.id,
    label: `ED-${doc.id.slice(-6)} (${doc.exportInvoiceNumber})`
  }));
  
  const transporterOptions: ComboboxOption[] = allTransporters.map(t => ({
    value: t.id,
    label: t.companyName,
  }));

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-xl mb-8">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Truck className="h-6 w-6 text-primary" />
          {isEditing ? "Edit Transport Bill (DB)" : "Add New Transport Bill (DB)"}
        </CardTitle>
        <CardDescription>Record the bill received from the transporter. Link it to an Export Document.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="exportDocumentId" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-2"><LinkIcon className="h-4 w-4 text-muted-foreground" />Link to Export Document *</FormLabel><Combobox options={exportDocOptions} {...field} placeholder="Select an Export Document..."/> <FormMessage /></FormItem> )} />
              <FormField control={form.control} name="transporterId" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-2"><Building className="h-4 w-4 text-muted-foreground" />Transporter *</FormLabel><Combobox options={transporterOptions} {...field} placeholder="Select a Transporter..."/> <FormMessage /></FormItem> )} />
            </div>
            
            <Card>
              <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="invoiceNumber" render={({ field }) => (<FormItem><FormLabel>Invoice No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="invoiceDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Invoice Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick date</span>}<CalendarIcon className="ml-auto h-4 w-4"/></Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value} onSelect={field.onChange}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Shipment Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <FormField control={form.control} name="shippingLine" render={({ field }) => (<FormItem><FormLabel>Shipping Line</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                 <FormField control={form.control} name="portOfLoading" render={({ field }) => (<FormItem><FormLabel>Port Of Loading</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                 <FormField control={form.control} name="portOfDischarge" render={({ field }) => (<FormItem><FormLabel>Port Of Discharge</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex justify-between">Items<Button type="button" size="sm" onClick={() => append({ description: "", quantity: 1, rate: 0, gstRate: 18 })}><PlusCircle className="mr-2 h-4 w-4"/>Add Item</Button></CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-md space-y-2 relative">
                     <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => remove(index)}><Trash2 className="h-3 w-3" /></Button>
                     <FormField control={form.control} name={`items.${index}.description`} render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={1} /></FormControl></FormItem>)} />
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (<FormItem><FormLabel>Qty</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name={`items.${index}.gstRate`} render={({ field }) => (<FormItem><FormLabel>GST %</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name={`items.${index}.rate`} render={({ field }) => (<FormItem><FormLabel>Rate</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                         <FormItem><FormLabel>Amount</FormLabel><Input readOnly value={(form.getValues(`items.${index}.quantity`) * form.getValues(`items.${index}.rate`)).toFixed(2)} className="bg-muted/50"/></FormItem>
                     </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Totals & Taxes</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormItem><FormLabel className="flex items-center gap-2"><DollarSign/>Sub Total</FormLabel><Input readOnly value={subTotal.toFixed(2)} className="bg-muted/50"/></FormItem>
                  <FormField control={form.control} name="cgstRate" render={({ field }) => (<FormItem><FormLabel>CGST %</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                  <FormItem><FormLabel>CGST Amt</FormLabel><Input readOnly value={cgstAmount.toFixed(2)} className="bg-muted/50"/></FormItem>
                  <div></div>
                  <FormItem><FormLabel className="flex items-center gap-2"><Layers/>Total Tax</FormLabel><Input readOnly value={totalTax.toFixed(2)} className="bg-muted/50"/></FormItem>
                  <FormField control={form.control} name="sgstRate" render={({ field }) => (<FormItem><FormLabel>SGST %</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                  <FormItem><FormLabel>SGST Amt</FormLabel><Input readOnly value={sgstAmount.toFixed(2)} className="bg-muted/50"/></FormItem>
                  <div></div>
                  <FormItem><FormLabel className="flex items-center gap-2"><DollarSign/>Total After Tax</FormLabel><Input readOnly value={totalAfterTax.toFixed(2)} className="bg-muted/50"/></FormItem>
                  <FormField control={form.control} name="roundOff" render={({ field }) => (<FormItem><FormLabel>Round Off</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>)} />
                   <div className="pt-6 text-right font-bold text-lg col-span-2">
                        <FormLabel>TOTAL PAYABLE</FormLabel>
                        <p>₹ {totalPayable.toFixed(2)}</p>
                    </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Remarks & Attachments</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                 <FormField control={form.control} name="remarks" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><NotebookText />Remarks</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="billDocumentUri" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><FileUp/>Upload Bill PDF/Image</FormLabel><FormControl><Input type="file" onChange={(e) => handleFileChange(e, 'billDocumentUri')} accept=".pdf,.jpg,.jpeg,.png" disabled={isUploading}/></FormControl><FormMessage/></FormItem>)} />
                      <FormField control={form.control} name="lrDocumentUri" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><FileUp/>Upload LR PDF/Image</FormLabel><FormControl><Input type="file" onChange={(e) => handleFileChange(e, 'lrDocumentUri')} accept=".pdf,.jpg,.jpeg,.png" disabled={isUploading} /></FormControl><FormMessage/></FormItem>)} />
                 </div>
              </CardContent>
            </Card>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            {isEditing && (<Button type="button" variant="ghost" onClick={onCancelEdit}><XCircle className="mr-2 h-4 w-4"/> Cancel</Button>)}
            <Button type="submit" disabled={isUploading}><Save className="mr-2 h-4 w-4"/> {isUploading ? "Uploading..." : (isEditing ? "Save Changes" : "Save Bill")}</Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
