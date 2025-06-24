
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { FileSignature, Briefcase, Factory, Save, XCircle, CalendarIcon, Hash, Globe, Ship, Anchor, FileText } from "lucide-react";
import React, { useEffect, useMemo } from "react";
import type { Company } from "@/types/company"; // For Exporter
import type { Manufacturer } from "@/types/manufacturer"; // For Manufacturer
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
  exportInvoiceNumber: z.string().min(1, "Export Invoice Number is required."),
  exportInvoiceDate: z.date({ required_error: "Export Invoice Date is required." }),
  countryOfFinalDestination: z.string().min(1, "Country of Final Destination is required."),
  vesselFlightNo: z.string().optional(),
  portOfLoading: z.string().optional(),
  portOfDischarge: z.string().optional(),
  finalDestination: z.string().optional(),
  termsOfDeliveryAndPayment: z.string().optional(),
});

export type ExportDocumentFormValues = z.infer<typeof formSchema>;

interface ExportDocumentFormProps {
  initialData?: ExportDocument | null;
  isEditing: boolean;
  onSave: (data: ExportDocumentFormValues) => void;
  onCancelEdit: () => void;
  allExporters: Company[];
  allManufacturers: Manufacturer[];
  sourcePoId?: string | null;
}

const defaultTerms = "30 % advance Remaining Against BL";

const getDefaultFormValues = (): ExportDocumentFormValues => ({
  exporterId: "",
  manufacturerId: "",
  exportInvoiceNumber: "",
  exportInvoiceDate: new Date(),
  countryOfFinalDestination: "",
  vesselFlightNo: "",
  portOfLoading: "",
  portOfDischarge: "",
  finalDestination: "",
  termsOfDeliveryAndPayment: defaultTerms,
});

export function ExportDocumentForm({
  initialData,
  isEditing,
  onSave,
  onCancelEdit,
  allExporters,
  allManufacturers,
  sourcePoId,
}: ExportDocumentFormProps) {
  const { toast } = useToast();
  const form = useForm<ExportDocumentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultFormValues(),
  });

  useEffect(() => {
    if (isEditing && initialData) {
      form.reset({
        exporterId: initialData.exporterId || "",
        manufacturerId: initialData.manufacturerId || "",
        exportInvoiceNumber: initialData.exportInvoiceNumber || "",
        exportInvoiceDate: initialData.exportInvoiceDate ? new Date(initialData.exportInvoiceDate) : new Date(),
        countryOfFinalDestination: initialData.countryOfFinalDestination || "",
        vesselFlightNo: initialData.vesselFlightNo || "",
        portOfLoading: initialData.portOfLoading || "",
        portOfDischarge: initialData.portOfDischarge || "",
        finalDestination: initialData.finalDestination || "",
        termsOfDeliveryAndPayment: initialData.termsOfDeliveryAndPayment || defaultTerms,
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
    <Card className="w-full max-w-2xl mx-auto shadow-xl mb-8">
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
            
            <FormField
                control={form.control}
                name="termsOfDeliveryAndPayment"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />Terms Of Delivery & Payments</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Terms..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />

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
                disabled={exporterOptions.length === 0 && manufacturerOptions.length === 0}
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
