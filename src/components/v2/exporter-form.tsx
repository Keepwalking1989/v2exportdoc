
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Company } from "@/types/company";
import { Building2, User, MapPin, Phone, Barcode, BadgePercent, Save, XCircle } from "lucide-react";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

const formSchema = z.object({
  companyName: z.string().min(2, {
    message: "Company name must be at least 2 characters.",
  }),
  contactPerson: z.string().min(2, {
    message: "Contact person must be at least 2 characters.",
  }),
  address: z.string().min(5, {
    message: "Address must be at least 5 characters.",
  }),
  phoneNumber: z.string().regex(phoneRegex, "Invalid phone number"),
  iecNumber: z.string().min(5, {
    message: "IEC number must be at least 5 characters.",
  }),
  gstNumber: z.string().length(15, { message: "GST Number must be 15 characters." }),
});

export type ExporterFormValues = z.infer<typeof formSchema>;

const defaultValues = {
  companyName: "",
  contactPerson: "",
  address: "",
  phoneNumber: "",
  iecNumber: "",
  gstNumber: "",
};

interface ExporterFormProps {
  onSave: (company: ExporterFormValues) => void;
  initialData?: Company | null;
  isEditing: boolean;
  onCancelEdit: () => void;
}

export function ExporterFormV2({ onSave, initialData, isEditing, onCancelEdit }: ExporterFormProps) {
  const form = useForm<ExporterFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditing && initialData) {
      form.reset(initialData);
    } else {
      form.reset(defaultValues);
    }
  }, [isEditing, initialData, form]);

  function onSubmit(values: ExporterFormValues) {
    onSave(values);
    if (!isEditing) {
      form.reset();
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          {isEditing ? "Edit Exporter (DB)" : "Add New Exporter (DB)"}
        </CardTitle>
        <CardDescription>
          {isEditing ? "Modify the details of your company." : "Fill in your company's details to be used on export documents."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Acme Corp" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactPerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />Contact Person</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g. 123 Main St, Anytown, USA" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. +1 555-123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="iecNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Barcode className="h-4 w-4 text-muted-foreground" />IEC Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 0123456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="gstNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><BadgePercent className="h-4 w-4 text-muted-foreground" />GST Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 22AAAAA0000A1Z5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-4">
              {isEditing && (
                <Button type="button" variant="ghost" onClick={onCancelEdit}>
                  <XCircle className="mr-2 h-4 w-4" /> Cancel
                </Button>
              )}
              <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground font-headline">
                <Save className="mr-2 h-4 w-4" /> {isEditing ? "Save Changes" : "Save Company"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
