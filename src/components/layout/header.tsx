
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Menu as MenuIcon, X as XIcon, Building, PlusCircle, ShoppingCart, Receipt, ArrowLeftRight, LayoutDashboard } from "lucide-react";

export function Header() {
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const menuItems = (
    <>
       <MenubarMenu>
        <MenubarTrigger className="font-headline">
          <PlusCircle className="mr-2 h-4 w-4" /> ADD
        </MenubarTrigger>
        <MenubarContent>
            <Link href="/v2/exporter" passHref><MenubarItem>Exporter</MenubarItem></Link>
            <MenubarSeparator />
            <Link href="/v2/client" passHref><MenubarItem>Client</MenubarItem></Link>
            <Link href="/v2/manufacturer" passHref><MenubarItem>Manufacturer</MenubarItem></Link>
            <Link href="/v2/transporter" passHref><MenubarItem>Transporter</MenubarItem></Link>
            <Link href="/v2/supplier" passHref><MenubarItem>Supplier</MenubarItem></Link>
            <Link href="/v2/pallet" passHref><MenubarItem>Pallet</MenubarItem></Link>
            <MenubarSeparator />
            <Link href="/v2/size" passHref><MenubarItem>Size</MenubarItem></Link>
            <Link href="/v2/product" passHref><MenubarItem>Product</MenubarItem></Link>
            <MenubarSeparator />
            <Link href="/v2/bank" passHref><MenubarItem>Bank</MenubarItem></Link>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger className="font-headline">
          <ShoppingCart className="mr-2 h-4 w-4" /> SALE
        </MenubarTrigger>
        <MenubarContent>
            <Link href="/v2/performa-invoice" passHref><MenubarItem>Performa Invoice</MenubarItem></Link>
            <Link href="/v2/purchase-order" passHref><MenubarItem>Purchase Order</MenubarItem></Link>
            <Link href="/v2/export-document" passHref><MenubarItem>Export Document</MenubarItem></Link>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger className="font-headline">
          <Receipt className="mr-2 h-4 w-4" /> PURCHASE
        </MenubarTrigger>
        <MenubarContent>
            <Link href="/v2/manu-bill" passHref><MenubarItem>Manu Bill</MenubarItem></Link>
            <Link href="/v2/trans-bill" passHref><MenubarItem>Trans Bill</MenubarItem></Link>
            <Link href="/v2/supply-bill" passHref><MenubarItem>Supply Bill</MenubarItem></Link>
        </MenubarContent>
      </MenubarMenu>
       <MenubarMenu>
        <MenubarTrigger className="font-headline">
          <ArrowLeftRight className="mr-2 h-4 w-4" /> TRANSACTION
        </MenubarTrigger>
        <MenubarContent>
           <Link href="/v2/transaction" passHref><MenubarItem>Transaction</MenubarItem></Link>
           <Link href="/v2/gst" passHref><MenubarItem>GST</MenubarItem></Link>
        </MenubarContent>
      </MenubarMenu>
    </>
  );

  const mobileMenuItems = (
    <nav className="flex flex-col space-y-1 p-4">
      <Button variant="ghost" className="justify-start font-headline text-lg" asChild onClick={() => setIsMobileMenuOpen(false)}>
        <Link href="/v2/dashboard"><LayoutDashboard className="mr-2 h-5 w-5" />DASHBOARD</Link>
      </Button>
      <Separator />

      <div className="text-sm font-semibold text-muted-foreground px-4 pt-2">ADD</div>
      <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/v2/exporter">Exporter</Link></Button>
      <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/v2/client">Client</Link></Button>
      <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/v2/manufacturer">Manufacturer</Link></Button>
      <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/v2/transporter">Transporter</Link></Button>
      <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/v2/supplier">Supplier</Link></Button>
      <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/v2/pallet">Pallet</Link></Button>
      <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/v2/size">Size</Link></Button>
      <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/v2/product">Product</Link></Button>
      <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/v2/bank">Bank</Link></Button>
      <Separator />
      
      <div className="text-sm font-semibold text-muted-foreground px-4 pt-2">SALE</div>
      <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/v2/performa-invoice">Performa Invoice</Link></Button>
      <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/v2/purchase-order">Purchase Order</Link></Button>
      <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/v2/export-document">Export Document</Link></Button>
      <Separator />
      
      <div className="text-sm font-semibold text-muted-foreground px-4 pt-2">PURCHASE</div>
      <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/v2/manu-bill">Manu Bill</Link></Button>
      <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/v2/trans-bill">Trans Bill</Link></Button>
      <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/v2/supply-bill">Supply Bill</Link></Button>
      <Separator />
      
      <div className="text-sm font-semibold text-muted-foreground px-4 pt-2">TRANSACTION</div>
      <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/v2/transaction">Transaction</Link></Button>
      <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/v2/gst">GST</Link></Button>
    </nav>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/v2/dashboard" className="flex items-center space-x-2">
          <Building className="h-6 w-6 text-primary" />
          <span className="font-headline text-xl font-bold text-primary">HEMITH ERP</span>
        </Link>
        {isMobile ? (
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <MenuIcon className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0 overflow-y-auto">
              <div className="flex justify-between items-center p-4 border-b">
                 <Link href="/v2/dashboard" className="flex items-center space-x-2" onClick={() => setIsMobileMenuOpen(false)}>
                    <Building className="h-6 w-6 text-primary" />
                    <span className="font-headline text-xl font-bold text-primary">HEMITH ERP</span>
                  </Link>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                  <XIcon className="h-6 w-6" />
                  <span className="sr-only">Close menu</span>
                </Button>
              </div>
              {mobileMenuItems}
            </SheetContent>
          </Sheet>
        ) : (
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" className="font-headline">
              <Link href="/v2/dashboard"><LayoutDashboard className="mr-2 h-4 w-4"/>DASHBOARD</Link>
            </Button>
            <Menubar className="border-none bg-transparent shadow-none">{menuItems}</Menubar>
          </div>
        )}
      </div>
    </header>
  );
}
