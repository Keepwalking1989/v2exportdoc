
"use client";

import { useState, useMemo, useEffect } from "react";
import type { Product } from "@/types/product";
import type { Size } from "@/types/size";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ChevronLeft, ChevronRight, PackageSearch, Palette } from "lucide-react";

interface ProductListProps {
  products: Product[];
  sizes: Size[]; // Sizes are needed to look up details
}

const ITEMS_PER_PAGE = 10;

export function ProductList({ products: initialProducts, sizes }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setProducts(initialProducts);
    setCurrentPage(1);
  }, [initialProducts]);

  const enrichedProducts = useMemo(() => {
    return products.map(product => {
      const sizeDetails = sizes.find(s => s.id === product.sizeId);
      return {
        ...product,
        sizeName: sizeDetails?.size || "N/A",
        sqmPerBox: sizeDetails?.sqmPerBox || 0,
        boxWeight: sizeDetails?.boxWeight || 0,
        purchasePrice: sizeDetails?.purchasePrice || 0,
        salesPrice: sizeDetails?.salesPrice || 0,
        hsnCode: sizeDetails?.hsnCode || "N/A",
      };
    });
  }, [products, sizes]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return enrichedProducts;
    return enrichedProducts.filter(
      (product) =>
        product.designName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sizeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.hsnCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [enrichedProducts, searchTerm]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

  return (
    <Card className="w-full shadow-xl mt-8">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <PackageSearch className="h-6 w-6 text-primary" />
          Registered Products
        </CardTitle>
        <CardDescription>View, search, and manage product information.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by design, size, or HSN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
        </div>

        {paginatedProducts.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-headline flex items-center gap-1"><Palette className="h-4 w-4" />Design Name</TableHead>
                  <TableHead className="font-headline">Size</TableHead>
                  <TableHead className="font-headline hidden sm:table-cell">SQM/Box</TableHead>
                  <TableHead className="font-headline hidden md:table-cell">Box Wt.</TableHead>
                  <TableHead className="font-headline hidden lg:table-cell">Purchase Price</TableHead>
                  <TableHead className="font-headline hidden lg:table-cell">Sales Price</TableHead>
                  <TableHead className="font-headline">HSN Code</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.designName}</TableCell>
                    <TableCell>{product.sizeName}</TableCell>
                    <TableCell className="hidden sm:table-cell">{product.sqmPerBox}</TableCell>
                    <TableCell className="hidden md:table-cell">{product.boxWeight}</TableCell>
                    <TableCell className="hidden lg:table-cell">{product.purchasePrice}</TableCell>
                    <TableCell className="hidden lg:table-cell">{product.salesPrice}</TableCell>
                    <TableCell>{product.hsnCode}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No products found. Add products using the form above.
            {sizes.length === 0 && <p className="text-sm mt-2">Note: You need to add sizes first on the 'Size' page to create products.</p>}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
