
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller, useWatch, Control, UseFormGetValues } from "react-hook-form";
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { CalendarIcon, PlusCircle, Trash2, FileText, Users, DollarSign, Package, Map, Anchor, Ship, Weight, Percent, Edit3, StickyNote, Landmark, XCircle, Image as ImageIcon } from "lucide-react";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import Image from 'next/image';

import type { PerformaInvoice, PerformaInvoiceItem, PerformaInvoiceContainer } from "@/types/performa-invoice";
import type { Company } from "@/types/company";
import type { Client } from "@/types/client";
import type { Size } from "@/types/size";
import type { Product } from "@/types/product";
import type { Bank } from "@/types/bank";

const performaInvoiceItemSchema = z.object({
  id: z.string().optional(), // Keep existing item ID if editing
  sizeId: z.string().min(1, "Size is required"),
  productId: z.string().min(1, "Product is required"),
  boxes: z.coerce.number().min(1, "Boxes must be at least 1"),
  ratePerSqmt: z.coerce.number().min(0, "Rate must be non-negative"),
  commission: z.coerce.number().min(0, "Commission must be non-negative").optional().default(0),
});

const containerSchema = z.object({
  size: z.enum(["20 ft", "40 ft"]),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
});

const formSchema = z.object({
  exporterId: z.string().min(1, "Exporter is required"),
  invoiceNumber: z.string(), // Will be read-only, set by logic
  invoiceDate: z.date({ required_error: "Invoice date is required" }),
  clientId: z.string().min(1, "Client is required"),
  selectedBankId: z.string().optional().default(""), // Optional for now, can be made mandatory
  finalDestination: z.string().min(2, "Final destination is required"),
  containers: z.array(containerSchema).min(1, "At least one container type is required."),
  currencyType: z.enum(["INR", "USD", "Euro"]),
  totalGrossWeight: z.string().min(1, "Total gross weight is required"),
  freight: z.coerce.number().min(0, "Freight must be non-negative").optional().default(0),
  discount: z.coerce.number().min(0, "Discount must be non-negative").optional().default(0),
  notifyPartyLine1: z.string().optional().default(""),
  notifyPartyLine2: z.string().optional().default(""),
  termsAndConditions: z.string().min(10, "Terms and conditions are required"),
  note: z.string().optional().default(""),
  items: z.array(performaInvoiceItemSchema).min(1, "At least one product item is required"),
});

type PerformaInvoiceFormValues = z.infer<typeof formSchema>;

interface PerformaInvoiceFormProps {
  initialDataForForm?: PerformaInvoice | null;
  isEditing: boolean;
  onSave: (invoice: PerformaInvoice) => void;
  onCancelEdit: () => void;
  nextInvoiceNumber: string;
  exporters: Company[];
  clients: Client[];
  sizes: Size[];
  allProducts: Product[];
  banks: Bank[];
}

const defaultTerms = "30 % advance and 70% against BL ( against scan copy of BL)";
const defaultNote = "TRANSSHIPMENT ALLOWED.\nPARTIAL SHIPMENT ALLOWED.\nSHIPMENT : AS EARLY AS POSSIBLE.\nQUANTITY AND VALUE +/-10% ALLOWED.\nNOT ACCEPTED ANY REFUND OR EXCHANGE.\nANY TRANSACTION CHARGES WILL BE PAIDED BY CONSIGNEE.";

const getDefaultFormValues = (invoiceNumber: string): PerformaInvoiceFormValues => ({
  exporterId: "",
  invoiceNumber: invoiceNumber,
  invoiceDate: new Date(),
  clientId: "",
  selectedBankId: "",
  finalDestination: "",
  containers: [{ size: "20 ft", quantity: 1 }],
  currencyType: "USD",
  totalGrossWeight: "NA",
  freight: 0,
  discount: 0,
  notifyPartyLine1: "",
  notifyPartyLine2: "",
  termsAndConditions: defaultTerms,
  note: defaultNote,
  items: [{ sizeId: "", productId: "", boxes: 1, ratePerSqmt: 0, commission: 0 }],
});

interface PerformaInvoiceItemCardProps {
  index: number;
  control: Control<PerformaInvoiceFormValues>;
  remove: (index: number) => void;
  sizes: Size[];
  allProducts: Product[];
  sizeOptions: ComboboxOption[];
  getProductOptions: (sizeId: string) => ComboboxOption[];
  handleSizeChange: (index: number, newSizeId: string) => void;
  handleProductChange: (index: number, newProductId: string) => void;
  getValues: UseFormGetValues<PerformaInvoiceFormValues>;
  fieldsLength: number;
}

const PerformaInvoiceItemCard: React.FC<PerformaInvoiceItemCardProps> = ({
  index,
  control,
  remove,
  sizes,
  allProducts,
  sizeOptions,
  getProductOptions,
  handleSizeChange,
  handleProductChange,
  getValues,
  fieldsLength,
}) => {
  const currentItemValues = useWatch({ control: control, name: `items.${index}` });
  const { sizeId, productId, boxes, ratePerSqmt } = currentItemValues || {};
  
  const { quantitySqmt, amount, productImageUrl } = useMemo(() => {
    const sizeDetail = sizes.find(s => s.id === sizeId);
    const productDetail = allProducts.find(p => p.id === productId);

    if (!sizeDetail) return { quantitySqmt: 0, amount: 0, productImageUrl: null };

    const numBoxes = parseFloat(String(boxes)) || 0;
    const numRatePerSqmt = parseFloat(String(ratePerSqmt)) || 0;
    const sqmPerBox = parseFloat(String(sizeDetail.sqmPerBox)) || 0;

    const calculatedSqm = numBoxes * sqmPerBox;
    const calculatedAmount = calculatedSqm * numRatePerSqmt;

    return { quantitySqmt: calculatedSqm, amount: calculatedAmount, productImageUrl: productDetail?.imageUrl };
  }, [sizeId, productId, boxes, ratePerSqmt, sizes, allProducts]);

  const productOptionsForThisItem = getProductOptions(sizeId);

  return (
    <div className="p-4 border rounded-md space-y-4 relative bg-card/50">
      <Button
        type="button"
        variant="destructive"
        size="icon"
        onClick={() => remove(index)}
        className="absolute top-2 right-2 h-7 w-7"
        disabled={fieldsLength <= 1}
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Remove Item</span>
      </Button>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="md:col-span-2 space-y-2">
            <FormField
              control={control}
              name={`items.${index}.sizeId`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Size</FormLabel>
                  <Select
                    onValueChange={(value) => handleSizeChange(index, value)}
                    value={field.value}
                    disabled={sizeOptions.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sizeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`items.${index}.productId`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product</FormLabel>
                  <Combobox
                    options={productOptionsForThisItem}
                    value={field.value}
                    onChange={(value) => handleProductChange(index, value)}
                    placeholder="Select Product..."
                    searchPlaceholder="Search Products..."
                    emptySearchMessage="No product found for this size."
                    disabled={!sizeId || productOptionsForThisItem.length === 0}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-3 gap-4">
             <FormField
              control={control}
              name={`items.${index}.boxes`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Boxes</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`items.${index}.ratePerSqmt`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rate/Sqmt</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`items.${index}.commission`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commission</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="pt-8">
              Qty Sqmt: {quantitySqmt.toFixed(2)}
            </div>
             <div className="pt-8">
              Amount: {amount.toFixed(2)}
            </div>
            {productImageUrl ? (
                <div className="flex flex-col items-center">
                    <FormLabel>Image</FormLabel>
                    <Image src={productImageUrl} alt="Product image" width={64} height={64} className="mt-2 h-16 w-16 object-cover rounded-md border" />
                </div>
            ) : (
                 <div className="flex flex-col items-center">
                    <FormLabel>Image</FormLabel>
                    <div className="mt-2 h-16 w-16 rounded-md border bg-muted flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};


export function PerformaInvoiceFormV2({
  initialDataForForm,
  isEditing,
  onSave,
  onCancelEdit,
  nextInvoiceNumber,
  exporters,
  clients,
  sizes,
  allProducts,
  banks,
}: PerformaInvoiceFormProps) {
  const { toast } = useToast();
  const form = useForm<PerformaInvoiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultFormValues(nextInvoiceNumber),
  });

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { fields: containerFields, append: appendContainer, remove: removeContainer } = useFieldArray({
    control: form.control,
    name: "containers",
  });

  useEffect(() => {
    if (isEditing && initialDataForForm) {
      const formData = {
        ...initialDataForForm,
        exporterId: String(initialDataForForm.exporterId),
        clientId: String(initialDataForForm.clientId),
        invoiceDate: new Date(initialDataForForm.invoiceDate),
        selectedBankId: initialDataForForm.selectedBankId?.toString() || "",
        containers: initialDataForForm.containers?.length > 0 ? initialDataForForm.containers : [{ size: "20 ft" as const, quantity: 1 }],
        items: initialDataForForm.items.map(item => ({
          id: item.id,
          sizeId: item.sizeId,
          productId: item.productId,
          boxes: item.boxes,
          ratePerSqmt: item.ratePerSqmt,
          commission: item.commission || 0,
        }))
      };
      form.reset(formData);
    } else {
      form.reset(getDefaultFormValues(nextInvoiceNumber));
    }
  }, [isEditing, initialDataForForm, nextInvoiceNumber, form]);


  const watchedItemsForTotals = form.watch("items");
  const watchedFreight = form.watch("freight");
  const watchedDiscount = form.watch("discount");

  const exporterOptions: ComboboxOption[] = useMemo(() =>
    exporters.map(c => ({ value: c.id, label: c.companyName })),
    [exporters]
  );
  const clientOptions: ComboboxOption[] = useMemo(() =>
    clients.map(c => ({ value: c.id, label: c.companyName })),
    [clients]
  );
  const bankOptions: ComboboxOption[] = useMemo(() =>
    banks.map(b => ({ value: b.id, label: `${b.bankName} - A/C: ${b.accountNumber}` })),
    [banks]
  );
  const sizeOptions: ComboboxOption[] = useMemo(() =>
    sizes.map(s => ({ value: s.id, label: `${s.size} (HSN: ${s.hsnCode})` })),
    [sizes]
  );

  const getProductOptions = useCallback((sizeId: string): ComboboxOption[] => {
    if (!sizeId || !allProducts) return [];
    return allProducts
      .filter(p => p.sizeId === sizeId)
      .map(p => ({ value: p.id, label: p.designName }));
  }, [allProducts]);


  const handleSizeChange = (itemIndex: number, newSizeId: string) => {
    form.setValue(`items.${itemIndex}.sizeId`, newSizeId);
    form.setValue(`items.${itemIndex}.productId`, ""); 
    const selectedSize = sizes.find(s => s.id === newSizeId);
    if (selectedSize) {
      form.setValue(`items.${itemIndex}.ratePerSqmt`, selectedSize.salesPrice);
    } else {
      form.setValue(`items.${itemIndex}.ratePerSqmt`, 0);
    }
  };

  const handleProductChange = (itemIndex: number, newProductId: string) => {
    form.setValue(`items.${itemIndex}.productId`, newProductId);
  };

  const { subTotal, grandTotal } = useMemo(() => {
    let currentSubTotal = 0;
    (watchedItemsForTotals || []).forEach(item => {
      const sizeDetail = sizes.find(s => s.id === item.sizeId);
      const numBoxes = parseFloat(String(item.boxes)) || 0;
      const numRatePerSqmt = parseFloat(String(item.ratePerSqmt)) || 0;
      const sqmPerBox = sizeDetail ? (parseFloat(String(sizeDetail.sqmPerBox)) || 0) : 0;
      if (sizeDetail && numBoxes > 0) {
        const quantitySqmt = numBoxes * sqmPerBox;
        const amount = quantitySqmt * numRatePerSqmt;
        currentSubTotal += amount;
      }
    });

    const currentDiscountInput = parseFloat(String(watchedDiscount)) || 0;
    const currentFreightInput = parseFloat(String(watchedFreight)) || 0;
    const currentGrandTotal = currentSubTotal - currentDiscountInput + currentFreightInput;
    
    return { subTotal: currentSubTotal, grandTotal: currentGrandTotal };
  }, [watchedItemsForTotals, sizes, watchedFreight, watchedDiscount]);


  function onSubmit(values: PerformaInvoiceFormValues) {
    const finalItems = values.items.map(item => {
        const sizeDetail = sizes.find(s => s.id === item.sizeId);
        const numBoxes = parseFloat(String(item.boxes)) || 0;
        const numRatePerSqmt = parseFloat(String(item.ratePerSqmt)) || 0;
        const sqmPerBox = sizeDetail ? (parseFloat(String(sizeDetail.sqmPerBox)) || 0) : 0;
        const quantitySqmt = numBoxes * sqmPerBox;
        const amount = quantitySqmt * numRatePerSqmt;

        return {
            id: item.id || Math.random().toString(36).substring(2, 9),
            sizeId: item.sizeId,
            productId: item.productId,
            boxes: numBoxes,
            ratePerSqmt: numRatePerSqmt,
            commission: item.commission || 0,
            quantitySqmt,
            amount,
        };
    });

    const finalSubTotal = finalItems.reduce((acc, item) => acc + (item.amount || 0), 0);
    const finalGrandTotal = finalSubTotal - (values.discount || 0) + (values.freight || 0);
    
    const invoiceToSave: PerformaInvoice = {
      ...values,
      id: isEditing && initialDataForForm ? initialDataForForm.id : '',
      invoiceNumber: isEditing && initialDataForForm ? initialDataForForm.invoiceNumber : nextInvoiceNumber,
      selectedBankId: values.selectedBankId || undefined, // Ensure it's undefined if empty string for type safety
      items: finalItems,
      subTotal: finalSubTotal,
      grandTotal: finalGrandTotal,
    };
    onSave(invoiceToSave);
  }

  const currentInvoiceNumber = form.watch("invoiceNumber");


  return (
    <Card className="w-full max-w-4xl mx-auto shadow-xl mb-8">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          {isEditing ? "Edit Performa Invoice (DB)" : "Create Performa Invoice (DB)"}
        </CardTitle>
        <CardDescription>{isEditing ? "Modify the details of the performa invoice." : "Fill in the details to generate a new performa invoice."}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="exporterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" />Exporter</FormLabel>
                    <Combobox
                      options={exporterOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select Exporter..."
                      searchPlaceholder="Search Exporters..."
                      emptySearchMessage="No exporter found."
                      disabled={exporterOptions.length === 0}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel className="flex items-center gap-2">Invoice Number</FormLabel>
                <FormControl>
                  <Input value={currentInvoiceNumber} readOnly className="bg-muted/50" />
                </FormControl>
              </FormItem>
              <FormField
                control={form.control}
                name="invoiceDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="flex items-center gap-2">Invoice Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), "PPP") // Ensure field.value is treated as Date
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />Client</FormLabel>
                     <Combobox
                      options={clientOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select Client..."
                      searchPlaceholder="Search Clients..."
                      emptySearchMessage="No client found."
                      disabled={clientOptions.length === 0}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="selectedBankId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Landmark className="h-4 w-4 text-muted-foreground" />Beneficiary Bank</FormLabel>
                    <Combobox
                      options={bankOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select Bank..."
                      searchPlaceholder="Search Banks..."
                      emptySearchMessage="No bank found."
                      disabled={bankOptions.length === 0}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="finalDestination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Map className="h-4 w-4 text-muted-foreground" />Final Destination</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Port Name, Country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                    Container Details
                    <Button type="button" size="sm" onClick={() => appendContainer({ size: "20 ft", quantity: 1 })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Container Type
                    </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {containerFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-4 p-2 border rounded-md">
                        <FormField
                        control={form.control}
                        name={`containers.${index}.size`}
                        render={({ field }) => (
                            <FormItem className="flex-1">
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select size" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                <SelectItem value="20 ft">20 ft</SelectItem>
                                <SelectItem value="40 ft">40 ft</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name={`containers.${index}.quantity`}
                        render={({ field }) => (
                            <FormItem>
                            <FormControl>
                                <Input type="number" placeholder="Qty" className="w-24" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeContainer(index)} disabled={containerFields.length <= 1}>
                        <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                    ))}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="currencyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" />Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="INR">INR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="Euro">Euro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalGrossWeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Weight className="h-4 w-4 text-muted-foreground" />Total Gross Wt (kg)</FormLabel>
                    <FormControl>
                      <Input placeholder="NA or e.g. 24000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Product Items
                  <Button type="button" size="sm" onClick={() => appendItem({ sizeId: "", productId: "", boxes: 1, ratePerSqmt: 0, commission: 0 })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {itemFields.map((fieldItem, index) => (
                  <PerformaInvoiceItemCard
                    key={fieldItem.id}
                    index={index}
                    control={form.control}
                    remove={removeItem}
                    sizes={sizes}
                    allProducts={allProducts}
                    sizeOptions={sizeOptions}
                    getProductOptions={getProductOptions}
                    handleSizeChange={handleSizeChange}
                    handleProductChange={handleProductChange}
                    getValues={form.getValues}
                    fieldsLength={itemFields.length}
                  />
                ))}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="freight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Ship className="h-4 w-4 text-muted-foreground" />Freight</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="discount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Percent className="h-4 w-4 text-muted-foreground" />Discount</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-8 text-lg font-semibold">
                Subtotal: {subTotal.toFixed(2)} {form.getValues("currencyType")}
                <br />
                Grand Total: {grandTotal.toFixed(2)} {form.getValues("currencyType")}
              </div>
            </div>

            <FormField
              control={form.control}
              name="notifyPartyLine1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Edit3 className="h-4 w-4 text-muted-foreground" />Notify Party Line 1 (Optional)</FormLabel>
                  <FormControl><Input placeholder="Notify party details" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notifyPartyLine2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Edit3 className="h-4 w-4 text-muted-foreground" />Notify Party Line 2 (Optional)</FormLabel>
                  <FormControl><Input placeholder="Additional notify party details" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="termsAndConditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">Terms & Conditions of Delivery & Payment</FormLabel>
                  <FormControl><Textarea rows={4} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><StickyNote className="h-4 w-4 text-muted-foreground" />Note (Optional)</FormLabel>
                  <FormControl><Textarea rows={5} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex space-x-4">
                <Button type="submit" className="flex-grow bg-accent hover:bg-accent/90 text-accent-foreground font-headline text-lg py-3">
                {isEditing ? "Update Performa Invoice" : "Save Performa Invoice"}
                </Button>
                {isEditing && (
                <Button type="button" variant="outline" onClick={onCancelEdit} className="flex-grow font-headline text-lg py-3">
                    <XCircle className="mr-2 h-5 w-5" /> Cancel Edit
                </Button>
                )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
