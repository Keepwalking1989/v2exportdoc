
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
import type { Size } from "@/types/size";
import { Ruler, Box, Weight, DollarSign, Barcode, FileText, Info, Save, XCircle } from "lucide-react";
import { useEffect } from "react";

const formSchema = z.object({
  size: z.string().min(1, { message: "Size cannot be empty." }),
  sqmPerBox: z.coerce.number().positive({ message: "SQM per Box must be a positive number." }),
  boxWeight: z.coerce.number().positive({ message: "Box Weight must be a positive number." }),
  purchasePrice: z.coerce.number().min(0, { message: "Purchase Price cannot be negative." }),
  salesPrice: z.coerce.number().min(0, { message: "Sales Price cannot be negative." }),
  hsnCode: z.string().min(4, { message: "HSN Code must be at least 4 characters." }),
  palletDetails: z.string().min(5, { message: "Pallet details must be at least 5 characters." }),
});

export type SizeFormValues = z.infer<typeof formSchema>;

const defaultValues = {
  size: "",
  sqmPerBox: 0,
  boxWeight: 0,
  purchasePrice: 0,
  salesPrice: 0,
  hsnCode: "",
  palletDetails: "",
};

interface SizeFormProps {
  onSave: (values: SizeFormValues) => void;
  initialData?: Size | null;
  isEditing: boolean;
  onCancelEdit: () => void;
}

export function SizeForm({ onSave, initialData, isEditing, onCancelEdit }: SizeFormProps) {
  const form = useForm<SizeFormValues>({
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

  function onSubmit(values: SizeFormValues) {
    onSave(values);
    if (!isEditing) {
      form.reset();
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Ruler className="h-6 w-6 text-primary" />
          {isEditing ? "Edit Size" : "Add New Size"}
        </CardTitle>
        <CardDescription>
          {isEditing ? "Modify the details of the existing size." : "Fill in the details below to add a new product size."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Ruler className="h-4 w-4 text-muted-foreground" />Size</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 600x600mm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sqmPerBox"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Box className="h-4 w-4 text-muted-foreground" />SQM per Box</FormLabel>
                  <FormControl>
                    <Input type="text" inputMode="decimal" placeholder="e.g. 1.44" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="boxWeight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Weight className="h-4 w-4 text-muted-foreground" />Box Weight (kg)</FormLabel>
                  <FormControl>
                    <Input type="text" inputMode="decimal" placeholder="e.g. 25.5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="purchasePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" />Purchase Price</FormLabel>
                  <FormControl>
                    <Input type="text" inputMode="decimal" placeholder="e.g. 120.75" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="salesPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" />Sales Price</FormLabel>
                  <FormControl>
                    <Input type="text" inputMode="decimal" placeholder="e.g. 150.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hsnCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Barcode className="h-4 w-4 text-muted-foreground" />HSN Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 690721" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="palletDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />Pallet Details</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g. 60 boxes per pallet, total weight 1530kg" {...field} />
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
                <Save className="mr-2 h-4 w-4" /> {isEditing ? "Save Changes" : "Save Size"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
