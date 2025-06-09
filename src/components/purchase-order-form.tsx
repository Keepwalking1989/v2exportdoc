
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, PlusCircle, Trash2, Package, Factory, FileText, Rss, Users, Scale, PackagePlus, ImageOff, Box, CheckSquare } from "lucide-react";
import React, { useEffect, useMemo, useCallback } from "react";

import type { PurchaseOrder, PurchaseOrderItem } from "@/types/purchase-order";
import type { PerformaInvoice, PerformaInvoiceItem as PIItem } from "@/types/performa-invoice";
import type { Company } from "@/types/company";
import type { Manufacturer } from "@/types/manufacturer";
import type { Size } from "@/types/size";
import type { Product } from "@/types/product";

const purchaseOrderItemSchema = z.object({
  id: z.string().optional(), // For existing items when editing
  productId: z.string().min(1, "Product is required"),
  designImage: z.string().optional().default("AS PER SAMPLE"),
  weightPerBox: z.coerce.number().positive({ message: "Weight per box must be a positive number." }),
  boxes: z.coerce.number().min(1, "Boxes must be at least 1"),
  thickness: z.string().min(1, "Thickness is required").default("8.5 MM to 9.0 MM"),
});

const purchaseOrderFormSchema = z.object({
  exporterId: z.string().min(1, "Exporter is required"),
  manufacturerId: z.string().min(1, "Manufacturer is required"),
  poNumber: z.string().min(1, "PO Number is required"),
  poDate: z.date({ required_error: "PO date is required" }),
  sizeId: z.string().min(1, "Size is required for the PO"), // The single size for this PO
  numberOfContainers: z.coerce.number().min(0, "Number of containers must be non-negative"),
  items: z.array(purchaseOrderItemSchema).min(1, "At least one product item is required"),
});

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderFormSchema>;

interface PurchaseOrderFormProps {
  initialData?: PurchaseOrder | null;
  sourcePi?: PerformaInvoice | null;
  isEditing: boolean;
  onSave: (poData: PurchaseOrder) => void;
  onCancelEdit?: () => void;
  defaultPoNumber: string; // Always provide this: for new POs it's the next generated, for editing it's current
  allExporters: Company[];
  allManufacturers: Manufacturer[];
  // For the PO-level size dropdown, these are the distinct sizes found *in the source PI*.
  // If not creating from PI (e.g. future direct creation or error), this might be empty or all system sizes.
  distinctSizesFromSourcePi: Size[];
  // These are all products that were *in the source PI*. They will be filtered by the PO-level sizeId.
  productsInSourcePi: Product[];
  // Global list of all sizes in the system, needed to get details like boxWeight.
  globalSizes: Size[];
  // Global list of all products in the system, needed to get product names.
  globalProducts: Product[];
}

const getDefaultFormValues = (poNumber: string): PurchaseOrderFormValues => ({
  exporterId: "",
  manufacturerId: "",
  poNumber: poNumber,
  poDate: new Date(),
  sizeId: "",
  numberOfContainers: 0,
  items: [{ productId: "", designImage: "AS PER SAMPLE", weightPerBox: 0, boxes: 1, thickness: "8.5 MM to 9.0 MM" }],
});


export function PurchaseOrderForm({
  initialData,
  sourcePi,
  isEditing,
  onSave,
  onCancelEdit,
  defaultPoNumber,
  allExporters,
  allManufacturers,
  distinctSizesFromSourcePi,
  productsInSourcePi,
  globalSizes,
  globalProducts,
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

  useEffect(() => {
    if (isEditing && initialData) {
      form.reset({
        ...initialData,
        poDate: new Date(initialData.poDate),
        items: initialData.items.map(item => ({
            ...item,
            weightPerBox: item.weightPerBox || 0 // Ensure numeric
        }))
      });
      // Ensure field array is also reset properly
      if (initialData.items && initialData.items.length > 0) {
        replace(initialData.items.map(item => ({ ...item, weightPerBox: item.weightPerBox || 0 })));
      } else {
        replace([{ productId: "", designImage: "AS PER SAMPLE", weightPerBox: 0, boxes: 1, thickness: "8.5 MM to 9.0 MM" }]);
      }
    } else if (!isEditing && sourcePi) {
      const defaultValuesForNew = getDefaultFormValues(defaultPoNumber);
      form.reset({
        ...defaultValuesForNew,
        exporterId: sourcePi.exporterId,
        poNumber: defaultPoNumber, // Use the generated one
        // sizeId will be selected by user
        // items will be added by user
      });
      replace(defaultValuesForNew.items);
    } else if (!isEditing) {
      // General new form, not from PI (though current logic implies always from PI)
      form.reset(getDefaultFormValues(defaultPoNumber));
      replace(getDefaultFormValues(defaultPoNumber).items);
    }
  }, [isEditing, initialData, sourcePi, defaultPoNumber, form, replace]);


  const exporterOptions: ComboboxOption[] = useMemo(() =>
    allExporters.map(e => ({ value: e.id, label: e.companyName })),
    [allExporters]
  );

  const manufacturerOptions: ComboboxOption[] = useMemo(() =>
    allManufacturers.map(m => ({ value: m.id, label: m.companyName })),
    [allManufacturers]
  );

  const poSizeOptions: ComboboxOption[] = useMemo(() =>
    distinctSizesFromSourcePi.map(s => ({ value: s.id, label: `${s.size} (HSN: ${s.hsnCode})` })),
    [distinctSizesFromSourcePi]
  );

  const getProductOptionsForPoSize = useCallback((poSizeId: string): ComboboxOption[] => {
    if (!poSizeId || !productsInSourcePi || productsInSourcePi.length === 0) return [];
    return productsInSourcePi
      .filter(p => p.sizeId === poSizeId)
      .map(p => {
        const globalProductDetails = globalProducts.find(gp => gp.id === p.id);
        return { value: p.id, label: globalProductDetails?.designName || "Unknown Product" };
      });
  }, [productsInSourcePi, globalProducts]);


  const handleProductChange = (itemIndex: number, newProductId: string) => {
    form.setValue(`items.${itemIndex}.productId`, newProductId);
    const productInPi = productsInSourcePi.find(p => p.id === newProductId);
    const globalSizeDetails = globalSizes.find(s => s.id === productInPi?.sizeId);

    if (globalSizeDetails) {
      form.setValue(`items.${itemIndex}.weightPerBox`, globalSizeDetails.boxWeight);
    } else {
      form.setValue(`items.${itemIndex}.weightPerBox`, 0);
    }

    // Pre-fill boxes from source PI if product matches
    if (sourcePi && productInPi) {
        const piItem = sourcePi.items.find(piItem => piItem.productId === newProductId && piItem.sizeId === selectedPoSizeId);
        if (piItem) {
            form.setValue(`items.${itemIndex}.boxes`, piItem.boxes);
        } else {
            form.setValue(`items.${itemIndex}.boxes`, 1); // Default if not found in PI items
        }
    } else {
        form.setValue(`items.${itemIndex}.boxes`, 1);
    }
  };

  function onSubmit(values: PurchaseOrderFormValues) {
    const poToSave: PurchaseOrder = {
      ...values,
      id: isEditing && initialData ? initialData.id : Date.now().toString(),
      // poNumber is already in values from form field
    };
    onSave(poToSave);
    toast({
      title: isEditing ? "Purchase Order Updated" : "Purchase Order Saved",
      description: `PO ${poToSave.poNumber} has been successfully ${isEditing ? 'updated' : 'saved'}.`,
    });
     if (!isEditing) {
       form.reset(getDefaultFormValues(defaultPoNumber)); // Reset with the *next* PO number potentially
       replace(getDefaultFormValues(defaultPoNumber).items);
     }
  }
  
  const currentPoNumberForDisplay = form.getValues("poNumber") || defaultPoNumber;

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl mb-8">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          {isEditing ? "Edit Purchase Order" : "Create Purchase Order"}
        </CardTitle>
        <CardDescription>
          {isEditing ? "Modify the details of the purchase order." : 
           (sourcePi ? `Generating PO from Performa Invoice: ${sourcePi.invoiceNumber}` : "Fill in the details for a new purchase order.")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Part 1 */}
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
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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
                      onChange={(value) => {
                        field.onChange(value);
                        // Reset items when PO size changes as product list depends on it
                        replace([{ productId: "", designImage: "AS PER SAMPLE", weightPerBox: 0, boxes: 1, thickness: "8.5 MM to 9.0 MM" }]);
                      }}
                      placeholder="Select Size for PO..."
                      disabled={poSizeOptions.length === 0 || !sourcePi}
                    />
                    <FormMessage />
                    {!sourcePi && <p className="text-xs text-muted-foreground">Size selection requires a source Performa Invoice.</p>}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numberOfContainers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" />Number Of Containers</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g. 1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Part 2 - Product Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Product Items
                  <Button type="button" size="sm" onClick={() => append({ productId: "", designImage: "AS PER SAMPLE", weightPerBox: 0, boxes: 1, thickness: "8.5 MM to 9.0 MM" })} disabled={!selectedPoSizeId}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Product
                  </Button>
                </CardTitle>
                 {!selectedPoSizeId && <CardDescription className="text-destructive">Please select a Size for the PO above to add products.</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((item, index) => {
                  const productOptions = getProductOptionsForPoSize(selectedPoSizeId);
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
                              disabled={productOptions.length === 0 || !selectedPoSizeId}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.designImage`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2"><ImageOff className="h-4 w-4 text-muted-foreground"/>Design Image Ref.</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.weightPerBox`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2"><Scale className="h-4 w-4 text-muted-foreground"/>Weight/Box (kg)</FormLabel>
                              <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="flex space-x-4">
              <Button type="submit" className="flex-grow bg-accent hover:bg-accent/90 text-accent-foreground font-headline text-lg py-3">
                {isEditing ? "Update Purchase Order" : "Save Purchase Order"}
              </Button>
              {isEditing && onCancelEdit && (
                <Button type="button" variant="outline" onClick={onCancelEdit} className="flex-grow font-headline text-lg py-3">
                  Cancel Edit
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

    