
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, PlusCircle, Trash2, FileText, Factory, Truck, Save, XCircle, FileUp, Hash, Percent, DollarSign, BookOpen, Link as LinkIcon, NotebookText } from "lucide-react";
import React, { useEffect, useMemo, useCallback } from "react";
import type { ManuBill, ManuBillItem } from "@/types/manu-bill";
import type { ExportDocument } from "@/types/export-document";
import type { Manufacturer } from "@/types/manufacturer";
import type { Transporter } from "@/types/transporter";

const manuBillItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  grade: z.string().optional(),
  hsnCode: z.string().optional(),
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1, "Unit is required"),
  rate: z.coerce.number().positive(),
  discountPercentage: z.coerce.number().min(0).max(100).default(0),
});

const formSchema = z.object({
  exportDocumentId: z.string().min(1, "Please link an Export Document"),
  manufacturerId: z.string(), // Auto-filled from export doc
  transporterId: z.string(), // Auto-filled from export doc
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.date(),
  ewayBillNumber: z.string().optional(),
  ackNo: z.string().optional(),
  ackDate: z.date().optional(),
  irnNo: z.string().optional(),
  lrDate: z.date().optional(),
  vehicleNo: z.string().optional(),
  items: z.array(manuBillItemSchema).min(1, "At least one item is required"),
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

export type ManuBillFormValues = z.infer<typeof formSchema>;

interface ManuBillFormProps {
  initialData?: ManuBill | null;
  isEditing: boolean;
  onSave: (data: ManuBill) => void;
  onCancelEdit: () => void;
  allExportDocuments: ExportDocument[];
  allManufacturers: Manufacturer[];
  allTransporters: Transporter[];
}

export function ManuBillForm({
  initialData,
  isEditing,
  onSave,
  onCancelEdit,
  allExportDocuments,
  allManufacturers,
  allTransporters,
}: ManuBillFormProps) {
  const form = useForm<ManuBillFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [{ description: "", grade: "PRE", hsnCode: "69072100", quantity: 0, unit: "SQM", rate: 0, discountPercentage: 0 }],
      invoiceDate: new Date(),
      ackDate: new Date(),
      lrDate: new Date(),
      centralTaxRate: 9,
      stateTaxRate: 9,
    },
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
        form.setValue('manufacturerId', doc.manufacturerId || '');
        form.setValue('transporterId', doc.transporterId || '');
        if (doc.containerItems?.[0]?.truckNumber) {
            form.setValue('vehicleNo', doc.containerItems[0].truckNumber);
        }
      }
    }
  }, [selectedExportDocId, allExportDocuments, form]);

  useEffect(() => {
    if (isEditing && initialData) {
      form.reset({
        ...initialData,
        invoiceDate: new Date(initialData.invoiceDate),
        ackDate: initialData.ackDate ? new Date(initialData.ackDate) : undefined,
        lrDate: initialData.lrDate ? new Date(initialData.lrDate) : undefined,
      });
    } else {
      form.reset();
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'billDocumentUri' | 'ewayBillDocumentUri') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue(fieldName, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  function onSubmit(values: ManuBillFormValues) {
    const finalBill: ManuBill = {
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
  
  const selectedManufacturer = allManufacturers.find(m => m.id === form.getValues('manufacturerId'));
  const selectedTransporter = allTransporters.find(t => t.id === form.getValues('transporterId'));

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-xl mb-8">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          {isEditing ? "Edit Manufacturer Bill" : "Add New Manufacturer Bill"}
        </CardTitle>
        <CardDescription>Record the bill received from the manufacturer. Start by linking it to an Export Document.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <CardContent className="space-y-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Factory className="h-4 w-4 text-muted-foreground" />Manufacturer</FormLabel>
                  <FormControl><Input readOnly value={selectedManufacturer?.companyName || 'Select an Export Doc'} className="bg-muted/50"/></FormControl>
                </FormItem>
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Truck className="h-4 w-4 text-muted-foreground" />Transporter</FormLabel>
                  <FormControl><Input readOnly value={selectedTransporter?.companyName || 'Select an Export Doc'} className="bg-muted/50"/></FormControl>
                </FormItem>
            </div>
            
             <Card>
              <CardHeader><CardTitle>Invoice & Transport Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <FormField control={form.control} name="invoiceNumber" render={({ field }) => (<FormItem><FormLabel>Invoice No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="invoiceDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Invoice Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick date</span>}<CalendarIcon className="ml-auto h-4 w-4"/></Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value} onSelect={field.onChange}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="lrDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>L.R. Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick date</span>}<CalendarIcon className="ml-auto h-4 w-4"/></Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value} onSelect={field.onChange}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="vehicleNo" render={({ field }) => (<FormItem><FormLabel>Vehicle No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex justify-between">Items<Button type="button" size="sm" onClick={() => append({ description: "", grade: "PRE", hsnCode: "69072100", quantity: 0, unit: "SQM", rate: 0, discountPercentage: 0 })}><PlusCircle className="mr-2 h-4 w-4"/>Add Item</Button></CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-md space-y-2 relative">
                     <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => remove(index)}><Trash2 className="h-3 w-3" /></Button>
                     <FormField control={form.control} name={`items.${index}.description`} render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                     <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        <FormField control={form.control} name={`items.${index}.grade`} render={({ field }) => (<FormItem><FormLabel>Grade</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name={`items.${index}.hsnCode`} render={({ field }) => (<FormItem><FormLabel>HSN</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (<FormItem><FormLabel>Qty</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name={`items.${index}.unit`} render={({ field }) => (<FormItem><FormLabel>Unit</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
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
                        <FormField control={form.control} name="billDocumentUri" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><FileUp/>Upload Bill PDF/Image</FormLabel><FormControl><Input type="file" onChange={(e) => handleFileChange(e, 'billDocumentUri')} accept=".pdf,.jpg,.jpeg,.png" /></FormControl><FormMessage/></FormItem>)} />
                        <FormField control={form.control} name="ewayBillDocumentUri" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><FileUp/>Upload E-Way Bill PDF/Image</FormLabel><FormControl><Input type="file" onChange={(e) => handleFileChange(e, 'ewayBillDocumentUri')} accept=".pdf,.jpg,.jpeg,.png" /></FormControl><FormMessage/></FormItem>)} />
                   </div>
                </CardContent>
             </Card>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            {isEditing && (<Button type="button" variant="ghost" onClick={onCancelEdit}><XCircle/> Cancel</Button>)}
            <Button type="submit"><Save /> {isEditing ? "Save Changes" : "Save Bill"}</Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
