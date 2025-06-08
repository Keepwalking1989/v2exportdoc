
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
import { PackagePlus, Ruler, Box, Weight, DollarSign, Barcode, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import React from "react";

const formSchema = z.object({
  selectedSizeId: z.string().min(1, { message: "Please select a size." }),
  sqmPerBoxDisplay: z.string().optional(),
  boxWeightDisplay: z.string().optional(),
  purchasePriceDisplay: z.string().optional(),
  salesPriceDisplay: z.string().optional(),
  hsnCodeDisplay: z.string().optional(),
  designNames: z.string().min(1, { message: "Design name(s) are required." })
    .refine(value => value.split(',').every(name => name.trim().length > 0), {
      message: "All comma-separated design names must be valid and non-empty.",
    }),
});

type ProductFormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  sizes: Size[];
  onSave: (products: Product[]) => void;
}

export function ProductForm({ sizes, onSave }: ProductFormProps) {
  const { toast } = useToast();
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      selectedSizeId: "",
      sqmPerBoxDisplay: "",
      boxWeightDisplay: "",
      purchasePriceDisplay: "",
      salesPriceDisplay: "",
      hsnCodeDisplay: "",
      designNames: "",
    },
  });

  const handleSizeChange = (sizeId: string) => {
    const selectedSize = sizes.find(s => s.id === sizeId);
    if (selectedSize) {
      form.setValue("selectedSizeId", sizeId);
      form.setValue("sqmPerBoxDisplay", selectedSize.sqmPerBox.toString());
      form.setValue("boxWeightDisplay", selectedSize.boxWeight.toString());
      form.setValue("purchasePriceDisplay", selectedSize.purchasePrice.toString());
      form.setValue("salesPriceDisplay", selectedSize.salesPrice.toString());
      form.setValue("hsnCodeDisplay", selectedSize.hsnCode);
    } else {
      form.setValue("selectedSizeId", "");
      form.setValue("sqmPerBoxDisplay", "");
      form.setValue("boxWeightDisplay", "");
      form.setValue("purchasePriceDisplay", "");
      form.setValue("salesPriceDisplay", "");
      form.setValue("hsnCodeDisplay", "");
    }
  };

  function onSubmit(values: ProductFormValues) {
    const designNameArray = values.designNames.split(',').map(name => name.trim()).filter(name => name.length > 0);
    
    const newProducts: Product[] = designNameArray.map(dName => ({
      id: `${Date.now()}-${dName.replace(/\s+/g, '-')}-${Math.random().toString(36).substring(2, 7)}`, // More robust ID
      sizeId: values.selectedSizeId,
      designName: dName,
    }));

    onSave(newProducts);
    toast({
      title: "Product(s) Saved",
      description: `${newProducts.length} product(s) based on size ID ${values.selectedSizeId} have been successfully saved.`,
    });
    form.reset();
    // Reset display fields manually as they are not part of standard reset behavior when controlled this way
    form.setValue("sqmPerBoxDisplay", "");
    form.setValue("boxWeightDisplay", "");
    form.setValue("purchasePriceDisplay", "");
    form.setValue("salesPriceDisplay", "");
    form.setValue("hsnCodeDisplay", "");
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <PackagePlus className="h-6 w-6 text-primary" />
          Add New Product(s)
        </CardTitle>
        <CardDescription>Select a size, enter design names (comma-separated for multiple), and save.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="selectedSizeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Ruler className="h-4 w-4 text-muted-foreground" />Select Size</FormLabel>
                  <Select onValueChange={handleSizeChange} defaultValue={field.value}>
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
              name="sqmPerBoxDisplay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Box className="h-4 w-4 text-muted-foreground" />SQM per Box</FormLabel>
                  <FormControl>
                    <Input placeholder="Auto-filled" {...field} readOnly className="bg-muted/50" />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="boxWeightDisplay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Weight className="h-4 w-4 text-muted-foreground" />Box Weight (kg)</FormLabel>
                  <FormControl>
                    <Input placeholder="Auto-filled" {...field} readOnly className="bg-muted/50" />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="purchasePriceDisplay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" />Purchase Price</FormLabel>
                    <FormControl>
                      <Input placeholder="Auto-filled" {...field} readOnly className="bg-muted/50" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="salesPriceDisplay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" />Sales Price</FormLabel>
                    <FormControl>
                      <Input placeholder="Auto-filled" {...field} readOnly className="bg-muted/50" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="hsnCodeDisplay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Barcode className="h-4 w-4 text-muted-foreground" />HSN Code</FormLabel>
                  <FormControl>
                    <Input placeholder="Auto-filled" {...field} readOnly className="bg-muted/50" />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="designNames"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Palette className="h-4 w-4 text-muted-foreground" />Design Name(s)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Onyx Black, Marble White, Stone Grey" {...field} />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">Enter one or more design names, separated by commas.</p>
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-headline">
              Save Product(s)
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
