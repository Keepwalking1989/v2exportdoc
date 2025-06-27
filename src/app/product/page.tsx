
"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { ProductForm, type ProductFormValues } from "@/components/product-form";
import { ProductList } from "@/components/product-list";
import type { Product } from "@/types/product";
import type { Size } from "@/types/size";
import type { PerformaInvoice } from "@/types/performa-invoice";
import type { PurchaseOrder } from "@/types/purchase-order";
import type { ExportDocument } from "@/types/export-document";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LOCAL_STORAGE_PRODUCTS_KEY = "bizform_products";
const LOCAL_STORAGE_SIZES_KEY = "bizform_sizes";

export default function ProductPage() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const storedProducts = localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY);
        if (storedProducts) {
          setProducts(JSON.parse(storedProducts).filter((p: Product) => !p.isDeleted));
        }
      } catch (error) {
        console.error("Failed to parse products from localStorage", error);
        setProducts([]);
      }
      try {
        const storedSizes = localStorage.getItem(LOCAL_STORAGE_SIZES_KEY);
        if (storedSizes) {
          setSizes(JSON.parse(storedSizes).filter((s: Size) => !s.isDeleted));
        }
      } catch (error) {
        console.error("Failed to parse sizes from localStorage", error);
        setSizes([]);
      }
    }
  }, []);

  const handleSaveProduct = (values: ProductFormValues) => {
    const allProductsRaw = localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY);
    const allProducts: Product[] = allProductsRaw ? JSON.parse(allProductsRaw) : [];

    if (productToEdit) {
      const updatedProducts = allProducts.map(p => 
        p.id === productToEdit.id ? { ...p, ...values } : p
      );
      localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(updatedProducts));
      setProducts(updatedProducts.filter(p => !p.isDeleted));
      toast({ title: "Product Updated", description: `${values.designName} has been successfully updated.` });
      setProductToEdit(null);
    } else {
      const newProduct: Product = { 
        id: `${Date.now()}-${values.designName.replace(/\s+/g, '-')}`, 
        sizeId: values.sizeId,
        designName: values.designName
      };
      const updatedProducts = [...allProducts, newProduct];
      localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(updatedProducts));
      setProducts(updatedProducts.filter(p => !p.isDeleted));
      toast({ title: "Product Saved", description: `${values.designName} has been successfully saved.` });
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
    const performaInvoices: PerformaInvoice[] = JSON.parse(localStorage.getItem('bizform_performa_invoices') || '[]');
    const purchaseOrders: PurchaseOrder[] = JSON.parse(localStorage.getItem('bizform_purchase_orders') || '[]');
    const exportDocuments: ExportDocument[] = JSON.parse(localStorage.getItem('bizform_export_documents_v2') || '[]');
    
    const isUsed = 
      performaInvoices.some(pi => pi.items.some(item => item.productId === id) && !pi.isDeleted) ||
      purchaseOrders.some(po => po.items.some(item => item.productId === id) && !po.isDeleted) ||
      exportDocuments.some(ed => ed.containerItems?.some(ci => 
        (ci.productItems?.some(item => item.productId === id)) || 
        (ci.sampleItems?.some(item => item.productId === id))
      ));
    
    if (isUsed) {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "This product is used in an Invoice, PO, or Export Document. Please remove its references before deleting.",
      });
      return;
    }

    const allProductsRaw = localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY);
    const allProducts: Product[] = allProductsRaw ? JSON.parse(allProductsRaw) : [];
    
    const updatedProducts = allProducts.map(p => 
      p.id === id ? { ...p, isDeleted: true } : p
    );
    
    localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(updatedProducts));
    setProducts(updatedProducts.filter(p => !p.isDeleted));
    toast({ title: "Product Deleted", description: "The product has been marked as deleted." });
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
        <div ref={formRef}>
          {sizes.length > 0 ? (
            <ProductForm 
              sizes={sizes} 
              onSave={handleSaveProduct}
              initialData={productToEdit}
              isEditing={!!productToEdit}
              onCancelEdit={handleCancelEdit}
            />
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
        </div>
        <ProductList 
          products={products} 
          sizes={sizes} 
          onEditProduct={handleEditProduct}
          onDeleteProduct={handleDeleteProduct}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} BizForm. All rights reserved.
      </footer>
    </div>
  );
}
