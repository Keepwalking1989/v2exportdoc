
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
import { FileSignature, Briefcase, Factory, Save, XCircle } from "lucide-react"; // Added Factory icon
import React, { useEffect, useMemo } from "react";
import type { Company } from "@/types/company"; // For Exporter
import type { Manufacturer } from "@/types/manufacturer"; // For Manufacturer
import type { ExportDocument } from "@/types/export-document";

const formSchema = z.object({
  exporterId: z.string().min(1, "Exporter is required"),
  manufacturerId: z.string().optional(), // Manufacturer is optional for now
});

export type ExportDocumentFormValues = z.infer<typeof formSchema>;

interface ExportDocumentFormProps {
  initialData?: Pick<ExportDocument, 'exporterId' | 'purchaseOrderId' | 'manufacturerId'> | null;
  isEditing: boolean;
  onSave: (data: ExportDocumentFormValues) => void;
  onCancelEdit: () => void;
  allExporters: Company[];
  allManufacturers: Manufacturer[]; // Added prop for manufacturers
  sourcePoId?: string | null;
}

const getDefaultFormValues = (): ExportDocumentFormValues => ({
  exporterId: "",
  manufacturerId: "",
});

export function ExportDocumentForm({
  initialData,
  isEditing,
  onSave,
  onCancelEdit,
  allExporters,
  allManufacturers, // Destructure allManufacturers
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
      });
    } else if (!isEditing) {
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
                          sourcePoId ? `Select exporter and manufacturer. This document will be linked to PO ID: ${sourcePoId.slice(-6)}.` :
                          "Select exporter and manufacturer for the new document.";

  return (
    <Card className="w-full max-w-xl mx-auto shadow-xl mb-8">
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
