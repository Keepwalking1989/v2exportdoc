
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller, Control, useWatch, UseFormGetValues, UseFormSetValue } from "react-hook-form";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { FileSignature, Briefcase, Factory, Save, XCircle, CalendarIcon, Hash, Globe, Ship, Anchor, FileText, Truck, BadgeCheck, ArrowLeftRight, Bell, CalendarClock, Percent, PlusCircle, Trash2, Stamp, Radio, Weight, ListStart, ListEnd, Boxes, NotebookText, FileScan, Clock, Package, Layers, DollarSign, Gift, Sigma } from "lucide-react";
import React, { useEffect, useMemo, useRef } from "react";
import type { Company } from "@/types/company"; // For Exporter
import type { Manufacturer } from "@/types/manufacturer"; // For Manufacturer
import type { Transporter } from "@/types/transporter";
import type { ExportDocument } from "@/types/export-document";
import type { Product } from "@/types/product";
import type { Size } from "@/types/size";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

const productItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, 'Product is required'),
  boxes: z.coerce.number().positive('Boxes must be > 0'),
  netWeight: z.coerce.number().nonnegative('Net Weight cannot be negative').optional(),
  grossWeight: z.coerce.number().nonnegative('Gross Weight cannot be negative').optional(),
  rate: z.coerce.number().nonnegative('Rate cannot be negative').optional(),
});

const manufacturerInfoSchema = z.object({
  id: z.string(),
  manufacturerId: z.string().min(1, "Manufacturer is required."),
  invoiceNumber: z.string().min(1, "Invoice number is required."),
  invoiceDate: z.date().optional(),
  permissionNumber: z.string().optional(),
});

const formSchema = z.object({
  exporterId: z.string().min(1, "Exporter is required"),
  transporterId: z.string().min(1, "Transporter is required"),
  exportInvoiceNumber: z.string().min(1, "Export Invoice Number is required."),
  exportInvoiceDate: z.date({ required_error: "Export Invoice Date is required." }),
  
  manufacturerDetails: z.array(manufacturerInfoSchema).min(1, "At least one manufacturer is required."),

  countryOfFinalDestination: z.string().min(1, "Country of Final Destination is required."),
  vesselFlightNo: z.string().optional(),
  portOfLoading: z.string().optional(),
  portOfDischarge: z.string().optional(),
  finalDestination: z.string().optional(),
  termsOfDeliveryAndPayment: z.string().optional(),
  conversationRate: z.coerce.number().optional(),
  exchangeNotification: z.string().optional(),
  exchangeDate: z.date().optional(),
  freight: z.coerce.number().optional(),
  gst: z.string().optional(),
  containerItems: z.array(z.object({
    id: z.string().optional(),
    bookingNo: z.string().optional(),
    containerNo: z.string().optional(),
    lineSeal: z.string().optional(),
    rfidSeal: z.string().optional(),
    truckNumber: z.string().optional(),
    builtyNo: z.string().optional(),
    tareWeight: z.coerce.number().optional(),
    startPalletNo: z.string().optional(),
    endPalletNo: z.string().optional(),
    totalPallets: z.string().optional(),
    description: z.string().optional(),
    weighingSlipNo: z.string().optional(),
    weighingDateTime: z.coerce.date().optional(),
    productItems: z.array(productItemSchema).optional(),
    sampleItems: z.array(productItemSchema).optional(),
  })).optional(),
});

export type ExportDocumentFormValues = z.infer<typeof formSchema>;

interface ExportDocumentFormProps {
  initialData?: ExportDocument | null;
  isEditing: boolean;
  onSave: (data: ExportDocumentFormValues) => void;
  onCancelEdit: () => void;
  allExporters: Company[];
  allManufacturers: Manufacturer[];
  allTransporters: Transporter[];
  allProducts: Product[];
  allSizes: Size[];
  sourcePoId?: string | null;
  nextExportInvoiceNumber: string;
}

const defaultTerms = "30 % advance Remaining Against BL";

const defaultNewContainerItem = { 
  bookingNo: "", 
  containerNo: "", 
  lineSeal: "", 
  rfidSeal: "", 
  truckNumber: "", 
  builtyNo: "",
  tareWeight: 0,
  startPalletNo: "",
  endPalletNo: "",
  totalPallets: "",
  description: "",
  weighingSlipNo: "",
  weighingDateTime: new Date(),
  productItems: [],
  sampleItems: [],
};

const defaultNewManufacturerItem = {
    id: Date.now().toString(),
    manufacturerId: "",
    invoiceNumber: "",
    invoiceDate: new Date(),
    permissionNumber: "",
};

const getDefaultFormValues = (nextInvoiceNumber: string): ExportDocumentFormValues => ({
  exporterId: "",
  transporterId: "",
  exportInvoiceNumber: nextInvoiceNumber,
  exportInvoiceDate: new Date(),
  manufacturerDetails: [defaultNewManufacturerItem],
  countryOfFinalDestination: "",
  vesselFlightNo: "",
  portOfLoading: "",
  portOfDischarge: "",
  finalDestination: "",
  termsOfDeliveryAndPayment: defaultTerms,
  conversationRate: 0,
  exchangeNotification: "",
  exchangeDate: undefined,
  freight: 0,
  gst: "",
  containerItems: [defaultNewContainerItem],
});

interface ItemManagerProps {
    containerIndex: number;
    control: Control<ExportDocumentFormValues>;
    allProducts: Product[];
    allSizes: Size[];
    getValues: UseFormGetValues<ExportDocumentFormValues>;
    setValue: UseFormSetValue<ExportDocumentFormValues>;
}

interface ItemProps {
    containerIndex: number;
    productIndex: number;
    control: Control<ExportDocumentFormValues>;
    remove: (index: number) => void;
    productOptions: ComboboxOption[];
    allProducts: Product[];
    allSizes: Size[];
    fieldArrayName: 'productItems' | 'sampleItems';
    getValues: UseFormGetValues<ExportDocumentFormValues>;
    setValue: UseFormSetValue<ExportDocumentFormValues>;
}

const ContainerProductItem: React.FC<ItemProps> = ({
    containerIndex,
    productIndex,
    control,
    remove,
    productOptions,
    allProducts,
    allSizes,
    fieldArrayName,
    getValues,
    setValue,
}) => {
    const currentItem = useWatch({
        control,
        name: `containerItems.${containerIndex}.${fieldArrayName}.${productIndex}`,
    }) || {};
    
    const { productId, boxes, rate } = currentItem;

    useEffect(() => {
        const product = allProducts.find(p => p.id === productId);
        if (product) {
            const size = allSizes.find(s => s.id === product.sizeId);
            const newRate = product.salesPrice ?? (size?.salesPrice || 0);
            setValue(`containerItems.${containerIndex}.${fieldArrayName}.${productIndex}.rate`, newRate);
        }
    }, [productId, allProducts, allSizes, setValue, containerIndex, productIndex, fieldArrayName]);
    
    useEffect(() => {
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;
        const size = allSizes.find(s => s.id === product.sizeId);
        if (!size) return;

        const numBoxes = Number(boxes) || 0;
        const baseBoxWeight = product.boxWeight ?? (size.boxWeight || 0);
        const newNetWeight = numBoxes * baseBoxWeight;
        
        setValue(`containerItems.${containerIndex}.${fieldArrayName}.${productIndex}.netWeight`, newNetWeight);
        
        const currentGrossWeightVal = getValues(`containerItems.${containerIndex}.${fieldArrayName}.${productIndex}.grossWeight`);
        if (!currentGrossWeightVal || Number(currentGrossWeightVal) < newNetWeight) {
            setValue(`containerItems.${containerIndex}.${fieldArrayName}.${productIndex}.grossWeight`, newNetWeight);
        }
    }, [productId, boxes, allProducts, allSizes, setValue, getValues, containerIndex, productIndex, fieldArrayName]);


    const { sqm, amount } = useMemo(() => {
        const product = allProducts.find(p => p.id === productId);
        const size = product ? allSizes.find(s => s.id === product.sizeId) : undefined;
        
        if (!product || !size) return { sqm: 0, amount: 0 };
        
        const numBoxes = Number(boxes) || 0;
        const numRate = Number(rate) || 0;
        
        const calculatedSqm = numBoxes * (size.sqmPerBox || 0);
        const calculatedAmount = calculatedSqm * numRate;

        return { sqm: calculatedSqm, amount: calculatedAmount };
    }, [productId, boxes, rate, allProducts, allSizes]);
    
    return (
      <div className="p-3 border rounded-md space-y-3 relative bg-background/80">
        <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={() => remove(productIndex)}
            className="absolute top-1 right-1 h-6 w-6"
        >
            <Trash2 className="h-3 w-3" />
            <span className="sr-only">Remove Product</span>
        </Button>
        
        <FormField
            control={control}
            name={`containerItems.${containerIndex}.${fieldArrayName}.${productIndex}.productId`}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Product</FormLabel>
                    <Combobox
                        options={productOptions}
                        value={field.value}
                        onChange={(value) => {
                            field.onChange(value);
                        }}
                        placeholder="Select Product..."
                    />
                    <FormMessage />
                </FormItem>
            )}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 items-start">
            <FormField
                control={control}
                name={`containerItems.${containerIndex}.${fieldArrayName}.${productIndex}.boxes`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center gap-1"><Boxes className="h-4 w-4 text-muted-foreground"/>Boxes</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g. 100" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormItem>
                <FormLabel className="flex items-center gap-1"><Layers className="h-4 w-4 text-muted-foreground"/>SQM</FormLabel>
                <FormControl>
                    <Input
                        readOnly
                        value={sqm.toFixed(2)}
                        className="bg-muted/50 focus-visible:ring-0"
                        tabIndex={-1}
                    />
                </FormControl>
            </FormItem>
            <FormField
                control={control}
                name={`containerItems.${containerIndex}.${fieldArrayName}.${productIndex}.rate`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center gap-1"><DollarSign className="h-4 w-4 text-muted-foreground"/>Rate</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g. 12.50" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
              control={control}
              name={`containerItems.${containerIndex}.${fieldArrayName}.${productIndex}.netWeight`}
              render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1"><Weight className="h-4 w-4 text-muted-foreground"/>Net Wt.</FormLabel>
                <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g. 1000"
                      {...field}
                      onChange={(e) => {
                          field.onChange(e.target.valueAsNumber || 0);
                      }}
                      className={cn(Number(field.value) > 27000 && "border-destructive text-destructive focus-visible:ring-destructive")}
                    />
                </FormControl>
                <FormMessage />
              </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`containerItems.${containerIndex}.${fieldArrayName}.${productIndex}.grossWeight`}
              render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1"><Weight className="h-4 w-4 text-muted-foreground"/>Gross Wt.</FormLabel>
                <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g. 1000"
                      {...field}
                       onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      className={cn(Number(field.value) > 27000 && "border-destructive text-destructive focus-visible:ring-destructive")}
                    />
                </FormControl>
                <FormMessage />
              </FormItem>
              )}
            />
            <FormItem>
                <FormLabel className="flex items-center gap-1"><DollarSign className="h-4 w-4 text-muted-foreground"/>Amount</FormLabel>
                <FormControl>
                    <Input
                        readOnly
                        value={amount.toFixed(2)}
                        className="bg-muted/50 focus-visible:ring-0"
                        tabIndex={-1}
                    />
                </FormControl>
            </FormItem>
        </div>
      </div>
    )
};


const ContainerProductManager: React.FC<ItemManagerProps> = ({ containerIndex, control, allProducts, allSizes, getValues, setValue }) => {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `containerItems.${containerIndex}.productItems`,
    });
    
    const productOptions: ComboboxOption[] = useMemo(() =>
        allProducts.map(p => {
            const size = allSizes.find(s => s.id === p.sizeId);
            return {
                value: p.id,
                label: `${p.designName} (${size?.size || 'N/A'})`
            };
        }), [allProducts, allSizes]);
    
    return (
        <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-md font-semibold flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Products in this Container
                </h4>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ productId: '', boxes: 1, rate: 0, netWeight: 0, grossWeight: 0 })}
                    >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Product
                </Button>
            </div>

            <div className="space-y-4 mt-2">
                {fields.map((productField, productIndex) => (
                    <ContainerProductItem
                        key={productField.id}
                        containerIndex={containerIndex}
                        productIndex={productIndex}
                        control={control}
                        remove={remove}
                        productOptions={productOptions}
                        allProducts={allProducts}
                        allSizes={allSizes}
                        fieldArrayName="productItems"
                        getValues={getValues}
                        setValue={setValue}
                    />
                ))}
                {fields.length === 0 && (
                     <div className="p-2 border border-dashed rounded-md text-center text-muted-foreground text-sm min-h-[50px] flex items-center justify-center">
                        <p>{productOptions.length > 0 ? "No products added to this container yet." : "No products available. Please add products on the Product page."}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const ContainerSampleManager: React.FC<ItemManagerProps> = ({ containerIndex, control, allProducts, allSizes, getValues, setValue }) => {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `containerItems.${containerIndex}.sampleItems`,
    });
    
    const productOptions: ComboboxOption[] = useMemo(() =>
        allProducts.map(p => {
            const size = allSizes.find(s => s.id === p.sizeId);
            return {
                value: p.id,
                label: `${p.designName} (${size?.size || 'N/A'})`
            };
        }), [allProducts, allSizes]);

    return (
        <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-md font-semibold flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary" />
                    Sample Items in this Container
                </h4>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ productId: '', boxes: 1, rate: 0, netWeight: 0, grossWeight: 0 })}
                >
                    <Gift className="mr-2 h-4 w-4" /> Add Sample
                </Button>
            </div>

            <div className="space-y-4 mt-2">
                {fields.map((productField, productIndex) => (
                    <ContainerProductItem
                        key={productField.id}
                        containerIndex={containerIndex}
                        productIndex={productIndex}
                        control={control}
                        remove={remove}
                        productOptions={productOptions}
                        allProducts={allProducts}
                        allSizes={allSizes}
                        fieldArrayName="sampleItems"
                        getValues={getValues}
                        setValue={setValue}
                    />
                ))}
                {fields.length === 0 && (
                     <div className="p-2 border border-dashed rounded-md text-center text-muted-foreground text-sm min-h-[50px] flex items-center justify-center">
                        <p>{productOptions.length > 0 ? "No samples added to this container yet." : "No products available to add as samples."}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

interface ContainerTotalsProps {
    containerIndex: number;
    control: Control<ExportDocumentFormValues>;
    allProducts: Product[];
    allSizes: Size[];
}

const ContainerTotals: React.FC<ContainerTotalsProps> = ({ containerIndex, control, allProducts, allSizes }) => {
    const productItems = useWatch({
        control,
        name: `containerItems.${containerIndex}.productItems`,
    }) || [];

    const sampleItems = useWatch({
        control,
        name: `containerItems.${containerIndex}.sampleItems`,
    }) || [];

    const { totalAmount, totalNetWeight, totalGrossWeight } = useMemo(() => {
        const allItems = [...(productItems || []), ...(sampleItems || [])];
        
        if (allItems.length === 0) {
            return { totalAmount: 0, totalNetWeight: 0, totalGrossWeight: 0 };
        }

        const totals = allItems.reduce((acc, item) => {
            const product = allProducts.find(p => p.id === item.productId);
            const size = product ? allSizes.find(s => s.id === product.sizeId) : undefined;
            
            const boxes = Number(item.boxes) || 0;
            const rate = Number(item.rate) || 0;
            const sqmPerBox = size?.sqmPerBox || 0;
            
            const calculatedSqm = boxes * sqmPerBox;
            const calculatedAmount = calculatedSqm * rate;
            
            acc.totalAmount += calculatedAmount;
            acc.totalNetWeight += Number(item.netWeight) || 0;
            acc.totalGrossWeight += Number(item.grossWeight) || 0;
            
            return acc;
        }, { totalAmount: 0, totalNetWeight: 0, totalGrossWeight: 0 });

        return totals;
    }, [productItems, sampleItems, allProducts, allSizes]);

    if (productItems.length === 0 && sampleItems.length === 0) {
        return null;
    }

    return (
        <div className="mt-6 p-4 border-t-2 border-dashed border-primary/50 space-y-3">
             <h4 className="text-lg font-bold flex items-center gap-2 text-primary">
                <Sigma className="h-5 w-5" />
                Container Totals
            </h4>
            <div className="flex justify-between items-center font-semibold text-md">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="text-primary flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {totalAmount.toFixed(2)}
                </span>
            </div>
            <div className="flex justify-between items-center font-semibold text-md">
                <span className="text-muted-foreground">Total Net Weight:</span>
                <span className="flex items-center gap-1">
                     <Weight className="h-4 w-4 text-muted-foreground" />
                    {totalNetWeight.toFixed(2)} Kgs
                </span>
            </div>
            <div className="flex justify-between items-center font-semibold text-md">
                <span className="text-muted-foreground">Total Gross Weight:</span>
                <span className="flex items-center gap-1">
                     <Weight className="h-4 w-4 text-muted-foreground" />
                    {totalGrossWeight.toFixed(2)} Kgs
                </span>
            </div>
        </div>
    );
};

const ManufacturerPermissionUpdater: React.FC<{
  control: Control<ExportDocumentFormValues>;
  index: number;
  allManufacturers: Manufacturer[];
  setValue: UseFormSetValue<ExportDocumentFormValues>;
}> = ({ control, index, allManufacturers, setValue }) => {
  const manufacturerId = useWatch({
    control,
    name: `manufacturerDetails.${index}.manufacturerId`,
  });

  const isFormDirty = control.formState.isDirty;

  useEffect(() => {
    // Only autofill if the user hasn't manually changed the permission number
    // for this item, or if the manufacturer changes.
    // The check for isDirty is a bit broad, but prevents overriding on first load of an existing doc.
    if (manufacturerId) {
      const selectedManufacturer = allManufacturers.find((m) => m.id === manufacturerId);
      if (selectedManufacturer) {
        setValue(
          `manufacturerDetails.${index}.permissionNumber`,
          selectedManufacturer.stuffingPermissionNumber || ''
        );
      }
    }
  }, [manufacturerId, index, allManufacturers, setValue]);

  return null;
};

export function ExportDocumentForm({
  initialData,
  isEditing,
  onSave,
  onCancelEdit,
  allExporters,
  allManufacturers,
  allTransporters,
  allProducts,
  allSizes,
  sourcePoId,
  nextExportInvoiceNumber,
}: ExportDocumentFormProps) {
  const { toast } = useToast();
  const form = useForm<ExportDocumentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultFormValues(nextExportInvoiceNumber),
  });
  
  const { fields: containerFields, append: appendContainer, remove: removeContainer } = useFieldArray({
    control: form.control,
    name: "containerItems",
  });

  const { fields: manufacturerFields, append: appendManufacturer, remove: removeManufacturer } = useFieldArray({
    control: form.control,
    name: "manufacturerDetails",
  });


  useEffect(() => {
    if (isEditing && initialData) {
      form.reset({
        ...initialData,
        exporterId: initialData.exporterId || "",
        transporterId: initialData.transporterId || "",
        exportInvoiceNumber: initialData.exportInvoiceNumber || "",
        exportInvoiceDate: initialData.exportInvoiceDate ? new Date(initialData.exportInvoiceDate) : new Date(),
        manufacturerDetails: initialData.manufacturerDetails?.map(md => ({...md, invoiceDate: md.invoiceDate ? new Date(md.invoiceDate) : undefined})) || [defaultNewManufacturerItem],
        countryOfFinalDestination: initialData.countryOfFinalDestination || "",
        vesselFlightNo: initialData.vesselFlightNo || "",
        portOfLoading: initialData.portOfLoading || "",
        portOfDischarge: initialData.portOfDischarge || "",
        finalDestination: initialData.finalDestination || "",
        termsOfDeliveryAndPayment: initialData.termsOfDeliveryAndPayment || defaultTerms,
        conversationRate: initialData.conversationRate || 0,
        exchangeNotification: initialData.exchangeNotification || "",
        exchangeDate: initialData.exchangeDate ? new Date(initialData.exchangeDate) : undefined,
        freight: initialData.freight || 0,
        gst: initialData.gst || "",
        containerItems: initialData.containerItems && initialData.containerItems.length > 0 
          ? initialData.containerItems.map(item => ({
              ...item,
              weighingDateTime: item.weighingDateTime ? new Date(item.weighingDateTime) : undefined,
              productItems: item.productItems || [],
              sampleItems: item.sampleItems || [],
            }))
          : [defaultNewContainerItem],
      });
    } else {
      form.reset(getDefaultFormValues(nextExportInvoiceNumber));
    }
  }, [isEditing, initialData, form, nextExportInvoiceNumber]);


  const exporterOptions: ComboboxOption[] = useMemo(() =>
    allExporters.map(e => ({ value: e.id, label: e.companyName })),
    [allExporters]
  );

  const manufacturerOptions: ComboboxOption[] = useMemo(() =>
    allManufacturers.map(m => ({ value: m.id, label: m.companyName })),
    [allManufacturers]
  );
  
  const transporterOptions: ComboboxOption[] = useMemo(() =>
    allTransporters.map(t => ({ value: t.id, label: t.companyName })),
    [allTransporters]
  );

  function onSubmit(values: ExportDocumentFormValues) {
    onSave(values);
    toast({
      title: isEditing ? "Document Updated" : "Document Saved",
      description: `Document has been successfully ${isEditing ? 'updated' : 'saved'}.`,
    });
    if (!isEditing) {
      form.reset(getDefaultFormValues(nextExportInvoiceNumber));
    }
  }

  const formTitle = isEditing ? "Edit Export Document" :
                    sourcePoId ? "New Export Document (from PO)" : "New Export Document";
  const formDescription = isEditing ? "Modify the details for this document." :
                          sourcePoId ? `This document will be linked to PO ID: ${sourcePoId.slice(-6)}.` :
                          "Fill in the details for the new document.";

  return (
    <Card className="w-full max-w-6xl mx-auto shadow-xl mb-8">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <FileSignature className="h-6 w-6 text-primary" />
          {formTitle}
        </CardTitle>
        <CardDescription>{formDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField control={form.control} name="exportInvoiceNumber" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-2"><Hash className="h-4 w-4 text-muted-foreground" />Export Invoice No.</FormLabel><FormControl><Input placeholder="e.g. EXP/HEM/001/25-26" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="exportInvoiceDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel className="flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-muted-foreground" />Export Invoice Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP"): <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) =>date > new Date() || date < new Date("2000-01-01")} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="exporterId" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" />Exporter *</FormLabel><Combobox options={exporterOptions} value={field.value} onChange={field.onChange} placeholder="Select Exporter..." searchPlaceholder="Search Exporters..." emptySearchMessage="No exporter found. Add on Exporter page." disabled={exporterOptions.length === 0} /><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="transporterId" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-2"><Truck className="h-4 w-4 text-muted-foreground" />Transporter *</FormLabel><Combobox options={transporterOptions} value={field.value} onChange={field.onChange} placeholder="Select Transporter..." searchPlaceholder="Search Transporters..." emptySearchMessage="No transporter found. Add on Transporter page." disabled={transporterOptions.length === 0} /><FormMessage /></FormItem>)} />
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">Manufacturer Details<Button type="button" size="sm" onClick={() => appendManufacturer(defaultNewManufacturerItem)}><PlusCircle className="mr-2 h-4 w-4" /> Add Manufacturer</Button></CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {manufacturerFields.map((field, index) => {
                    return (
                        <div key={field.id} className="p-4 border rounded-md space-y-4 relative bg-card/50">
                            <ManufacturerPermissionUpdater control={form.control} index={index} allManufacturers={allManufacturers} setValue={form.setValue}/>
                            <Button type="button" variant="destructive" size="icon" onClick={() => manufacturerFields.length > 1 && removeManufacturer(index)} className="absolute top-2 right-2 h-7 w-7" disabled={manufacturerFields.length <= 1}><Trash2 className="h-4 w-4" /><span className="sr-only">Remove Manufacturer</span></Button>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <FormField control={form.control} name={`manufacturerDetails.${index}.manufacturerId`} render={({ field }) => (<FormItem><FormLabel><Factory className="inline mr-2 h-4 w-4 text-muted-foreground" />Manufacturer *</FormLabel><Combobox options={manufacturerOptions} {...field} placeholder="Select Manufacturer..."/><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`manufacturerDetails.${index}.invoiceNumber`} render={({ field }) => ( <FormItem><FormLabel><Hash className="inline mr-2 h-4 w-4 text-muted-foreground" />Invoice No. *</FormLabel><FormControl><Input placeholder="e.g. MAN-INV-001" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`manufacturerDetails.${index}.invoiceDate`} render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel><CalendarIcon className="inline mr-2 h-4 w-4 text-muted-foreground" />Invoice Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick date</span>}<CalendarIcon className="ml-auto h-4 w-4"/></Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value} onSelect={field.onChange}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`manufacturerDetails.${index}.permissionNumber`} render={({ field }) => (<FormItem><FormLabel><BadgeCheck className="inline mr-2 h-4 w-4 text-muted-foreground" />Permission No.</FormLabel><FormControl><Input placeholder="Auto-filled from Manufacturer" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        </div>
                    );
                  })}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField control={form.control} name="countryOfFinalDestination" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" />Country of Final Destination *</FormLabel><FormControl><Input placeholder="e.g. United States" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="vesselFlightNo" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Ship className="h-4 w-4 text-muted-foreground" />Vessel / Flight No.</FormLabel><FormControl><Input placeholder="e.g. MAERSK-123" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="portOfLoading" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Anchor className="h-4 w-4 text-muted-foreground" />Port Of Loading</FormLabel><FormControl><Input placeholder="e.g. Mundra, India" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="portOfDischarge" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Anchor className="h-4 w-4 text-muted-foreground" />Port Of Discharge</FormLabel><FormControl><Input placeholder="e.g. Newark, USA" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <FormField control={form.control} name="finalDestination" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-2"><Anchor className="h-4 w-4 text-muted-foreground" />Final Destination (Place)</FormLabel><FormControl><Input placeholder="e.g. New York, USA" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="conversationRate" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><ArrowLeftRight className="h-4 w-4 text-muted-foreground" />Conversation Rate</FormLabel><FormControl><Input type="number" placeholder="e.g. 83.50" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="freight" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Ship className="h-4 w-4 text-muted-foreground" />Freight</FormLabel><FormControl><Input type="number" placeholder="e.g. 500" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="gst" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Percent className="h-4 w-4 text-muted-foreground" />GST</FormLabel><FormControl><Input placeholder="e.g. 18%" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="exchangeNotification" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Bell className="h-4 w-4 text-muted-foreground" />Exchange Notification</FormLabel><FormControl><Input placeholder="e.g. Notif-123" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="exchangeDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-muted-foreground" />Exchange Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP"): <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
            </div>

            <FormField control={form.control} name="termsOfDeliveryAndPayment" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />Terms Of Delivery & Payments</FormLabel><FormControl><Textarea placeholder="Terms..." {...field} /></FormControl><FormMessage /></FormItem>)} />

            <Card>
              <CardHeader>
                  <CardTitle className="flex items-center justify-between">Container Items<Button type="button" size="sm" onClick={() => appendContainer(defaultNewContainerItem)}><PlusCircle className="mr-2 h-4 w-4" /> Add Container</Button></CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  {containerFields.map((field, index) => (
                      <div key={field.id} className="p-4 border rounded-md space-y-4 relative bg-card/50">
                          <Button type="button" variant="destructive" size="icon" onClick={() => containerFields.length > 1 && removeContainer(index)} className="absolute top-2 right-2 h-7 w-7" disabled={containerFields.length <= 1}><Trash2 className="h-4 w-4" /><span className="sr-only">Remove Item</span></Button>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name={`containerItems.${index}.bookingNo`} render={({ field }) => (<FormItem><FormLabel>Booking No.</FormLabel><FormControl><Input placeholder="e.g. BK123456" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name={`containerItems.${index}.containerNo`} render={({ field }) => (<FormItem><FormLabel>Container No.</FormLabel><FormControl><Input placeholder="e.g. MSKU1234567" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name={`containerItems.${index}.lineSeal`} render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Stamp className="h-4 w-4 text-muted-foreground" />LINE SEAL</FormLabel><FormControl><Input placeholder="e.g. LS123" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name={`containerItems.${index}.rfidSeal`} render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Radio className="h-4 w-4 text-muted-foreground" />RFID SEAL</FormLabel><FormControl><Input placeholder="e.g. RFID456" {...field} /></FormControl><FormMessage /></FormItem>)} />
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField control={form.control} name={`containerItems.${index}.truckNumber`} render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Truck className="h-4 w-4 text-muted-foreground" />Truck Number</FormLabel><FormControl><Input placeholder="e.g. GJ01AB1234" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name={`containerItems.${index}.builtyNo`} render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />Builty No</FormLabel><FormControl><Input placeholder="e.g. BN789" {...field} /></FormControl><FormMessage /></FormItem>)} />
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                                <FormField control={form.control} name={`containerItems.${index}.tareWeight`} render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Weight className="h-4 w-4 text-muted-foreground" />Tare weight (Kgs)</FormLabel><FormControl><Input type="number" placeholder="e.g. 4500" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`containerItems.${index}.startPalletNo`} render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><ListStart className="h-4 w-4 text-muted-foreground" />Start PALLET NO</FormLabel><FormControl><Input placeholder="e.g. 1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`containerItems.${index}.endPalletNo`} render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><ListEnd className="h-4 w-4 text-muted-foreground" />End PALLET NO</FormLabel><FormControl><Input placeholder="e.g. 26" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`containerItems.${index}.totalPallets`} render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Boxes className="h-4 w-4 text-muted-foreground" />Total Pallets</FormLabel><FormControl><Input placeholder="e.g. 26" {...field} /></FormControl><FormMessage /></FormItem>)} />
                           </div>
                            <FormField control={form.control} name={`containerItems.${index}.description`} render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><NotebookText className="h-4 w-4 text-muted-foreground" />Description for this Container</FormLabel><FormControl><Textarea placeholder="e.g. Contains fragile items, handle with care." {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name={`containerItems.${index}.weighingSlipNo`} render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><FileScan className="h-4 w-4 text-muted-foreground" />Weighing Slip No</FormLabel><FormControl><Input placeholder="e.g. WSN-5678" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <Controller control={form.control} name={`containerItems.${index}.weighingDateTime`} render={({ field }) => {const dateValue = field.value ? new Date(field.value) : new Date(); const localISOString = new Date(dateValue.getTime() - (dateValue.getTimezoneOffset() * 60000)).toISOString().slice(0, 16); return (<FormItem><FormLabel className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />Weighing Date & Time</FormLabel><FormControl><Input type="datetime-local" value={field.value ? localISOString : ''} onChange={(e) => {field.onChange(e.target.value ? new Date(e.target.value) : null);}} /></FormControl><FormMessage /></FormItem>);}} />
                            </div>
                            
                            <ContainerProductManager containerIndex={index} control={form.control} allProducts={allProducts} allSizes={allSizes} getValues={form.getValues} setValue={form.setValue} />
                            <Separator className="my-6 border-dashed"/>
                            <ContainerSampleManager containerIndex={index} control={form.control} allProducts={allProducts} allSizes={allSizes} getValues={form.getValues} setValue={form.setValue} />
                            <ContainerTotals containerIndex={index} control={form.control} allProducts={allProducts} allSizes={allSizes} />
                      </div>
                  ))}
              </CardContent>
            </Card>


            <div className="flex justify-between items-center mt-8">
              <Button type="button" variant="outline" onClick={onCancelEdit} className="font-headline" disabled={!isEditing && !sourcePoId}><XCircle className="mr-2 h-5 w-5" /> Cancel</Button>
              <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground font-headline" disabled={exporterOptions.length === 0}><Save className="mr-2 h-5 w-5" />{isEditing ? "Update Document" : "Save Document"}</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
