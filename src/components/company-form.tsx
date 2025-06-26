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
import { Building2, User, MapPin, Phone, Barcode, BadgePercent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  iecNumber: z.string().min(5, { // IEC in India is 10 digits, but let's be flexible
    message: "IEC number must be at least 5 characters.",
  }),
  gstNumber: z.string().length(15, { message: "GST Number must be 15 characters." }),
});

type CompanyFormValues = z.infer<typeof formSchema>;

interface CompanyFormProps {
  onSave: (company: Company) => void;
}

export function CompanyForm({ onSave }: CompanyFormProps) {
  const { toast } = useToast();
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      contactPerson: "",
      address: "",
      phoneNumber: "",
      iecNumber: "",
      gstNumber: "",
    },
  });

  function onSubmit(values: CompanyFormValues) {
    const newCompany: Company = {
      id: Date.now().toString(),
      ...values,
    };
    onSave(newCompany);
    toast({
      title: "Company Saved",
      description: `${values.companyName} has been successfully saved.`,
    });
    form.reset();
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          Add New Company
        </CardTitle>
        <CardDescription>Fill in the details below to add a new company.</CardDescription>
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
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-headline">
              Save Company
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// Need to add Card components, assuming they are standard ShadCN
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
