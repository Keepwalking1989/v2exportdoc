
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Pallet } from "@/types/pallet";
import { Building2, BadgePercent, User, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

const formSchema = z.object({
  companyName: z.string().min(2, {
    message: "Company name must be at least 2 characters.",
  }),
  gstNumber: z.string().length(15, { message: "GST Number must be 15 characters." }),
  contactPerson: z.string().min(2, {
    message: "Contact person must be at least 2 characters.",
  }),
  contactNumber: z.string().regex(phoneRegex, "Invalid phone number"),
});

type PalletFormValues = z.infer<typeof formSchema>;

interface PalletFormProps {
  onSave: (pallet: Pallet) => void;
}

export function PalletForm({ onSave }: PalletFormProps) {
  const { toast } = useToast();
  const form = useForm<PalletFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      gstNumber: "",
      contactPerson: "",
      contactNumber: "",
    },
  });

  function onSubmit(values: PalletFormValues) {
    const newPallet: Pallet = {
      id: Date.now().toString(),
      ...values,
    };
    onSave(newPallet);
    toast({
      title: "Pallet Company Saved",
      description: `${values.companyName} has been successfully saved.`,
    });
    form.reset();
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          Add New Pallet Company
        </CardTitle>
        <CardDescription>Fill in the details below to add a new pallet company.</CardDescription>
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
                    <Input placeholder="e.g. Global Pallets Co." {...field} />
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
            <FormField
              control={form.control}
              name="contactPerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />Contact Person</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Alex Woods" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />Contact Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. +91 9876543210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-headline">
              Save Pallet Company
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
