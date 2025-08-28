
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller, useWatch, Control, UseFormGetValues, UseFormSetValue } from "react-hook-form";
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
import { FileSignature, Briefcase, Factory, Save, XCircle, CalendarIcon, Hash, Globe, Ship, Anchor, FileText, Truck, BadgeCheck, ArrowLeftRight, Bell, CalendarClock, Percent, PlusCircle, Trash2, Stamp, Radio, Weight, ListStart, ListEnd, Boxes, NotebookText, FileScan, Clock, Package, Layers, DollarSign, Gift, Sigma, Users, ShoppingCart, ReceiptText } from "lucide-react";
import React, { useEffect, useMemo, useRef } from "react";
import type { Company } from "@/types/company"; // For Exporter
import type { Manufacturer } from "@/types/manufacturer"; // For Manufacturer
import type { Transporter } from "@/types/transporter";
import type { Client } from "@/types/client";
import type { PerformaInvoice } from "@/types/performa-invoice";
import type { PurchaseOrder } from "@/types/purchase-order";
import type { ExportDocument, ManufacturerInfo } from "@/types/export-document";
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
  netWeight: z.coerce.number().positive('Net Weight is required'),
  grossWeight: z.coerce.number().positive('Gross Weight is required'),
  rate: z.coerce.number().min(0, 'Rate is required'),
});

const manufacturerInfoSchema = z.object({
  id: z.string(),
  manufacturerId: z.string().min(1, "Manufacturer is required."),
  invoiceNumber: z.string().min(1, "Invoice number is required."),
  invoiceDate: z.date({ required_error: "Invoice Date is required." }),
  permissionNumber: z.string().min(1, 'Permission No. is required.'),
});

const formSchema = z.object({
  exporterId: z.string().min(1, "Exporter is required"),
  exportInvoiceNumber: z.string().min(1, "Export Invoice Number is required."),
  exportInvoiceDate: z.date({ required_error: "Export Invoice Date is required." }),
  
  clientId: z.string().min(1, "Client is required"),
  performaInvoiceId: z.string().min(1, 'Performa Invoice is required.'),
  purchaseOrderId: z.string().min(1, 'Purchase Order is required.'),

  manufacturerDetails: z.array(manufacturerInfoSchema).min(1, "At least one manufacturer is required."),

  countryOfFinalDestination: z.string().min(1, "Country of Final Destination is required."),
  vesselFlightNo: z.string().optional(),
  portOfLoading: z.string().min(1, "Port of Loading is required."),
  portOfDischarge: z.string().min(1, "Port of Discharge is required."),
  finalDestination: z.string().min(1, "Final Destination is required."),
  termsOfDeliveryAndPayment: z.string().min(1, "Terms are required."),
  conversationRate: z.coerce.number().min(0, "Conversation Rate is required."),
  exchangeNotification: z.string().min(1, "Exchange Notification is required."),
  exchangeDate: z.date({ required_error: "Exchange Date is required." }),
  transporterId: z.string().min(1, "Transporter is required"),
  freight: z.coerce.number().min(0, "Freight is required."),
  gst: z.string().min(1, "GST is required."),
  discount: z.coerce.number().min(0).optional().default(0),
  
  containerItems: z.array(z.object({
    id: z.string().optional(),
    bookingNo: z.string().min(1, 'Booking No. is required.'),
    containerNo: z.string().min(1, 'Container No. is required.'),
    lineSeal: z.string().min(1, 'Line Seal is required.'),
    rfidSeal: z.string().min(1, 'RFID Seal is required.'),
    truckNumber: z.string().min(1, 'Truck No. is required.'),
    builtyNo: z.string().min(1, 'Builty No. is required.'),
    tareWeight: z.coerce.number().positive('Tare Weight is required.'),
    startPalletNo: z.string().min(1, 'Start Pallet No. is required.'),
    endPalletNo: z.string().min(1, 'End Pallet No. is required.'),
    totalPallets: z.string().min(1, 'Total Pallets is required.'),
    description: z.string().min(1, 'Description is required.'),
    weighingSlipNo: z.string().min(1, 'Weighing Slip No. is required.'),
    weighingDateTime: z.coerce.date({ required_error: 'Weighing Date/Time is required.' }),
    productItems: z.array(productItemSchema).min(1, 'At least one product is required.'),
    sampleItems: z.array(productItemSchema).optional(),
  })).min(1, 'At least one container is required.'),
});

export type ExportDocumentFormValues = z.infer<typeof formSchema>;

interface ExportDocumentFormProps {
  initialData?: ExportDocument | null;
  isEditing: boolean;
  onSave: (data: ExportDocument) => void;
  onCancelEdit: () => void;
  allExporters: Company[];
  allManufacturers: Manufacturer[];
  allTransporters: Transporter[];
  allProducts: Product[];
  allSizes: Size[];
  allClients: Client[];
  allPerformaInvoices: PerformaInvoice[];
  allPurchaseOrders: PurchaseOrder[];
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
  exportInvoiceNumber: nextInvoiceNumber,
  exportInvoiceDate: new Date(),
  clientId: "",
  performaInvoiceId: "",
  purchaseOrderId: "",
  manufacturerDetails: [defaultNewManufacturerItem],
  countryOfFinalDestination: "",
  vesselFlightNo: "",
  portOfLoading: "",
  portOfDischarge: "",
  finalDestination: "",
  termsOfDeliveryAndPayment: defaultTerms,
  conversationRate: 0,
  exchangeNotification: "",
  exchangeDate: new Date(),
  transporterId: "",
  freight: 0,
  gst: "",
  discount: 0,
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

    const handleProductSelectionChange = (newProductId: string) => {
        setValue(`containerItems.${containerIndex}.${fieldArrayName}.${productIndex}.productId`, newProductId, { shouldDirty: true });
        
        const product = allProducts.find(p => p.id === newProductId);
        if (product) {
            const size = allSizes.find(s => s.id === product.sizeId);
            
            const newRate = product.salesPrice ?? (size?.salesPrice || 0);
            setValue(`containerItems.${containerIndex}.${fieldArrayName}.${productIndex}.rate`, newRate);
            
            const numBoxes = Number(getValues(`containerItems.${containerIndex}.${fieldArrayName}.${productIndex}.boxes`)) || 0;
            const baseBoxWeight = product.boxWeight ?? (size?.boxWeight || 0);
            const newNetWeight = numBoxes * baseBoxWeight;
            setValue(`containerItems.${containerIndex}.${fieldArrayName}.${productIndex}.netWeight`, newNetWeight);
            setValue(`containerItems.${containerIndex}.${fieldArrayName}.${productIndex}.grossWeight`, newNetWeight);
        }
    };

    useEffect(() => {
        const currentProductId = getValues(`containerItems.${containerIndex}.${fieldArrayName}.${productIndex}.productId`);
        if (!currentProductId) return;

        const product = allProducts.find(p => p.id === currentProductId);
        if (!product) return;
        const size = allSizes.find(s => s.id === product.sizeId);
        if (!size) return;

        const numBoxes = Number(boxes) || 0;
        const baseBoxWeight = product.boxWeight ?? (size.boxWeight || 0);
        const newNetWeight = numBoxes * baseBoxWeight;
        
        setValue(`containerItems.${containerIndex}.${fieldArrayName}.${productIndex}.netWeight`, newNetWeight);
        setValue(`containerItems.${containerIndex}.${fieldArrayName}.${productIndex}.grossWeight`, newNetWeight);
        
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boxes]);


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
                    <FormLabel>Product *</FormLabel>
                    <Combobox
                        options={productOptions}
                        value={field.value}
                        onChange={handleProductSelectionChange}
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
                        <FormLabel className="flex items-center gap-1"><Boxes className="h-4 w-4 text-muted-foreground"/>Boxes *</FormLabel>
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
                        <FormLabel className="flex items-center gap-1"><DollarSign className="h-4 w-4 text-muted-foreground"/>Rate *</FormLabel>
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
                <FormLabel className="flex items-center gap-1"><Weight className="h-4 w-4 text-muted-foreground"/>Net Wt. *</FormLabel>
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
                <FormLabel className="flex items-center gap-1"><Weight className="h-4 w-4 text-muted-foreground"/>Gross Wt. *</FormLabel>
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
                    Products in this Container *
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
                     <div className="p-2 border border-dashed rounded-md text-center text-destructive text-sm min-h-[50px] flex items-center justify-center">
                        <p>At least one product must be added to this container.</p>
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

  useEffect(() => {
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

const PalletCalculator: React.FC<{
  containerIndex: number;
  control: Control<ExportDocumentFormValues>;
  setValue: UseFormSetValue<ExportDocumentFormValues>;
}> = ({ containerIndex, control, setValue }) => {
  const startPallet = useWatch({
    control,
    name: `containerItems.${containerIndex}.startPalletNo`,
  });
  const endPallet = useWatch({
    control,
    name: `containerItems.${containerIndex}.endPalletNo`,
  });

  React.useEffect(() => {
    const start = parseInt(startPallet || '0', 10);
    const end = parseInt(endPallet || '0', 10);

    if (!isNaN(start) && !isNaN(end) && end >= start && start > 0) {
      const total = (end - start + 1).toString();
      setValue(`containerItems.${containerIndex}.totalPallets`, total);
    } else {
      setValue(`containerItems.${containerIndex}.totalPallets`, "");
    }
  }, [startPallet, endPallet, setValue, containerIndex]);

  return null; // This component doesn't render anything
};


export function ExportDocumentFormV2({
  initialData,
  isEditing,
  onSave,
  onCancelEdit,
  allExporters,
  allManufacturers,
  allTransporters,
  allProducts,
  allSizes,
  allClients,
  allPerformaInvoices,
  allPurchaseOrders,
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
            clientId: String(initialData.clientId || ""),
            performaInvoiceId: String(initialData.performaInvoiceId || ""),
            purchaseOrderId: String(initialData.purchaseOrderId || ""),
            exportInvoiceDate: new Date(initialData.exportInvoiceDate),
            exchangeDate: initialData.exchangeDate ? new Date(initialData.exchangeDate) : new Date(),
            manufacturerDetails: initialData.manufacturerDetails?.map(md => ({...md, invoiceDate: md.invoiceDate ? new Date(md.invoiceDate) : new Date()})) || [defaultNewManufacturerItem],
            containerItems: initialData.containerItems && initialData.containerItems.length > 0 
              ? initialData.containerItems.map(item => ({
                  ...item,
                  weighingDateTime: item.weighingDateTime ? new Date(item.weighingDateTime) : new Date(),
                  productItems: item.productItems || [],
                  sampleItems: item.sampleItems || [],
                }))
              : [defaultNewContainerItem],
        });
    } else if (!isEditing && sourcePoId) {
        const po = allPurchaseOrders.find(p => p.id.toString() === sourcePoId);
        if (!po) return;

        const pi = allPerformaInvoices.find(p => String(p.id) === String(po.sourcePiId));
        if (!pi) return;
        
        form.reset({
            ...getDefaultFormValues(nextExportInvoiceNumber),
            exporterId: pi.exporterId,
            clientId: pi.clientId,
            performaInvoiceId: pi.id,
            purchaseOrderId: po.id,
            manufacturerDetails: [{
              id: Date.now().toString(),
              manufacturerId: po.manufacturerId,
              invoiceNumber: "",
              invoiceDate: new Date(),
              permissionNumber: allManufacturers.find(m => m.id === po.manufacturerId)?.stuffingPermissionNumber || ''
            }],
            countryOfFinalDestination: allClients.find(c => c.id === pi.clientId)?.country || '',
        });
    } else {
        form.reset(getDefaultFormValues(nextExportInvoiceNumber));
    }
}, [isEditing, initialData, sourcePoId, form, nextExportInvoiceNumber, allPurchaseOrders, allPerformaInvoices, allClients, allManufacturers]);

  const watchedClientId = form.watch('clientId');
  const watchedExporterId = form.watch('exporterId');
  const watchedManufacturerDetails = form.watch('manufacturerDetails');
  const watchedPerformaInvoiceId = form.watch('performaInvoiceId');

  // Find names for debug info
  const exporterName = useMemo(() => allExporters.find(e => e.id === watchedExporterId)?.companyName, [watchedExporterId, allExporters]);
  const clientName = useMemo(() => allClients.find(c => c.id === watchedClientId)?.companyName, [watchedClientId, allClients]);
  const manufacturerName = useMemo(() => allManufacturers.find(m => m.id === watchedManufacturerDetails?.[0]?.manufacturerId)?.companyName, [watchedManufacturerDetails, allManufacturers]);
  

  // Cascading Resets for NEW forms
  useEffect(() => {
    if (!isEditing && form.formState.isDirty) {
      form.setValue('performaInvoiceId', '');
      form.setValue('purchaseOrderId', '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedClientId, isEditing]);

  useEffect(() => {
     if (!isEditing && form.formState.isDirty) {
      form.setValue('purchaseOrderId', '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedPerformaInvoiceId, watchedManufacturerDetails, isEditing]);


  const clientOptions: ComboboxOption[] = useMemo(() =>
    allClients.map(c => ({ value: c.id.toString(), label: c.companyName })),
    [allClients]
  );
  
  const piOptions = useMemo(() => {
    if (!watchedClientId) return [];
    return allPerformaInvoices
      .filter(pi => String(pi.clientId) === String(watchedClientId))
      .map(pi => ({ value: pi.id.toString(), label: pi.invoiceNumber }));
  }, [watchedClientId, allPerformaInvoices]);

  const poOptions = useMemo(() => {
    const currentPiId = watchedPerformaInvoiceId;
    const selectedManufacturerId = watchedManufacturerDetails?.[0]?.manufacturerId;

    if (!currentPiId || !selectedManufacturerId) {
       return allPurchaseOrders.map(po => ({ value: po.id.toString(), label: po.poNumber }));
    }
    
    return allPurchaseOrders
      .filter(po => String(po.sourcePiId) === String(currentPiId) && String(po.manufacturerId) === String(selectedManufacturerId))
      .map(po => ({ value: po.id.toString(), label: po.poNumber }));
  }, [watchedPerformaInvoiceId, watchedManufacturerDetails, allPurchaseOrders]);


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
    const finalDocData: ExportDocument = {
        ...values,
        id: isEditing && initialData ? initialData.id : '',
        manufacturerDetails: values.manufacturerDetails?.map(md => ({...md, id: md.id || Math.random().toString(36).substring(2,9)})),
        containerItems: values.containerItems?.map(item => ({
            ...item, 
            id: item.id || Math.random().toString(36).substring(2,9),
            productItems: item.productItems?.map(p => ({...p, id: p.id || Math.random().toString(36).substring(2,9)})),
            sampleItems: item.sampleItems?.map(s => ({...s, id: s.id || Math.random().toString(36).substring(2,9)})),
        })) || [],
    };
    onSave(finalDocData);
  }

  const formTitle = isEditing ? "Edit Export Document (DB)" :
                    sourcePoId ? "New Export Document (from PO)" : "New Export Document (DB)";
  const formDescription = isEditing ? "Modify the details for this document in the database." :
                          sourcePoId ? `This document is linked to PO ID: ${sourcePoId}. It will be saved to the database.` :
                          "Fill in the details for the new document to save to the database.";

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
            {/* --- DEBUG BLOCK START --- */}
            <div className="p-4 border-2 border-dashed border-red-500 bg-red-50 rounded-lg">
                <h3 className="font-bold text-red-700 mb-2">Temporary Debug Info</h3>
                <p className="text-sm"><strong>Exporter:</strong> {exporterName || 'Not Set'}</p>
                <p className="text-sm"><strong>Client:</strong> {clientName || 'Not Set'}</p>
                <p className="text-sm"><strong>Manufacturer:</strong> {manufacturerName || 'Not Set'}</p>
            </div>
            {/* --- DEBUG BLOCK END --- */}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField control={form.control} name="exportInvoiceNumber" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-2"><Hash className="h-4 w-4 text-muted-foreground" />Export Invoice No. *</FormLabel><FormControl><Input placeholder="e.g. EXP/HEM/001/25-26" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="exportInvoiceDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel className="flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-muted-foreground" />Export Invoice Date *</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP"): <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) =>date > new Date() || date < new Date("2000-01-01")} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="exporterId" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" />Exporter *</FormLabel><Combobox options={exporterOptions} value={field.value} onChange={field.onChange} placeholder="Select Exporter..." searchPlaceholder="Search Exporters..." emptySearchMessage="No exporter found. Add on Exporter page." disabled={exporterOptions.length === 0} /><FormMessage /></FormItem>)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="clientId" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />Client *</FormLabel><Combobox options={clientOptions} value={field.value} onChange={field.onChange} placeholder="Select Client..."/><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="performaInvoiceId" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-muted-foreground" />Performa Invoice *</FormLabel><Combobox options={piOptions} value={field.value} onChange={field.onChange} placeholder="Select PI..." disabled={!watchedClientId && !initialData?.clientId} /><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="purchaseOrderId" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-2"><ReceiptText className="h-4 w-4 text-muted-foreground" />Purchase Order *</FormLabel><Combobox options={poOptions} value={field.value} onChange={field.onChange} placeholder="Select PO..." disabled={(!watchedPerformaInvoiceId && !initialData?.performaInvoiceId) || (!watchedManufacturerDetails?.[0]?.manufacturerId && !initialData?.manufacturerDetails?.[0]?.manufacturerId)} /><FormMessage /></FormItem>)} />
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
                                <FormField control={form.control} name={`manufacturerDetails.${index}.invoiceDate`} render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel><CalendarIcon className="inline mr-2 h-4 w-4 text-muted-foreground" />Invoice Date *</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick date</span>}<CalendarIcon className="ml-auto h-4 w-4"/></Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value} onSelect={field.onChange}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`manufacturerDetails.${index}.permissionNumber`} render={({ field }) => (<FormItem><FormLabel><BadgeCheck className="inline mr-2 h-4 w-4 text-muted-foreground" />Permission No. *</FormLabel><FormControl><Input placeholder="Auto-filled from Manufacturer" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        </div>
                    );
                  })}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField control={form.control} name="countryOfFinalDestination" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" />Country of Final Destination *</FormLabel><FormControl><Input placeholder="e.g. United States" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="vesselFlightNo" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Ship className="h-4 w-4 text-muted-foreground" />Vessel / Flight No.</FormLabel><FormControl><Input placeholder="e.g. MAERSK-123" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="portOfLoading" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Anchor className="h-4 w-4 text-muted-foreground" />Port Of Loading *</FormLabel><FormControl><Input placeholder="e.g. Mundra, India" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="portOfDischarge" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Anchor className="h-4 w-4 text-muted-foreground" />Port Of Discharge *</FormLabel><FormControl><Input placeholder="e.g. Newark, USA" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <FormField control={form.control} name="finalDestination" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-2"><Anchor className="h-4 w-4 text-muted-foreground" />Final Destination (Place) *</FormLabel><FormControl><Input placeholder="e.g. New York, USA" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="conversationRate" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><ArrowLeftRight className="h-4 w-4 text-muted-foreground" />Conversation Rate *</FormLabel><FormControl><Input type="number" placeholder="e.g. 83.50" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="exchangeNotification" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Bell className="h-4 w-4 text-muted-foreground" />Exchange Notification *</FormLabel><FormControl><Input placeholder="e.g. Notif-123" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="exchangeDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-muted-foreground" />Exchange Date *</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP"): <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField control={form.control} name="transporterId" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-2"><Truck className="h-4 w-4 text-muted-foreground" />Transporter *</FormLabel><Combobox options={transporterOptions} value={field.value} onChange={field.onChange} placeholder="Select Transporter..." searchPlaceholder="Search Transporters..." emptySearchMessage="No transporter found. Add on Transporter page." disabled={transporterOptions.length === 0} /><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="freight" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Ship className="h-4 w-4 text-muted-foreground" />Freight *</FormLabel><FormControl><Input type="number" placeholder="e.g. 500" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="gst" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Percent className="h-4 w-4 text-muted-foreground" />GST *</FormLabel><FormControl><Input placeholder="e.g. 18%" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="discount" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Percent className="h-4 w-4 text-muted-foreground" />Discount</FormLabel><FormControl><Input type="number" placeholder="e.g. 100" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            
            <FormField control={form.control} name="termsOfDeliveryAndPayment" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />Terms Of Delivery & Payments *</FormLabel><FormControl><Textarea placeholder="Terms..." {...field} /></FormControl><FormMessage /></FormItem>)} />

            <Card>
              <CardHeader>
                  <CardTitle className="flex items-center justify-between">Container Items *<Button type="button" size="sm" onClick={() => appendContainer(defaultNewContainerItem)}><PlusCircle className="mr-2 h-4 w-4" /> Add Container</Button></CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  {containerFields.map((field, index) => (
                      <div key={field.id} className="p-4 border rounded-md space-y-4 relative bg-card/50">
                          <PalletCalculator containerIndex={index} control={form.control} setValue={form.setValue} />
                          <Button type="button" variant="destructive" size="icon" onClick={() => containerFields.length > 1 && removeContainer(index)} className="absolute top-2 right-2 h-7 w-7" disabled={containerFields.length <= 1}><Trash2 className="h-4 w-4" /><span className="sr-only">Remove Item</span></Button>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={form.control} name={`containerItems.${index}.bookingNo`} render={({ field }) => (<FormItem><FormLabel>Booking No. *</FormLabel><FormControl><Input placeholder="e.g. BK123456" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name={`containerItems.${index}.containerNo`} render={({ field }) => (<FormItem><FormLabel>Container No. *</FormLabel><FormControl><Input placeholder="e.g. MSKU1234567" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name={`containerItems.${index}.lineSeal`} render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Stamp className="h-4 w-4 text-muted-foreground" />LINE SEAL *</FormLabel><FormControl><Input placeholder="e.g. LS123" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          </div>

                           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={form.control} name={`containerItems.${index}.rfidSeal`} render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Radio className="h-4 w-4 text-muted-foreground" />RFID SEAL *</FormLabel><FormControl><Input placeholder="e.g. RFID456" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name={`containerItems.${index}.truckNumber`} render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Truck className="h-4 w-4 text-muted-foreground" />Truck Number *</FormLabel><FormControl><Input placeholder="e.g. GJ01AB1234" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name={`containerItems.${index}.builtyNo`} render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />Builty No *</FormLabel><FormControl><Input placeholder="e.g. BN789" {...field} /></FormControl><FormMessage /></FormItem>)} />
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <FormField control={form.control} name={`containerItems.${index}.tareWeight`} render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Weight className="h-4 w-4 text-muted-foreground" />Tare weight (Kgs) *</FormLabel><FormControl><Input type="number" placeholder="e.g. 4500" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`containerItems.${index}.startPalletNo`} render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><ListStart className="h-4 w-4 text-muted-foreground" />Start PALLET NO *</FormLabel><FormControl><Input placeholder="e.g. 1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`containerItems.${index}.endPalletNo`} render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><ListEnd className="h-4 w-4 text-muted-foreground" />End PALLET NO *</FormLabel><FormControl><Input placeholder="e.g. 26" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`containerItems.${index}.totalPallets`} render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Boxes className="h-4 w-4 text-muted-foreground" />Total Pallets *</FormLabel><FormControl><Input placeholder="Auto-calculated" {...field} /></FormControl><FormMessage /></FormItem>)} />
                           </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <FormField control={form.control} name={`containerItems.${index}.description`} render={({ field }) => (<FormItem className="lg:col-span-1"><FormLabel className="flex items-center gap-2"><NotebookText className="h-4 w-4 text-muted-foreground" />Description *</FormLabel><FormControl><Textarea placeholder="e.g. Contains fragile items, handle with care." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`containerItems.${index}.weighingSlipNo`} render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><FileScan className="h-4 w-4 text-muted-foreground" />Weighing Slip No *</FormLabel><FormControl><Input placeholder="e.g. WSN-5678" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <Controller control={form.control} name={`containerItems.${index}.weighingDateTime`} render={({ field }) => {const dateValue = field.value ? new Date(field.value) : new Date(); const localISOString = new Date(dateValue.getTime() - (dateValue.getTimezoneOffset() * 60000)).toISOString().slice(0, 16); return (<FormItem><FormLabel className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />Weighing Date & Time *</FormLabel><FormControl><Input type="datetime-local" value={field.value ? localISOString : ''} onChange={(e) => {field.onChange(e.target.value ? new Date(e.target.value) : null);}} /></FormControl><FormMessage /></FormItem>);}} />
                            </div>
                            
                            <ContainerProductManager containerIndex={index} control={form.control} allProducts={allProducts} allSizes={allSizes} getValues={form.getValues} setValue={form.setValue} />
                            <Separator className="my-6 border-dashed"/>
                            <ContainerSampleManager containerIndex={index} control={form.control} allProducts={allProducts} allSizes={allSizes} getValues={form.getValues} setValue={form.setValue} />
                            <ContainerTotals containerIndex={index} control={form.control} allProducts={allProducts} allSizes={allSizes} />
                      </div>
                  ))}
              </CardContent>
            </Card>


            <div className="flex justify-end space-x-4">
              <Button type="button" variant="ghost" onClick={onCancelEdit} className="font-headline"><XCircle className="mr-2 h-5 w-5" /> Cancel</Button>
              <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground font-headline" disabled={exporterOptions.length === 0}><Save className="mr-2 h-5 w-5" />{isEditing ? "Update Document" : "Save Document"}</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
