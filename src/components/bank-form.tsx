
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
import type { Bank } from "@/types/bank";
import { Landmark, MapPin, ReceiptText, Globe, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  bankName: z.string().min(2, {
    message: "Bank name must be at least 2 characters.",
  }),
  bankAddress: z.string().min(5, {
    message: "Bank address must be at least 5 characters.",
  }),
  accountNumber: z.string().min(5, {
    message: "Account number must be at least 5 characters.",
  }),
  swiftCode: z.string().min(8, { // SWIFT codes are 8 or 11 characters
    message: "SWIFT code must be at least 8 characters.",
  }).max(11, { message: "SWIFT code can be at most 11 characters."}),
  ifscCode: z.string().length(11, { // IFSC codes are 11 characters in India
    message: "IFSC code must be 11 characters.",
  }),
});

type BankFormValues = z.infer<typeof formSchema>;

interface BankFormProps {
  onSave: (bank: Bank) => void;
}

export function BankForm({ onSave }: BankFormProps) {
  const { toast } = useToast();
  const form = useForm<BankFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bankName: "",
      bankAddress: "",
      accountNumber: "",
      swiftCode: "",
      ifscCode: "",
    },
  });

  function onSubmit(values: BankFormValues) {
    const newBank: Bank = {
      id: Date.now().toString(),
      ...values,
    };
    onSave(newBank);
    toast({
      title: "Bank Saved",
      description: `${values.bankName} has been successfully saved.`,
    });
    form.reset();
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Landmark className="h-6 w-6 text-primary" />
          Add New Bank
        </CardTitle>
        <CardDescription>Fill in the details below to add a new bank.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Landmark className="h-4 w-4 text-muted-foreground" />Bank Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. State Bank of India" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />Bank Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g. 123 Banking St, Financial District, Mumbai" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><ReceiptText className="h-4 w-4 text-muted-foreground" />Bank A/C No.</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 00123456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="swiftCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" />Bank SWIFT Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. SBININBBXXX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ifscCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Code className="h-4 w-4 text-muted-foreground" />Bank IFSC Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. SBIN0000001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-headline">
              Save Bank
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
