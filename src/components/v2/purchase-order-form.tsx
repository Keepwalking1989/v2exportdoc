
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, PlusCircle, Trash2, Package, Factory, FileText, Rss, Scale, PackagePlus, Box, CheckSquare, Edit3, XCircle, Image as ImageIcon } from "lucide-react";
import React, { useEffect, useMemo, useCallback } from "react";
import Image from "next/image";

import type { PurchaseOrder, PurchaseOrderItem } from "@/types/purchase-order";
import type { PerformaInvoice } from "@/types/performa-invoice";
import type { Company } from "@/types/company";
import type { Manufacturer } from "@/types/manufacturer";
import type { Size } from "@/types/size";
import type { Product } from "@/types/product";

const purchaseOrderItemSchema = z.object({
  id: z.string().optional(), 
  productId: z.string().min(1, "Product is required"),
  imageUrl: z.string().optional(),
  weightPerBox: z.coerce.number().positive({ message: "Weight per box must be a positive number." }),
  boxes: z.coerce.number().min(1, "Boxes must be at least 1"),
  thickness: z.string().min(1, "Thickness is required").default("8.5 MM to 9.0 MM"),
});

const defaultPOTerms = `Ø Tiles should be stamped with MADE IN INDIA, & No any punch should be there on the back side of tiles.
Ø Dispatch Immediately.
Ø Quality check under supervision by seller and exporter.`;

const purchaseOrderFormSchema = z.object({
  exporterId: z.string().min(1, "Exporter is required"),
  manufacturerId: z.string().min(1, "Manufacturer is required"),
  poNumber: z.string().min(1, "PO Number is required"),
  poDate: z.date({ required_error: "PO date is required" }),
  sizeId: z.string().min(1, "Size is required for the PO"), 
  numberOfContainers: z.coerce.number().min(0, "Number of containers must be non-negative"),
  items: z.array(purchaseOrderItemSchema).min(1, "At least one product item is required"),
  termsAndConditions: z.string().min(1, "Terms & Conditions are required.").default(defaultPOTerms),
});

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderFormSchema>;

interface PurchaseOrderFormProps {
  initialData?: PurchaseOrder | null;
  sourcePiId?: string | null;
  isEditing: boolean;
  onSave: (poData: PurchaseOrder) => void;
  onCancelEdit?: () => void;
  defaultPoNumber: string; 
  allExporters: Company[];
  allManufacturers: Manufacturer[];
  allPerformaInvoices: PerformaInvoice[];
  allSizes: Size[];
  allProducts: Product[];
}

const getDefaultFormValues = (poNumber: string): PurchaseOrderFormValues => ({
  exporterId: "",
  manufacturerId: "",
  poNumber: poNumber,
  poDate: new Date(),
  sizeId: "",
  numberOfContainers: 0,
  items: [{ productId: "", imageUrl: "", weightPerBox: 0, boxes: 1, thickness: "8.5 MM to 9.0 MM" }],
  termsAndConditions: defaultPOTerms,
});


export function PurchaseOrderFormV2({
  initialData,
  sourcePiId,
  isEditing,
  onSave,
  onCancelEdit,
  defaultPoNumber,
  allExporters,
  allManufacturers,
  allPerformaInvoices,
  allSizes,
  allProducts,
}: PurchaseOrderFormProps) {
  const { toast } = useToast();
  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: getDefaultFormValues(defaultPoNumber),
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const selectedPoSizeId = form.watch("sizeId");
  const sourcePi = useMemo(() => allPerformaInvoices.find(pi => pi.id === sourcePiId), [sourcePiId, allPerformaInvoices]);


  useEffect(() => {
    if (isEditing && initialData) {
      form.reset({
        ...initialData,
        exporterId: initialData.exporterId.toString(),
        manufacturerId: initialData.manufacturerId.toString(),
        sizeId: initialData.sizeId.toString(),
        poDate: new Date(initialData.poDate),
        termsAndConditions: initialData.termsAndConditions || defaultPOTerms,
        items: initialData.items.map(item => {
            const product = allProducts.find(p => p.id === item.productId);
            return {
                ...item,
                weightPerBox: item.weightPerBox || 0,
                imageUrl: product?.imageUrl || "",
            }
        })
      });
      replace(initialData.items.map(item => {
        const product = allProducts.find(p => p.id === item.productId);
        return { 
            ...item, 
            id: item.id || undefined, 
            weightPerBox: item.weightPerBox || 0,
            imageUrl: product?.imageUrl || "",
        }
      }));
    } else if (!isEditing && sourcePi) {
      const defaultValuesForNew = getDefaultFormValues(defaultPoNumber);
      form.reset({
        ...defaultValuesForNew,
        exporterId: sourcePi.exporterId.toString(),
        poNumber: defaultPoNumber, 
        termsAndConditions: defaultPOTerms,
      });
      replace(defaultValuesForNew.items);
    } else if (!isEditing) {
      const defaultValues = getDefaultFormValues(defaultPoNumber);
      form.reset(defaultValues);
      replace(defaultValues.items);
    }
  }, [isEditing, initialData, sourcePi, defaultPoNumber, form, replace, allProducts]);

  useEffect(() => {
    if (isEditing) return;

    if (!sourcePi || !selectedPoSizeId) {
      replace([{ productId: "", imageUrl: "", weightPerBox: 0, boxes: 1, thickness: "8.5 MM to 9.0 MM" }]);
      return;
    }
    
    const itemsFromPiForSelectedSize = sourcePi.items.filter(
      (piItem) => piItem.sizeId.toString() === selectedPoSizeId
    );

    if (itemsFromPiForSelectedSize.length > 0) {
      const newPoItems = itemsFromPiForSelectedSize.map((piItem) => {
        const productDetail = allProducts.find(p => p.id.toString() === piItem.productId.toString());
        const sizeDetail = allSizes.find(s => s.id.toString() === selectedPoSizeId);
        
        return {
          productId: piItem.productId,
          boxes: piItem.boxes,
          weightPerBox: productDetail?.boxWeight || sizeDetail?.boxWeight || 0,
          thickness: "8.5 MM to 9.0 MM",
          imageUrl: productDetail?.imageUrl || "",
        };
      });
      replace(newPoItems);
    } else {
      replace([{ productId: "", imageUrl: "", weightPerBox: 0, boxes: 1, thickness: "8.5 MM to 9.0 MM" }]);
    }

  }, [selectedPoSizeId, sourcePi, isEditing, replace, allProducts, allSizes]);


  const exporterOptions: ComboboxOption[] = useMemo(() =>
    allExporters.map(e => ({ value: e.id.toString(), label: e.companyName })),
    [allExporters]
  );

  const manufacturerOptions: ComboboxOption[] = useMemo(() =>
    allManufacturers.map(m => ({ value: m.id.toString(), label: m.companyName })),
    [allManufacturers]
  );

  const poSizeOptions: ComboboxOption[] = useMemo(() => {
    let availableSizes: Size[] = [];
    if (sourcePi && !isEditing) {
        const sizeIdsInPi = new Set(sourcePi.items.map(item => item.sizeId.toString()));
        availableSizes = allSizes.filter(s => sizeIdsInPi.has(s.id.toString()));
    } else {
        availableSizes = allSizes;
    }
    return availableSizes.map(s => ({ value: s.id.toString(), label: `${s.size} (HSN: ${s.hsnCode})` }));
  }, [allSizes, sourcePi, isEditing]);


  const getProductOptionsForPoSize = useCallback((poSizeIdForOptions: string): ComboboxOption[] => {
    if (!poSizeIdForOptions || !allProducts) return [];
    return allProducts
        .filter(p => p.sizeId.toString() === poSizeIdForOptions)
        .map(p => ({ value: p.id.toString(), label: p.designName || "Unknown Product" }))
        .filter((option, index, self) => index === self.findIndex(o => o.value === option.value)); 
  }, [allProducts]);


  const handleProductChange = (itemIndex: number, newProductId: string) => {
    form.setValue(`items.${itemIndex}.productId`, newProductId);
    const product = allProducts.find(p => p.id.toString() === newProductId);
    
    if(product) {
      form.setValue(`items.${itemIndex}.imageUrl`, product.imageUrl || "");
      const size = allSizes.find(s => s.id.toString() === product.sizeId.toString());
       if (size) {
        form.setValue(`items.${itemIndex}.weightPerBox`, product?.boxWeight || size.boxWeight);
      } else {
        form.setValue(`items.${itemIndex}.weightPerBox`, 0);
      }
    } else {
       form.setValue(`items.${itemIndex}.imageUrl`, "");
       form.setValue(`items.${itemIndex}.weightPerBox`, 0);
    }
    
    if (!isEditing && sourcePi && newProductId) { 
        const piItem = sourcePi.items.find(piItm => piItm.productId.toString() === newProductId && piItm.sizeId.toString() === selectedPoSizeId);
        if (piItem) {
            form.setValue(`items.${itemIndex}.boxes`, piItem.boxes);
        } else {
            form.setValue(`items.${itemIndex}.boxes`, 1);
        }
    } else if (!isEditing) { 
        form.setValue(`items.${itemIndex}.boxes`, 1);
    }
  };

  function onSubmit(values: PurchaseOrderFormValues) {
    const poToSave: PurchaseOrder = {
      ...values,
      id: isEditing && initialData ? initialData.id : '',
      sourcePiId: (isEditing && initialData ? initialData.sourcePiId : sourcePi?.id) || "",
    };
    onSave(poToSave);
  }
  
  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl mb-8">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          {isEditing ? "Edit Purchase Order" : "Create Purchase Order"}
        </CardTitle>
        <CardDescription>
          {isEditing ? `Editing PO: ${initialData?.poNumber}` : 
           (sourcePi ? `Generating PO from Performa Invoice: ${sourcePi.invoiceNumber}` : "Fill in the details for a new purchase order.")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      disabled={exporterOptions.length === 0}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="manufacturerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Factory className="h-4 w-4 text-muted-foreground" />Manufacturer</FormLabel>
                    <Combobox
                      options={manufacturerOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select Manufacturer..."
                      disabled={manufacturerOptions.length === 0}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <FormField
                control={form.control}
                name="poNumber"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center gap-2">PO Number</FormLabel>
                        <FormControl>
                        <Input {...field} placeholder="e.g. HEM/PO/25-26/001" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
                />
              <FormField
                control={form.control}
                name="poDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="flex items-center gap-2">PO Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="sizeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Rss className="h-4 w-4 text-muted-foreground" />Size (for this PO)</FormLabel>
                     <Combobox
                      options={poSizeOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select Size for PO..."
                      searchPlaceholder="Search sizes..."
                      emptySearchMessage="No applicable sizes found."
                      disabled={poSizeOptions.length === 0}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numberOfContainers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" />Number Of Containers</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Product Items
                  <Button type="button" size="sm" onClick={() => append({ productId: "", imageUrl: "", weightPerBox: 0, boxes: 1, thickness: "8.5 MM to 9.0 MM" })} disabled={!selectedPoSizeId}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Product
                  </Button>
                </CardTitle>
                 {!selectedPoSizeId && <CardDescription className="text-destructive">Please select a Size for the PO above to add products.</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((item, index) => {
                  const productOptions = getProductOptionsForPoSize(selectedPoSizeId);
                  const imageUrl = form.watch(`items.${index}.imageUrl`);
                  return (
                    <div key={item.id} className="p-4 border rounded-md space-y-4 relative bg-card/50">
                       <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => remove(index)}
                          className="absolute top-2 right-2 h-7 w-7"
                          disabled={fields.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                        <div className="md:col-span-2">
                           <FormField
                            control={form.control}
                            name={`items.${index}.productId`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2"><PackagePlus className="h-4 w-4 text-muted-foreground"/>Product</FormLabel>
                                <Combobox
                                  options={productOptions}
                                  value={field.value}
                                  onChange={(value) => handleProductChange(index, value)}
                                  placeholder="Select Product..."
                                  searchPlaceholder="Search products..."
                                  emptySearchMessage="No product found for this size."
                                  disabled={productOptions.length === 0 || !selectedPoSizeId}
                                />
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="md:col-span-2 grid grid-cols-2 gap-4">
                           <FormField
                              control={form.control}
                              name={`items.${index}.boxes`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2"><Box className="h-4 w-4 text-muted-foreground"/>Boxes</FormLabel>
                                  <FormControl><Input type="number" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                             <FormField
                              control={form.control}
                              name={`items.${index}.weightPerBox`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2"><Scale className="h-4 w-4 text-muted-foreground"/>Weight/Box</FormLabel>
                                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                        </div>
                        <div className="flex flex-col items-center">
                           <FormLabel>Image</FormLabel>
                            {imageUrl ? (
                                <Image src={imageUrl} alt="Product" width={64} height={64} className="mt-2 h-16 w-16 object-cover rounded-md border" />
                            ) : (
                                <div className="mt-2 h-16 w-16 rounded-md border bg-muted flex items-center justify-center">
                                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                </div>
                            )}
                        </div>
                      </div>
                      <FormField
                        control={form.control}
                        name={`items.${index}.thickness`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2"><CheckSquare className="h-4 w-4 text-muted-foreground"/>Thickness</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <FormField
              control={form.control}
              name="termsAndConditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Edit3 className="h-4 w-4 text-muted-foreground" />Terms & Conditions:</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={5}
                      placeholder="Enter terms and conditions..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-4">
              <Button type="submit" className="flex-grow bg-accent hover:bg-accent/90 text-accent-foreground font-headline text-lg py-3">
                {isEditing ? "Update Purchase Order" : "Save Purchase Order"}
              </Button>
              {onCancelEdit && (
                <Button type="button" variant="outline" onClick={onCancelEdit} className="flex-grow font-headline text-lg py-3">
                   <XCircle className="mr-2 h-5 w-5" /> Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
