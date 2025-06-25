
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { FileSignature, Briefcase, Factory, Save, XCircle, CalendarIcon, Hash, Globe, Ship, Anchor, FileText, Truck, BadgeCheck, ArrowLeftRight, Bell, CalendarClock, Percent, PlusCircle, Trash2, Stamp, Radio, Weight, ListStart, ListEnd, Boxes, NotebookText, FileScan, Clock } from "lucide-react";
import React, { useEffect, useMemo } from "react";
import type { Company } from "@/types/company"; // For Exporter
import type { Manufacturer } from "@/types/manufacturer"; // For Manufacturer
import type { Transporter } from "@/types/transporter";
import type { ExportDocument } from "@/types/export-document";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  exporterId: z.string().min(1, "Exporter is required"),
  manufacturerId: z.string().optional(),
  transporterId: z.string().optional(),
  exportInvoiceNumber: z.string().min(1, "Export Invoice Number is required."),
  exportInvoiceDate: z.date({ required_error: "Export Invoice Date is required." }),
  manufacturerInvoiceNumber: z.string().optional(),
  manufacturerInvoiceDate: z.date().optional(),
  permissionNumber: z.string().optional(),
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
  sourcePoId?: string | null;
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
};

const getDefaultFormValues = (): ExportDocumentFormValues => ({
  exporterId: "",
  manufacturerId: "",
  transporterId: "",
  exportInvoiceNumber: "",
  exportInvoiceDate: new Date(),
  manufacturerInvoiceNumber: "",
  manufacturerInvoiceDate: undefined,
  permissionNumber: "",
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

export function ExportDocumentForm({
  initialData,
  isEditing,
  onSave,
  onCancelEdit,
  allExporters,
  allManufacturers,
  allTransporters,
  sourcePoId,
}: ExportDocumentFormProps) {
  const { toast } = useToast();
  const form = useForm<ExportDocumentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultFormValues(),
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "containerItems",
  });

  const selectedManufacturerId = form.watch("manufacturerId");

  useEffect(() => {
    if (selectedManufacturerId) {
      const selectedManufacturer = allManufacturers.find(m => m.id === selectedManufacturerId);
      if (selectedManufacturer) {
        form.setValue("permissionNumber", selectedManufacturer.stuffingPermissionNumber || "");
      }
    } else {
        form.setValue("permissionNumber", "");
    }
  }, [selectedManufacturerId, allManufacturers, form]);


  useEffect(() => {
    if (isEditing && initialData) {
      form.reset({
        ...initialData,
        exporterId: initialData.exporterId || "",
        manufacturerId: initialData.manufacturerId || "",
        transporterId: initialData.transporterId || "",
        exportInvoiceNumber: initialData.exportInvoiceNumber || "",
        exportInvoiceDate: initialData.exportInvoiceDate ? new Date(initialData.exportInvoiceDate) : new Date(),
        manufacturerInvoiceNumber: initialData.manufacturerInvoiceNumber || "",
        manufacturerInvoiceDate: initialData.manufacturerInvoiceDate ? new Date(initialData.manufacturerInvoiceDate) : undefined,
        permissionNumber: initialData.permissionNumber || "",
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
            }))
          : [defaultNewContainerItem],
      });
    } else {
      form.reset(getDefaultFormValues());
    }
  }, [isEditing, initialData, form]);


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
      form.reset(getDefaultFormValues());
    }
  }

  const formTitle = isEditing ? "Edit Export Document" :
                    sourcePoId ? "New Export Document (from PO)" : "New Export Document";
  const formDescription = isEditing ? "Modify the details for this document." :
                          sourcePoId ? `This document will be linked to PO ID: ${sourcePoId.slice(-6)}.` :
                          "Fill in the details for the new document.";

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-xl mb-8">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <FileSignature className="h-6 w-6 text-primary" />
          {formTitle}
        </CardTitle>
        <CardDescription>{formDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="exportInvoiceNumber"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="flex items-center gap-2"><Hash className="h-4 w-4 text-muted-foreground" />Export Invoice No.</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g. EXP-2024-001" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="exportInvoiceDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel className="flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-muted-foreground" />Export Invoice Date</FormLabel>
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
                                format(field.value, "PPP")
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
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                            date > new Date() || date < new Date("2000-01-01")
                            }
                            initialFocus
                        />
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
                name="manufacturerInvoiceNumber"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="flex items-center gap-2"><Hash className="h-4 w-4 text-muted-foreground" />Manufacturer Invoice No.</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g. MAN-INV-001" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="manufacturerInvoiceDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel className="flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-muted-foreground" />Manufacturer Invoice Date</FormLabel>
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
                                format(field.value, "PPP")
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
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                            date > new Date() || date < new Date("2000-01-01")
                            }
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <FormField
              control={form.control}
              name="exporterId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    Exporter *
                  </FormLabel>
                  <Combobox
                    options={exporterOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select Exporter..."
                    searchPlaceholder="Search Exporters..."
                    emptySearchMessage="No exporter found. Add on Exporter page."
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
                  <FormLabel className="flex items-center gap-2">
                    <Factory className="h-4 w-4 text-muted-foreground" />
                    Manufacturer (Optional)
                  </FormLabel>
                  <Combobox
                    options={manufacturerOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select Manufacturer..."
                    searchPlaceholder="Search Manufacturers..."
                    emptySearchMessage="No manufacturer found. Add on Manufacturer page."
                    disabled={manufacturerOptions.length === 0}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
                control={form.control}
                name="permissionNumber"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-muted-foreground" />Permission No.</FormLabel>
                    <FormControl>
                        <Input placeholder="Auto-filled from Manufacturer" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
              control={form.control}
              name="transporterId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    Transporter (Optional)
                  </FormLabel>
                  <Combobox
                    options={transporterOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select Transporter..."
                    searchPlaceholder="Search Transporters..."
                    emptySearchMessage="No transporter found. Add on Transporter page."
                    disabled={transporterOptions.length === 0}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
                control={form.control}
                name="countryOfFinalDestination"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" />Country of Final Destination *</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g. United States" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="vesselFlightNo"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center gap-2"><Ship className="h-4 w-4 text-muted-foreground" />Vessel / Flight No.</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. MAERSK-123" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="finalDestination"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center gap-2"><Anchor className="h-4 w-4 text-muted-foreground" />Final Destination (Place)</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. New York, USA" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="portOfLoading"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center gap-2"><Anchor className="h-4 w-4 text-muted-foreground" />Port Of Loading</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. Mundra, India" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="portOfDischarge"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center gap-2"><Anchor className="h-4 w-4 text-muted-foreground" />Port Of Discharge</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. Newark, USA" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                    control={form.control}
                    name="conversationRate"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center gap-2"><ArrowLeftRight className="h-4 w-4 text-muted-foreground" />Conversation Rate</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g. 83.50" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="freight"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center gap-2"><Ship className="h-4 w-4 text-muted-foreground" />Freight</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g. 500" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="gst"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center gap-2"><Percent className="h-4 w-4 text-muted-foreground" />GST</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. 18%" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="exchangeNotification"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center gap-2"><Bell className="h-4 w-4 text-muted-foreground" />Exchange Notification</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. Notif-123" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="exchangeDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-muted-foreground" />Exchange Date</FormLabel>
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
                                    format(field.value, "PPP")
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
                                selected={field.value}
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

            <FormField
                control={form.control}
                name="termsOfDeliveryAndPayment"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />Terms Of Delivery &amp; Payments</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Terms..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />

            <Card>
              <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                      Container Items
                      <Button type="button" size="sm" onClick={() => append(defaultNewContainerItem)}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Container
                      </Button>
                  </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  {fields.map((field, index) => (
                      <div key={field.id} className="p-4 border rounded-md space-y-4 relative bg-card/50">
                          <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => remove(index)}
                              className="absolute top-2 right-2 h-7 w-7"
                              disabled={fields.length <= 1}
                          >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Remove Item</span>
                          </Button>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name={`containerItems.${index}.bookingNo`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Booking No.</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. BK123456" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name={`containerItems.${index}.containerNo`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Container No.</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. MSKU1234567" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                          </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name={`containerItems.${index}.lineSeal`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2"><Stamp className="h-4 w-4 text-muted-foreground" />LINE SEAL</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. LS123" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`containerItems.${index}.rfidSeal`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2"><Radio className="h-4 w-4 text-muted-foreground" />RFID SEAL</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. RFID456" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name={`containerItems.${index}.truckNumber`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2"><Truck className="h-4 w-4 text-muted-foreground" />Truck Number</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. GJ01AB1234" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name={`containerItems.${index}.builtyNo`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />Builty No</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. BN789" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                                <FormField
                                    control={form.control}
                                    name={`containerItems.${index}.tareWeight`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2"><Weight className="h-4 w-4 text-muted-foreground" />Tare weight (Kgs)</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="e.g. 4500" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`containerItems.${index}.startPalletNo`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2"><ListStart className="h-4 w-4 text-muted-foreground" />Start PALLET NO</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. 1" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`containerItems.${index}.endPalletNo`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2"><ListEnd className="h-4 w-4 text-muted-foreground" />End PALLET NO</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. 26" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`containerItems.${index}.totalPallets`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2"><Boxes className="h-4 w-4 text-muted-foreground" />Total Pallets</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. 26" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                           </div>
                            <FormField
                                control={form.control}
                                name={`containerItems.${index}.description`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2"><NotebookText className="h-4 w-4 text-muted-foreground" />Description for this Container</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="e.g. Contains fragile items, handle with care." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name={`containerItems.${index}.weighingSlipNo`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2"><FileScan className="h-4 w-4 text-muted-foreground" />Weighing Slip No</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. WSN-5678" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Controller
                                    control={form.control}
                                    name={`containerItems.${index}.weighingDateTime`}
                                    render={({ field }) => {
                                        const dateValue = field.value ? new Date(field.value) : new Date();
                                        const localISOString = new Date(dateValue.getTime() - (dateValue.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

                                        return (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />Weighing Date &amp; Time</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="datetime-local"
                                                        value={field.value ? localISOString : ''}
                                                        onChange={(e) => {
                                                            field.onChange(e.target.value ? new Date(e.target.value) : null);
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        );
                                    }}
                                />
                            </div>
                      </div>
                  ))}
              </CardContent>
            </Card>


            <div className="flex justify-between items-center mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={onCancelEdit}
                className="font-headline"
                disabled={!isEditing && !sourcePoId} // Disable if new and not from PO
              >
                <XCircle className="mr-2 h-5 w-5" /> Cancel
              </Button>
              <Button
                type="submit"
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-headline"
                disabled={exporterOptions.length === 0}
              >
                <Save className="mr-2 h-5 w-5" />
                {isEditing ? "Update Document" : "Save Document"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
