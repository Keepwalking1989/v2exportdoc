
"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { ProductForm } from "@/components/product-form";
import { ProductList } from "@/components/product-list";
import type { Product } from "@/types/product";
import type { Size } from "@/types/size"; // Import Size type

const LOCAL_STORAGE_PRODUCTS_KEY = "bizform_products";
const LOCAL_STORAGE_SIZES_KEY = "bizform_sizes"; // To load sizes for the form

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]); // State to hold sizes
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      // Load Products
      try {
        const storedProducts = localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY);
        if (storedProducts) {
          setProducts(JSON.parse(storedProducts));
        }
      } catch (error) {
        console.error("Failed to parse products from localStorage", error);
        setProducts([]);
      }

      // Load Sizes (needed for the form dropdown and list display)
      try {
        const storedSizes = localStorage.getItem(LOCAL_STORAGE_SIZES_KEY);
        if (storedSizes) {
          setSizes(JSON.parse(storedSizes));
        }
      } catch (error) {
        console.error("Failed to parse sizes from localStorage", error);
        setSizes([]);
      }
    }
  }, []);

  const handleSaveProducts = (newProducts: Product[]) => {
    const updatedProducts = [...products, ...newProducts];
    setProducts(updatedProducts);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(updatedProducts));
    }
  };

  if (!isClient) {
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
        {sizes.length > 0 ? (
          <ProductForm sizes={sizes} onSave={handleSaveProducts} />
        ) : (
          <Card className="w-full max-w-2xl mx-auto shadow-xl">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Cannot Add Products</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                There are no sizes defined in the system. Please go to the "ADD &gt; Size" page to create product sizes before adding products.
              </p>
            </CardContent>
          </Card>
        )}
        <ProductList products={products} sizes={sizes} />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} BizForm. All rights reserved.
      </footer>
    </div>
  );
}
