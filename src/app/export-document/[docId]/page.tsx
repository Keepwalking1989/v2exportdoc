
'use client';

import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Wind, Sailboat, Nfc, BadgeCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ExportDocument } from '@/types/export-document';

const LOCAL_STORAGE_EXPORT_DOCS_KEY_V2 = "bizform_export_documents_v2";

export default function DocumentDataPage() {
  const router = useRouter();
  const params = useParams();
  const docId = params.docId as string;
  const [document, setDocument] = useState<ExportDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (docId && typeof window !== 'undefined') {
      try {
        const storedDocs = localStorage.getItem(LOCAL_STORAGE_EXPORT_DOCS_KEY_V2);
        const allDocs: ExportDocument[] = storedDocs ? JSON.parse(storedDocs) : [];
        const foundDoc = allDocs.find(d => d.id === docId);
        if (foundDoc) {
          setDocument(foundDoc);
        } else {
          console.error("Document not found");
        }
      } catch (error) {
        console.error("Failed to load document from local storage", error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [docId]);
  
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
              </CardHeader>
              <CardContent>
                <p>Download options will be available here.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="eway">
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Eway Bill Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Fields for Eway Bill will be added here.</p>
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
