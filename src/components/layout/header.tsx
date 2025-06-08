
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
import { Menu as MenuIcon, X as XIcon, Building, PlusCircle, ShoppingCart, Receipt } from "lucide-react";

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
          <MenubarItem>Manufacturer</MenubarItem>
          <MenubarItem>Pallet</MenubarItem>
          <MenubarItem>Transporter</MenubarItem>
          <MenubarItem>Suppliers</MenubarItem>
          <MenubarItem>Size</MenubarItem>
          <MenubarItem>Product</MenubarItem>
          <MenubarItem>Bank</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger className="font-headline">
          <ShoppingCart className="mr-2 h-4 w-4" /> SALE
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Performa Invoice</MenubarItem>
          <MenubarItem>Purchase Order</MenubarItem>
          <MenubarItem>Export Document</MenubarItem>
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
        <Button variant="ghost" className="justify-start font-normal w-full" onClick={() => setIsMobileMenuOpen(false)}>Manufacturer</Button>
        <Button variant="ghost" className="justify-start font-normal w-full" onClick={() => setIsMobileMenuOpen(false)}>Pallet</Button>
        <Button variant="ghost" className="justify-start font-normal w-full" onClick={() => setIsMobileMenuOpen(false)}>Transporter</Button>
        <Button variant="ghost" className="justify-start font-normal w-full" onClick={() => setIsMobileMenuOpen(false)}>Suppliers</Button>
        <Button variant="ghost" className="justify-start font-normal w-full" onClick={() => setIsMobileMenuOpen(false)}>Size</Button>
        <Button variant="ghost" className="justify-start font-normal w-full" onClick={() => setIsMobileMenuOpen(false)}>Product</Button>
        <Button variant="ghost" className="justify-start font-normal w-full" onClick={() => setIsMobileMenuOpen(false)}>Bank</Button>
      </div>

      <Button variant="ghost" className="justify-start font-headline text-lg mt-2" onClick={() => setIsMobileMenuOpen(false)}>
         <ShoppingCart className="mr-2 h-5 w-5" /> SALE
      </Button>
       <div className="pl-6">
        <Button variant="ghost" className="justify-start font-normal w-full" onClick={() => setIsMobileMenuOpen(false)}>Performa Invoice</Button>
        <Button variant="ghost" className="justify-start font-normal w-full" onClick={() => setIsMobileMenuOpen(false)}>Purchase Order</Button>
        <Button variant="ghost" className="justify-start font-normal w-full" onClick={() => setIsMobileMenuOpen(false)}>Export Document</Button>
      </div>

      <Button variant="ghost" className="justify-start font-headline text-lg mt-2" onClick={() => setIsMobileMenuOpen(false)}>
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
          <span className="font-headline text-xl font-bold text-primary">BizForm</span>
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
                    <span className="font-headline text-xl font-bold text-primary">BizForm</span>
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
