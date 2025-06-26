
'use client';

import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Download, Wind, Sailboat, Nfc, BadgeCheck } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import type { ExportDocument } from '@/types/export-document';
import type { Manufacturer } from '@/types/manufacturer';
import type { Transporter } from '@/types/transporter';
import type { Product } from '@/types/product';
import type { Size } from '@/types/size';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const LOCAL_STORAGE_EXPORT_DOCS_KEY_V2 = "bizform_export_documents_v2";
const LOCAL_STORAGE_MANUFACTURERS_KEY = "bizform_manufacturers";
const LOCAL_STORAGE_TRANSPORTERS_KEY = "bizform_transporters";
const LOCAL_STORAGE_PRODUCTS_KEY = "bizform_products";
const LOCAL_STORAGE_SIZES_KEY = "bizform_sizes";

const DownloadOption = ({ label }: { label: string }) => (
  <div className="flex justify-between items-center p-3 border rounded-md bg-card hover:bg-muted/50 transition-colors">
    <span className="font-medium text-card-foreground">{label}</span>
    <Button variant="outline" size="sm" onClick={() => { /* Implement download logic here */ }}>
      <Download className="mr-2 h-4 w-4" /> Download
    </Button>
  </div>
);

const DetailRow = ({ label, value }: { label: string, value: string | undefined | null }) => (
  <div>
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="font-semibold">{value || 'N/A'}</p>
  </div>
);

export default function DocumentDataPage() {
  const router = useRouter();
  const params = useParams();
  const docId = params.docId as string;
  const [document, setDocument] = useState<ExportDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // State for related data
  const [allManufacturers, setAllManufacturers] = useState<Manufacturer[]>([]);
  const [allTransporters, setAllTransporters] = useState<Transporter[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allSizes, setAllSizes] = useState<Size[]>([]);

  useEffect(() => {
    if (docId && typeof window !== 'undefined') {
      try {
        const storedDocs = localStorage.getItem(LOCAL_STORAGE_EXPORT_DOCS_KEY_V2);
        const allDocs: ExportDocument[] = storedDocs ? JSON.parse(storedDocs) : [];
        const foundDoc = allDocs.find(d => d.id === docId);
        if (foundDoc) {
          setDocument({
            ...foundDoc,
            exportInvoiceDate: new Date(foundDoc.exportInvoiceDate),
          });
        } else {
          console.error("Document not found");
        }

        // Load related data
        setAllManufacturers(JSON.parse(localStorage.getItem(LOCAL_STORAGE_MANUFACTURERS_KEY) || "[]"));
        setAllTransporters(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TRANSPORTERS_KEY) || "[]"));
        setAllProducts(JSON.parse(localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY) || "[]"));
        setAllSizes(JSON.parse(localStorage.getItem(LOCAL_STORAGE_SIZES_KEY) || "[]"));

      } catch (error) {
        console.error("Failed to load document from local storage", error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [docId]);

  const ewayBillData = useMemo(() => {
    if (!document || !allManufacturers.length || !allSizes.length || !allProducts.length) {
      return null;
    }

    const manufacturer = allManufacturers.find(m => m.id === document.manufacturerId);
    const transporter = allTransporters.find(t => t.id === document.transporterId);
    const conversationRate = document.conversationRate || 1;
    const gstString = document.gst || "0";
    const gstRate = parseFloat(gstString.replace('%', '')) / 100 || 0;

    const sizeAggregator = new Map<string, {
      sizeDetails: Size;
      totalBoxes: number;
      totalBaseAmount: number;
    }>();

    document.containerItems?.forEach(container => {
      const allItems = [...(container.productItems || []), ...(container.sampleItems || [])];
      allItems.forEach(item => {
        const product = allProducts.find(p => p.id === item.productId);
        if (!product) return;
        const size = allSizes.find(s => s.id === product.sizeId);
        if (!size) return;

        const baseAmount = (size.sqmPerBox || 0) * (item.boxes || 0) * (item.rate || 0);

        const existing = sizeAggregator.get(size.id);
        if (existing) {
          existing.totalBoxes += item.boxes || 0;
          existing.totalBaseAmount += baseAmount;
        } else {
          sizeAggregator.set(size.id, {
            sizeDetails: size,
            totalBoxes: item.boxes || 0,
            totalBaseAmount: baseAmount,
          });
        }
      });
    });

    const aggregatedItems = Array.from(sizeAggregator.values()).map(agg => {
      const amount = agg.totalBaseAmount * conversationRate;
      const gstAmount = amount * gstRate;
      const totalAmount = amount + gstAmount;
      return {
        hsnCode: agg.sizeDetails.hsnCode,
        size: agg.sizeDetails.size,
        quantity: agg.totalBoxes,
        amount,
        gstAmount,
        totalAmount,
      };
    });

    const grandTotal = aggregatedItems.reduce((acc, item) => {
      acc.amount += item.amount;
      acc.gstAmount += item.gstAmount;
      acc.totalAmount += item.totalAmount;
      return acc;
    }, { amount: 0, gstAmount: 0, totalAmount: 0 });

    const containerDetails = document.containerItems?.map(container => ({
      truckNumber: container.truckNumber || 'N/A',
      builtyNo: container.builtyNo || 'N/A',
      boxQuantity: (container.productItems?.reduce((sum, item) => sum + (item.boxes || 0), 0) || 0) +
                   (container.sampleItems?.reduce((sum, item) => sum + (item.boxes || 0), 0) || 0)
    })) || [];

    return {
      exportInvoiceNumber: document.exportInvoiceNumber,
      exportInvoiceDate: format(document.exportInvoiceDate, 'dd-MM-yyyy'),
      manufacturerName: manufacturer?.companyName,
      manufacturerAddress: manufacturer?.address,
      manufacturerPincode: manufacturer?.pinCode,
      transporterName: transporter?.companyName,
      transporterGst: transporter?.gstNumber,
      gst: document.gst,
      aggregatedItems,
      grandTotal,
      containerDetails,
    };
  }, [document, allManufacturers, allTransporters, allProducts, allSizes]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading document data...</p>
        </main>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Document Not Found</CardTitle>
            </CardHeader>
            <CardContent>
              <p>The requested export document could not be found.</p>
              <Button onClick={() => router.push('/export-document')} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Go Back to List
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold font-headline text-primary">
            Document Data: {document.exportInvoiceNumber}
          </h1>
          <Button onClick={() => router.push('/export-document')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
          </Button>
        </div>

        <Tabs defaultValue="download" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="download"><Download className="mr-2 h-4 w-4" /> Download</TabsTrigger>
            <TabsTrigger value="eway"><Wind className="mr-2 h-4 w-4" /> Eway Bill</TabsTrigger>
            <TabsTrigger value="shipping"><Sailboat className="mr-2 h-4 w-4" /> Shipping Bill</TabsTrigger>
            <TabsTrigger value="rfid"><Nfc className="mr-2 h-4 w-4" /> RFID Details</TabsTrigger>
            <TabsTrigger value="brc"><BadgeCheck className="mr-2 h-4 w-4" /> BRC Doc</TabsTrigger>
          </TabsList>

          <TabsContent value="download">
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Download Documents</CardTitle>
                <CardDescription>Select a document type to generate and download a PDF.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary font-headline">For Custom</h3>
                  <div className="space-y-3">
                    <DownloadOption label="Custom Invoice" />
                    <DownloadOption label="Packing List" />
                    <DownloadOption label="VGM" />
                    <DownloadOption label="ANNEXURE" />
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary font-headline">For Client</h3>
                  <div className="space-y-3">
                    <DownloadOption label="Custom Invoice" />
                    <DownloadOption label="Packing List" />
                    <DownloadOption label="VGM" />
                    <DownloadOption label="ANNEXURE" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="eway">
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Eway Bill Details</CardTitle>
              </CardHeader>
              <CardContent>
                {ewayBillData ? (
                  <div className="space-y-6">
                    <Card>
                      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <DetailRow label="Export Invoice No" value={ewayBillData.exportInvoiceNumber} />
                        <DetailRow label="Export Invoice Date" value={ewayBillData.exportInvoiceDate} />
                        <DetailRow label="Manufacturer Name" value={ewayBillData.manufacturerName} />
                        <DetailRow label="Manufacturer Address" value={`${ewayBillData.manufacturerAddress || ''}, ${ewayBillData.manufacturerPincode || ''}`} />
                        <DetailRow label="Ship To" value="MUNDRA PORT" />
                        <DetailRow label="Port Pincode" value="370421" />
                        <DetailRow label="Transporter Name" value={ewayBillData.transporterName} />
                        <DetailRow label="Transporter GST" value={ewayBillData.transporterGst} />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader><CardTitle>Item Details</CardTitle></CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>HSN</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Size</TableHead>
                              <TableHead>Qty (Boxes)</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>GST</TableHead>
                              <TableHead>GST Amt</TableHead>
                              <TableHead>Total Amt</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {ewayBillData.aggregatedItems.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.hsnCode}</TableCell>
                                <TableCell>Polished Glazed Vitrified Tiles ( PGVT )</TableCell>
                                <TableCell>{item.size}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell>{item.amount.toFixed(2)}</TableCell>
                                <TableCell>{ewayBillData.gst || 'N/A'}</TableCell>
                                <TableCell>{item.gstAmount.toFixed(2)}</TableCell>
                                <TableCell>{item.totalAmount.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                          <TableFooter>
                            <TableRow className="font-bold">
                              <TableCell colSpan={4}>Grand Total</TableCell>
                              <TableCell>{ewayBillData.grandTotal.amount.toFixed(2)}</TableCell>
                              <TableCell colSpan={1}></TableCell>
                              <TableCell>{ewayBillData.grandTotal.gstAmount.toFixed(2)}</TableCell>
                              <TableCell>{ewayBillData.grandTotal.totalAmount.toFixed(2)}</TableCell>
                            </TableRow>
                          </TableFooter>
                        </Table>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader><CardTitle>Container Details</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        {ewayBillData.containerDetails.map((container, index) => (
                          <Card key={index} className="bg-muted/30">
                            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                                <DetailRow label="Reason" value="Export In Multi vehicle" />
                                <DetailRow label="Truck Number" value={container.truckNumber} />
                                <DetailRow label="Bulti Number" value={container.builtyNo} />
                                <DetailRow label="Box Quantity" value={container.boxQuantity.toString()} />
                            </CardContent>
                          </Card>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <p>Could not generate Eway Bill data. Ensure all related information (manufacturer, products, etc.) is available.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shipping">
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Shipping Bill Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Fields for Shipping Bill will be added here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rfid">
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>RFID Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Fields for RFID details will be added here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="brc">
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>BRC Document Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Fields for BRC document will be added here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} BizForm. All rights reserved.
      </footer>
    </div>
  );
}
