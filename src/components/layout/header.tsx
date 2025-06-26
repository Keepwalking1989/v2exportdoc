
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
import { Menu as MenuIcon, X as XIcon, Building, PlusCircle, ShoppingCart, Receipt, Palette, Package, Landmark, Briefcase, FileText } from "lucide-react"; // Added FileText

export function Header() {
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
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
          <Link href="/" passHref>
            <MenubarItem>EXPORTER</MenubarItem>
          </Link>
          <MenubarSeparator />
          <Link href="/client" passHref>
            <MenubarItem>Client</MenubarItem>
          </Link>
          <Link href="/manufacturer" passHref>
            <MenubarItem>Manufacturer</MenubarItem>
          </Link>
          <Link href="/pallet" passHref>
            <MenubarItem>Pallet</MenubarItem>
          </Link>
          <Link href="/transporter" passHref>
            <MenubarItem>Transporter</MenubarItem>
          </Link>
          <MenubarItem>Suppliers</MenubarItem>
          <Link href="/size" passHref>
            <MenubarItem>Size</MenubarItem>
          </Link>
          <Link href="/product" passHref>
            <MenubarItem>Product</MenubarItem>
          </Link>
          <Link href="/bank" passHref>
            <MenubarItem>Bank</MenubarItem>
          </Link>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger className="font-headline">
          <ShoppingCart className="mr-2 h-4 w-4" /> SALE
        </MenubarTrigger>
        <MenubarContent>
          <Link href="/performa-invoice" passHref>
            <MenubarItem>Performa Invoice</MenubarItem>
          </Link>
          <Link href="/purchase-order" passHref>
            <MenubarItem>Purchase Order</MenubarItem>
          </Link>
          <Link href="/export-document" passHref>
            <MenubarItem>Export Document</MenubarItem>
          </Link>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger className="font-headline">
          <Receipt className="mr-2 h-4 w-4" /> PURCHASE
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Manu Bill</MenubarItem>
          <MenubarItem>Trans Bill</MenubarItem>
          <MenubarItem>Pallet Bill</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </>
  );

  const mobileMenuItems = (
    <nav className="flex flex-col space-y-1 p-4">
      <Button variant="ghost" className="justify-start font-headline text-lg" onClick={() => setIsMobileMenuOpen(false)}>
        <PlusCircle className="mr-2 h-5 w-5" /> ADD
      </Button>
      <div className="pl-6">
        <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/">EXPORTER</Link></Button>
        <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/client">Client</Link></Button>
        <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/manufacturer">Manufacturer</Link></Button>
        <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/pallet">Pallet</Link></Button>
        <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/transporter">Transporter</Link></Button>
        <Button variant="ghost" className="justify-start font-normal w-full" onClick={() => setIsMobileMenuOpen(false)}>Suppliers</Button>
        <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/size">Size</Link></Button>
        <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/product">Product</Link></Button>
        <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/bank">Bank</Link></Button>
      </div>

      <Button variant="ghost" className="justify-start font-headline text-lg mt-2" onClick={() => { /* Consider sub-menu expansion for mobile */ }}>
         <ShoppingCart className="mr-2 h-5 w-5" /> SALE
      </Button>
       <div className="pl-6">
        <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/performa-invoice">Performa Invoice</Link></Button>
        <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/purchase-order">Purchase Order</Link></Button>
        <Button variant="ghost" className="justify-start font-normal w-full" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/export-document">Export Document</Link></Button>
      </div>

      <Button variant="ghost" className="justify-start font-headline text-lg mt-2" onClick={() => { /* Consider sub-menu expansion for mobile */ }}>
        <Receipt className="mr-2 h-5 w-5" /> PURCHASE
      </Button>
      <div className="pl-6">
        <Button variant="ghost" className="justify-start font-normal w-full" onClick={() => setIsMobileMenuOpen(false)}>Manu Bill</Button>
        <Button variant="ghost" className="justify-start font-normal w-full" onClick={() => setIsMobileMenuOpen(false)}>Trans Bill</Button>
        <Button variant="ghost" className="justify-start font-normal w-full" onClick={() => setIsMobileMenuOpen(false)}>Pallet Bill</Button>
      </div>
    </nav>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
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
            <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0">
              <div className="flex justify-between items-center p-4 border-b">
                 <Link href="/" className="flex items-center space-x-2" onClick={() => setIsMobileMenuOpen(false)}>
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
          <Menubar className="border-none bg-transparent shadow-none">{menuItems}</Menubar>
        )}
      </div>
    </header>
  );
}
