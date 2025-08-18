
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

  const fetchProducts = async () => {
    try {
      const productsRes = await fetch('/api/v2/product-data');
      if (!productsRes.ok) throw new Error('Failed to fetch products');
      const productsData = await productsRes.json();
      setProducts(productsData);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Product Fetch Error", description: error.message });
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const sizesRes = await fetch('/api/v2/size-data');
        if (!sizesRes.ok) throw new Error('Failed to fetch sizes');
        setSizes(await sizesRes.json());
        await fetchProducts();
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: `Could not load data: ${error.message}` });
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [toast]);

  const handleSaveProduct = async (values: ProductFormValues) => {
    const isEditing = !!productToEdit;
    const url = isEditing ? `/api/v2/product-data?id=${productToEdit!.id}` : '/api/v2/product-data';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${isEditing ? 'update' : 'save'} product.`);
      }

      const successData = await response.json();
      toast({ title: `Product(s) ${isEditing ? 'Updated' : 'Saved'}`, description: successData.message || `Product ${values.designName} has been processed.` });
      setProductToEdit(null);
      await fetchProducts();

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Saving Product",
        description: error.message || "An unknown error occurred.",
      });
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

  const handleDeleteProduct = async (id: string) => {
    try {
        const response = await fetch(`/api/v2/product-data?id=${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error((await response.json()).message || 'Failed to delete product.');
        toast({ title: "Product Deleted", description: "The product has been marked as deleted." });
        await fetchProducts();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Delete Error", description: error.message });
    }
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
