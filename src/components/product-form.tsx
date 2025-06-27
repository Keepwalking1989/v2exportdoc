
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Product } from "@/types/product";
import type { Size } from "@/types/size";
import { PackagePlus, Ruler, Box, Weight, DollarSign, Barcode, Palette, Save, XCircle } from "lucide-react";
import { useEffect, useRef } from "react";

const formSchema = z.object({
  sizeId: z.string().min(1, { message: "Please select a size." }),
  designName: z.string().min(1, { message: "Design name is required." }),
  salesPrice: z.coerce.number().min(0, { message: "Sales Price cannot be negative." }),
  boxWeight: z.coerce.number().positive({ message: "Box Weight must be a positive number." }),
});

export type ProductFormValues = z.infer<typeof formSchema>;

const defaultValues = {
  sizeId: "",
  designName: "",
  salesPrice: 0,
  boxWeight: 0,
};

interface ProductFormProps {
  sizes: Size[];
  onSave: (product: ProductFormValues) => void;
  initialData?: Product | null;
  isEditing: boolean;
  onCancelEdit: () => void;
}

export function ProductForm({ sizes, onSave, initialData, isEditing, onCancelEdit }: ProductFormProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const selectedSizeId = form.watch("sizeId");
  const prevSizeIdRef = useRef(selectedSizeId);
  
  const selectedSizeDetails = selectedSizeId ? sizes.find(s => s.id === selectedSizeId) : null;

  useEffect(() => {
    if (isEditing && initialData) {
      form.reset({
        ...defaultValues,
        ...initialData,
      });
    } else {
      form.reset(defaultValues);
    }
  }, [isEditing, initialData, form]);

  useEffect(() => {
    if (prevSizeIdRef.current !== selectedSizeId || (!isEditing && selectedSizeId)) {
        const selectedSize = sizes.find(s => s.id === selectedSizeId);
        if (selectedSize) {
            form.setValue("salesPrice", selectedSize.salesPrice);
            form.setValue("boxWeight", selectedSize.boxWeight);
        }
    }
    prevSizeIdRef.current = selectedSizeId;
  }, [selectedSizeId, sizes, form, isEditing]);


  function onSubmit(values: ProductFormValues) {
    onSave(values);
    if (!isEditing) {
      form.reset();
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <PackagePlus className="h-6 w-6 text-primary" />
          {isEditing ? "Edit Product" : "Add New Product"}
        </CardTitle>
        <CardDescription>
          {isEditing ? "Modify the details of the existing product." : "Select a size, then enter one or more design names separated by commas."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="sizeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Ruler className="h-4 w-4 text-muted-foreground" />Select Size</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a size..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sizes.map(size => (
                        <SelectItem key={size.id} value={size.id}>
                          {size.size} (HSN: {size.hsnCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="designName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Palette className="h-4 w-4 text-muted-foreground" />Design Name(s)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Onyx Black, Pearl White..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>


            {selectedSizeDetails && (
              <div className="space-y-4 pt-4 border-t">
                 <FormItem>
                    <FormLabel className="flex items-center gap-2"><Box className="h-4 w-4 text-muted-foreground" />SQM per Box (from Size)</FormLabel>
                    <FormControl>
                        <Input value={selectedSizeDetails.sqmPerBox} readOnly className="bg-muted/50" />
                    </FormControl>
                 </FormItem>
              </div>
            )}
            
            <div className="flex justify-end space-x-4">
              {isEditing && (
                <Button type="button" variant="ghost" onClick={onCancelEdit}>
                  <XCircle className="mr-2 h-4 w-4" /> Cancel
                </Button>
              )}
              <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground font-headline">
                <Save className="mr-2 h-4 w-4" /> {isEditing ? "Save Changes" : "Save Product(s)"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
