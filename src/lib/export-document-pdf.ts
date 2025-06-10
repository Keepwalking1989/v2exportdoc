
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
const PAGE_MARGIN_X = 36; // pt (approx 12.7mm)
const PAGE_MARGIN_Y_TOP = 36; // pt
const PAGE_MARGIN_Y_BOTTOM = 36; // pt
const CONTENT_WIDTH = 595.28 - 2 * PAGE_MARGIN_X; // A4 width (595.28pt) - margins
const HALF_CONTENT_WIDTH = CONTENT_WIDTH / 2;
const QUARTER_CONTENT_WIDTH = CONTENT_WIDTH / 4;

// --- Colors ---
const COLOR_TEXT_HEADER = [0, 0, 0]; // Black
const COLOR_TEXT_BODY = [50, 50, 50]; // Dark Gray
const COLOR_TEXT_LABEL = [0, 0, 0]; // Black for labels
const COLOR_BORDER_LIGHT = [200, 200, 200]; // Light gray for borders
const COLOR_BORDER_DARK = [100, 100, 100]; // Darker gray for important borders

// --- Font Sizes (pt) ---
const FONT_TITLE_MAIN = 16;
const FONT_TITLE_SECTION = 12;
const FONT_NORMAL_BOLD = 10;
const FONT_NORMAL = 9;
const FONT_SMALL = 8;

// --- Line Heights ---
const LINE_SPACING = 4; // Extra space between lines of text in a multi-line cell
const SECTION_SPACING = 15; // Space after a major section

// Helper to draw text with potential multi-line support
function drawText(doc: jsPDF, text: string | undefined | null, x: number, y: number, options: {
  fontSize?: number,
  fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic',
  color?: number[],
  maxWidth?: number,
  align?: 'left' | 'center' | 'right'
} = {}): number {
  const {
    fontSize = FONT_NORMAL,
    fontStyle = 'normal',
    color = COLOR_TEXT_BODY,
    maxWidth = CONTENT_WIDTH, // Default to full content width if not specified
    align = 'left'
  } = options;

  doc.setFontSize(fontSize);
  doc.setFont('helvetica', fontStyle);
  doc.setTextColor(color[0], color[1], color[2]);

  const lines = doc.splitTextToSize(text || '', maxWidth);
  let currentY = y;

  lines.forEach((line: string) => {
    let currentX = x;
    if (align === 'center') {
      currentX = x + (maxWidth - doc.getTextWidth(line)) / 2;
    } else if (align === 'right') {
      currentX = x + maxWidth - doc.getTextWidth(line);
    }
    doc.text(line, currentX, currentY);
    currentY += fontSize + LINE_SPACING;
  });
  return currentY - LINE_SPACING; // Return the y-position of the baseline of the last line
}

// Helper to draw a bordered box with a label and value (multi-line capable)
function drawLabeledBox(
  doc: jsPDF,
  label: string,
  value: string | undefined | null,
  x: number,
  y: number,
  width: number,
  options: {
    labelFontSize?: number,
    valueFontSize?: number,
    minHeight?: number,
    borderColor?: number[],
    borderWidth?: number,
    valueAlign?: 'left' | 'center' | 'right'
  } = {}
): number {
  const {
    labelFontSize = FONT_SMALL,
    valueFontSize = FONT_NORMAL,
    minHeight = 0,
    borderColor = COLOR_BORDER_LIGHT,
    borderWidth = 0.5,
    valueAlign = 'left'
  } = options;

  // Draw Label (above the box or inside if preferred)
  const labelY = y + labelFontSize + LINE_SPACING / 2;
  drawText(doc, label, x + 3, labelY, { fontSize: labelFontSize, fontStyle: 'bold', color: COLOR_TEXT_LABEL });
  const afterLabelY = labelY + LINE_SPACING;

  // Calculate value height
  doc.setFontSize(valueFontSize);
  const valueLines = doc.splitTextToSize(value || ' ', width - 6); // -6 for padding
  let valueHeight = (valueFontSize + LINE_SPACING) * valueLines.length - LINE_SPACING;
  valueHeight = Math.max(valueHeight, minHeight - (afterLabelY - y) - 3); // Ensure min height for box content area

  const boxY = afterLabelY;
  const boxHeight = valueHeight + 6; // 3pt padding top/bottom for value
  const totalCellHeight = boxY - y + boxHeight;

  // Draw Box
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(borderWidth);
  doc.rect(x, boxY, width, boxHeight);

  // Draw Value
  drawText(doc, value, x + 3, boxY + valueFontSize + 1.5, { // 1.5 for padding
    fontSize: valueFontSize,
    maxWidth: width - 6,
    align: valueAlign
  });

  return y + totalCellHeight;
}


export function generateExportDocumentPdf(
  docData: ExportDocument,
  exporter: Company | undefined,
  client: Client | undefined,
  manufacturer: Manufacturer | undefined,
  bank: Bank | undefined,
  allSizes: Size[],
  allProducts: Product[]
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let yPos = PAGE_MARGIN_Y_TOP;

  // --- 1. Main Document Title ---
  yPos = drawText(doc, "EXPORT INVOICE / PACKING LIST", PAGE_MARGIN_X, yPos, {
    fontSize: FONT_TITLE_MAIN,
    fontStyle: 'bold',
    align: 'center',
    maxWidth: CONTENT_WIDTH
  });
  yPos += SECTION_SPACING * 0.75;

  // --- 2. Exporter and Invoice Details Table (2 columns) ---
  const exporterDetails = [
    exporter?.companyName || 'N/A',
    exporter?.address || 'N/A',
    `IEC: ${exporter?.iecNumber || 'N/A'}`,
    `GSTIN (Manufacturer): ${manufacturer?.gstNumber || 'N/A'}`
  ].join('\n');

  const invoiceDetails = [
    `Invoice No.: ${docData.exportInvoiceNumber}`,
    `Date: ${format(new Date(docData.exportInvoiceDate), 'dd-MMM-yyyy')}`,
    `PO No.: ${docData.purchaseOrderId ? allPOs.find(po => po.id === docData.purchaseOrderId)?.poNumber || 'N/A' : 'N/A'}`,
    `PI No.: ${docData.performaInvoiceId ? allPIs.find(pi => pi.id === docData.performaInvoiceId)?.invoiceNumber || 'N/A' : 'N/A'}`
  ].join('\n');
  
  // Use autoTable for a simple two-column layout for Exporter & Invoice details
  autoTable(doc, {
    startY: yPos,
    body: [[
      { content: exporterDetails, styles: { fontSize: FONT_NORMAL, cellPadding: {top: 2, right: 5, bottom: 2, left: 0} } },
      { content: invoiceDetails, styles: { fontSize: FONT_NORMAL, cellPadding: {top: 2, right: 0, bottom: 2, left: 5} } }
    ]],
    theme: 'plain',
    styles: {
      lineWidth: 0.25,
      lineColor: COLOR_BORDER_LIGHT,
    },
    columnStyles: {
      0: { cellWidth: HALF_CONTENT_WIDTH - 5 },
      1: { cellWidth: HALF_CONTENT_WIDTH + 5 } // Give a bit more space to invoice details
    },
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
    tableWidth: 'auto', // Let columns define width up to contentWidth
    didDrawPage: (data) => { yPos = data.cursor?.y || yPos; }
  });
  yPos += SECTION_SPACING * 0.5;


  // --- 3. Consignee and Other Details Table (2 columns) ---
  const consigneeDetails = [
    `Consignee:`,
    client?.companyName || 'N/A',
    client?.address || 'N/A',
    `Country: ${client?.country || 'N/A'}`
  ].join('\n');

  let notifyPartyDetails = 'Notify Party (if other than Consignee):\n';
  if (docData.notifyPartyLine1 || docData.notifyPartyLine2) {
    if (docData.notifyPartyLine1) notifyPartyDetails += `${docData.notifyPartyLine1}\n`;
    if (docData.notifyPartyLine2) notifyPartyDetails += docData.notifyPartyLine2;
  } else {
    notifyPartyDetails += 'Same as Consignee';
  }

  autoTable(doc, {
    startY: yPos,
    body: [[
      { content: consigneeDetails, styles: { fontSize: FONT_NORMAL, cellPadding: {top: 2, right: 5, bottom: 2, left: 0} } },
      { content: notifyPartyDetails, styles: { fontSize: FONT_NORMAL, cellPadding: {top: 2, right: 0, bottom: 2, left: 5} } }
    ]],
    theme: 'plain',
    styles: {
      lineWidth: 0.25,
      lineColor: COLOR_BORDER_LIGHT,
    },
    columnStyles: {
      0: { cellWidth: HALF_CONTENT_WIDTH - 5 },
      1: { cellWidth: HALF_CONTENT_WIDTH + 5 }
    },
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
    tableWidth: 'auto',
    didDrawPage: (data) => { yPos = data.cursor?.y || yPos; }
  });
   yPos += SECTION_SPACING * 0.5;

  // --- 4. Shipment Details Table (4 columns) ---
   const shipmentDetailsBody = [
    [
      { content: `Pre-Carriage by:\nN/A`, styles: {halign: 'left'} },
      { content: `Place of Receipt:\nN/A`, styles: {halign: 'left'} },
      { content: `Country of Origin of Goods:\n${docData.countryOfOrigin || 'INDIA'}`, styles: {halign: 'left'} },
      { content: `Country of Final Destination:\n${docData.countryOfFinalDestination || client?.country || 'N/A'}`, styles: {halign: 'left'} },
    ],
    [
      { content: `Vessel/Flight No:\n${docData.vesselFlightNo || 'N/A'}`, styles: {halign: 'left'} },
      { content: `Port of Loading:\n${docData.portOfLoading || 'N/A'}`, styles: {halign: 'left'} },
      { content: `Port of Discharge:\n${docData.portOfDischarge || 'N/A'}`, styles: {halign: 'left'} },
      { content: `Final Destination (Place of Delivery):\n${docData.finalDestination || 'N/A'}`, styles: {halign: 'left'} },
    ]
  ];

  autoTable(doc, {
    startY: yPos,
    body: shipmentDetailsBody,
    theme: 'grid', // Use grid for clear separation
    styles: {
      fontSize: FONT_SMALL,
      lineWidth: 0.25,
      lineColor: COLOR_BORDER_LIGHT,
      cellPadding: 2,
      valign: 'top'
    },
    columnStyles: { // Equal width for 4 columns
      0: { cellWidth: QUARTER_CONTENT_WIDTH },
      1: { cellWidth: QUARTER_CONTENT_WIDTH },
      2: { cellWidth: QUARTER_CONTENT_WIDTH },
      3: { cellWidth: QUARTER_CONTENT_WIDTH },
    },
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
    tableWidth: 'auto',
    didDrawPage: (data) => { yPos = data.cursor?.y || yPos; }
  });
  yPos += SECTION_SPACING * 0.5;

  // --- 5. Bank Details ---
  if (bank) {
    const bankInfo = [
      `Beneficiary's Bank:`,
      bank.bankName,
      bank.bankAddress,
      `Account No.: ${bank.accountNumber}`,
      `SWIFT Code: ${bank.swiftCode}`,
      `IFSC Code: ${bank.ifscCode}`
    ].join('\n');
    yPos = drawText(doc, bankInfo, PAGE_MARGIN_X, yPos, { fontSize: FONT_SMALL, maxWidth: CONTENT_WIDTH });
    yPos += SECTION_SPACING * 0.5;
  }


  // --- Table for Containers and Products ---
  // This will be complex and will be the next step.
  yPos = drawText(doc, "CONTAINER AND PRODUCT DETAILS (To Be Implemented Here)", PAGE_MARGIN_X, yPos, {
    fontSize: FONT_TITLE_SECTION,
    fontStyle: 'bold',
    align: 'center',
    maxWidth: CONTENT_WIDTH
  });
  yPos += SECTION_SPACING;


  // --- Final Totals (Placeholder for now) ---
  yPos = drawText(doc, `Total Invoice Value (${docData.currencyType || 'USD'}): ${docData.totalInvoiceValue?.toFixed(2) || '0.00'}`, PAGE_MARGIN_X, yPos, {
    fontSize: FONT_NORMAL_BOLD,
    fontStyle: 'bold',
    align: 'right',
    maxWidth: CONTENT_WIDTH
  });
  const amountInWordsStr = amountToWords(docData.totalInvoiceValue || 0, docData.currencyType || 'USD');
  yPos = drawText(doc, `Amount in Words: ${amountInWordsStr.toUpperCase()}`, PAGE_MARGIN_X, yPos, {
    fontSize: FONT_SMALL,
    fontStyle: 'bold',
    align: 'left',
    maxWidth: CONTENT_WIDTH
  });
  yPos += SECTION_SPACING;


  // --- Declaration & Signature (Placeholder) ---
  const declaration = "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.";
  yPos = drawText(doc, "Declaration:", PAGE_MARGIN_X, yPos, { fontSize: FONT_SMALL, fontStyle: 'bold' });
  yPos = drawText(doc, declaration, PAGE_MARGIN_X, yPos, { fontSize: FONT_SMALL, maxWidth: CONTENT_WIDTH });
  yPos += SECTION_SPACING * 1.5;

  yPos = drawText(doc, `For ${exporter?.companyName || 'Exporter Name'}`, PAGE_MARGIN_X + HALF_CONTENT_WIDTH, yPos, {
      fontSize: FONT_NORMAL_BOLD,
      fontStyle: 'bold',
      align: 'center',
      maxWidth: HALF_CONTENT_WIDTH
  });
  yPos += 40; // Space for signature
  yPos = drawText(doc, "Authorised Signatory", PAGE_MARGIN_X + HALF_CONTENT_WIDTH, yPos, {
      fontSize: FONT_NORMAL_BOLD,
      fontStyle: 'bold',
      align: 'center',
      maxWidth: HALF_CONTENT_WIDTH
  });


  // --- Save the PDF ---
  // Helper data from localStorage that was passed to the main page and then here
  // This is just to make TypeScript happy for now as they are not used in this stage of PDF generation
  const allPOs: PurchaseOrder[] = JSON.parse(localStorage.getItem("bizform_purchase_orders") || "[]");
  const allPIs: PerformaInvoice[] = JSON.parse(localStorage.getItem("bizform_performa_invoices") || "[]");

  doc.save(`Export_Document_${docData.exportInvoiceNumber.replace(/[\\/:*?"<>|]/g, '_')}.pdf`);
}

    