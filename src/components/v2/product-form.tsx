
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { PackagePlus, Ruler, Box, Weight, DollarSign, Palette, Save, XCircle, PlusCircle, Trash2, FileUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";

const productEntrySchema = z.object({
  designName: z.string().min(1, { message: "Design name is required." }),
  imageUrl: z.string().optional(),
});

const formSchema = z.object({
  sizeId: z.string().min(1, { message: "Please select a size." }),
  salesPrice: z.coerce.number().min(0, { message: "Sales Price cannot be negative." }),
  boxWeight: z.coerce.number().positive({ message: "Box Weight must be a positive number." }),
  productsToCreate: z.array(productEntrySchema).min(1, "At least one design is required."),
});

export type ProductFormValues = z.infer<typeof formSchema>;

const defaultValues: ProductFormValues = {
  sizeId: "",
  salesPrice: 0,
  boxWeight: 0,
  productsToCreate: [{ designName: "", imageUrl: "" }],
};

interface ProductFormProps {
  sizes: Size[];
  onSave: (values: any) => void;
  initialData?: Product | null;
  isEditing: boolean;
  onCancelEdit: () => void;
}

export function ProductFormV2({ sizes, onSave, initialData, isEditing, onCancelEdit }: ProductFormProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "productsToCreate",
  });

  const selectedSizeId = form.watch("sizeId");
  const prevSizeIdRef = useRef(selectedSizeId);

  useEffect(() => {
    if (isEditing && initialData) {
      form.reset({
        sizeId: initialData.sizeId,
        salesPrice: initialData.salesPrice || 0,
        boxWeight: initialData.boxWeight || 0,
        productsToCreate: [{ designName: initialData.designName, imageUrl: initialData.imageUrl || "" }],
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    toast({ title: "Uploading...", description: `Uploading ${file.name}. Please wait.` });

    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const fileData = reader.result;
            const response = await fetch('/api/v2/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileData, fileName: file.name }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'File upload failed');
            }

            const { filePath } = await response.json();
            form.setValue(`productsToCreate.${index}.imageUrl`, filePath, { shouldValidate: true });
            toast({ title: "Upload Successful", description: `Image for design ready.` });
        };
    } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Error", description: error.message });
    } finally {
        setIsUploading(false);
    }
  };

  function onSubmit(values: ProductFormValues) {
    if (isEditing && initialData) {
      const updatedProduct: Product = {
        ...initialData,
        ...values,
        designName: values.productsToCreate[0].designName,
        imageUrl: values.productsToCreate[0].imageUrl,
      };
       onSave(updatedProduct);
    } else {
       onSave(values);
    }
    if (!isEditing) {
      form.reset();
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <PackagePlus className="h-6 w-6 text-primary" />
          {isEditing ? "Edit Product (DB)" : "Add New Product(s) (DB)"}
        </CardTitle>
        <CardDescription>
          {isEditing ? "Modify the details of the existing product." : "Select a size and add one or more designs with their images."}
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
                  <FormLabel className="flex items-center gap-2"><Ruler className="h-4 w-4 text-muted-foreground" />Select Size *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="salesPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" />Sales Price</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g. 150.00" {...field} />
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
                      <Input type="number" placeholder="e.g. 25.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Card className="p-4">
              <CardTitle className="text-lg mb-4 flex items-center justify-between">
                Designs
                {!isEditing && (
                    <Button type="button" size="sm" onClick={() => append({ designName: "", imageUrl: "" })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Design
                    </Button>
                )}
              </CardTitle>
              <div className="space-y-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="p-3 border rounded-md space-y-3 bg-muted/20 relative">
                       {!isEditing && fields.length > 1 && (
                            <Button type="button" variant="destructive" size="icon" className="absolute -top-3 -right-3 h-6 w-6" onClick={() => remove(index)}>
                                <Trash2 className="h-3 w-3"/>
                            </Button>
                       )}
                        <FormField
                            control={form.control}
                            name={`productsToCreate.${index}.designName`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2"><Palette className="h-4 w-4 text-muted-foreground"/>Design Name *</FormLabel>
                                    <FormControl><Input placeholder="e.g. Onyx Black" {...field} /></FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`productsToCreate.${index}.imageUrl`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2"><FileUp className="h-4 w-4 text-muted-foreground"/>Design Image</FormLabel>
                                    {field.value && <img src={field.value} alt="Preview" className="h-16 w-16 object-cover rounded-md border"/>}
                                    <FormControl><Input type="file" onChange={(e) => handleFileChange(e, index)} accept="image/*" /></FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                    </div>
                ))}
              </div>
            </Card>
            
            <div className="flex justify-end space-x-4">
              {isEditing && (
                <Button type="button" variant="ghost" onClick={onCancelEdit}>
                  <XCircle className="mr-2 h-4 w-4" /> Cancel
                </Button>
              )}
              <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground font-headline" disabled={isUploading}>
                <Save className="mr-2 h-4 w-4" /> {isUploading ? "Uploading..." : (isEditing ? "Save Changes" : "Save Product(s)")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
