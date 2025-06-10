
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
import { FileSignature, Briefcase, Save, XCircle } from "lucide-react";
import React, { useEffect, useMemo } from "react";
import type { Company } from "@/types/company"; // For Exporter
import type { ExportDocument } from "@/types/export-document";

const formSchema = z.object({
  exporterId: z.string().min(1, "Exporter is required"),
});

export type ExportDocumentFormValues = z.infer<typeof formSchema>;

interface ExportDocumentFormProps {
  // initialData will contain exporterId and purchaseOrderId if editing or creating from PO
  initialData?: Pick<ExportDocument, 'exporterId' | 'purchaseOrderId'> | null;
  isEditing: boolean;
  onSave: (data: { exporterId: string }) => void; // Page will add purchaseOrderId
  onCancelEdit: () => void;
  allExporters: Company[];
  // sourcePoId is not directly used by the form fields but indicates context if creating from PO
  sourcePoId?: string | null; 
}

const getDefaultFormValues = (): ExportDocumentFormValues => ({
  exporterId: "",
});

export function ExportDocumentForm({
  initialData,
  isEditing,
  onSave,
  onCancelEdit,
  allExporters,
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
      });
    } else if (!isEditing) {
      // If creating new (even from PO), we might want to auto-select an exporter if only one exists,
      // or if the PO has an exporter that matches one in allExporters.
      // For now, just reset to default. Pre-selection based on PO can be added later.
      form.reset(getDefaultFormValues());
    }
  }, [isEditing, initialData, form, sourcePoId, allExporters]);


  const exporterOptions: ComboboxOption[] = useMemo(() =>
    allExporters.map(e => ({ value: e.id, label: e.companyName })),
    [allExporters]
  );

  function onSubmit(values: ExportDocumentFormValues) {
    onSave(values); // The page component will handle adding the purchaseOrderId
    toast({
      title: isEditing ? "Document Updated" : "Document Field Saved",
      description: `Exporter has been ${isEditing ? 'updated' : 'saved'}.`,
    });
    if (!isEditing) {
      form.reset(getDefaultFormValues());
    }
  }

  const formTitle = isEditing ? "Edit Export Document" : 
                    sourcePoId ? "New Export Document (from PO)" : "New Export Document";
  const formDescription = isEditing ? "Modify the exporter for this document." :
                          sourcePoId ? `Select an exporter. This document will be linked to Purchase Order ID: ${sourcePoId}.` :
                          "Select an exporter for the new document.";

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
                    emptySearchMessage="No exporter found. Please add exporters on the main page."
                    disabled={exporterOptions.length === 0}
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
                disabled={!isEditing}
              >
                <XCircle className="mr-2 h-5 w-5" /> Cancel Edit
              </Button>
              <Button 
                type="submit" 
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-headline"
                disabled={exporterOptions.length === 0}
              >
                <Save className="mr-2 h-5 w-5" />
                {isEditing ? "Update Exporter" : "Save Exporter"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
