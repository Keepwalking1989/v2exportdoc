"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu as MenuIcon, X as XIcon, Building } from "lucide-react";

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
        <MenubarTrigger className="font-headline">File</MenubarTrigger>
        <MenubarContent>
          <Link href="/" passHref>
            <MenubarItem>New Company</MenubarItem>
          </Link>
          <MenubarSeparator />
          <MenubarItem>Export Data (CSV)</MenubarItem>
          <MenubarItem>Export Data (PDF)</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger className="font-headline">View</MenubarTrigger>
        <MenubarContent>
          <Link href="/" passHref>
            <MenubarItem>All Companies</MenubarItem>
          </Link>
          <MenubarSub>
            <MenubarSubTrigger>Search Options</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem>Advanced Search</MenubarItem>
              <MenubarItem>Saved Searches</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger className="font-headline">Help</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Documentation</MenubarItem>
          <MenubarItem>Support</MenubarItem>
          <MenubarItem>About BizForm</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </>
  );

  const mobileMenuItems = (
    <nav className="flex flex-col space-y-2 p-4">
      <Button variant="ghost" className="justify-start font-headline" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/">File: New Company</Link></Button>
      <Button variant="ghost" className="justify-start font-headline" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/">View: All Companies</Link></Button>
      <Button variant="ghost" className="justify-start font-headline" onClick={() => setIsMobileMenuOpen(false)}>Help: About</Button>
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
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
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
