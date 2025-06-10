
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { ExportDocument, ExportDocumentContainerItem, ExportDocumentProductItem } from '@/types/export-document';
import type { Company } from '@/types/company'; // For Exporter
import type { Client } from '@/types/client';
import type { Manufacturer } from '@/types/manufacturer';
import type { Size } from '@/types/size';
import type { Product } from '@/types/product';
import type { Bank } from '@/types/bank';
import { amountToWords } from '@/lib/utils';

// --- Page & General Layout (Using Points) ---
const PAGE_MARGIN_X = 28.34; // pt (approx 10mm)
const PAGE_MARGIN_Y_TOP = 28.34; // pt (approx 10mm)
const PAGE_MARGIN_Y_BOTTOM = 28.34; // pt (approx 10mm)
const CONTENT_WIDTH = 595.28 - 2 * PAGE_MARGIN_X; // A4 width in points - margins

// --- Colors (placeholders, can be themed later) ---
const COLOR_HEADER_BG = [220, 220, 220]; // Light Gray
const COLOR_TEXT_HEADER = [0, 0, 0]; // Black
const COLOR_TEXT_BODY = [50, 50, 50]; // Dark Gray
const COLOR_BORDER = [150, 150, 150]; // Medium Gray

// --- Font Sizes (pt) ---
const FONT_TITLE = 16;
const FONT_SUBTITLE = 12;
const FONT_NORMAL = 10;
const FONT_SMALL = 8;

export function generateExportDocumentPdf(
  docData: ExportDocument,
  exporter: Company | undefined,
  client: Client | undefined,
  manufacturer: Manufacturer | undefined, // For GST
  bank: Bank | undefined,
  allSizes: Size[],
  allProducts: Product[]
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let yPos = PAGE_MARGIN_Y_TOP;

  // Placeholder content for now
  doc.setFontSize(FONT_TITLE);
  doc.text('Export Document / Invoice (Placeholder)', PAGE_MARGIN_X, yPos);
  yPos += FONT_TITLE * 1.5;

  doc.setFontSize(FONT_NORMAL);
  doc.text(`Export Invoice No: ${docData.exportInvoiceNumber}`, PAGE_MARGIN_X, yPos);
  yPos += FONT_NORMAL * 1.5;

  doc.text(`Exporter: ${exporter?.companyName || 'N/A'}`, PAGE_MARGIN_X, yPos);
  yPos += FONT_NORMAL * 1.5;
  
  doc.text(`Client: ${client?.companyName || 'N/A'}`, PAGE_MARGIN_X, yPos);
  yPos += FONT_NORMAL * 1.5;

  doc.text('Full PDF Content Generation: To Be Implemented', PAGE_MARGIN_X, yPos);
  yPos += FONT_NORMAL * 1.5;

  doc.text(`Number of Containers: ${docData.containers.length}`, PAGE_MARGIN_X, yPos);
  yPos += FONT_NORMAL * 1.5;

  docData.containers.forEach((container, cIdx) => {
    doc.text(`  Container #${cIdx + 1}: ${container.containerNo || 'N/A'} - ${container.products.length} product types`, PAGE_MARGIN_X, yPos);
    yPos += FONT_NORMAL * 1.2;
  });


  // --- Save the PDF ---
  doc.save(`Export_Document_${docData.exportInvoiceNumber.replace(/\//g, '_')}.pdf`);
}
