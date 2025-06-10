
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { PurchaseOrder, PurchaseOrderItem } from '@/types/purchase-order';
import type { Company } from '@/types/company';
import type { Manufacturer } from '@/types/manufacturer';
import type { Size } from '@/types/size';
import type { Product } from '@/types/product'; // Assuming product name comes from global products
import type { PerformaInvoice } from '@/types/performa-invoice';

// Page Layout (Points)
const PAGE_MARGIN = 36; // Approx 12.7mm
const CONTENT_WIDTH = 595.28 - 2 * PAGE_MARGIN; // A4 width in points - margins

// Font Sizes
const FONT_TITLE = 16;
const FONT_HEADER = 12;
const FONT_SUBHEADER = 10;
const FONT_BODY = 10;
const FONT_TABLE_HEAD = 9;
const FONT_TABLE_BODY = 8;
const FONT_FOOTER = 10;

// Line Heights (as a multiplier of font size)
const LINE_SPACING_FACTOR = 1.2;

// Helper to add text and move Y position
function addText(doc: jsPDF, text: string, x: number, y: number, fontSize: number, fontWeight: 'normal' | 'bold' = 'normal', align: 'left' | 'center' | 'right' = 'left'): number {
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', fontWeight);
  const textWidth = doc.getTextWidth(text);
  let textX = x;
  if (align === 'center') {
    textX = x + (CONTENT_WIDTH / 2) - (textWidth / 2); // Assuming x is PAGE_MARGIN for full width centering
    if (x !== PAGE_MARGIN) textX = x + ( (doc.internal.pageSize.getWidth() - 2*PAGE_MARGIN) / 2) - (textWidth / 2); // more general case
  } else if (align === 'right') {
    textX = x + CONTENT_WIDTH - textWidth; // Assuming x is PAGE_MARGIN for full width right align
     if (x !== PAGE_MARGIN) textX = x + ( (doc.internal.pageSize.getWidth() - 2*PAGE_MARGIN) / 2) - textWidth; // for half width cells
  }

  doc.text(text, textX, y);
  return y + fontSize * LINE_SPACING_FACTOR;
}


export function generatePurchaseOrderPdf(
  po: PurchaseOrder,
  exporter: Company,
  manufacturer: Manufacturer,
  poSize: Size | undefined, // The specific size for this PO
  allProducts: Product[], // To get product names
  sourcePi: PerformaInvoice | undefined // Optional: To display source PI number
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let yPos = PAGE_MARGIN;

  // Title
  yPos = addText(doc, "PURCHASE ORDER", PAGE_MARGIN, yPos, FONT_TITLE, 'bold', 'center');
  yPos += FONT_TITLE * 0.5; // Extra space after title

  // PO Details Section (Two Columns)
  const col1X = PAGE_MARGIN;
  const col2X = PAGE_MARGIN + CONTENT_WIDTH / 2 + 10; // 10pt gutter
  const colWidth = CONTENT_WIDTH / 2 - 5; // Adjust for gutter

  let yPosCol1 = yPos;
  let yPosCol2 = yPos;

  // --- Column 1: Exporter & Manufacturer ---
  yPosCol1 = addText(doc, "Exporter:", col1X, yPosCol1, FONT_SUBHEADER, 'bold');
  yPosCol1 = addText(doc, exporter.companyName, col1X, yPosCol1, FONT_BODY);
  const exporterAddressLines = doc.splitTextToSize(exporter.address, colWidth);
  exporterAddressLines.forEach((line: string) => {
    yPosCol1 = addText(doc, line, col1X, yPosCol1, FONT_BODY);
  });
  if (exporter.iecNumber) {
    yPosCol1 = addText(doc, `IEC: ${exporter.iecNumber}`, col1X, yPosCol1, FONT_BODY);
  }
  yPosCol1 += FONT_BODY * 0.5;


  yPosCol1 = addText(doc, "To (Manufacturer):", col1X, yPosCol1, FONT_SUBHEADER, 'bold');
  yPosCol1 = addText(doc, manufacturer.companyName, col1X, yPosCol1, FONT_BODY);
  const manufacturerAddressLines = doc.splitTextToSize(manufacturer.address, colWidth);
  manufacturerAddressLines.forEach((line: string) => {
    yPosCol1 = addText(doc, line, col1X, yPosCol1, FONT_BODY);
  });
  if (manufacturer.gstNumber) {
     yPosCol1 = addText(doc, `GSTIN: ${manufacturer.gstNumber}`, col1X, yPosCol1, FONT_BODY);
  }
   if (manufacturer.pinCode) {
     yPosCol1 = addText(doc, `PIN: ${manufacturer.pinCode}`, col1X, yPosCol1, FONT_BODY);
  }


  // --- Column 2: PO Info ---
  yPosCol2 = addText(doc, "PO No.:", col2X, yPosCol2, FONT_SUBHEADER, 'bold');
  yPosCol2 = addText(doc, po.poNumber, col2X, yPosCol2, FONT_BODY);
  yPosCol2 += FONT_BODY * 0.5;

  yPosCol2 = addText(doc, "PO Date:", col2X, yPosCol2, FONT_SUBHEADER, 'bold');
  yPosCol2 = addText(doc, format(new Date(po.poDate), 'dd/MM/yyyy'), col2X, yPosCol2, FONT_BODY);
  yPosCol2 += FONT_BODY * 0.5;

  if (sourcePi) {
    yPosCol2 = addText(doc, "Ref. PI No.:", col2X, yPosCol2, FONT_SUBHEADER, 'bold');
    yPosCol2 = addText(doc, sourcePi.invoiceNumber, col2X, yPosCol2, FONT_BODY);
    yPosCol2 += FONT_BODY * 0.5;
  }

  yPosCol2 = addText(doc, "Size:", col2X, yPosCol2, FONT_SUBHEADER, 'bold');
  yPosCol2 = addText(doc, poSize?.size || "N/A", col2X, yPosCol2, FONT_BODY);
  yPosCol2 += FONT_BODY * 0.5;
  
  yPosCol2 = addText(doc, "HSN Code:", col2X, yPosCol2, FONT_SUBHEADER, 'bold');
  yPosCol2 = addText(doc, poSize?.hsnCode || "N/A", col2X, yPosCol2, FONT_BODY);
  yPosCol2 += FONT_BODY * 0.5;

  yPosCol2 = addText(doc, "No. of Containers:", col2X, yPosCol2, FONT_SUBHEADER, 'bold');
  yPosCol2 = addText(doc, po.numberOfContainers.toString(), col2X, yPosCol2, FONT_BODY);

  yPos = Math.max(yPosCol1, yPosCol2) + FONT_HEADER; // Space before table

  // Instruction Text
  yPos = addText(doc, "Please supply the following goods:", PAGE_MARGIN, yPos, FONT_BODY);
  yPos += FONT_BODY * 0.5;

  // Product Items Table
  const tableHead = [['SR', 'Product Name (Design)', 'Design Image Ref.', 'Weight/Box (kg)', 'Boxes', 'Thickness', 'Total Weight (kg)']];
  let totalBoxesOverall = 0;
  let totalWeightOverall = 0;

  const tableBody = po.items.map((item, index) => {
    const productDetail = allProducts.find(p => p.id === item.productId);
    const productName = productDetail?.designName || "Unknown Product";
    const itemTotalWeight = item.weightPerBox * item.boxes;
    totalBoxesOverall += item.boxes;
    totalWeightOverall += itemTotalWeight;
    return [
      (index + 1).toString(),
      productName,
      item.designImage || "AS PER SAMPLE",
      item.weightPerBox.toFixed(2),
      item.boxes.toString(),
      item.thickness,
      itemTotalWeight.toFixed(2)
    ];
  });

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    startY: yPos,
    theme: 'grid',
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: FONT_TABLE_BODY, cellPadding: 3 },
    headStyles: { fontSize: FONT_TABLE_HEAD, fontStyle: 'bold', fillColor: [220, 220, 220], halign: 'center' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 30 }, // SR
      1: { cellWidth: 'auto' }, // Product Name
      2: { cellWidth: 'auto' }, // Design Image Ref
      3: { halign: 'right', cellWidth: 60 }, // Weight/Box
      4: { halign: 'right', cellWidth: 40 }, // Boxes
      5: { halign: 'center', cellWidth: 70 }, // Thickness
      6: { halign: 'right', cellWidth: 70 }, // Total Weight
    },
    didDrawPage: (data) => {
        // @ts-ignore
      yPos = data.cursor?.y ?? yPos; // Update yPos after table
    }
  });
  
  yPos += FONT_BODY; // Space after table

  // Totals Section
  yPos = addText(doc, `Total Boxes: ${totalBoxesOverall}`, PAGE_MARGIN, yPos, FONT_BODY, 'bold');
  yPos = addText(doc, `Approx. Total Order Weight: ${totalWeightOverall.toFixed(2)} kg`, PAGE_MARGIN, yPos, FONT_BODY, 'bold');
  yPos += FONT_HEADER;


  // Signature Section (position towards bottom)
  const finalYPosForSignature = doc.internal.pageSize.getHeight() - PAGE_MARGIN - (FONT_FOOTER * 3 * LINE_SPACING_FACTOR);
  if (yPos > finalYPosForSignature - (FONT_FOOTER * 2 * LINE_SPACING_FACTOR)) { // Check if enough space or add new page
      doc.addPage();
      yPos = PAGE_MARGIN;
  } else {
      yPos = finalYPosForSignature;
  }
  
  const signatureX = PAGE_MARGIN + (CONTENT_WIDTH / 2); // Start from mid-page for right alignment

  doc.setFontSize(FONT_FOOTER);
  doc.setFont('helvetica', 'bold');
  const forExporterText = `For ${exporter.companyName}`;
  const forExporterTextWidth = doc.getTextWidth(forExporterText);
  doc.text(forExporterText, signatureX + (CONTENT_WIDTH / 2) - forExporterTextWidth , yPos);
  yPos += FONT_FOOTER * LINE_SPACING_FACTOR * 2.5; // More space for signature

  doc.setFontSize(FONT_FOOTER);
  doc.setFont('helvetica', 'bold');
  const authSignText = "Authorised Signature";
  const authSignTextWidth = doc.getTextWidth(authSignText);
  doc.text(authSignText, signatureX + (CONTENT_WIDTH / 2) - authSignTextWidth, yPos);


  doc.save(`Purchase_Order_${po.poNumber.replace(/\//g, '_')}.pdf`);
}
