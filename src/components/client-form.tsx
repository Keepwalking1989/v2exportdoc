
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Client } from "@/types/client";
import { Building2, User, Phone, MapPin, Globe, LocateFixed, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

const formSchema = z.object({
  companyName: z.string().min(2, {
    message: "Company name must be at least 2 characters.",
  }),
  person: z.string().min(2, {
    message: "Person's name must be at least 2 characters.",
  }),
  contactNumber: z.string().regex(phoneRegex, "Invalid phone number"),
  address: z.string().min(5, {
    message: "Address must be at least 5 characters.",
  }),
  city: z.string().min(2, {
    message: "City must be at least 2 characters.",
  }),
  country: z.string().min(2, {
    message: "Country must be at least 2 characters.",
  }),
  pinCode: z.string().min(3, { // Flexible PIN code length
    message: "PIN code must be at least 3 characters.",
  }),
});

type ClientFormValues = z.infer<typeof formSchema>;

interface ClientFormProps {
  onSave: (client: Client) => void;
}

export function ClientForm({ onSave }: ClientFormProps) {
  const { toast } = useToast();
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      person: "",
      contactNumber: "",
      address: "",
      city: "",
      country: "",
      pinCode: "",
    },
  });

  function onSubmit(values: ClientFormValues) {
    const newClient: Client = {
      id: Date.now().toString(),
      ...values,
    };
    onSave(newClient);
    toast({
      title: "Client Saved",
      description: `${values.companyName} has been successfully saved.`,
    });
    form.reset();
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" />
          Add New Client
        </CardTitle>
        <CardDescription>Fill in the details below to add a new client.</CardDescription>
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
                    <Input placeholder="e.g. Client Solutions Ltd." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="person"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />Contact Person</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Sarah Miller" {...field} />
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
                    <Input placeholder="e.g. +44 20 7946 0958" {...field} />
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
                    <Textarea placeholder="e.g. 789 Business Park, Suite 100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />City</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. London" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" />Country</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. United Kingdom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="pinCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><LocateFixed className="h-4 w-4 text-muted-foreground" />PIN Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. W1A 0AX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-headline">
              Save Client
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
