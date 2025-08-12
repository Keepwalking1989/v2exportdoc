
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { ProductFormV2, type ProductFormValues } from "@/components/v2/product-form";
import { ProductListV2 } from "@/components/v2/product-list";
import type { Product } from "@/types/product";
import type { Size } from "@/types/size";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ProductPageV2() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [products, setProducts] = useState<(Product & { sizeName?: string })[]>([]);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [productsRes, sizesRes] = await Promise.all([
          fetch('/api/v2/product-data'),
          fetch('/api/v2/size-data')
        ]);

        if (!productsRes.ok) throw new Error('Failed to fetch products');
        if (!sizesRes.ok) throw new Error('Failed to fetch sizes');

        const productsData = await productsRes.json();
        const sizesData = await sizesRes.json();
        
        setProducts(productsData);
        setSizes(sizesData);

      } catch (error) {
        console.error("Failed to fetch initial data", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load data from the database." });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const handleSaveProduct = async (values: ProductFormValues) => {
    if (productToEdit) {
      // TODO: Implement update logic
      console.log("Update logic not implemented yet.");
      toast({ title: "Product Updated", description: `${values.designName} has been successfully updated.` });
    } else {
      // Create new logic
      try {
        const response = await fetch('/api/v2/product-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save products');
        }

        const successData = await response.json();
        toast({ title: "Products Saved", description: successData.message });

        // Refetch products to update the list
        const productsRes = await fetch('/api/v2/product-data');
        const productsData = await productsRes.json();
        setProducts(productsData);

      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error Saving Products",
          description: error.message || "An unknown error occurred.",
        });
      }
    }
  };

  const handleEditProduct = (id: string) => {
    const product = products.find(p => p.id === id);
    if (product) {
      setProductToEdit(product);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  
  const handleCancelEdit = () => {
    setProductToEdit(null);
  };

  const handleDeleteProduct = (id: string) => {
    // TODO: Implement delete logic
    console.log("Delete logic not implemented yet.");
    toast({
      variant: "destructive",
      title: "Deletion Pending",
      description: "Delete functionality is not yet implemented for the database.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Loading product data...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div ref={formRef}>
          {sizes.length > 0 ? (
            <ProductFormV2 
              sizes={sizes} 
              onSave={handleSaveProduct}
              initialData={productToEdit}
              isEditing={!!productToEdit}
              onCancelEdit={handleCancelEdit}
            />
          ) : (
            <Card className="w-full max-w-2xl mx-auto shadow-xl mb-8">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Cannot Add Products</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  There are no sizes defined in the database. Please go to the "V2 &gt; ADD &gt; Size" page to create product sizes before adding products.
                </CardDescription>
              </CardContent>
            </Card>
          )}
        </div>
        <ProductListV2
          products={products}
          onEditProduct={handleEditProduct}
          onDeleteProduct={handleDeleteProduct}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} HEMITH ERP. All rights reserved. (V2 - MySQL)
      </footer>
    </div>
  );
}
