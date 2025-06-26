
'use client';

import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Download, Wind, Sailboat, Nfc, BadgeCheck, Edit, CalendarIcon, FileText as FileTextIcon } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import type { ExportDocument } from '@/types/export-document';
import type { Manufacturer } from '@/types/manufacturer';
import type { Transporter } from '@/types/transporter';
import type { Product } from '@/types/product';
import type { Size } from '@/types/size';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const LOCAL_STORAGE_EXPORT_DOCS_KEY_V2 = "bizform_export_documents_v2";
const LOCAL_STORAGE_MANUFACTURERS_KEY = "bizform_manufacturers";
const LOCAL_STORAGE_TRANSPORTERS_KEY = "bizform_transporters";
const LOCAL_STORAGE_PRODUCTS_KEY = "bizform_products";
const LOCAL_STORAGE_SIZES_KEY = "bizform_sizes";

const ewayBillSchema = z.object({
  ewayBillNumber: z.string().optional(),
  ewayBillDate: z.date().optional(),
  ewayBillDocument: z.string().optional(), // data URI
});
type EwayBillFormValues = z.infer<typeof ewayBillSchema>;

const shippingBillSchema = z.object({
  shippingBillNumber: z.string().optional(),
  shippingBillDate: z.date().optional(),
  shippingBillDocument: z.string().optional(), // data URI
});
type ShippingBillFormValues = z.infer<typeof shippingBillSchema>;

const blSchema = z.object({
  blNumber: z.string().optional(),
  blDate: z.date().optional(),
  blDocument: z.string().optional(), // data URI
});
type BlFormValues = z.infer<typeof blSchema>;


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
  const { toast } = useToast();

  const [document, setDocument] = useState<ExportDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Editing states
  const [isEditingEway, setIsEditingEway] = useState(false);
  const [isEditingShippingBill, setIsEditingShippingBill] = useState(false);
  const [isEditingBl, setIsEditingBl] = useState(false);

  // State for related data
  const [allManufacturers, setAllManufacturers] = useState<Manufacturer[]>([]);
  const [allTransporters, setAllTransporters] = useState<Transporter[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allSizes, setAllSizes] = useState<Size[]>([]);

  const ewayBillForm = useForm<EwayBillFormValues>({ resolver: zodResolver(ewayBillSchema) });
  const shippingBillForm = useForm<ShippingBillFormValues>({ resolver: zodResolver(shippingBillSchema) });
  const blForm = useForm<BlFormValues>({ resolver: zodResolver(blSchema) });

  const updateDocumentInStorage = (updatedDoc: ExportDocument) => {
    const storedDocs = localStorage.getItem(LOCAL_STORAGE_EXPORT_DOCS_KEY_V2);
    let allDocs: ExportDocument[] = storedDocs ? JSON.parse(storedDocs) : [];
    const updatedDocs = allDocs.map(doc => doc.id === docId ? updatedDoc : doc);
    localStorage.setItem(LOCAL_STORAGE_EXPORT_DOCS_KEY_V2, JSON.stringify(updatedDocs));
    setDocument(updatedDoc); // Update state locally to re-render UI
  };

  useEffect(() => {
    if (docId && typeof window !== 'undefined') {
      try {
        const storedDocs = localStorage.getItem(LOCAL_STORAGE_EXPORT_DOCS_KEY_V2);
        const allDocs: ExportDocument[] = storedDocs ? JSON.parse(storedDocs) : [];
        const foundDoc = allDocs.find(d => d.id === docId);
        if (foundDoc) {
          const parsedDoc = {
            ...foundDoc,
            exportInvoiceDate: new Date(foundDoc.exportInvoiceDate),
            ewayBillDate: foundDoc.ewayBillDate ? new Date(foundDoc.ewayBillDate) : undefined,
            shippingBillDate: foundDoc.shippingBillDate ? new Date(foundDoc.shippingBillDate) : undefined,
            blDate: foundDoc.blDate ? new Date(foundDoc.blDate) : undefined,
          };
          setDocument(parsedDoc);
          
          if (!parsedDoc.ewayBillNumber) setIsEditingEway(true);
          if (!parsedDoc.shippingBillNumber) setIsEditingShippingBill(true);
          if (!parsedDoc.blNumber) setIsEditingBl(true);
          
          ewayBillForm.reset({ ewayBillNumber: parsedDoc.ewayBillNumber, ewayBillDate: parsedDoc.ewayBillDate, ewayBillDocument: parsedDoc.ewayBillDocument });
          shippingBillForm.reset({ shippingBillNumber: parsedDoc.shippingBillNumber, shippingBillDate: parsedDoc.shippingBillDate, shippingBillDocument: parsedDoc.shippingBillDocument });
          blForm.reset({ blNumber: parsedDoc.blNumber, blDate: parsedDoc.blDate, blDocument: parsedDoc.blDocument });

        } else {
          console.error("Document not found");
        }

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
  }, [docId, ewayBillForm, shippingBillForm, blForm]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, formSetter: (value: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        formSetter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSaveEwayBill = (data: EwayBillFormValues) => {
    if (!document) return;
    try {
      updateDocumentInStorage({ ...document, ...data });
      setIsEditingEway(false);
      toast({ title: "Eway Bill Details Saved" });
    } catch (error) {
      console.error("Failed to save Eway Bill details", error);
      toast({ variant: "destructive", title: "Error", description: "Could not save Eway Bill details." });
    }
  };

  const onSaveShippingBill = (data: ShippingBillFormValues) => {
    if (!document) return;
    try {
      updateDocumentInStorage({ ...document, ...data });
      setIsEditingShippingBill(false);
      toast({ title: "Shipping Bill Details Saved" });
    } catch (error) {
      console.error("Failed to save Shipping Bill details", error);
      toast({ variant: "destructive", title: "Error", description: "Could not save Shipping Bill details." });
    }
  };

  const onSaveBl = (data: BlFormValues) => {
    if (!document) return;
    try {
      updateDocumentInStorage({ ...document, ...data });
      setIsEditingBl(false);
      toast({ title: "BL Details Saved" });
    } catch (error) {
      console.error("Failed to save BL details", error);
      toast({ variant: "destructive", title: "Error", description: "Could not save BL details." });
    }
  };

  const ewayBillData = useMemo(() => {
    if (!document || !allManufacturers.length || !allSizes.length || !allProducts.length) return null;
    const manufacturer = allManufacturers.find(m => m.id === document.manufacturerId);
    const transporter = allTransporters.find(t => t.id === document.transporterId);
    const conversationRate = document.conversationRate || 1;
    const gstString = document.gst || "0";
    const gstRate = parseFloat(gstString.replace('%', '')) / 100 || 0;
    const sizeAggregator = new Map<string, { sizeDetails: Size; totalBoxes: number; totalBaseAmount: number; }>();
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
          sizeAggregator.set(size.id, { sizeDetails: size, totalBoxes: item.boxes || 0, totalBaseAmount: baseAmount });
        }
      });
    });
    const aggregatedItems = Array.from(sizeAggregator.values()).map(agg => {
      const amount = agg.totalBaseAmount * conversationRate;
      const gstAmount = amount * gstRate;
      const totalAmount = amount + gstAmount;
      return { hsnCode: agg.sizeDetails.hsnCode, size: agg.sizeDetails.size, quantity: agg.totalBoxes, amount, gstAmount, totalAmount };
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
      boxQuantity: (container.productItems?.reduce((sum, item) => sum + (item.boxes || 0), 0) || 0) + (container.sampleItems?.reduce((sum, item) => sum + (item.boxes || 0), 0) || 0)
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
    return <div className="flex flex-col min-h-screen bg-background"><Header /><main className="flex-grow container mx-auto px-4 py-8"><p className="text-center text-muted-foreground">Loading document data...</p></main></div>;
  }
  if (!document) {
    return <div className="flex flex-col min-h-screen bg-background"><Header /><main className="flex-grow container mx-auto px-4 py-8"><Card><CardHeader><CardTitle>Document Not Found</CardTitle></CardHeader><CardContent><p>The requested export document could not be found.</p><Button onClick={() => router.push('/export-document')} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Go Back to List</Button></CardContent></Card></main></div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold font-headline text-primary">Document Data: {document.exportInvoiceNumber}</h1>
          <Button onClick={() => router.push('/export-document')} variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Button>
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
            <Card className="mt-4"><CardHeader><CardTitle>Download Documents</CardTitle><CardDescription>Select a document type to generate and download a PDF.</CardDescription></CardHeader><CardContent className="space-y-8"><div><h3 className="text-lg font-semibold mb-4 text-primary font-headline">For Custom</h3><div className="space-y-3"><DownloadOption label="Custom Invoice" /><DownloadOption label="Packing List" /><DownloadOption label="VGM" /><DownloadOption label="ANNEXURE" /></div></div><Separator /><div><h3 className="text-lg font-semibold mb-4 text-primary font-headline">For Client</h3><div className="space-y-3"><DownloadOption label="Custom Invoice" /><DownloadOption label="Packing List" /><DownloadOption label="VGM" /><DownloadOption label="ANNEXURE" /></div></div></CardContent></Card>
          </TabsContent>

          <TabsContent value="eway">
            <Card className="mt-4"><CardHeader><CardTitle>Eway Bill Details</CardTitle></CardHeader><CardContent>
              {ewayBillData ? (
                <div className="space-y-6">
                  <Card><CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"><DetailRow label="Export Invoice No" value={ewayBillData.exportInvoiceNumber} /><DetailRow label="Export Invoice Date" value={ewayBillData.exportInvoiceDate} /><DetailRow label="Manufacturer Name" value={ewayBillData.manufacturerName} /><DetailRow label="Manufacturer Address" value={`${ewayBillData.manufacturerAddress || ''}, ${ewayBillData.manufacturerPincode || ''}`} /><DetailRow label="Ship To" value="MUNDRA PORT" /><DetailRow label="Port Pincode" value="370421" /><DetailRow label="Transporter Name" value={ewayBillData.transporterName} /><DetailRow label="Transporter GST" value={ewayBillData.transporterGst} /></CardContent></Card>
                  <Card><CardHeader><CardTitle>Item Details</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>HSN</TableHead><TableHead>Description</TableHead><TableHead>Size</TableHead><TableHead>Qty (Boxes)</TableHead><TableHead>Amount</TableHead><TableHead>GST</TableHead><TableHead>GST Amt</TableHead><TableHead>Total Amt</TableHead></TableRow></TableHeader><TableBody>{ewayBillData.aggregatedItems.map((item, index) => (<TableRow key={index}><TableCell>{item.hsnCode}</TableCell><TableCell>Polished Glazed Vitrified Tiles ( PGVT ) </TableCell><TableCell>{item.size}</TableCell><TableCell>{item.quantity}</TableCell><TableCell>{item.amount.toFixed(2)}</TableCell><TableCell>{ewayBillData.gst || 'N/A'}</TableCell><TableCell>{item.gstAmount.toFixed(2)}</TableCell><TableCell>{item.totalAmount.toFixed(2)}</TableCell></TableRow>))}</TableBody><TableFooter><TableRow className="font-bold"><TableCell colSpan={4}>Grand Total</TableCell><TableCell>{ewayBillData.grandTotal.amount.toFixed(2)}</TableCell><TableCell colSpan={1}></TableCell><TableCell>{ewayBillData.grandTotal.gstAmount.toFixed(2)}</TableCell><TableCell>{ewayBillData.grandTotal.totalAmount.toFixed(2)}</TableCell></TableRow></TableFooter></Table></CardContent></Card>
                  <Card><CardHeader><CardTitle>Container Details</CardTitle></CardHeader><CardContent className="space-y-4">{ewayBillData.containerDetails.map((container, index) => (<Card key={index} className="bg-muted/30"><CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4"><DetailRow label="Reason" value="Export In Multi vehicle" /><DetailRow label="Truck Number" value={container.truckNumber} /><DetailRow label="Bulti Number" value={container.builtyNo} /><DetailRow label="Box Quantity" value={container.boxQuantity.toString()} /></CardContent></Card>))}</CardContent></Card>
                  <Separator className="my-8" />
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Eway Bill Document Entry</CardTitle><CardDescription>Enter the Eway Bill details once available.</CardDescription></div>{!isEditingEway && document?.ewayBillNumber && (<Button variant="outline" onClick={() => setIsEditingEway(true)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>)}</CardHeader>
                    <Form {...ewayBillForm}><form onSubmit={ewayBillForm.handleSubmit(onSaveEwayBill)}><CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {isEditingEway ? (<FormField control={ewayBillForm.control} name="ewayBillNumber" render={({ field }) => (<FormItem><FormLabel>Eway Bill Number</FormLabel><FormControl><Input placeholder="Enter Eway Bill Number" {...field} /></FormControl><FormMessage /></FormItem>)} />) : (<DetailRow label="Eway Bill Number" value={document?.ewayBillNumber} />)}
                        {isEditingEway ? (<FormField control={ewayBillForm.control} name="ewayBillDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Eway Bill Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />) : (<DetailRow label="Eway Bill Date" value={document?.ewayBillDate ? format(new Date(document.ewayBillDate), "PPP") : 'N/A'} />)}
                      </div>
                      <div>
                        {isEditingEway ? (<FormItem><FormLabel>Eway Bill Document</FormLabel><FormControl><Input type="file" onChange={(e) => handleFileChange(e, (val) => ewayBillForm.setValue('ewayBillDocument', val))} accept=".pdf,.jpg,.jpeg,.png" /></FormControl><FormMessage /></FormItem>) : (<div><p className="text-sm text-muted-foreground">Eway Bill Document</p>{document?.ewayBillDocument ? (<Button asChild className="mt-2"><a href={document.ewayBillDocument} download={`EwayBill_${document.exportInvoiceNumber}.pdf`}><Download className="mr-2 h-4 w-4" /> Download Document</a></Button>) : (<p className="font-semibold">No document uploaded.</p>)}</div>)}
                      </div>
                    </CardContent>{isEditingEway && (<CardFooter className="justify-end gap-2"><Button type="button" variant="ghost" onClick={() => { setIsEditingEway(false); ewayBillForm.reset({ ewayBillNumber: document?.ewayBillNumber, ewayBillDate: document?.ewayBillDate, ewayBillDocument: document?.ewayBillDocument }); }}>Cancel</Button><Button type="submit">Save Details</Button></CardFooter>)}</form></Form>
                  </Card>
                </div>
              ) : (<p>Could not generate Eway Bill data. Ensure all related information (manufacturer, products, etc.) is available.</p>)}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="shipping">
            <div className="mt-4 space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Shipping Bill Details</CardTitle>
                            <CardDescription>Enter the Shipping Bill details once available.</CardDescription>
                        </div>
                        {!isEditingShippingBill && document?.shippingBillNumber && (
                            <Button variant="outline" onClick={() => setIsEditingShippingBill(true)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </Button>
                        )}
                    </CardHeader>
                    <Form {...shippingBillForm}>
                        <form onSubmit={shippingBillForm.handleSubmit(onSaveShippingBill)}>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {isEditingShippingBill ? (
                                        <FormField control={shippingBillForm.control} name="shippingBillNumber" render={({ field }) => (<FormItem><FormLabel>Shipping Bill Number</FormLabel><FormControl><Input placeholder="Enter Shipping Bill Number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    ) : (
                                        <DetailRow label="Shipping Bill Number" value={document?.shippingBillNumber} />
                                    )}
                                    {isEditingShippingBill ? (
                                        <FormField control={shippingBillForm.control} name="shippingBillDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Shipping Bill Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                                    ) : (
                                        <DetailRow label="Shipping Bill Date" value={document?.shippingBillDate ? format(new Date(document.shippingBillDate), "PPP") : 'N/A'} />
                                    )}
                                </div>
                                <div>
                                    {isEditingShippingBill ? (
                                        <FormItem><FormLabel>Shipping Bill Document</FormLabel><FormControl><Input type="file" onChange={(e) => handleFileChange(e, (val) => shippingBillForm.setValue('shippingBillDocument', val))} accept=".pdf,.jpg,.jpeg,.png" /></FormControl><FormMessage /></FormItem>
                                    ) : (
                                        <div><p className="text-sm text-muted-foreground">Shipping Bill Document</p>{document?.shippingBillDocument ? (<Button asChild className="mt-2"><a href={document.shippingBillDocument} download={`ShippingBill_${document.exportInvoiceNumber}.pdf`}><Download className="mr-2 h-4 w-4" /> Download Document</a></Button>) : (<p className="font-semibold">No document uploaded.</p>)}</div>
                                    )}
                                </div>
                            </CardContent>
                            {isEditingShippingBill && (
                                <CardFooter className="justify-end gap-2">
                                    <Button type="button" variant="ghost" onClick={() => { setIsEditingShippingBill(false); shippingBillForm.reset({ shippingBillNumber: document?.shippingBillNumber, shippingBillDate: document?.shippingBillDate, shippingBillDocument: document?.shippingBillDocument }); }}>Cancel</Button>
                                    <Button type="submit">Save Details</Button>
                                </CardFooter>
                            )}
                        </form>
                    </Form>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>BL (Bill of Lading) Details</CardTitle>
                            <CardDescription>Enter the BL details once available.</CardDescription>
                        </div>
                        {!isEditingBl && document?.blNumber && (
                             <Button variant="outline" onClick={() => setIsEditingBl(true)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </Button>
                        )}
                    </CardHeader>
                    <Form {...blForm}>
                        <form onSubmit={blForm.handleSubmit(onSaveBl)}>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {isEditingBl ? (
                                        <FormField control={blForm.control} name="blNumber" render={({ field }) => (<FormItem><FormLabel>BL Number</FormLabel><FormControl><Input placeholder="Enter BL Number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    ) : (
                                        <DetailRow label="BL Number" value={document?.blNumber} />
                                    )}
                                     {isEditingBl ? (
                                        <FormField control={blForm.control} name="blDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>BL Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                                    ) : (
                                        <DetailRow label="BL Date" value={document?.blDate ? format(new Date(document.blDate), "PPP") : 'N/A'} />
                                    )}
                                </div>
                                <div>
                                     {isEditingBl ? (
                                        <FormItem><FormLabel>BL Document</FormLabel><FormControl><Input type="file" onChange={(e) => handleFileChange(e, (val) => blForm.setValue('blDocument', val))} accept=".pdf,.jpg,.jpeg,.png" /></FormControl><FormMessage /></FormItem>
                                    ) : (
                                        <div><p className="text-sm text-muted-foreground">BL Document</p>{document?.blDocument ? (<Button asChild className="mt-2"><a href={document.blDocument} download={`BL_${document.exportInvoiceNumber}.pdf`}><Download className="mr-2 h-4 w-4" /> Download Document</a></Button>) : (<p className="font-semibold">No document uploaded.</p>)}</div>
                                    )}
                                </div>
                            </CardContent>
                             {isEditingBl && (
                                <CardFooter className="justify-end gap-2">
                                    <Button type="button" variant="ghost" onClick={() => { setIsEditingBl(false); blForm.reset({ blNumber: document?.blNumber, blDate: document?.blDate, blDocument: document?.blDocument }); }}>Cancel</Button>
                                    <Button type="submit">Save Details</Button>
                                </CardFooter>
                            )}
                        </form>
                    </Form>
                </Card>
            </div>
          </TabsContent>

          <TabsContent value="rfid">
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>RFID Details</CardTitle>
                <CardDescription>
                  Summary of RFID and related document details for each container.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Associated Document Numbers</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DetailRow label="Shipping Bill Number" value={document?.shippingBillNumber} />
                    <DetailRow label="Shipping Bill Date" value={document?.shippingBillDate ? format(new Date(document.shippingBillDate), "PPP") : 'N/A'} />
                    <DetailRow label="Eway Bill Number" value={document?.ewayBillNumber} />
                  </CardContent>
                </Card>
                
                <Separator />
                <h3 className="text-lg font-semibold text-primary font-headline">Container-Specific RFID Seals</h3>
                {document?.containerItems && document.containerItems.length > 0 ? (
                  document.containerItems.map((container, index) => (
                    <Card key={container.id || index} className="bg-muted/30">
                      <CardHeader>
                          <CardTitle className="text-base">Container: {container.containerNo || `Container ${index + 1}`}</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <DetailRow label="RFID Seal" value={container.rfidSeal} />
                        <DetailRow label="Container No." value={container.containerNo} />
                        <DetailRow label="Truck Number" value={container.truckNumber} />
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-muted-foreground">No container information available.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="brc"><Card className="mt-4"><CardHeader><CardTitle>BRC Document Details</CardTitle></CardHeader><CardContent><p>Fields for BRC document will be added here.</p></CardContent></Card></TabsContent>
        </Tabs>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">© {new Date().getFullYear()} BizForm. All rights reserved.</footer>
    </div>
  );
}

    