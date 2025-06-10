
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, PlusCircle, Trash2, FileText, Package, Factory, Users, DollarSign, Ship, Anchor, MapPin, Edit3, Save, Layers, PackagePlus, Info, Briefcase, FileSignature, Truck } from "lucide-react";
import React, { useEffect, useState, useMemo, useCallback } from "react";

import type { ExportDocument, ExportDocumentContainerItem, ExportDocumentProductItem } from "@/types/export-document";
import type { PurchaseOrder } from "@/types/purchase-order";
import type { PerformaInvoice } from "@/types/performa-invoice";
import type { Company } from "@/types/company";
import type { Client } from "@/types/client";
import type { Manufacturer } from "@/types/manufacturer";
import type { Size } from "@/types/size";
import type { Product } from "@/types/product";
import type { Bank } from "@/types/bank";

const LOCAL_STORAGE_PO_KEY = "bizform_purchase_orders";
const LOCAL_STORAGE_PI_KEY = "bizform_performa_invoices";
const LOCAL_STORAGE_COMPANIES_KEY = "bizform_companies";
const LOCAL_STORAGE_CLIENTS_KEY = "bizform_clients";
const LOCAL_STORAGE_MANUFACTURERS_KEY = "bizform_manufacturers";
const LOCAL_STORAGE_SIZES_KEY = "bizform_sizes";
const LOCAL_STORAGE_PRODUCTS_KEY = "bizform_products";
const LOCAL_STORAGE_BANKS_KEY = "bizform_banks";

const exportDocumentProductItemSchema = z.object({
  id: z.string().optional(),
  sizeId: z.string().min(1, "Size is required"),
  productId: z.string().min(1, "Product is required"),
  boxes: z.coerce.number().min(1, "Boxes must be at least 1"),
  ratePerSqmt: z.coerce.number().min(0, "Rate must be non-negative"),
  grossWtKgs: z.coerce.number().min(0, "Gross weight must be non-negative").optional(),
});

const exportDocumentContainerItemSchema = z.object({
  id: z.string().optional(),
  bookingNo: z.string().optional(),
  containerNo: z.string().optional(),
  lineSeal: z.string().optional(),
  rfidSeal: z.string().optional(),
  tareWeight: z.coerce.number().min(0, "Tare weight must be non-negative").optional(),
  startPalletNo: z.string().optional(),
  endPalletNo: z.string().optional(),
  description: z.string().optional(),
  weighingDateTime: z.union([z.date(), z.string()]).optional(),
  weighingSlipNo: z.string().optional(),
  truckNumber: z.string().optional(),
  biltiNo: z.string().optional(),
  products: z.array(exportDocumentProductItemSchema).min(1, "At least one product item is required in a container"),
});

const formSchema = z.object({
  purchaseOrderId: z.string().optional(),
  exportInvoiceNumber: z.string().min(1, "Export Invoice Number is required"),
  exportInvoiceDate: z.date({ required_error: "Export Invoice Date is required" }),
  
  vesselFlightNo: z.string().optional(),
  portOfLoading: z.string().min(1, "Port of Loading is required"),
  portOfDischarge: z.string().min(1, "Port of Discharge is required"),
  countryOfOrigin: z.string().min(1, "Country of Origin is required"),
  shippingMarks: z.string().optional(),

  // These are derived/pre-filled, not directly part of the form for submission in this schema version
  // exporterId, clientId, manufacturerId, finalDestination, currencyType, selectedBankId, notifyPartyLine1/2
  
  containers: z.array(exportDocumentContainerItemSchema).min(1, "At least one container is required"),
});

type ExportDocumentFormValues = z.infer<typeof formSchema>;

interface ExportDocumentFormProps {
  initialData?: ExportDocument | null;
  isEditing: boolean;
  onSave: (doc: ExportDocument) => void;
  // onCancelEdit: () => void;
  // nextExportInvoiceNumber: string; // If we implement auto-numbering
}

const getDefaultFormValues = (): ExportDocumentFormValues => ({
  purchaseOrderId: "",
  exportInvoiceNumber: "",
  exportInvoiceDate: new Date(),
  vesselFlightNo: "",
  portOfLoading: "",
  portOfDischarge: "",
  countryOfOrigin: "INDIA",
  shippingMarks: "AS PER INVOICE",
  containers: [{
    id: Date.now().toString() + "_container",
    bookingNo: "", containerNo: "", lineSeal: "", rfidSeal: "", tareWeight: 0,
    startPalletNo: "", endPalletNo: "", description: "VITRIFIED TILES AS PER INVOICE",
    weighingDateTime: new Date(), weighingSlipNo: "", truckNumber: "", biltiNo: "",
    products: [{ id: Date.now().toString() + "_product", sizeId: "", productId: "", boxes: 1, ratePerSqmt: 0, grossWtKgs: 0 }],
  }],
});


export function ExportDocumentForm({
  initialData,
  isEditing,
  onSave,
}: ExportDocumentFormProps) {
  const { toast } = useToast();
  const form = useForm<ExportDocumentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultFormValues(),
  });

  const { fields: containerFields, append: appendContainer, remove: removeContainer, update: updateContainer } = useFieldArray({
    control: form.control,
    name: "containers",
  });

  // State for master data and derived data
  const [allPOs, setAllPOs] = useState<PurchaseOrder[]>([]);
  const [allPIs, setAllPIs] = useState<PerformaInvoice[]>([]);
  const [allExporters, setAllExporters] = useState<Company[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allManufacturers, setAllManufacturers] = useState<Manufacturer[]>([]);
  const [allSizes, setAllSizes] = useState<Size[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allBanks, setAllBanks] = useState<Bank[]>([]);

  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [linkedPI, setLinkedPI] = useState<PerformaInvoice | null>(null);
  const [displayExporter, setDisplayExporter] = useState<Company | null>(null);
  const [displayClient, setDisplayClient] = useState<Client | null>(null);
  const [displayManufacturer, setDisplayManufacturer] = useState<Manufacturer | null>(null);
  const [displayBank, setDisplayBank] = useState<Bank | null>(null);


  useEffect(() => {
    // Load all necessary master data from localStorage
    setAllPOs(JSON.parse(localStorage.getItem(LOCAL_STORAGE_PO_KEY) || "[]").map((po:any)=>({...po, poDate: new Date(po.poDate)})));
    setAllPIs(JSON.parse(localStorage.getItem(LOCAL_STORAGE_PI_KEY) || "[]").map((pi:any)=>({...pi, invoiceDate: new Date(pi.invoiceDate)})));
    setAllExporters(JSON.parse(localStorage.getItem(LOCAL_STORAGE_COMPANIES_KEY) || "[]"));
    setAllClients(JSON.parse(localStorage.getItem(LOCAL_STORAGE_CLIENTS_KEY) || "[]"));
    setAllManufacturers(JSON.parse(localStorage.getItem(LOCAL_STORAGE_MANUFACTURERS_KEY) || "[]").map((m:any)=>({...m, stuffingPermissionDate: new Date(m.stuffingPermissionDate)})));
    setAllSizes(JSON.parse(localStorage.getItem(LOCAL_STORAGE_SIZES_KEY) || "[]"));
    setAllProducts(JSON.parse(localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY) || "[]"));
    setAllBanks(JSON.parse(localStorage.getItem(LOCAL_STORAGE_BANKS_KEY) || "[]"));
  }, []);

  const poOptions: ComboboxOption[] = useMemo(() =>
    allPOs.map(po => ({ value: po.id, label: `${po.poNumber} - ${format(new Date(po.poDate), 'dd/MM/yy')}` })),
    [allPOs]
  );
  
  const sizeOptions: ComboboxOption[] = useMemo(() => {
      // If a PO is selected, prioritize sizes from that PO's items.
      // Otherwise, show all global sizes.
      let relevantSizes: Size[] = [];
      if (selectedPO && selectedPO.sizeId) {
          const poSize = allSizes.find(s => s.id === selectedPO.sizeId);
          if (poSize) relevantSizes.push(poSize);
      }
      // Add all other global sizes if not already present, ensuring uniqueness
      allSizes.forEach(s => {
          if (!relevantSizes.find(rs => rs.id === s.id)) {
              relevantSizes.push(s);
          }
      });
      return relevantSizes.map(s => ({ value: s.id, label: `${s.size} (HSN: ${s.hsnCode})` }));
  }, [selectedPO, allSizes]);


  const getProductOptionsForSize = useCallback((sizeId: string): ComboboxOption[] => {
    if (!sizeId) return [];
    // If a PO is selected, try to get product options from that PO that match the size.
    // Otherwise, get all global products matching the size.
    let relevantProducts: Product[] = [];
    if (selectedPO) {
        selectedPO.items.forEach(poItem => {
            const product = allProducts.find(p => p.id === poItem.productId && p.sizeId === sizeId);
            if (product && !relevantProducts.find(rp => rp.id === product.id)) {
                relevantProducts.push(product);
            }
        });
    }
    // Add all other global products for this size if not already present
    allProducts.forEach(p => {
        if (p.sizeId === sizeId && !relevantProducts.find(rp => rp.id === p.id)) {
            relevantProducts.push(p);
        }
    });
    return relevantProducts.map(p => ({ value: p.id, label: p.designName }));
  }, [selectedPO, allProducts]);


  const handlePOChange = (poId: string) => {
    const po = allPOs.find(p => p.id === poId);
    setSelectedPO(po || null);
    form.setValue("purchaseOrderId", poId);

    if (po) {
      const exporter = allExporters.find(e => e.id === po.exporterId);
      setDisplayExporter(exporter || null);
      
      const manufacturer = allManufacturers.find(m => m.id === po.manufacturerId);
      setDisplayManufacturer(manufacturer || null);

      if (po.sourcePiId) {
        const pi = allPIs.find(p => p.id === po.sourcePiId);
        setLinkedPI(pi || null);
        if (pi) {
          const client = allClients.find(c => c.id === pi.clientId);
          setDisplayClient(client || null);
          form.setValue("portOfLoading", "MUNDRA PORT, INDIA"); // Default
          form.setValue("portOfDischarge", pi.finalDestination); 
          form.setValue("countryOfFinalDestination", client?.country || "");
          // Pre-fill notify party from PI
          form.setValue("shippingMarks", `CONSIGNEE:\n${client?.companyName.toUpperCase()}\n${client?.address.toUpperCase()}\nFINAL DESTINATION: ${pi.finalDestination.toUpperCase()}`);


          if (pi.selectedBankId) {
            const bank = allBanks.find(b => b.id === pi.selectedBankId);
            setDisplayBank(bank || null);
          } else {
            setDisplayBank(null);
          }

          // Pre-fill container and product items from PO (basic structure)
          // This part needs careful handling of product details like rate.
          const newContainers: ExportDocumentFormValues['containers'] = po.items.length > 0 ? [{
            id: Date.now().toString() + "_container_from_po",
            bookingNo: "", containerNo: "", lineSeal: "", rfidSeal: "", tareWeight: 0,
            startPalletNo: "", endPalletNo: "", description: "VITRIFIED TILES AS PER INVOICE",
            weighingDateTime: new Date(), weighingSlipNo: "", truckNumber: "", biltiNo: "",
            products: po.items.map(poItem => {
                const sizeDetail = allSizes.find(s => s.id === po.sizeId); // PO has one main sizeId
                const productDetail = allProducts.find(p => p.id === poItem.productId && p.sizeId === po.sizeId);
                const rate = sizeDetail?.salesPrice || 0; // Default to size's sales price
                const netWt = (sizeDetail?.boxWeight || 0) * poItem.boxes;
                return {
                    id: Date.now().toString() + "_" + productDetail?.id + "_product",
                    sizeId: po.sizeId, // Size from PO level
                    productId: poItem.productId,
                    boxes: poItem.boxes,
                    ratePerSqmt: rate,
                    grossWtKgs: netWt, // Default gross to net
                };
            })
          }] : getDefaultFormValues().containers;
          form.setValue("containers", newContainers);

        } else {
          setDisplayClient(null);
          setDisplayBank(null);
        }
      } else {
        setLinkedPI(null);
        setDisplayClient(null);
        setDisplayBank(null);
      }
    } else {
      // Clear derived fields if PO is deselected
      setLinkedPI(null);
      setDisplayExporter(null);
      setDisplayClient(null);
      setDisplayManufacturer(null);
      setDisplayBank(null);
      form.reset(getDefaultFormValues()); // Reset to default if no PO selected
    }
  };
  
  const handleProductSelectionForContainer = (containerIndex: number, productIndex: number, newProductId: string) => {
    const sizeId = form.getValues(`containers.${containerIndex}.products.${productIndex}.sizeId`);
    const sizeDetail = allSizes.find(s => s.id === sizeId);
    const rate = sizeDetail?.salesPrice || 0;
    const netWt = (sizeDetail?.boxWeight || 0) * form.getValues(`containers.${containerIndex}.products.${productIndex}.boxes`);
    
    form.setValue(`containers.${containerIndex}.products.${productIndex}.ratePerSqmt`, rate);
    form.setValue(`containers.${containerIndex}.products.${productIndex}.grossWtKgs`, netWt); 
  };


  function onSubmit(values: ExportDocumentFormValues) {
    const finalDoc: ExportDocument = {
      ...values,
      id: isEditing && initialData ? initialData.id : Date.now().toString(),
      purchaseOrderId: selectedPO?.id,
      performaInvoiceId: linkedPI?.id,
      exporterId: displayExporter?.id,
      clientId: displayClient?.id,
      manufacturerId: displayManufacturer?.id,
      finalDestination: linkedPI?.finalDestination,
      currencyType: linkedPI?.currencyType,
      selectedBankId: displayBank?.id,
      notifyPartyLine1: linkedPI?.notifyPartyLine1,
      notifyPartyLine2: linkedPI?.notifyPartyLine2,
      countryOfFinalDestination: displayClient?.country,
      containers: values.containers.map(container => ({
        ...container,
        products: container.products.map(product => {
          const size = allSizes.find(s => s.id === product.sizeId);
          const quantitySqmt = size ? product.boxes * size.sqmPerBox : 0;
          const amount = quantitySqmt * product.ratePerSqmt;
          const netWtKgs = size ? product.boxes * size.boxWeight : 0;
          return {
            ...product,
            quantitySqmt,
            amount,
            netWtKgs,
            grossWtKgs: product.grossWtKgs ?? netWtKgs, // Ensure grossWtKgs has a value
          };
        }),
      })),
    };
    
    // Calculate overall totals before saving
    let totalInvoiceValue = 0;
    let overallTotalGrossWeight = 0;
    let overallTotalBoxes = 0;
    let overallTotalNetWeight = 0;
    let overallTareWeight = 0;

    finalDoc.containers.forEach(container => {
      let containerNetWt = 0;
      let containerGrossWt = 0;
      let containerBoxes = 0;
      container.products.forEach(p => {
        totalInvoiceValue += p.amount || 0;
        containerNetWt += p.netWtKgs || 0;
        containerGrossWt += p.grossWtKgs || 0; 
        containerBoxes += p.boxes || 0;
      });
      container.totalNetWeightContainer = containerNetWt;
      container.totalGrossWeightContainer = containerGrossWt;
      container.totalBoxesContainer = containerBoxes;

      overallTotalNetWeight += containerNetWt;
      overallTotalGrossWeight += containerGrossWt; // Sum of product gross weights
      overallTotalBoxes += containerBoxes;
      overallTareWeight += container.tareWeight || 0;
    });

    finalDoc.totalInvoiceValue = totalInvoiceValue;
    finalDoc.overallTotalNetWeight = overallTotalNetWeight;
    finalDoc.overallTotalGrossWeight = overallTotalGrossWeight; // This is sum of product gross weights
    finalDoc.overallTotalBoxes = overallTotalBoxes;
    finalDoc.overallTareWeight = overallTareWeight;
    finalDoc.overallFinalGrossWeight = overallTotalGrossWeight + overallTareWeight; // Final shipment weight

    onSave(finalDoc);
    toast({
      title: isEditing ? "Export Document Updated" : "Export Document Saved",
      description: `Document ${finalDoc.exportInvoiceNumber} has been successfully ${isEditing ? 'updated' : 'saved'}.`,
    });
     if (!isEditing) {
       form.reset(getDefaultFormValues());
       setSelectedPO(null); // Clear selected PO as well
     }
  }

  return (
    <Card className="w-full max-w-5xl mx-auto shadow-xl mb-8">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <FileSignature className="h-6 w-6 text-primary" />
          {isEditing ? "Edit Export Document" : "Create Export Document"}
        </CardTitle>
        <CardDescription>
          {isEditing ? "Modify the details of the export document." : "Select a Purchase Order to pre-fill or enter details manually."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* --- Part 1: Main Document Details --- */}
            <Card>
              <CardHeader><CardTitle className="text-xl">Document & Party Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="purchaseOrderId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" />Select Purchase Order (Optional)</FormLabel>
                      <Combobox
                        options={poOptions}
                        value={field.value}
                        onChange={handlePOChange}
                        placeholder="Select PO to pre-fill..."
                        searchPlaceholder="Search POs..."
                        emptySearchMessage="No PO found."
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="exportInvoiceNumber"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center gap-2">Export Invoice Number *</FormLabel>
                        <FormControl><Input placeholder="e.g. EXP/001/24-25" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="exportInvoiceDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel className="flex items-center gap-2">Export Invoice Date *</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>

                {/* Display derived Exporter, Client, Manufacturer */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div><FormLabel>Exporter:</FormLabel> <p className="text-muted-foreground">{displayExporter?.companyName || "N/A"}</p></div>
                    <div><FormLabel>Client:</FormLabel> <p className="text-muted-foreground">{displayClient?.companyName || "N/A"}</p></div>
                    <div><FormLabel>Manufacturer GST:</FormLabel> <p className="text-muted-foreground">{displayManufacturer?.gstNumber || "N/A"}</p></div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><FormLabel>Ref. PI No:</FormLabel> <p className="text-muted-foreground">{linkedPI?.invoiceNumber || "N/A"}</p></div>
                    <div><FormLabel>Currency:</FormLabel> <p className="text-muted-foreground">{linkedPI?.currencyType || "N/A"}</p></div>
                 </div>


                <FormField control={form.control} name="vesselFlightNo" render={({ field }) => (<FormItem><FormLabel>Vessel/Flight No.</FormLabel><FormControl><Input placeholder="e.g., MAERSK HOUSTON / EK511" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="portOfLoading" render={({ field }) => (<FormItem><FormLabel>Port of Loading *</FormLabel><FormControl><Input placeholder="e.g., MUNDRA PORT, INDIA" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="portOfDischarge" render={({ field }) => (<FormItem><FormLabel>Port of Discharge *</FormLabel><FormControl><Input placeholder="e.g., JEBEL ALI, UAE" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="countryOfOrigin" render={({ field }) => (<FormItem><FormLabel>Country of Origin *</FormLabel><FormControl><Input placeholder="e.g., INDIA" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <div><FormLabel>Country of Final Destination:</FormLabel> <p className="text-muted-foreground">{displayClient?.country || (linkedPI?.finalDestination ? linkedPI.finalDestination.split(',').pop()?.trim() : "N/A")}</p></div>
                 </div>
                <FormField control={form.control} name="shippingMarks" render={({ field }) => (<FormItem><FormLabel>Shipping Marks & Numbers</FormLabel><FormControl><Textarea rows={3} placeholder="Enter shipping marks..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                
                {displayBank && (
                    <div><FormLabel>Beneficiary Bank:</FormLabel> <p className="text-muted-foreground text-xs">{`${displayBank.bankName}, A/C: ${displayBank.accountNumber}, SWIFT: ${displayBank.swiftCode}`}</p></div>
                )}
                 {(linkedPI?.notifyPartyLine1 || linkedPI?.notifyPartyLine2) && (
                    <div>
                        <FormLabel>Notify Party:</FormLabel>
                        {linkedPI.notifyPartyLine1 && <p className="text-muted-foreground text-xs">{linkedPI.notifyPartyLine1}</p>}
                        {linkedPI.notifyPartyLine2 && <p className="text-muted-foreground text-xs">{linkedPI.notifyPartyLine2}</p>}
                    </div>
                 )}
              </CardContent>
            </Card>

            {/* --- Part 2: Containers --- */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl">Container Details</CardTitle>
                <Button type="button" size="sm" onClick={() => appendContainer(getDefaultFormValues().containers[0])}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Container
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {containerFields.map((containerItem, containerIndex) => (
                  <Card key={containerItem.id} className="bg-muted/30 p-4">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-md">Container #{containerIndex + 1}</h4>
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeContainer(containerIndex)} disabled={containerFields.length <= 1} className="h-7 w-7">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <FormField control={form.control} name={`containers.${containerIndex}.bookingNo`} render={({ field }) => (<FormItem><FormLabel>Booking No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`containers.${containerIndex}.containerNo`} render={({ field }) => (<FormItem><FormLabel>Container No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`containers.${containerIndex}.lineSeal`} render={({ field }) => (<FormItem><FormLabel>Line Seal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`containers.${containerIndex}.rfidSeal`} render={({ field }) => (<FormItem><FormLabel>RFID Seal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`containers.${containerIndex}.tareWeight`} render={({ field }) => (<FormItem><FormLabel>Tare Weight (Kg)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`containers.${containerIndex}.startPalletNo`} render={({ field }) => (<FormItem><FormLabel>Start Pallet No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`containers.${containerIndex}.endPalletNo`} render={({ field }) => (<FormItem><FormLabel>End Pallet No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`containers.${containerIndex}.weighingDateTime`} render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Weighing Date & Time</FormLabel>
                            <Popover><PopoverTrigger asChild><FormControl>
                                <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(new Date(field.value), "PPP p") : <span>Pick date & time</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button></FormControl></PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} initialFocus />
                                    {/* Add time picker component here if needed, or use separate fields */}
                                </PopoverContent>
                            </Popover><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name={`containers.${containerIndex}.weighingSlipNo`} render={({ field }) => (<FormItem><FormLabel>Weighing Slip No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`containers.${containerIndex}.truckNumber`} render={({ field }) => (<FormItem><FormLabel>Truck No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`containers.${containerIndex}.biltiNo`} render={({ field }) => (<FormItem><FormLabel>Bilti No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`containers.${containerIndex}.description`} render={({ field }) => (<FormItem className="md:col-span-2 lg:col-span-3"><FormLabel>Description (Goods in Container)</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    
                    {/* Products within this container */}
                    <Controller
                        control={form.control}
                        name={`containers.${containerIndex}.products`}
                        render={({ field }) => {
                            const { fields: productFields, append: appendProduct, remove: removeProduct } = useFieldArray({
                                control: form.control,
                                name: `containers.${containerIndex}.products`
                            });

                            return (
                                <div className="mt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="font-semibold text-sm">Products in Container #{containerIndex + 1}</h5>
                                        <Button type="button" size="sm" variant="outline" onClick={() => appendProduct(getDefaultFormValues().containers[0].products[0])}>
                                        <PackagePlus className="mr-2 h-4 w-4" /> Add Product
                                        </Button>
                                    </div>
                                    {productFields.map((productItem, productIndex) => {
                                        const currentSizeId = form.watch(`containers.${containerIndex}.products.${productIndex}.sizeId`);
                                        const productOptions = getProductOptionsForSize(currentSizeId);
                                        const sizeDetail = allSizes.find(s => s.id === currentSizeId);
                                        const boxes = form.watch(`containers.${containerIndex}.products.${productIndex}.boxes`);
                                        const rate = form.watch(`containers.${containerIndex}.products.${productIndex}.ratePerSqmt`);
                                        const quantitySqmt = sizeDetail && boxes ? (boxes * sizeDetail.sqmPerBox).toFixed(2) : '0.00';
                                        const amount = quantitySqmt && rate ? (parseFloat(quantitySqmt) * rate).toFixed(2) : '0.00';
                                        const netWtKgs = sizeDetail && boxes ? (boxes * sizeDetail.boxWeight).toFixed(2) : '0.00';


                                       return (
                                        <Card key={productItem.id} className="p-3 mb-3 bg-background/70">
                                            <div className="flex justify-end mb-1">
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeProduct(productIndex)} disabled={productFields.length <=1} className="h-6 w-6 text-destructive hover:text-destructive/80">
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <FormField control={form.control} name={`containers.${containerIndex}.products.${productIndex}.sizeId`} render={({ field: f }) => (
                                                    <FormItem><FormLabel>Size *</FormLabel>
                                                    <Combobox options={sizeOptions} value={f.value} onChange={(val) => {f.onChange(val); handleProductSelectionForContainer(containerIndex, productIndex, val);}} placeholder="Select Size..." disabled={sizeOptions.length === 0}/>
                                                    <FormMessage /></FormItem>)} />
                                                <FormField control={form.control} name={`containers.${containerIndex}.products.${productIndex}.productId`} render={({ field: f }) => (
                                                    <FormItem><FormLabel>Product *</FormLabel>
                                                    <Combobox options={productOptions} value={f.value} onChange={(val) => {f.onChange(val); handleProductSelectionForContainer(containerIndex, productIndex, val);}} placeholder="Select Product..." disabled={!currentSizeId || productOptions.length === 0}/>
                                                    <FormMessage /></FormItem>)} />
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                                                <FormField control={form.control} name={`containers.${containerIndex}.products.${productIndex}.boxes`} render={({ field:f }) => (<FormItem><FormLabel>Boxes *</FormLabel><FormControl><Input type="number" {...f} /></FormControl><FormMessage /></FormItem>)} />
                                                <div><FormLabel>Sq.Mtr</FormLabel><Input value={quantitySqmt} readOnly className="bg-muted/50" /></div>
                                                <FormField control={form.control} name={`containers.${containerIndex}.products.${productIndex}.ratePerSqmt`} render={({ field:f }) => (<FormItem><FormLabel>Rate/Sq.Mt *</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem>)} />
                                                <div><FormLabel>Amount</FormLabel><Input value={amount} readOnly className="bg-muted/50" /></div>
                                                <div><FormLabel>Net Wt.(Kgs)</FormLabel><Input value={netWtKgs} readOnly className="bg-muted/50" /></div>
                                                <FormField control={form.control} name={`containers.${containerIndex}.products.${productIndex}.grossWtKgs`} render={({ field:f }) => (<FormItem><FormLabel>Gross Wt.(Kgs)</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                        </Card>
                                       )
                                    })}
                                </div>
                            );
                        }}
                    />
                  </Card>
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-end mt-8">
              <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground font-headline text-lg py-3 px-8">
                <Save className="mr-2 h-5 w-5" />
                {isEditing ? "Update Export Document" : "Save Export Document"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// Helper to pre-fill form fields with default values from selected PO and linked PI
function populateFormFromPO(
    po: PurchaseOrder, 
    pi: PerformaInvoice | null,
    form: ReturnType<typeof useForm<ExportDocumentFormValues>>,
    allExporters: Company[],
    allClients: Client[],
    allManufacturers: Manufacturer[],
    allSizes: Size[],
    allProducts: Product[],
    allBanks: Bank[]
    // setDisplayExporter, setDisplayClient, setDisplayManufacturer, setDisplayBank
) {
    // This function can be expanded to deeply pre-fill the form
    // For now, primary pre-filling is handled in handlePOChange effect
}
