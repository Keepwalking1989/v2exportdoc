
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
const FONT_SECTION_LABEL_HEADER = 8;
const FONT_CONTENT_PRIMARY = 8;
const FONT_TABLE_HEAD = 7.5;
const FONT_TABLE_BODY = 7.5;
const FONT_FOOTER_LABEL_BLUE_BG = 7;
const FONT_FOOTER_CONTENT = 7;
const FONT_FOOTER_LABEL_BOLD = 7;
const FONT_SIGNATURE = 8;

// --- Line Heights (pt) - Give a bit more room to prevent overlap ---
const LH_PACKED = 1.8; // Additional height over font size for packed lines
const LH_SINGLE = 2.0; // Additional height over font size for single distinct lines

// --- Element Heights ---
const BLUE_BG_LABEL_HEIGHT = FONT_SECTION_LABEL_HEADER + 4; // Font size + padding

// --- Spacing (pt) ---
const SPACE_AFTER_MAIN_TITLE = 4;
const SPACE_BETWEEN_HEADER_SECTIONS = 1.5;
const SPACE_AFTER_HORIZONTAL_LINE = 2;
const SPACE_BEFORE_TABLE = 3;
const SPACE_AFTER_TABLE = 4;
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
  const halfContentWidth = contentWidth / 2 - 5; // -5 for a small gutter

  doc.setFont('helvetica');

  // --- MAIN TITLE ---
  doc.setFontSize(FONT_MAIN_TITLE);
  doc.setFont('helvetica', 'bold');
  doc.text('PROFORMA INVOICE', pageWidth / 2, yPos, { align: 'center' });
  yPos += FONT_MAIN_TITLE + SPACE_AFTER_MAIN_TITLE;

  const drawTextLines = (
    text: string | string[],
    x: number,
    currentY: number,
    fontSize: number,
    style: 'normal' | 'bold',
    lineHeightIncrement: number, // Total height for one line (font + increment)
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
      doc.text(line, x, newY + fontSize, { align }); // Add fontSize for baseline
      newY += fontSize + lineHeightIncrement;
    });
    return newY - (fontSize + lineHeightIncrement); // Return Y of last line's end
  };

  // --- TOP SECTION: EXPORTER & CONSIGNEE ---
  let exporterY = yPos;
  exporterY = drawTextLines(exporter.companyName.toUpperCase(), PAGE_MARGIN_X, exporterY, FONT_CONTENT_PRIMARY, 'bold', LH_PACKED) + FONT_CONTENT_PRIMARY + LH_PACKED;
  exporterY = drawTextLines(exporter.address, PAGE_MARGIN_X, exporterY, FONT_CONTENT_PRIMARY, 'normal', LH_PACKED, halfContentWidth) + FONT_CONTENT_PRIMARY + LH_PACKED;
  
  let consigneeY = yPos;
  consigneeY = drawTextLines(client.companyName.toUpperCase(), PAGE_MARGIN_X + halfContentWidth + 10, consigneeY, FONT_CONTENT_PRIMARY, 'bold', LH_PACKED) + FONT_CONTENT_PRIMARY + LH_PACKED;
  consigneeY = drawTextLines(client.address, PAGE_MARGIN_X + halfContentWidth + 10, consigneeY, FONT_CONTENT_PRIMARY, 'normal', LH_PACKED, halfContentWidth) + FONT_CONTENT_PRIMARY + LH_PACKED;

  yPos = Math.max(exporterY, consigneeY) - (FONT_CONTENT_PRIMARY + LH_PACKED) + SPACE_BETWEEN_HEADER_SECTIONS;


  // --- MID SECTION: Invoice Date/No & Final Destination ---
  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(PAGE_MARGIN_X, yPos, contentWidth, BLUE_BG_LABEL_HEIGHT, 'F');

  const invDateStr = `${invoice.invoiceNumber} / ${format(new Date(invoice.invoiceDate), 'dd-MM-yyyy')}`;
  drawTextLines(invDateStr, PAGE_MARGIN_X + 2, yPos, FONT_SECTION_LABEL_HEADER, 'normal', LH_SINGLE, halfContentWidth - 4, COLOR_BLACK_RGB);
  drawTextLines(invoice.finalDestination, PAGE_MARGIN_X + halfContentWidth + 10 + 2, yPos, FONT_SECTION_LABEL_HEADER, 'normal', LH_SINGLE, halfContentWidth - 4, COLOR_BLACK_RGB);
  yPos += BLUE_BG_LABEL_HEIGHT + SPACE_BETWEEN_HEADER_SECTIONS;

  // --- BOTTOM HEADER SECTION: IEC Code & Terms ---
  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(PAGE_MARGIN_X, yPos, contentWidth, BLUE_BG_LABEL_HEIGHT, 'F');
  
  drawTextLines(exporter.iecNumber, PAGE_MARGIN_X + 2, yPos, FONT_SECTION_LABEL_HEADER, 'normal', LH_SINGLE, halfContentWidth - 4, COLOR_BLACK_RGB);
  drawTextLines(invoice.termsAndConditions, PAGE_MARGIN_X + halfContentWidth + 10 + 2, yPos, FONT_SECTION_LABEL_HEADER, 'normal', LH_PACKED, halfContentWidth -4, COLOR_BLACK_RGB);
  yPos += BLUE_BG_LABEL_HEIGHT + SPACE_BEFORE_TABLE;


  // --- PRODUCT TABLE ---
  const tableHead = [['S. No.', 'HSN Code', 'Goods Description', 'SQM', `Rate/${invoice.currencyType}`, `Amount/${invoice.currencyType}`]];
  const tableBody = invoice.items.map((item, index) => {
    const product = allProducts.find(p => p.id === item.productId);
    const size = allSizes.find(s => s.id === item.sizeId);
    const goodsDesc = `${product?.designName || 'N/A'} ${size?.size || 'N/A'}\n${product?.designName || 'N/A'} MATT`;
    
    return [
      (index + 1).toString(),
      size?.hsnCode || 'N/A',
      goodsDesc,
      item.quantitySqmt?.toFixed(2) || '0.00',
      item.ratePerSqmt.toFixed(2),
      item.amount?.toFixed(2) || '0.00',
    ];
  });

  const emptyRowsNeeded = 6 - tableBody.length;
  if (emptyRowsNeeded > 0) {
    for (let i = 0; i < emptyRowsNeeded; i++) {
      tableBody.push(['', '', '', '', '', '']);
    }
  }
  
  const tableFootData = [
    [{ content: 'SUB TOTAL', colSpan: 5, styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold' } }, { content: (invoice.subTotal || 0).toFixed(2), styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold'} }],
    [{ content: 'FREIGHT CHARGES', colSpan: 5, styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold' } }, { content: (invoice.freight || 0).toFixed(2), styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold' } }],
    [{ content: 'OTHER CHARGES', colSpan: 5, styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold' } }, { content: '0.00', styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold' } }],
    [{ content: 'GRAND TOTAL', colSpan: 5, styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold' } }, { content: (invoice.grandTotal || 0).toFixed(2), styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold' } }],
  ];

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    foot: tableFootData,
    startY: yPos,
    theme: 'grid',
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
    styles: { fontSize: FONT_TABLE_BODY, cellPadding: 1.5, lineColor: COLOR_TABLE_LINE, lineWidth: 0.5, valign: 'middle' },
    headStyles: { fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'normal', fontSize: FONT_TABLE_HEAD, cellPadding: 2, halign: 'center', valign: 'middle' },
    footStyles: { fontSize: FONT_TABLE_HEAD, cellPadding: 1.5,  lineWidth: 0.5, lineColor: COLOR_TABLE_LINE, valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 35, halign: 'center' }, 
      1: { cellWidth: 55, halign: 'center' }, 
      2: { cellWidth: 'auto' },            
      3: { cellWidth: 50, halign: 'right' },
      4: { cellWidth: 45, halign: 'right' },
      5: { cellWidth: 65, halign: 'right' },
    },
    didDrawPage: (data) => {
      yPos = data.cursor?.y ?? yPos;
    }
  });
  yPos += SPACE_AFTER_TABLE;

  // --- Total SQM & Amount in Words ---
  const totalSqmValue = invoice.items.reduce((sum, item) => sum + (item.quantitySqmt || 0), 0).toFixed(2);
  const amountInWordsStr = amountToWords(invoice.grandTotal || 0, invoice.currencyType);
  const totalSqmBlockHeight = FONT_FOOTER_LABEL_BLUE_BG + 4;

  // Total SQM
  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(PAGE_MARGIN_X, yPos, 40, totalSqmBlockHeight, 'F'); // Label bg
  drawTextLines("Total", PAGE_MARGIN_X + 2, yPos, FONT_FOOTER_LABEL_BLUE_BG, 'normal', LH_SINGLE, 36, COLOR_BLACK_RGB);
  
  doc.setDrawColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.rect(PAGE_MARGIN_X + 40, yPos, 60, totalSqmBlockHeight, 'S'); // Value box
  drawTextLines(totalSqmValue, PAGE_MARGIN_X + 40 + 5, yPos, FONT_FOOTER_LABEL_BLUE_BG, 'bold', LH_SINGLE, 50, COLOR_BLACK_RGB, 'center');

  // Amount in Words
  const amountWordsLabelX = PAGE_MARGIN_X + 40 + 60 + 5;
  const amountWordsValueMaxWidth = contentWidth - (40 + 60 + 5);

  drawTextLines(amountInWordsStr.toUpperCase(), amountWordsLabelX, yPos, FONT_FOOTER_LABEL_BLUE_BG, 'bold', LH_SINGLE, amountWordsValueMaxWidth, COLOR_BLACK_RGB);
  yPos += totalSqmBlockHeight + SPACE_FOOTER_SECTION_GAP;


  // --- Note ---
  let noteY = yPos;
  if (invoice.note) {
    noteY = drawTextLines("Note:", PAGE_MARGIN_X, noteY, FONT_FOOTER_LABEL_BOLD, 'bold', LH_SINGLE) + FONT_FOOTER_LABEL_BOLD + LH_SINGLE;
    const noteLines = invoice.note.split('\n');
    noteLines.forEach(line => {
      let style: 'bold' | 'normal' = 'normal';
      const keywordsToBold = ["TRANSSHIPMENT ALLOWED.", "PARTIAL SHIPMENT ALLOWED.", "SHIPMENT : AS EARLY AS POSSIBLE.", "QUANTITY AND VALUE +/-10% ALLOWED.", "NOT ACCEPTED ANY REFUND OR EXCHANGE .", "ANY TRANSACTION CHARGES WILL BE PAIDED BY CONSIGNEE."];
      if (keywordsToBold.some(kw => line.toUpperCase().trim().startsWith(kw))) {
        style = 'bold';
      }
      noteY = drawTextLines(line, PAGE_MARGIN_X, noteY, FONT_FOOTER_CONTENT, style, LH_PACKED, contentWidth) + FONT_FOOTER_CONTENT + LH_PACKED;
    });
  }
  yPos = noteY; // Use the Y from note processing

  // --- Beneficiary Details ---
  let beneficiaryY = yPos + SPACE_FOOTER_SECTION_GAP;
  if (selectedBank) {
    beneficiaryY = drawTextLines("BENEFICIARY DETAILS:", PAGE_MARGIN_X, beneficiaryY, FONT_FOOTER_LABEL_BOLD, 'bold', LH_SINGLE) + FONT_FOOTER_LABEL_BOLD + LH_SINGLE;
    beneficiaryY = drawTextLines(`BENEFICIARY NAME: ${selectedBank.bankName.toUpperCase()}`, PAGE_MARGIN_X, beneficiaryY, FONT_FOOTER_CONTENT, 'normal', LH_PACKED, contentWidth) + FONT_FOOTER_CONTENT + LH_PACKED;
    beneficiaryY = drawTextLines(`BENEFICIARY BANK: HDFC BANK, BRANCH: ${selectedBank.bankAddress.toUpperCase()}`, PAGE_MARGIN_X, beneficiaryY, FONT_FOOTER_CONTENT, 'normal', LH_PACKED, contentWidth) + FONT_FOOTER_CONTENT + LH_PACKED;
    beneficiaryY = drawTextLines(`BENEFICIARY BANK ADDRESS: N/A`, PAGE_MARGIN_X, beneficiaryY, FONT_FOOTER_CONTENT, 'normal', LH_PACKED, contentWidth) + FONT_FOOTER_CONTENT + LH_PACKED;
    beneficiaryY = drawTextLines(`BENEFICIARY A/C NO: ${selectedBank.accountNumber}, SWIFT CODE: ${selectedBank.swiftCode.toUpperCase()}, IFSC CODE: ${selectedBank.ifscCode.toUpperCase()}`, PAGE_MARGIN_X, beneficiaryY, FONT_FOOTER_CONTENT, 'normal', LH_PACKED, contentWidth) + FONT_FOOTER_CONTENT + LH_PACKED;
  }
  yPos = beneficiaryY;

  // --- Declaration ---
  let declarationY = yPos + SPACE_FOOTER_SECTION_GAP;
  declarationY = drawTextLines("Declaration:", PAGE_MARGIN_X, declarationY, FONT_FOOTER_LABEL_BOLD, 'bold', LH_SINGLE) + FONT_FOOTER_LABEL_BOLD + LH_SINGLE;
  declarationY = drawTextLines("Certified that the particulars given above are true and correct.", PAGE_MARGIN_X, declarationY, FONT_FOOTER_CONTENT, 'normal', LH_PACKED, contentWidth) + FONT_FOOTER_CONTENT + LH_PACKED;
  yPos = declarationY + SPACE_FOOTER_SECTION_GAP + 10;

  // --- Signature ---
  const signatureTextLine1 = `FOR, ${exporter.companyName.toUpperCase()}`;
  const signatureTextLine2 = "AUTHORISED SIGNATURE";
  
  const signatureBlockHeight = (FONT_SIGNATURE + LH_SINGLE) * 3; // Approx height for signature block
  if (yPos + signatureBlockHeight > doc.internal.pageSize.getHeight() - PAGE_MARGIN_Y_BOTTOM) {
    doc.addPage();
    yPos = PAGE_MARGIN_Y_TOP;
  }

  const sig1Y = yPos;
  const sig2Y = sig1Y + (FONT_SIGNATURE + LH_SINGLE) * 2; // Position for "AUTHORISED SIGNATURE"

  drawTextLines(signatureTextLine1, pageWidth - PAGE_MARGIN_X, sig1Y, FONT_SIGNATURE, 'bold', LH_SINGLE, undefined, COLOR_BLACK_RGB, 'right');
  
  // Draw line for signature
  const sigLineWidth = Math.max(doc.getTextWidth(signatureTextLine1), doc.getTextWidth(signatureTextLine2)) + 10;
  doc.setDrawColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.setLineWidth(0.8);
  doc.line(pageWidth - PAGE_MARGIN_X - sigLineWidth, sig2Y - (FONT_SIGNATURE + LH_SINGLE) * 0.5, pageWidth - PAGE_MARGIN_X, sig2Y - (FONT_SIGNATURE + LH_SINGLE) * 0.5);

  drawTextLines(signatureTextLine2, pageWidth - PAGE_MARGIN_X, sig2Y, FONT_SIGNATURE, 'bold', LH_SINGLE, undefined, COLOR_BLACK_RGB, 'right');

  doc.save(`Performa_Invoice_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
}
