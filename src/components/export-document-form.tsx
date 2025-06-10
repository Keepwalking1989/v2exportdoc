
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
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, PlusCircle, Trash2, FileText, Package, Factory, Users, DollarSign, Ship, Anchor, MapPin, Edit3, Save, Layers, PackagePlus, Info, Briefcase, FileSignature, Truck, XCircle } from "lucide-react";
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
  // Calculated fields, not part of form validation but used in submission logic
  // quantitySqmt: z.number().optional(),
  // amount: z.number().optional(),
  // netWtKgs: z.number().optional(),
});

const exportDocumentContainerItemSchema = z.object({
  id: z.string().optional(),
  bookingNo: z.string().optional(),
  containerNo: z.string().optional(),
  lineSeal: z.string().optional(),
  rfidSeal: z.string().optional(),
  tareWeight: z.coerce.number().min(0, "Tare weight must be non-negative").optional().default(0),
  startPalletNo: z.string().optional(),
  endPalletNo: z.string().optional(),
  description: z.string().optional().default("VITRIFIED TILES AS PER INVOICE"),
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
  countryOfOrigin: z.string().min(1, "Country of Origin is required").default("INDIA"),
  shippingMarks: z.string().optional().default("AS PER INVOICE"),
  countryOfFinalDestination: z.string().optional(), // Added this field
  
  containers: z.array(exportDocumentContainerItemSchema).min(1, "At least one container is required"),
});

export type ExportDocumentFormValues = z.infer<typeof formSchema>;

interface ExportDocumentFormProps {
  initialData?: ExportDocument | null;
  isEditing: boolean;
  onSave: (doc: ExportDocument) => void;
  onCancelEdit: () => void;
}

const getDefaultFormValues = (): ExportDocumentFormValues => ({
  purchaseOrderId: "",
  exportInvoiceNumber: "",
  exportInvoiceDate: new Date(),
  vesselFlightNo: "",
  portOfLoading: "",
  portOfDischarge: "",
  countryOfOrigin: "INDIA",
  countryOfFinalDestination: "",
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
  onCancelEdit,
}: ExportDocumentFormProps) {
  const { toast } = useToast();
  const form = useForm<ExportDocumentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultFormValues(),
  });

  const { fields: containerFields, append: appendContainer, remove: removeContainer, replace: replaceContainers } = useFieldArray({
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
  const [displayManufacturerGst, setDisplayManufacturerGst] = useState<string>("");


  useEffect(() => {
    setAllPOs(JSON.parse(localStorage.getItem(LOCAL_STORAGE_PO_KEY) || "[]").map((po:any)=>({...po, poDate: new Date(po.poDate)})));
    setAllPIs(JSON.parse(localStorage.getItem(LOCAL_STORAGE_PI_KEY) || "[]").map((pi:any)=>({...pi, invoiceDate: new Date(pi.invoiceDate)})));
    setAllExporters(JSON.parse(localStorage.getItem(LOCAL_STORAGE_COMPANIES_KEY) || "[]"));
    setAllClients(JSON.parse(localStorage.getItem(LOCAL_STORAGE_CLIENTS_KEY) || "[]"));
    setAllManufacturers(JSON.parse(localStorage.getItem(LOCAL_STORAGE_MANUFACTURERS_KEY) || "[]").map((m:any)=>({...m, stuffingPermissionDate: m.stuffingPermissionDate ? new Date(m.stuffingPermissionDate) : undefined })));
    setAllSizes(JSON.parse(localStorage.getItem(LOCAL_STORAGE_SIZES_KEY) || "[]"));
    setAllProducts(JSON.parse(localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY) || "[]"));
    setAllBanks(JSON.parse(localStorage.getItem(LOCAL_STORAGE_BANKS_KEY) || "[]"));
  }, []);

  useEffect(() => {
    if (isEditing && initialData) {
        const formData = {
            ...initialData,
            exportInvoiceDate: new Date(initialData.exportInvoiceDate),
            containers: initialData.containers.map(container => ({
                ...container,
                weighingDateTime: container.weighingDateTime ? new Date(container.weighingDateTime) : undefined,
                products: container.products.map(prod => ({
                    id: prod.id,
                    sizeId: prod.sizeId,
                    productId: prod.productId,
                    boxes: prod.boxes,
                    ratePerSqmt: prod.ratePerSqmt,
                    grossWtKgs: prod.grossWtKgs || prod.netWtKgs || 0,
                }))
            }))
        };
        form.reset(formData as ExportDocumentFormValues); // Cast if necessary
        if (formData.containers) {
          replaceContainers(formData.containers);
        } else {
          replaceContainers(getDefaultFormValues().containers);
        }
        
        // Re-populate derived display fields if editing
        if (initialData.purchaseOrderId) {
            handlePOChange(initialData.purchaseOrderId, true); // Pass true to indicate it's an edit load
        }

    } else if (!isEditing) {
      form.reset(getDefaultFormValues());
      replaceContainers(getDefaultFormValues().containers);
      setSelectedPO(null); // Clear PO specific data if not editing
      setLinkedPI(null);
      setDisplayExporter(null);
      setDisplayClient(null);
      setDisplayManufacturer(null);
      setDisplayBank(null);
      setDisplayManufacturerGst("");
    }
  }, [isEditing, initialData, form, replaceContainers]);


  const poOptions: ComboboxOption[] = useMemo(() =>
    allPOs.map(po => ({ value: po.id, label: `${po.poNumber} - ${format(new Date(po.poDate), 'dd/MM/yy')}` })),
    [allPOs]
  );
  
  const sizeOptionsForContainerProduct = useCallback((poSizeIdContext?: string): ComboboxOption[] => {
    let relevantSizes: Size[] = [];
    if (poSizeIdContext) { // If PO context (and thus a specific size is on PO)
        const poSize = allSizes.find(s => s.id === poSizeIdContext);
        if (poSize) relevantSizes.push(poSize);
    }
    // Add all other global sizes if not already present and no PO context or no size on PO
    if (relevantSizes.length === 0 || !poSizeIdContext) {
        allSizes.forEach(s => {
            if (!relevantSizes.find(rs => rs.id === s.id)) {
                relevantSizes.push(s);
            }
        });
    }
    return relevantSizes.map(s => ({ value: s.id, label: `${s.size} (HSN: ${s.hsnCode})` }));
  }, [allSizes]);


  const getProductOptionsForSize = useCallback((sizeId: string, poContext?: PurchaseOrder): ComboboxOption[] => {
    if (!sizeId) return [];
    let relevantProducts: Product[] = [];

    if (poContext) { // If a PO is selected, filter products based on that PO's items for the given size
        poContext.items.forEach(poItem => {
            if (poContext.sizeId === sizeId) { // PO items are tied to the PO's single sizeId
                const product = allProducts.find(p => p.id === poItem.productId && p.sizeId === sizeId);
                if (product && !relevantProducts.find(rp => rp.id === product.id)) {
                    relevantProducts.push(product);
                }
            }
        });
    }
    // If no PO context or no products found via PO for this size, add all global products for this size
    if (relevantProducts.length === 0) {
        allProducts.forEach(p => {
            if (p.sizeId === sizeId && !relevantProducts.find(rp => rp.id === p.id)) {
                relevantProducts.push(p);
            }
        });
    }
    return relevantProducts.map(p => ({ value: p.id, label: p.designName }));
  }, [allProducts]);


  const handlePOChange = useCallback((poId: string, isEditLoad: boolean = false) => {
    const po = allPOs.find(p => p.id === poId);
    setSelectedPO(po || null);
    form.setValue("purchaseOrderId", poId);

    if (po) {
      const exporter = allExporters.find(e => e.id === po.exporterId);
      setDisplayExporter(exporter || null);
      
      const manufacturer = allManufacturers.find(m => m.id === po.manufacturerId);
      setDisplayManufacturer(manufacturer || null);
      setDisplayManufacturerGst(manufacturer?.gstNumber || "N/A");

      if (po.sourcePiId) {
        const pi = allPIs.find(p => p.id === po.sourcePiId);
        setLinkedPI(pi || null);
        if (pi) {
          const client = allClients.find(c => c.id === pi.clientId);
          setDisplayClient(client || null);
          form.setValue("portOfLoading", "MUNDRA PORT, INDIA"); // Default
          form.setValue("portOfDischarge", pi.finalDestination); 
          form.setValue("countryOfFinalDestination", client?.country || pi.finalDestination.split(',').pop()?.trim() || "");
          form.setValue("shippingMarks", `CONSIGNEE:\n${client?.companyName.toUpperCase() || ''}\n${client?.address.toUpperCase() || ''}\nFINAL DESTINATION: ${pi.finalDestination.toUpperCase()}`);

          if (pi.selectedBankId) {
            const bank = allBanks.find(b => b.id === pi.selectedBankId);
            setDisplayBank(bank || null);
          } else {
            setDisplayBank(null);
          }
          
          if (!isEditLoad) { // Only pre-fill containers if it's not an edit load (to preserve existing edited data)
            const newContainers: ExportDocumentFormValues['containers'] = po.items.length > 0 ? [{
              id: Date.now().toString() + "_container_from_po",
              bookingNo: "", containerNo: "", lineSeal: "", rfidSeal: "", tareWeight: 0,
              startPalletNo: "1", endPalletNo: po.numberOfContainers > 0 ? (Math.ceil(po.items.reduce((acc, item) => acc + item.boxes, 0) / (allSizes.find(s => s.id === po.sizeId)?.palletDetails?.match(/(\d+)\s*boxes/i)?.[1] ? parseInt(allSizes.find(s => s.id === po.sizeId)!.palletDetails!.match(/(\d+)\s*boxes/i)![1]) : 60) || 1)).toString() : "1", // Basic pallet estimation
              description: "VITRIFIED TILES AS PER INVOICE",
              weighingDateTime: new Date(), weighingSlipNo: "", truckNumber: "", biltiNo: "",
              products: po.items.map(poItem => {
                  const sizeDetail = allSizes.find(s => s.id === po.sizeId); // PO has one main sizeId
                  const rate = sizeDetail?.salesPrice || 0;
                  const netWt = (sizeDetail?.boxWeight || 0) * poItem.boxes;
                  return {
                      id: Date.now().toString() + "_" + poItem.productId + "_product",
                      sizeId: po.sizeId, 
                      productId: poItem.productId,
                      boxes: poItem.boxes,
                      ratePerSqmt: rate,
                      grossWtKgs: netWt, 
                  };
              })
            }] : getDefaultFormValues().containers;
            form.setValue("containers", newContainers);
            replaceContainers(newContainers); // Ensure useFieldArray is updated
          }
        } else {
          setDisplayClient(null); setDisplayBank(null);
          if (!isEditLoad) form.setValue("containers", getDefaultFormValues().containers); replaceContainers(getDefaultFormValues().containers);
        }
      } else {
        setLinkedPI(null); setDisplayClient(null); setDisplayBank(null);
        if (!isEditLoad) form.setValue("containers", getDefaultFormValues().containers); replaceContainers(getDefaultFormValues().containers);
      }
    } else {
      setSelectedPO(null); setLinkedPI(null); setDisplayExporter(null);
      setDisplayClient(null); setDisplayManufacturer(null); setDisplayBank(null); setDisplayManufacturerGst("");
      if (!isEditLoad) form.reset(getDefaultFormValues()); replaceContainers(getDefaultFormValues().containers);
    }
  }, [allPOs, allExporters, allManufacturers, allPIs, allClients, allBanks, allSizes, form, replaceContainers]);
  
  const handleProductSelectionForContainer = useCallback((containerIndex: number, productIndex: number, newProductId: string) => {
    const sizeId = form.getValues(`containers.${containerIndex}.products.${productIndex}.sizeId`);
    const sizeDetail = allSizes.find(s => s.id === sizeId);
    const rate = sizeDetail?.salesPrice || 0;
    const boxes = form.getValues(`containers.${containerIndex}.products.${productIndex}.boxes`);
    const netWt = sizeDetail ? (sizeDetail.boxWeight * boxes) : 0;
    
    form.setValue(`containers.${containerIndex}.products.${productIndex}.ratePerSqmt`, rate);
    form.setValue(`containers.${containerIndex}.products.${productIndex}.grossWtKgs`, netWt); 
  }, [form, allSizes]);


  function onSubmit(values: ExportDocumentFormValues) {
    const finalDoc: ExportDocument = {
      ...values,
      id: isEditing && initialData ? initialData.id : Date.now().toString(),
      purchaseOrderId: selectedPO?.id,
      performaInvoiceId: linkedPI?.id,
      exporterId: displayExporter?.id,
      clientId: displayClient?.id,
      manufacturerId: displayManufacturer?.id, // Storing for potential future use, GST is what's displayed from it.
      finalDestination: linkedPI?.finalDestination || values.portOfDischarge, // Use PI's if available, else use form's port of discharge
      currencyType: linkedPI?.currencyType || "USD", // Default if not from PI
      selectedBankId: displayBank?.id,
      notifyPartyLine1: linkedPI?.notifyPartyLine1,
      notifyPartyLine2: linkedPI?.notifyPartyLine2,
      countryOfFinalDestination: values.countryOfFinalDestination || displayClient?.country, // Ensure this gets saved
      containers: values.containers.map(container => ({
        ...container,
        weighingDateTime: container.weighingDateTime ? new Date(container.weighingDateTime) : undefined,
        products: container.products.map(product => {
          const size = allSizes.find(s => s.id === product.sizeId);
          const quantitySqmt = size ? product.boxes * size.sqmPerBox : 0;
          const amount = quantitySqmt * product.ratePerSqmt;
          const netWtKgs = size ? product.boxes * size.boxWeight : 0;
          return {
            ...product,
            id: product.id || Date.now().toString() + "_prod_" + Math.random(), // ensure ID
            quantitySqmt,
            amount,
            netWtKgs,
            grossWtKgs: product.grossWtKgs ?? netWtKgs,
          };
        }),
      })),
    };
    
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
      overallTotalGrossWeight += containerGrossWt;
      overallTotalBoxes += containerBoxes;
      overallTareWeight += container.tareWeight || 0;
    });

    finalDoc.totalInvoiceValue = totalInvoiceValue;
    finalDoc.overallTotalNetWeight = overallTotalNetWeight;
    finalDoc.overallTotalGrossWeight = overallTotalGrossWeight;
    finalDoc.overallTotalBoxes = overallTotalBoxes;
    finalDoc.overallTareWeight = overallTareWeight;
    finalDoc.overallFinalGrossWeight = overallTotalGrossWeight + overallTareWeight;

    onSave(finalDoc);
    toast({
      title: isEditing ? "Export Document Updated" : "Export Document Saved",
      description: `Document ${finalDoc.exportInvoiceNumber} has been successfully ${isEditing ? 'updated' : 'saved'}.`,
    });
     if (!isEditing) {
       form.reset(getDefaultFormValues());
       replaceContainers(getDefaultFormValues().containers);
       setSelectedPO(null); 
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
                        onChange={(val) => handlePOChange(val)}
                        placeholder="Select PO to pre-fill..."
                        searchPlaceholder="Search POs..."
                        emptySearchMessage="No PO found."
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="exportInvoiceNumber" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-2">Export Invoice Number *</FormLabel><FormControl><Input placeholder="e.g. EXP/001/24-25" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="exportInvoiceDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel className="flex items-center gap-2">Export Invoice Date *</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm p-2 border rounded-md bg-muted/20">
                    <div><FormLabel>Exporter:</FormLabel> <p className="text-muted-foreground text-xs">{displayExporter?.companyName || "N/A"}<br/>{displayExporter?.address || ""}<br/>IEC: {displayExporter?.iecNumber || "N/A"}</p></div>
                    <div><FormLabel>Client:</FormLabel> <p className="text-muted-foreground text-xs">{displayClient?.companyName || "N/A"}<br/>{displayClient?.address || ""}<br/>{displayClient?.country || ""}</p></div>
                    <div><FormLabel>Manufacturer:</FormLabel> <p className="text-muted-foreground text-xs">{displayManufacturer?.companyName || "N/A"}<br/>GST: {displayManufacturerGst || "N/A"}</p></div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div><FormLabel>Ref. PO No:</FormLabel> <p className="text-muted-foreground">{selectedPO?.poNumber || "N/A"}</p></div>
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
                    <FormField control={form.control} name="countryOfFinalDestination" render={({ field }) => (<FormItem><FormLabel>Country of Final Destination</FormLabel><FormControl><Input placeholder="e.g., UAE" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 </div>
                <FormField control={form.control} name="shippingMarks" render={({ field }) => (<FormItem><FormLabel>Shipping Marks & Numbers</FormLabel><FormControl><Textarea rows={3} placeholder="Enter shipping marks..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                
                {displayBank && (<div><FormLabel>Beneficiary Bank:</FormLabel> <p className="text-muted-foreground text-xs">{`${displayBank.bankName}, A/C: ${displayBank.accountNumber}, SWIFT: ${displayBank.swiftCode}`}</p></div>)}
                 {(linkedPI?.notifyPartyLine1 || linkedPI?.notifyPartyLine2) && (<div><FormLabel>Notify Party:</FormLabel>{linkedPI.notifyPartyLine1 && <p className="text-muted-foreground text-xs">{linkedPI.notifyPartyLine1}</p>}{linkedPI.notifyPartyLine2 && <p className="text-muted-foreground text-xs">{linkedPI.notifyPartyLine2}</p>}</div>)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl">Container Details</CardTitle>
                <Button type="button" size="sm" onClick={() => appendContainer(getDefaultFormValues().containers[0])}><PlusCircle className="mr-2 h-4 w-4" /> Add Container</Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {containerFields.map((containerItem, containerIndex) => {
                    // Access field array for products within this container
                    const { fields: productFields, append: appendProduct, remove: removeProduct } = useFieldArray({
                        control: form.control,
                        name: `containers.${containerIndex}.products`
                    });

                   return (
                  <Card key={containerItem.id} className="bg-muted/30 p-4">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-md">Container #{containerIndex + 1}</h4>
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeContainer(containerIndex)} disabled={containerFields.length <= 1} className="h-7 w-7"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <FormField control={form.control} name={`containers.${containerIndex}.bookingNo`} render={({ field }) => (<FormItem><FormLabel>Booking No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`containers.${containerIndex}.containerNo`} render={({ field }) => (<FormItem><FormLabel>Container No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`containers.${containerIndex}.lineSeal`} render={({ field }) => (<FormItem><FormLabel>Line Seal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`containers.${containerIndex}.rfidSeal`} render={({ field }) => (<FormItem><FormLabel>RFID Seal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`containers.${containerIndex}.tareWeight`} render={({ field }) => (<FormItem><FormLabel>Tare Wt.(Kg)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`containers.${containerIndex}.startPalletNo`} render={({ field }) => (<FormItem><FormLabel>Start Pallet No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`containers.${containerIndex}.endPalletNo`} render={({ field }) => (<FormItem><FormLabel>End Pallet No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`containers.${containerIndex}.weighingDateTime`} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Weighing Date & Time</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP p") : <span>Pick date & time</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`containers.${containerIndex}.weighingSlipNo`} render={({ field }) => (<FormItem><FormLabel>Weighing Slip No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`containers.${containerIndex}.truckNumber`} render={({ field }) => (<FormItem><FormLabel>Truck No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`containers.${containerIndex}.biltiNo`} render={({ field }) => (<FormItem><FormLabel>Bilti No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`containers.${containerIndex}.description`} render={({ field }) => (<FormItem className="md:col-span-2 lg:col-span-3"><FormLabel>Goods Description (Container)</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    
                    <div className="mt-4">
                        <div className="flex justify-between items-center mb-2">
                            <h5 className="font-semibold text-sm">Products in Container #{containerIndex + 1}</h5>
                            <Button type="button" size="sm" variant="outline" onClick={() => appendProduct(getDefaultFormValues().containers[0].products[0])}><PackagePlus className="mr-2 h-4 w-4" /> Add Product</Button>
                        </div>
                        {productFields.map((productItem, productIndex) => {
                            const currentSizeId = form.watch(`containers.${containerIndex}.products.${productIndex}.sizeId`);
                            const productOptions = getProductOptionsForSize(currentSizeId, selectedPO || undefined); // Pass PO context
                            const sizeContextForOptions = selectedPO?.sizeId || currentSizeId; // Prefer PO's size for initial product list context
                            const sizeDetailsForCalc = allSizes.find(s => s.id === currentSizeId);
                            const boxesForCalc = form.watch(`containers.${containerIndex}.products.${productIndex}.boxes`);
                            const rateForCalc = form.watch(`containers.${containerIndex}.products.${productIndex}.ratePerSqmt`);
                            const quantitySqmtDisplay = sizeDetailsForCalc && boxesForCalc ? (boxesForCalc * sizeDetailsForCalc.sqmPerBox).toFixed(2) : '0.00';
                            const amountDisplay = quantitySqmtDisplay && rateForCalc ? (parseFloat(quantitySqmtDisplay) * rateForCalc).toFixed(2) : '0.00';
                            const netWtKgsDisplay = sizeDetailsForCalc && boxesForCalc ? (boxesForCalc * sizeDetailsForCalc.boxWeight).toFixed(2) : '0.00';

                           return (
                            <Card key={productItem.id} className="p-3 mb-3 bg-background/70">
                                <div className="flex justify-end mb-1">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeProduct(productIndex)} disabled={productFields.length <=1} className="h-6 w-6 text-destructive hover:text-destructive/80"><Trash2 className="h-3 w-3" /></Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <FormField control={form.control} name={`containers.${containerIndex}.products.${productIndex}.sizeId`} render={({ field: f }) => (
                                        <FormItem><FormLabel>Size *</FormLabel>
                                        <Combobox options={sizeOptionsForContainerProduct(selectedPO?.sizeId)} value={f.value} onChange={(val) => {f.onChange(val); handleProductSelectionForContainer(containerIndex, productIndex, val);}} placeholder="Select Size..." disabled={sizeOptionsForContainerProduct(selectedPO?.sizeId).length === 0}/>
                                        <FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name={`containers.${containerIndex}.products.${productIndex}.productId`} render={({ field: f }) => (
                                        <FormItem><FormLabel>Product *</FormLabel>
                                        <Combobox options={productOptions} value={f.value} onChange={(val) => {f.onChange(val); handleProductSelectionForContainer(containerIndex, productIndex, val);}} placeholder="Select Product..." disabled={!currentSizeId || productOptions.length === 0}/>
                                        <FormMessage /></FormItem>)} />
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                                    <FormField control={form.control} name={`containers.${containerIndex}.products.${productIndex}.boxes`} render={({ field:f }) => (<FormItem><FormLabel>Boxes *</FormLabel><FormControl><Input type="number" {...f} /></FormControl><FormMessage /></FormItem>)} />
                                    <div><FormLabel>Sq.Mtr</FormLabel><Input value={quantitySqmtDisplay} readOnly className="bg-muted/50" /></div>
                                    <FormField control={form.control} name={`containers.${containerIndex}.products.${productIndex}.ratePerSqmt`} render={({ field:f }) => (<FormItem><FormLabel>Rate/Sq.Mt *</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem>)} />
                                    <div><FormLabel>Amount</FormLabel><Input value={amountDisplay} readOnly className="bg-muted/50" /></div>
                                    <div><FormLabel>Net Wt.(Kgs)</FormLabel><Input value={netWtKgsDisplay} readOnly className="bg-muted/50" /></div>
                                    <FormField control={form.control} name={`containers.${containerIndex}.products.${productIndex}.grossWtKgs`} render={({ field:f }) => (<FormItem><FormLabel>Gross Wt.(Kgs)</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                            </Card>
                           )
                        })}
                    </div>
                  </Card>
                )})}
              </CardContent>
            </Card>

            <div className="flex justify-between items-center mt-8">
                <Button type="button" variant="outline" onClick={onCancelEdit} className="font-headline text-lg py-3 px-8" disabled={!isEditing}>
                    <XCircle className="mr-2 h-5 w-5" /> Cancel Edit
                </Button>
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

    