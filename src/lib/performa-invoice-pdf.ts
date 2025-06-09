
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
const PAGE_MARGIN_X = 28.34; // pt (approx 10mm)
const PAGE_MARGIN_Y_TOP = 28.34; // pt (approx 10mm)
const PAGE_MARGIN_Y_BOTTOM = 28.34; // pt (approx 10mm)

// --- Colors ---
const COLOR_BLUE_RGB = [217, 234, 247]; // Light blue for backgrounds
const COLOR_BLACK_RGB = [0, 0, 0];
const COLOR_TABLE_LINE = [150, 150, 150]; // Medium gray for table lines

// --- Font Sizes (pt) ---
const FONT_MAIN_TITLE = 12;
const FONT_SECTION_LABEL_HEADER = 7.5; // For blue box labels like "INVOICE NO & DATE"
const FONT_CONTENT_PRIMARY = 8;    // For Exporter, Consignee names, addresses
const FONT_TABLE_HEAD = 7.5;
const FONT_TABLE_BODY = 7.5;
const FONT_FOOTER_TOTALS_LABEL_BLUE_BG = 7; // For "TOTAL SQM", "TOTAL INVOICE AMOUNT..."
const FONT_FOOTER_NOTE_LABEL_BOLD = 7;
const FONT_FOOTER_NOTE_CONTENT = 6.5;
const FONT_FOOTER_BANK_LABEL_BOLD = 7;
const FONT_FOOTER_BANK_CONTENT = 6.5;
const FONT_FOOTER_DECLARATION_LABEL_BOLD = 7;
const FONT_FOOTER_DECLARATION_CONTENT = 6.5;
const FONT_SIGNATURE = 8;

// --- Line Height Additions (pt) - Additional height over font size ---
const LH_MAIN_TITLE_ADDITION = 2.0;
const LH_PACKED_ADDITION = 1.8;      // For multi-line text blocks where lines are close (addresses)
const LH_SINGLE_ADDITION = 2.0;      // For single distinct lines or labels
const LH_FOOTER_PACKED_ADDITION = 1.5;
const LH_FOOTER_SINGLE_ADDITION = 1.8;

// --- Element Heights ---
const BLUE_BG_LABEL_HEIGHT = FONT_SECTION_LABEL_HEADER + 4; // Font size + vertical padding

// --- Spacing (pt) ---
const SPACE_AFTER_MAIN_TITLE = 4;
const SPACE_BETWEEN_HEADER_SECTIONS = 1.5; // Space between Exporter/Consignee block and line, and between line and InvoiceDate/Dest block
const SPACE_AFTER_HORIZONTAL_LINE = 2;   // Space after a line, before text
const SPACE_BEFORE_TABLE = 3;
const SPACE_AFTER_TABLE = 4;
const SPACE_FOOTER_SECTION_GAP = 3;    // Gap between footer sections like Note, Bank, Declaration
const SPACE_BEFORE_SIGNATURE = 10;


/**
 * Draws a block of text and returns the Y-coordinate for the baseline of the line *immediately following* this block.
 * @param doc The jsPDF document instance.
 * @param text The text string or array of strings.
 * @param x The x-coordinate.
 * @param currentY The baseline y-coordinate for the *first* line of text in this block.
 * @param fontSize The font size.
 * @param fontWeight The font weight ('normal' or 'bold').
 * @param fontStyle The font style ('normal' or 'italic').
 * @param lineHeightAddition The additional space to add after each line (on top of font size).
 * @param maxWidth Optional. Max width for text wrapping.
 * @param color Optional. Text color [r, g, b].
 * @param align Optional. Text alignment.
 * @returns The y-coordinate for the baseline of the line *immediately following* this block.
 */
function drawTextBlockAndGetEndY(
  doc: jsPDF,
  text: string | string[],
  x: number,
  currentY: number, // Baseline for the first line
  fontSize: number,
  fontWeight: 'normal' | 'bold',
  fontStyle: 'normal' | 'italic',
  lineHeightAddition: number,
  maxWidth?: number,
  color: number[] = COLOR_BLACK_RGB,
  align: 'left' | 'center' | 'right' = 'left'
): number {
  let combinedStyle = 'normal';
  if (fontWeight === 'bold' && fontStyle === 'italic') combinedStyle = 'bolditalic';
  else if (fontWeight === 'bold') combinedStyle = 'bold';
  else if (fontStyle === 'italic') combinedStyle = 'italic';
  doc.setFont('helvetica', combinedStyle);
  doc.setFontSize(fontSize);
  doc.setTextColor(color[0], color[1], color[2]);

  const lines = Array.isArray(text) ? text : (maxWidth ? doc.splitTextToSize(text || '', maxWidth) : [text || '']);
  let yBaselineForCurrentLine = currentY;

  lines.forEach(lineContent => {
    doc.text(lineContent, x, yBaselineForCurrentLine + fontSize, { align }); // Draw text (y is baseline)
    yBaselineForCurrentLine += (fontSize + lineHeightAddition); // Advance baseline for the next line in this block
  });

  return yBaselineForCurrentLine; // This is the Y for the baseline of the line *immediately following* this block
}


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
  const leftColumnX = PAGE_MARGIN_X;
  const rightColumnX = PAGE_MARGIN_X + halfContentWidth + 10;

  // --- MAIN TITLE ---
  yPos = drawTextBlockAndGetEndY(doc, 'PROFORMA INVOICE', pageWidth / 2, yPos, FONT_MAIN_TITLE, 'bold', 'normal', LH_MAIN_TITLE_ADDITION, undefined, COLOR_BLACK_RGB, 'center');
  yPos += SPACE_AFTER_MAIN_TITLE;

  // --- EXPORTER & CONSIGNEE ---
  // Store the starting Y for this dual-column section
  const headerBlockStartY = yPos;
  let exporterEndY = headerBlockStartY;
  let consigneeEndY = headerBlockStartY;

  // Exporter Details
  exporterEndY = drawTextBlockAndGetEndY(doc, "EXPORTER:", leftColumnX, exporterEndY, FONT_CONTENT_PRIMARY, 'bold', 'normal', LH_PACKED_ADDITION, halfContentWidth);
  exporterEndY += (FONT_CONTENT_PRIMARY + LH_PACKED_ADDITION); // Add double line space
  exporterEndY = drawTextBlockAndGetEndY(doc, exporter.companyName.toUpperCase(), leftColumnX, exporterEndY, FONT_CONTENT_PRIMARY, 'bold', 'normal', LH_PACKED_ADDITION, halfContentWidth);
  exporterEndY = drawTextBlockAndGetEndY(doc, exporter.address, leftColumnX, exporterEndY, FONT_CONTENT_PRIMARY, 'normal', 'normal', LH_PACKED_ADDITION, halfContentWidth);

  // Consignee Details
  consigneeEndY = drawTextBlockAndGetEndY(doc, "CONSIGNEE / BUYER:", rightColumnX, consigneeEndY, FONT_CONTENT_PRIMARY, 'bold', 'normal', LH_PACKED_ADDITION, halfContentWidth);
  consigneeEndY += (FONT_CONTENT_PRIMARY + LH_PACKED_ADDITION); // Add double line space
  consigneeEndY = drawTextBlockAndGetEndY(doc, client.companyName.toUpperCase(), rightColumnX, consigneeEndY, FONT_CONTENT_PRIMARY, 'bold', 'normal', LH_PACKED_ADDITION, halfContentWidth);
  consigneeEndY = drawTextBlockAndGetEndY(doc, client.address, rightColumnX, consigneeEndY, FONT_CONTENT_PRIMARY, 'normal', 'normal', LH_PACKED_ADDITION, halfContentWidth);
  
  yPos = Math.max(exporterEndY, consigneeEndY);
  yPos += SPACE_BETWEEN_HEADER_SECTIONS;


  // --- HORIZONTAL LINE 1 ---
  doc.setDrawColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.setLineWidth(0.5);
  doc.line(PAGE_MARGIN_X, yPos, pageWidth - PAGE_MARGIN_X, yPos);
  yPos += SPACE_AFTER_HORIZONTAL_LINE;

  // --- Invoice Date/No & Final Destination (Below Line 1) ---
  const invDestBlockStartY = yPos;
  let invDateBlockEndY = invDestBlockStartY;
  let finalDestBlockEndY = invDestBlockStartY;

  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(leftColumnX, invDestBlockStartY, halfContentWidth, BLUE_BG_LABEL_HEIGHT, 'F');
  const invDateStr = `INVOICE NO & DATE: ${invoice.invoiceNumber} / ${format(new Date(invoice.invoiceDate), 'dd-MM-yyyy')}`;
  drawTextBlockAndGetEndY(doc, invDateStr, leftColumnX + 2, invDestBlockStartY + (BLUE_BG_LABEL_HEIGHT - FONT_SECTION_LABEL_HEADER - LH_SINGLE_ADDITION)/2 , FONT_SECTION_LABEL_HEADER, 'normal', 'normal', LH_SINGLE_ADDITION, halfContentWidth - 4);
  invDateBlockEndY = invDestBlockStartY + BLUE_BG_LABEL_HEIGHT;


  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(rightColumnX, invDestBlockStartY, halfContentWidth, BLUE_BG_LABEL_HEIGHT, 'F');
  drawTextBlockAndGetEndY(doc, `FINAL DESTINATION: ${invoice.finalDestination.toUpperCase()}`, rightColumnX + 2, invDestBlockStartY + (BLUE_BG_LABEL_HEIGHT - FONT_SECTION_LABEL_HEADER - LH_SINGLE_ADDITION)/2, FONT_SECTION_LABEL_HEADER, 'normal', 'normal', LH_SINGLE_ADDITION, halfContentWidth - 4);
  finalDestBlockEndY = invDestBlockStartY + BLUE_BG_LABEL_HEIGHT;
  
  yPos = Math.max(invDateBlockEndY, finalDestBlockEndY);
  yPos += SPACE_BETWEEN_HEADER_SECTIONS;


  // --- HORIZONTAL LINE 2 ---
  doc.line(PAGE_MARGIN_X, yPos, pageWidth - PAGE_MARGIN_X, yPos);
  yPos += SPACE_AFTER_HORIZONTAL_LINE;

  // --- IEC Code & Terms (Below Line 2) ---
  const iecTermsBlockStartY = yPos;
  let iecBlockEndY = iecTermsBlockStartY;
  let termsBlockEndY = iecTermsBlockStartY;

  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(leftColumnX, iecTermsBlockStartY, halfContentWidth, BLUE_BG_LABEL_HEIGHT, 'F');
  drawTextBlockAndGetEndY(doc, `IEC. CODE: ${exporter.iecNumber}`, leftColumnX + 2, iecTermsBlockStartY + (BLUE_BG_LABEL_HEIGHT - FONT_SECTION_LABEL_HEADER - LH_SINGLE_ADDITION)/2, FONT_SECTION_LABEL_HEADER, 'normal', 'normal', LH_SINGLE_ADDITION, halfContentWidth - 4);
  iecBlockEndY = iecTermsBlockStartY + BLUE_BG_LABEL_HEIGHT;

  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  const termsTextHeight = doc.getTextDimensions(invoice.termsAndConditions, { fontSize: FONT_SECTION_LABEL_HEADER, maxWidth: halfContentWidth - 4 }).h + 4; // Add some padding
  const termsBlueBoxHeight = Math.max(BLUE_BG_LABEL_HEIGHT, termsTextHeight); // Ensure box is tall enough
  doc.rect(rightColumnX, iecTermsBlockStartY, halfContentWidth, termsBlueBoxHeight, 'F');
  termsBlockEndY = drawTextBlockAndGetEndY(doc, `TERMS AND CONDITIONS OF DELIVERY & PAYMENT: ${invoice.termsAndConditions}`, rightColumnX + 2, iecTermsBlockStartY + 2, FONT_SECTION_LABEL_HEADER, 'normal', 'normal', LH_PACKED_ADDITION, halfContentWidth - 4); // Start text slightly from top of blue box
  termsBlockEndY = Math.max(termsBlockEndY, iecTermsBlockStartY + termsBlueBoxHeight); // Ensure endY respects box height

  yPos = Math.max(iecBlockEndY, termsBlockEndY);
  yPos += SPACE_BEFORE_TABLE;


  // --- PRODUCT TABLE ---
  const tableHead = [['SR.\nNO.', 'HSN\nCODE', 'DESCRIPTION OF GOODS', 'TOTAL\nBOXES', 'TOTAL\nSQMT', `RATE\n${invoice.currencyType}`, `AMOUNT\n${invoice.currencyType}`]];
  const tableBody = invoice.items.map((item, index) => {
    const product = allProducts.find(p => p.id === item.productId);
    const size = allSizes.find(s => s.id === item.sizeId);
    const goodsDesc = `${product?.designName || 'N/A'} ${size?.size || 'N/A'}`;
    const boxes = item.boxes;
    const totalSqmt = item.quantitySqmt || 0;

    return [
      (index + 1).toString(),
      size?.hsnCode || 'N/A',
      goodsDesc,
      boxes.toString(),
      totalSqmt.toFixed(2),
      item.ratePerSqmt.toFixed(2),
      item.amount?.toFixed(2) || '0.00',
    ];
  });
  
  const minTableRows = 3; 
  const emptyRowsNeeded = Math.max(0, minTableRows - tableBody.length);
  for (let i = 0; i < emptyRowsNeeded; i++) {
    tableBody.push(['\n ', '\n ', '\n ', '\n ', '\n ', '\n ', '\n ']); // Add some newlines for height
  }
  
  const tableFootData = [
    [{ content: 'SUB TOTAL', colSpan: 6, styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold' } }, { content: (invoice.subTotal || 0).toFixed(2), styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold'} }],
    [{ content: `FREIGHT CHARGES ${invoice.currencyType}`, colSpan: 6, styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold' } }, { content: (invoice.freight || 0).toFixed(2), styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold' } }],
    [{ content: `OTHER CHARGES ${invoice.currencyType}`, colSpan: 6, styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold' } }, { content: '0.00', styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold' } }], 
    [{ content: `GRAND TOTAL ${invoice.currencyType}`, colSpan: 6, styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold' } }, { content: (invoice.grandTotal || 0).toFixed(2), styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold' } }],
  ];

  let tableEndY = 0;
  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    foot: tableFootData,
    startY: yPos,
    theme: 'grid',
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
    styles: { fontSize: FONT_TABLE_BODY, cellPadding: 1.5, lineColor: COLOR_TABLE_LINE, lineWidth: 0.5, valign: 'middle' },
    headStyles: { fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold', fontSize: FONT_TABLE_HEAD, cellPadding: 2, halign: 'center', valign: 'middle', minCellHeight: FONT_TABLE_HEAD + 4 },
    bodyStyles: { minCellHeight: FONT_TABLE_BODY + LH_PACKED_ADDITION * 1.5 }, // Give body cells bit more height
    footStyles: { fontSize: FONT_TABLE_HEAD, cellPadding: 1.5,  lineWidth: 0.5, lineColor: COLOR_TABLE_LINE, valign: 'middle', minCellHeight: FONT_TABLE_HEAD + 4 },
    columnStyles: {
      0: { cellWidth: 30, halign: 'center' }, 
      1: { cellWidth: 50, halign: 'center' }, 
      2: { cellWidth: 'auto' },                
      3: { cellWidth: 40, halign: 'center' }, 
      4: { cellWidth: 50, halign: 'right' },  
      5: { cellWidth: 50, halign: 'right' },  
      6: { cellWidth: 65, halign: 'right' },  
    },
    didDrawPage: (data) => {
      tableEndY = data.cursor?.y ?? yPos; 
    }
  });
  yPos = tableEndY + SPACE_AFTER_TABLE;


  // --- Total SQM & Amount in Words ---
  const totalSqmValue = invoice.items.reduce((sum, item) => sum + (item.quantitySqmt || 0), 0).toFixed(2);
  const totalSqmLabel = "TOTAL SQM";
  const totalSqmBlockHeight = FONT_FOOTER_TOTALS_LABEL_BLUE_BG + 4; 
  const totalSqmLabelWidth = doc.getTextWidth(totalSqmLabel) + 10; 
  const totalSqmValueWidth = 60; 
  const totalSqmBlockWidth = totalSqmLabelWidth + totalSqmValueWidth;

  // Total SQM Label BG & Text
  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(PAGE_MARGIN_X, yPos, totalSqmLabelWidth, totalSqmBlockHeight, 'F'); 
  drawTextBlockAndGetEndY(doc, totalSqmLabel, PAGE_MARGIN_X + 2, yPos + (totalSqmBlockHeight - FONT_FOOTER_TOTALS_LABEL_BLUE_BG - LH_SINGLE_ADDITION)/2, FONT_FOOTER_TOTALS_LABEL_BLUE_BG, 'bold', 'normal', LH_SINGLE_ADDITION, totalSqmLabelWidth - 4);
  
  // Total SQM Value Box & Text
  doc.setDrawColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.rect(PAGE_MARGIN_X + totalSqmLabelWidth, yPos, totalSqmValueWidth, totalSqmBlockHeight, 'S'); 
  drawTextBlockAndGetEndY(doc, totalSqmValue, PAGE_MARGIN_X + totalSqmLabelWidth + (totalSqmValueWidth / 2), yPos + (totalSqmBlockHeight - FONT_FOOTER_TOTALS_LABEL_BLUE_BG - LH_SINGLE_ADDITION)/2, FONT_FOOTER_TOTALS_LABEL_BLUE_BG, 'bold', 'normal', LH_SINGLE_ADDITION, totalSqmValueWidth - 4, COLOR_BLACK_RGB, 'center');

  // Amount in Words
  const amountInWordsStr = amountToWords(invoice.grandTotal || 0, invoice.currencyType);
  const amountInWordsFullStr = `TOTAL INVOICE AMOUNT IN WORDS: ${amountInWordsStr.toUpperCase()}`;
  const amountWordsLabelX = PAGE_MARGIN_X + totalSqmBlockWidth + 5;
  const amountWordsValueMaxWidth = contentWidth - totalSqmBlockWidth - 5; 

  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(amountWordsLabelX, yPos, amountWordsValueMaxWidth, totalSqmBlockHeight, 'F'); 
  drawTextBlockAndGetEndY(doc, amountInWordsFullStr, amountWordsLabelX + 2, yPos + (totalSqmBlockHeight - FONT_FOOTER_TOTALS_LABEL_BLUE_BG - LH_SINGLE_ADDITION)/2, FONT_FOOTER_TOTALS_LABEL_BLUE_BG, 'bold', 'normal', LH_SINGLE_ADDITION, amountWordsValueMaxWidth - 4, COLOR_BLACK_RGB);
  
  yPos += totalSqmBlockHeight + SPACE_FOOTER_SECTION_GAP;


  // --- Note ---
  if (invoice.note) {
    yPos = drawTextBlockAndGetEndY(doc, "Note:", PAGE_MARGIN_X, yPos, FONT_FOOTER_NOTE_LABEL_BOLD, 'bold', 'normal', LH_FOOTER_SINGLE_ADDITION, contentWidth);
    const noteLines = invoice.note.split('\n');
    noteLines.forEach(line => {
      let style: 'bold' | 'normal' = 'normal';
      const keywordsToBold = ["TRANSSHIPMENT ALLOWED.", "PARTIAL SHIPMENT ALLOWED.", "SHIPMENT : AS EARLY AS POSSIBLE.", "QUANTITY AND VALUE +/-10% ALLOWED.", "NOT ACCEPTED ANY REFUND OR EXCHANGE .", "ANY TRANSACTION CHARGES WILL BE PAIDED BY CONSIGNEE."]; // Note: original image had "PAIDED"
      if (keywordsToBold.some(kw => line.toUpperCase().trim().startsWith(kw))) {
        style = 'bold';
      }
      yPos = drawTextBlockAndGetEndY(doc, line, PAGE_MARGIN_X, yPos, FONT_FOOTER_NOTE_CONTENT, style, 'normal', LH_FOOTER_PACKED_ADDITION, contentWidth);
    });
    yPos += SPACE_FOOTER_SECTION_GAP; 
  }
  
  // --- Beneficiary Details ---
  if (selectedBank) {
    yPos = drawTextBlockAndGetEndY(doc, "BENEFICIARY DETAILS:", PAGE_MARGIN_X, yPos, FONT_FOOTER_BANK_LABEL_BOLD, 'bold', 'normal', LH_FOOTER_SINGLE_ADDITION, contentWidth);
    const bankDetails = [
      `BENEFICIARY NAME: ${selectedBank.bankName.toUpperCase()}`,
      `BENEFICIARY BANK: ${selectedBank.bankName.toUpperCase()}, BRANCH: ${selectedBank.bankAddress.toUpperCase()}`,
      `BENEFICIARY A/C NO: ${selectedBank.accountNumber}, SWIFT CODE: ${selectedBank.swiftCode.toUpperCase()}, IFSC CODE: ${selectedBank.ifscCode.toUpperCase()}`
    ];
    bankDetails.forEach(detail => {
      yPos = drawTextBlockAndGetEndY(doc, detail, PAGE_MARGIN_X, yPos, FONT_FOOTER_BANK_CONTENT, 'normal', 'normal', LH_FOOTER_PACKED_ADDITION, contentWidth);
    });
    yPos += SPACE_FOOTER_SECTION_GAP;
  }

  // --- Declaration ---
  yPos = drawTextBlockAndGetEndY(doc, "Declaration:", PAGE_MARGIN_X, yPos, FONT_FOOTER_DECLARATION_LABEL_BOLD, 'bold', 'normal', LH_FOOTER_SINGLE_ADDITION, contentWidth);
  yPos = drawTextBlockAndGetEndY(doc, "CERTIFIED THAT THE PARTICULARS GIVEN ABOVE ARE TRUE AND CORRECT.", PAGE_MARGIN_X, yPos, FONT_FOOTER_DECLARATION_CONTENT, 'normal', 'normal', LH_FOOTER_PACKED_ADDITION, contentWidth);
  yPos += SPACE_BEFORE_SIGNATURE; 

  // --- Signature ---
  const signatureTextLine1 = `FOR, ${exporter.companyName.toUpperCase()}`;
  const signatureTextLine2 = "AUTHORISED SIGNATURE";
  
  const signatureBlockHeight = (FONT_SIGNATURE + LH_SINGLE_ADDITION) * 3; 
  if (yPos + signatureBlockHeight > doc.internal.pageSize.getHeight() - PAGE_MARGIN_Y_BOTTOM) {
    doc.addPage();
    yPos = PAGE_MARGIN_Y_TOP;
  }

  yPos = drawTextBlockAndGetEndY(doc, signatureTextLine1, pageWidth - PAGE_MARGIN_X, yPos, FONT_SIGNATURE, 'bold', 'normal', LH_SINGLE_ADDITION, undefined, COLOR_BLACK_RGB, 'right');
  yPos += (FONT_SIGNATURE + LH_SINGLE_ADDITION) * 1.5; // More space before "AUTHORISED SIGNATURE"
  yPos = drawTextBlockAndGetEndY(doc, signatureTextLine2, pageWidth - PAGE_MARGIN_X, yPos, FONT_SIGNATURE, 'bold', 'normal', LH_SINGLE_ADDITION, undefined, COLOR_BLACK_RGB, 'right');

  doc.save(`Performa_Invoice_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
}
