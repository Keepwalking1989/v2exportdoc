
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { PerformaInvoice } from '@/types/performa-invoice';
import type { Company } from '@/types/company';
import type { Client } from '@/types/client';
import type { Size } from '@/types/size';
import type { Product } from '@/types/product';
import type { Bank } from '@/types/bank';
import { amountToWords } from '@/lib/utils';

// --- Page & General Layout (Using Points) ---
const PAGE_MARGIN_X = 28; // pt (approx 10mm)
const PAGE_MARGIN_Y_TOP = 20; // pt
const PAGE_MARGIN_Y_BOTTOM = 20; // pt

// --- Colors ---
const COLOR_BLUE_RGB = [217, 234, 247]; // Light blue for backgrounds
const COLOR_WHITE_RGB = [255, 255, 255];
const COLOR_BLACK_RGB = [0, 0, 0];
const COLOR_TABLE_LINE = [150, 150, 150]; // Grey for table lines

// --- Font Sizes (pt) ---
const FONT_MAIN_TITLE = 14;
const FONT_SECTION_LABEL_HEADER = 8; // EXPORTER, CONSIGNEE (Black text)
const FONT_SECTION_LABEL_BLUE_BG = 7.5; // Invoice Date, IEC Code (White text on Blue BG)
const FONT_CONTENT_PRIMARY = 8; // Main text like company names, addresses
const FONT_CONTENT_SMALL = 7.5; // Smaller content text like invoice values
const FONT_TABLE_HEAD = 7.5;
const FONT_TABLE_BODY = 7.5;
const FONT_FOOTER_LABEL_BLUE_BG = 7.5; // Total SQM, Amount in Words Label
const FONT_FOOTER_CONTENT = 7;     // Note, Beneficiary, Declaration content
const FONT_FOOTER_LABEL_BOLD = 7.5;  // Note:, Beneficiary Details:
const FONT_SIGNATURE = 8;

// --- Line Heights (pt) - EXTREMELY TIGHT based on image ---
const LH_PACKED = 0.1; // Additional height over font size for packed lines (e.g., address lines)
const LH_SINGLE = 0.5; // Additional height over font size for single distinct lines

// --- Element Heights (estimations based on font + packed line height for multi-line) ---
const HEADER_BLOCK_CONTENT_LINE_HEIGHT = FONT_CONTENT_PRIMARY + LH_PACKED;
const BLUE_BG_LABEL_HEIGHT = FONT_SECTION_LABEL_BLUE_BG + 3; // A bit of padding for blue bg

// --- Spacing (pt) ---
const SPACE_AFTER_MAIN_TITLE = 5;
const SPACE_BETWEEN_HEADER_SECTIONS = 1; // Minimal space between Exporter/Consignee and InvDate/FinalDest
const SPACE_AFTER_HORIZONTAL_LINE = 1;
const SPACE_BEFORE_TABLE = 2;
const SPACE_AFTER_TABLE = 5;
const SPACE_FOOTER_SECTION_GAP = 3;

export function generatePerformaInvoicePdf(
  invoice: PerformaInvoice,
  exporter: Company,
  client: Client,
  allSizes: Size[],
  allProducts: Product[],
  selectedBank?: Bank
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let yPos = PAGE_MARGIN_Y_TOP;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 2 * PAGE_MARGIN_X;
  const halfContentWidth = contentWidth / 2 - 5; // -5 for a small gutter between columns

  doc.setFont('helvetica');

  // --- MAIN TITLE ---
  doc.setFontSize(FONT_MAIN_TITLE);
  doc.setFont('helvetica', 'bold');
  doc.text('PROFORMA INVOICE', pageWidth / 2, yPos, { align: 'center' });
  yPos += FONT_MAIN_TITLE + SPACE_AFTER_MAIN_TITLE;

  // --- Helper to draw text and manage yPos ---
  const drawTextLines = (
    text: string | string[],
    x: number,
    currentY: number,
    fontSize: number,
    style: 'normal' | 'bold',
    lineHeightIncrement: number,
    maxWidth?: number,
    color: number[] = COLOR_BLACK_RGB,
    align: 'left' | 'center' | 'right' = 'left'
  ): number => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', style);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = Array.isArray(text) ? text : (maxWidth ? doc.splitTextToSize(text || '', maxWidth) : [text || '']);
    let newY = currentY;
    lines.forEach(line => {
      doc.text(line, x, newY, { align });
      newY += fontSize + lineHeightIncrement;
    });
    return newY - (fontSize + lineHeightIncrement); // Return Y of last line baseline
  };


  // --- TOP SECTION: EXPORTER & CONSIGNEE ---
  const exporterLabelY = yPos;
  doc.setFontSize(FONT_SECTION_LABEL_HEADER);
  doc.setFont('helvetica', 'bold');
  doc.text('EXPORTER', PAGE_MARGIN_X, exporterLabelY + FONT_SECTION_LABEL_HEADER);
  const consigneeLabelY = yPos;
  doc.text('CONSIGNEE', PAGE_MARGIN_X + halfContentWidth + 10, consigneeLabelY + FONT_SECTION_LABEL_HEADER);
  
  const exporterStartY = exporterLabelY + FONT_SECTION_LABEL_HEADER + LH_SINGLE;
  let currentExporterY = exporterStartY;
  currentExporterY = drawTextLines(exporter.companyName, PAGE_MARGIN_X, currentExporterY, FONT_CONTENT_PRIMARY, 'bold', LH_PACKED, halfContentWidth) + HEADER_BLOCK_CONTENT_LINE_HEIGHT;
  currentExporterY = drawTextLines(exporter.address, PAGE_MARGIN_X, currentExporterY, FONT_CONTENT_PRIMARY, 'normal', LH_PACKED, halfContentWidth) + HEADER_BLOCK_CONTENT_LINE_HEIGHT;

  const consigneeStartY = consigneeLabelY + FONT_SECTION_LABEL_HEADER + LH_SINGLE;
  let currentConsigneeY = consigneeStartY;
  currentConsigneeY = drawTextLines(client.companyName, PAGE_MARGIN_X + halfContentWidth + 10, currentConsigneeY, FONT_CONTENT_PRIMARY, 'bold', LH_PACKED, halfContentWidth) + HEADER_BLOCK_CONTENT_LINE_HEIGHT;
  currentConsigneeY = drawTextLines(client.address, PAGE_MARGIN_X + halfContentWidth + 10, currentConsigneeY, FONT_CONTENT_PRIMARY, 'normal', LH_PACKED, halfContentWidth) + HEADER_BLOCK_CONTENT_LINE_HEIGHT;
  
  yPos = Math.max(currentExporterY, currentConsigneeY) - (FONT_CONTENT_PRIMARY + LH_PACKED) + SPACE_BETWEEN_HEADER_SECTIONS + 5; // +5 to give a bit more space before line

  // --- Horizontal Line 1 ---
  doc.setDrawColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.setLineWidth(0.5);
  doc.line(PAGE_MARGIN_X, yPos, pageWidth - PAGE_MARGIN_X, yPos);
  yPos += SPACE_AFTER_HORIZONTAL_LINE;

  // --- MID SECTION: Invoice Date/No & Final Destination ---
  const invDateLabel = "Invoice Date And Number";
  const finalDestLabel = "Final Destination";
  
  // Blue background for InvDate Label
  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(PAGE_MARGIN_X, yPos, halfContentWidth, BLUE_BG_LABEL_HEIGHT, 'F');
  drawTextLines(invDateLabel, PAGE_MARGIN_X + 2, yPos + FONT_SECTION_LABEL_BLUE_BG * 0.9, FONT_SECTION_LABEL_BLUE_BG, 'bold', LH_PACKED, halfContentWidth - 4, COLOR_WHITE_RGB);
  
  // Blue background for FinalDest Label
  doc.rect(PAGE_MARGIN_X + halfContentWidth + 10, yPos, halfContentWidth, BLUE_BG_LABEL_HEIGHT, 'F');
  drawTextLines(finalDestLabel, PAGE_MARGIN_X + halfContentWidth + 10 + 2, yPos + FONT_SECTION_LABEL_BLUE_BG * 0.9, FONT_SECTION_LABEL_BLUE_BG, 'bold', LH_PACKED, halfContentWidth - 4, COLOR_WHITE_RGB);
  yPos += BLUE_BG_LABEL_HEIGHT + LH_SINGLE;

  const invDateValueY = yPos;
  const invDateStr = `${invoice.invoiceNumber} / ${format(new Date(invoice.invoiceDate), 'dd-MM-yyyy')}`;
  drawTextLines(invDateStr, PAGE_MARGIN_X + 2, invDateValueY, FONT_CONTENT_SMALL, 'normal', LH_PACKED, halfContentWidth - 4);

  const finalDestValueY = yPos;
  drawTextLines(invoice.finalDestination, PAGE_MARGIN_X + halfContentWidth + 10 + 2, finalDestValueY, FONT_CONTENT_SMALL, 'normal', LH_PACKED, halfContentWidth - 4);
  yPos += FONT_CONTENT_SMALL + LH_PACKED + SPACE_BETWEEN_HEADER_SECTIONS;

  // --- Horizontal Line 2 ---
  doc.line(PAGE_MARGIN_X, yPos, pageWidth - PAGE_MARGIN_X, yPos);
  yPos += SPACE_AFTER_HORIZONTAL_LINE;

  // --- BOTTOM HEADER SECTION: IEC Code & Terms ---
  const iecLabel = "IEC. Code";
  const termsLabel = "Terms And Conditions Of Delivery And Payment";

  // Blue background for IEC Label
  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(PAGE_MARGIN_X, yPos, halfContentWidth, BLUE_BG_LABEL_HEIGHT, 'F');
  drawTextLines(iecLabel, PAGE_MARGIN_X + 2, yPos + FONT_SECTION_LABEL_BLUE_BG * 0.9, FONT_SECTION_LABEL_BLUE_BG, 'bold', LH_PACKED, halfContentWidth - 4, COLOR_WHITE_RGB);

  // Blue background for Terms Label
  doc.rect(PAGE_MARGIN_X + halfContentWidth + 10, yPos, halfContentWidth, BLUE_BG_LABEL_HEIGHT, 'F');
  drawTextLines(termsLabel, PAGE_MARGIN_X + halfContentWidth + 10 + 2, yPos + FONT_SECTION_LABEL_BLUE_BG * 0.9, FONT_SECTION_LABEL_BLUE_BG, 'bold', LH_PACKED, halfContentWidth - 4, COLOR_WHITE_RGB);
  yPos += BLUE_BG_LABEL_HEIGHT + LH_SINGLE;

  const iecValueY = yPos;
  let iecEndY = drawTextLines(exporter.iecNumber, PAGE_MARGIN_X + 2, iecValueY, FONT_CONTENT_SMALL, 'normal', LH_PACKED, halfContentWidth - 4) + (FONT_CONTENT_SMALL + LH_PACKED);
  
  const termsValueY = yPos;
  let termsEndY = drawTextLines(invoice.termsAndConditions, PAGE_MARGIN_X + halfContentWidth + 10 + 2, termsValueY, FONT_CONTENT_SMALL, 'normal', LH_PACKED, halfContentWidth - 4) + (FONT_CONTENT_SMALL + LH_PACKED);

  yPos = Math.max(iecEndY, termsEndY) + SPACE_BEFORE_TABLE;


  // --- PRODUCT TABLE ---
  const tableHead = [['S. No.', 'HSN Code', 'Goods Description', 'SQM', `Rate/${invoice.currencyType}`, `Amount/${invoice.currencyType}`]];
  const tableBody = invoice.items.map((item, index) => {
    const product = allProducts.find(p => p.id === item.productId);
    const size = allSizes.find(s => s.id === item.sizeId);
    const goodsDesc = `${product?.designName || 'N/A'} (${size?.size || 'N/A'})\n${product?.designName || 'N/A'} MATT`; // Example, adjust if design name should be different for 2nd line. For image match, it was same
    
    return [
      (index + 1).toString(),
      size?.hsnCode || 'N/A',
      goodsDesc,
      item.quantitySqmt?.toFixed(2) || '0.00',
      item.ratePerSqmt.toFixed(2),
      item.amount?.toFixed(2) || '0.00',
    ];
  });

  // Add empty rows to match image (approx 6 total rows shown in item part)
  const totalRowsInImageItemSection = 6;
  const emptyRowsToAdd = Math.max(0, totalRowsInImageItemSection - tableBody.length);
  for (let i = 0; i < emptyRowsToAdd; i++) {
    tableBody.push(['', '', '', '', '', '']);
  }
  
  const tableFootData = [
    [{ content: 'SUB TOTAL', colSpan: 5, styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_WHITE_RGB, fontStyle: 'bold' } }, { content: (invoice.subTotal || 0).toFixed(2), styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold'} }],
    [{ content: 'FREIGHT CHARGES', colSpan: 5, styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_WHITE_RGB, fontStyle: 'bold' } }, { content: (invoice.freight || 0).toFixed(2), styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold' } }],
    [{ content: 'OTHER CHARGES', colSpan: 5, styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_WHITE_RGB, fontStyle: 'bold' } }, { content: '0.00', styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold' } }],
    [{ content: 'GRAND TOTAL', colSpan: 5, styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_WHITE_RGB, fontStyle: 'bold' } }, { content: (invoice.grandTotal || 0).toFixed(2), styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold' } }],
  ];

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    foot: tableFootData,
    startY: yPos,
    theme: 'grid',
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
    styles: { fontSize: FONT_TABLE_BODY, cellPadding: 1, lineColor: COLOR_TABLE_LINE, lineWidth: 0.5 },
    headStyles: { fillColor: COLOR_BLUE_RGB, textColor: COLOR_WHITE_RGB, fontStyle: 'bold', fontSize: FONT_TABLE_HEAD, cellPadding: 2, halign: 'center' },
    footStyles: { fontSize: FONT_TABLE_HEAD, cellPadding: 2,  lineWidth: 0.5, lineColor: COLOR_TABLE_LINE },
    columnStyles: {
      0: { cellWidth: 35, halign: 'center' }, // S. No.
      1: { cellWidth: 55, halign: 'center' }, // HSN Code
      2: { cellWidth: 'auto' },            // Goods Description
      3: { cellWidth: 50, halign: 'right' },// SQM
      4: { cellWidth: 45, halign: 'right' },// Rate
      5: { cellWidth: 65, halign: 'right' },// Amount
    },
    didDrawPage: (data) => {
      yPos = data.cursor?.y ?? yPos;
    }
  });
  yPos += SPACE_AFTER_TABLE;

  // --- Total SQM & Amount in Words ---
  const totalSqmLabel = "Total SQM";
  const totalSqmValue = invoice.items.reduce((sum, item) => sum + (item.quantitySqmt || 0), 0).toFixed(2);
  const amountInWordsLabel = "TOTAL INVOICE AMOUNT IN WORDS:";
  const amountInWordsStr = amountToWords(invoice.grandTotal || 0, invoice.currencyType);

  const totalSqmValueWidth = doc.getTextWidth(totalSqmValue) + 10;
  const totalSqmLabelWidth = doc.getTextWidth(totalSqmLabel) + 5;
  const totalSqmBlockWidth = totalSqmLabelWidth + totalSqmValueWidth + 5;
  
  // Blue BG for Total SQM Label
  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(PAGE_MARGIN_X, yPos, totalSqmLabelWidth, FONT_FOOTER_LABEL_BLUE_BG + 4, 'F');
  drawTextLines(totalSqmLabel, PAGE_MARGIN_X + 2, yPos + FONT_FOOTER_LABEL_BLUE_BG * 0.9, FONT_FOOTER_LABEL_BLUE_BG, 'bold', LH_PACKED, totalSqmLabelWidth - 4, COLOR_WHITE_RGB);
  // Value for Total SQM
  doc.rect(PAGE_MARGIN_X + totalSqmLabelWidth, yPos, totalSqmValueWidth, FONT_FOOTER_LABEL_BLUE_BG + 4, 'S'); // Just border for value
  drawTextLines(totalSqmValue, PAGE_MARGIN_X + totalSqmLabelWidth + 5, yPos + FONT_FOOTER_LABEL_BLUE_BG * 0.9, FONT_FOOTER_LABEL_BLUE_BG, 'bold', LH_PACKED, totalSqmValueWidth - 10, COLOR_BLACK_RGB, 'center');

  const amountWordsLabelX = PAGE_MARGIN_X + totalSqmBlockWidth + 5;
  const amountWordsLabelWidth = doc.getTextWidth(amountInWordsLabel) + 10; // Corrected variable name
  const amountWordsValueMaxWidth = contentWidth - totalSqmBlockWidth - 5 - 5; // Remaining width

  // Blue BG for Amount in Words Label
  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(amountWordsLabelX, yPos, amountWordsLabelWidth, FONT_FOOTER_LABEL_BLUE_BG + 4, 'F');
  drawTextLines(amountInWordsLabel, amountWordsLabelX + 2, yPos + FONT_FOOTER_LABEL_BLUE_BG * 0.9, FONT_FOOTER_LABEL_BLUE_BG, 'bold', LH_PACKED, amountWordsLabelWidth - 4, COLOR_WHITE_RGB);
  
  yPos += FONT_FOOTER_LABEL_BLUE_BG + 4 + LH_SINGLE;
  // Value for Amount in Words (below its label)
  yPos = drawTextLines(amountInWordsStr, amountWordsLabelX, yPos, FONT_FOOTER_CONTENT, 'bold', LH_PACKED, amountWordsValueMaxWidth) + (FONT_FOOTER_CONTENT + LH_PACKED);
  yPos += SPACE_FOOTER_SECTION_GAP;


  // --- Note ---
  if (invoice.note) {
    yPos = drawTextLines("Note:", PAGE_MARGIN_X, yPos, FONT_FOOTER_LABEL_BOLD, 'bold', LH_SINGLE) + (FONT_FOOTER_LABEL_BOLD + LH_SINGLE);
    const noteLines = invoice.note.split('\n');
    let tempNoteY = yPos;
    noteLines.forEach(line => {
      let style: 'bold' | 'normal' = 'normal';
      // Specific bolding for keywords at the start of the line from image
      const keywordsToBold = ["PAYMENT:", "TRANSSHIPMENT ALLOWED.", "QUANTITY AND VALUE", "ANY TRANSACTION CHARGES"];
      if (keywordsToBold.some(kw => line.toUpperCase().trim().startsWith(kw))) {
        style = 'bold';
      }
      tempNoteY = drawTextLines(line, PAGE_MARGIN_X, tempNoteY, FONT_FOOTER_CONTENT, style, LH_PACKED, contentWidth) + (FONT_FOOTER_CONTENT + LH_PACKED);
    });
    yPos = tempNoteY;
    yPos += SPACE_FOOTER_SECTION_GAP;
  }

  // --- Beneficiary Details ---
  if (selectedBank) {
    yPos = drawTextLines("BENEFICIARY DETAILS:", PAGE_MARGIN_X, yPos, FONT_FOOTER_LABEL_BOLD, 'bold', LH_SINGLE) + (FONT_FOOTER_LABEL_BOLD + LH_SINGLE);
    yPos = drawTextLines(`BENEFICIARY NAME: ${selectedBank.bankName.toUpperCase()}`, PAGE_MARGIN_X, yPos, FONT_FOOTER_CONTENT, 'normal', LH_PACKED, contentWidth) + (FONT_FOOTER_CONTENT + LH_PACKED);
    yPos = drawTextLines(`BENEFICIARY BANK: HDFC, BRANCH: ${selectedBank.bankAddress.toUpperCase()}`, PAGE_MARGIN_X, yPos, FONT_FOOTER_CONTENT, 'normal', LH_PACKED, contentWidth) + (FONT_FOOTER_CONTENT + LH_PACKED); // Assuming branch is in address
    yPos = drawTextLines(`BENEFICIARY BANK ADDRESS: N/A`, PAGE_MARGIN_X, yPos, FONT_FOOTER_CONTENT, 'normal', LH_PACKED, contentWidth) + (FONT_FOOTER_CONTENT + LH_PACKED); // As per image
    yPos = drawTextLines(`BENEFICIARY A/C No: ${selectedBank.accountNumber}, SWIFT CODE: ${selectedBank.swiftCode.toUpperCase()}, IFSC CODE: ${selectedBank.ifscCode.toUpperCase()}`, PAGE_MARGIN_X, yPos, FONT_FOOTER_CONTENT, 'normal', LH_PACKED, contentWidth) + (FONT_FOOTER_CONTENT + LH_PACKED);
    yPos += SPACE_FOOTER_SECTION_GAP;
  }
  
  // --- Declaration ---
  yPos = drawTextLines("Declaration:", PAGE_MARGIN_X, yPos, FONT_FOOTER_LABEL_BOLD, 'bold', LH_SINGLE) + (FONT_FOOTER_LABEL_BOLD + LH_SINGLE);
  yPos = drawTextLines("Certified that the particulars given above are true and correct.", PAGE_MARGIN_X, yPos, FONT_FOOTER_CONTENT, 'normal', LH_PACKED, contentWidth) + (FONT_FOOTER_CONTENT + LH_PACKED);
  yPos += SPACE_FOOTER_SECTION_GAP + 10; // Extra space before signature

  // --- Signature ---
  const signatureTextLine1 = `FOR, ${exporter.companyName.toUpperCase()}`;
  const signatureTextLine2 = "AUTHORISED SIGNATURE";
  const signatureX = pageWidth - PAGE_MARGIN_X - (doc.getTextWidth(signatureTextLine2) > doc.getTextWidth(signatureTextLine1) ? doc.getTextWidth(signatureTextLine2) : doc.getTextWidth(signatureTextLine1) ) - 10 ; // Approx right align
  const signatureBlockWidth = Math.max(doc.getTextWidth(signatureTextLine1), doc.getTextWidth(signatureTextLine2)) + 20;


  if (yPos + (FONT_SIGNATURE + LH_SINGLE) * 2 + 10 > doc.internal.pageSize.getHeight() - PAGE_MARGIN_Y_BOTTOM) {
    doc.addPage();
    yPos = PAGE_MARGIN_Y_TOP;
  }

  yPos = drawTextLines(signatureTextLine1, pageWidth - PAGE_MARGIN_X, yPos, FONT_SIGNATURE, 'bold', LH_SINGLE, undefined, COLOR_BLACK_RGB, 'right') + (FONT_SIGNATURE + LH_SINGLE);
  yPos += (FONT_SIGNATURE + LH_SINGLE) * 1.5; // Space for the line
  doc.setLineWidth(0.8);
  doc.line(pageWidth - PAGE_MARGIN_X - signatureBlockWidth, yPos, pageWidth - PAGE_MARGIN_X, yPos);
  yPos += LH_SINGLE * 2;
  drawTextLines(signatureTextLine2, pageWidth - PAGE_MARGIN_X, yPos, FONT_SIGNATURE, 'bold', LH_SINGLE, undefined, COLOR_BLACK_RGB, 'right');

  doc.save(`Performa_Invoice_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
}
