
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
import { Landmark, MapPin, ReceiptText, Globe, Code, Save, XCircle } from "lucide-react";
import { useEffect } from "react";

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

export type BankFormValues = z.infer<typeof formSchema>;

const defaultValues = {
  bankName: "",
  bankAddress: "",
  accountNumber: "",
  swiftCode: "",
  ifscCode: "",
};

interface BankFormProps {
  onSave: (values: BankFormValues) => void;
  initialData?: Bank | null;
  isEditing: boolean;
  onCancelEdit: () => void;
}

export function BankForm({ onSave, initialData, isEditing, onCancelEdit }: BankFormProps) {
  const form = useForm<BankFormValues>({
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

  function onSubmit(values: BankFormValues) {
    onSave(values);
    if (!isEditing) {
      form.reset();
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Landmark className="h-6 w-6 text-primary" />
          {isEditing ? "Edit Bank" : "Add New Bank"}
        </CardTitle>
        <CardDescription>
          {isEditing ? "Modify the details of the existing bank." : "Fill in the details below to add a new bank."}
        </CardDescription>
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
            <div className="flex justify-end space-x-4">
              {isEditing && (
                <Button type="button" variant="ghost" onClick={onCancelEdit}>
                  <XCircle className="mr-2 h-4 w-4" /> Cancel
                </Button>
              )}
              <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground font-headline">
                <Save className="mr-2 h-4 w-4" /> {isEditing ? "Save Changes" : "Save Bank"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
