
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
const FONT_SECTION_LABEL_HEADER = 7.5;
const FONT_CONTENT_PRIMARY = 8;
const FONT_TABLE_HEAD = 7.5;
const FONT_TABLE_BODY = 7.5;
const FONT_FOOTER_TOTALS_LABEL_BLUE_BG = 7;
const FONT_FOOTER_NOTE_LABEL_BOLD = 7;
const FONT_FOOTER_NOTE_CONTENT = 6.5;
const FONT_FOOTER_BANK_LABEL_BOLD = 7;
const FONT_FOOTER_BANK_CONTENT = 6.5;
const FONT_FOOTER_DECLARATION_LABEL_BOLD = 7;
const FONT_FOOTER_DECLARATION_CONTENT = 6.5;
const FONT_SIGNATURE = 8;

// --- Line Height Additions (pt) - Additional height over font size for text flow ---
const LH_MAIN_TITLE_ADDITION = 2.0;
const LH_PACKED_ADDITION = 1.8;
const LH_SINGLE_ADDITION = 2.0;
const LH_FOOTER_PACKED_ADDITION = 1.5;
const LH_FOOTER_SINGLE_ADDITION = 1.8;

// --- Element Heights ---
const BLUE_BOX_TEXT_PADDING_Y = 4; // Vertical padding inside blue boxes
const BLUE_HEADER_BOX_HEIGHT_TOP = FONT_MAIN_TITLE + (BLUE_BOX_TEXT_PADDING_Y * 2);
const BLUE_HEADER_BOX_HEIGHT_SECOND_ROW = FONT_SECTION_LABEL_HEADER + (BLUE_BOX_TEXT_PADDING_Y * 2);
const BLUE_BG_LABEL_HEIGHT = FONT_SECTION_LABEL_HEADER + 4;

// --- Spacing (pt) ---
const HORIZONTAL_LINE_THICKNESS = 0.5;
const SPACE_AFTER_SECOND_ROW_LINE_CONTENT = 2.0; // Space after the line below EXPORTER/CONSIGNEE boxes
const SPACE_BETWEEN_HEADER_SECTIONS = 1.5; // Used between blocks like InvDate/FinalDest and IEC/Terms
const SPACE_AFTER_HORIZONTAL_LINE_CONTENT = 2.0; // General space after a content horizontal line
const SPACE_BEFORE_TABLE = 3.0;
const SPACE_AFTER_TABLE = 4.0;
const SPACE_FOOTER_SECTION_GAP = 3.0;
const SPACE_BEFORE_SIGNATURE = 10.0;


function drawTextBlockAndGetEndY(
  doc: jsPDF,
  text: string | string[],
  x: number,
  currentY: number,
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
    let drawX = x;
    if (align === 'center' && maxWidth) {
      const textWidth = doc.getTextWidth(lineContent);
      drawX = x + (maxWidth - textWidth) / 2;
    }

    doc.text(lineContent, drawX, yBaselineForCurrentLine + fontSize, { align: align === 'center' && !maxWidth ? 'center' : 'left', baseline: 'alphabetic' });
    yBaselineForCurrentLine += (fontSize + lineHeightAddition);
  });
  return yBaselineForCurrentLine; // This is the Y for the *next* line's baseline
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
  const halfContentWidth = contentWidth / 2;
  const leftColumnX = PAGE_MARGIN_X;
  const rightColumnX = PAGE_MARGIN_X + halfContentWidth;

  // --- HEADER: "PROFORMA INVOICE" Box ---
  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(PAGE_MARGIN_X, yPos, contentWidth, BLUE_HEADER_BOX_HEIGHT_TOP, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_MAIN_TITLE);
  doc.setTextColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.text("PROFORMA INVOICE", pageWidth / 2, yPos + (BLUE_HEADER_BOX_HEIGHT_TOP / 2), { align: 'center', baseline: 'middle' });
  yPos += BLUE_HEADER_BOX_HEIGHT_TOP;

  // Single Horizontal Line BETWEEN the "PROFORMA INVOICE" box and the "EXPORTER/CONSIGNEE" boxes
  doc.setDrawColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.setLineWidth(HORIZONTAL_LINE_THICKNESS);
  doc.line(PAGE_MARGIN_X, yPos, pageWidth - PAGE_MARGIN_X, yPos);
  yPos += HORIZONTAL_LINE_THICKNESS; // Advance yPos by the thickness of the line itself

  // --- HEADER: "EXPORTER" and "CONSIGNEE / BUYER:" Boxes ---
  const secondHeaderRowY = yPos; // These boxes start IMMEDIATELY after the line

  // Shared settings for both boxes in the second row
  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]); // Ensure fill is blue for both
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_SECTION_LABEL_HEADER);
  doc.setTextColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]); // Ensure text is black for both

  // Left box ("EXPORTER")
  doc.rect(leftColumnX, secondHeaderRowY, halfContentWidth, BLUE_HEADER_BOX_HEIGHT_SECOND_ROW, 'F');
  doc.text("EXPORTER", leftColumnX + (halfContentWidth / 2), secondHeaderRowY + (BLUE_HEADER_BOX_HEIGHT_SECOND_ROW / 2), { align: 'center', baseline: 'middle' });

  // Right box ("CONSIGNEE / BUYER:")
  // Explicitly set fill and text color again just to be absolutely sure, though it should carry over
  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(rightColumnX, secondHeaderRowY, halfContentWidth, BLUE_HEADER_BOX_HEIGHT_SECOND_ROW, 'F');
  doc.setTextColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.text("CONSIGNEE / BUYER:", rightColumnX + (halfContentWidth / 2), secondHeaderRowY + (BLUE_HEADER_BOX_HEIGHT_SECOND_ROW / 2), { align: 'center', baseline: 'middle' });

  // Vertical line between EXPORTER and CONSIGNEE boxes
  doc.setDrawColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.setLineWidth(HORIZONTAL_LINE_THICKNESS);
  doc.line(leftColumnX + halfContentWidth, secondHeaderRowY, leftColumnX + halfContentWidth, secondHeaderRowY + BLUE_HEADER_BOX_HEIGHT_SECOND_ROW);
  
  yPos = secondHeaderRowY + BLUE_HEADER_BOX_HEIGHT_SECOND_ROW;

  // Line below "EXPORTER/CONSIGNEE" boxes
  doc.setDrawColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.setLineWidth(HORIZONTAL_LINE_THICKNESS);
  doc.line(PAGE_MARGIN_X, yPos, pageWidth - PAGE_MARGIN_X, yPos);
  yPos += HORIZONTAL_LINE_THICKNESS;
  yPos += SPACE_AFTER_SECOND_ROW_LINE_CONTENT; // Existing space before actual content

  // --- EXPORTER & CONSIGNEE DETAILS (Below new header) ---
  let detailsStartY = yPos;
  let exporterEndY = detailsStartY;
  let consigneeEndY = detailsStartY;

  // Exporter Label and Name (with double space)
  exporterEndY = drawTextBlockAndGetEndY(doc, "EXPORTER:", leftColumnX, exporterEndY, FONT_CONTENT_PRIMARY, 'bold', 'normal', LH_PACKED_ADDITION, halfContentWidth);
  exporterEndY += (FONT_CONTENT_PRIMARY + LH_PACKED_ADDITION); // Double line space
  exporterEndY = drawTextBlockAndGetEndY(doc, exporter.companyName.toUpperCase(), leftColumnX, exporterEndY, FONT_CONTENT_PRIMARY, 'bold', 'normal', LH_PACKED_ADDITION, halfContentWidth);
  exporterEndY = drawTextBlockAndGetEndY(doc, exporter.address, leftColumnX, exporterEndY, FONT_CONTENT_PRIMARY, 'normal', 'normal', LH_PACKED_ADDITION, halfContentWidth);

  // Consignee Label and Name (with double space)
  consigneeEndY = drawTextBlockAndGetEndY(doc, "CONSIGNEE / BUYER:", rightColumnX, consigneeEndY, FONT_CONTENT_PRIMARY, 'bold', 'normal', LH_PACKED_ADDITION, halfContentWidth);
  consigneeEndY += (FONT_CONTENT_PRIMARY + LH_PACKED_ADDITION); // Double line space
  consigneeEndY = drawTextBlockAndGetEndY(doc, client.companyName.toUpperCase(), rightColumnX, consigneeEndY, FONT_CONTENT_PRIMARY, 'bold', 'normal', LH_PACKED_ADDITION, halfContentWidth);
  consigneeEndY = drawTextBlockAndGetEndY(doc, client.address, rightColumnX, consigneeEndY, FONT_CONTENT_PRIMARY, 'normal', 'normal', LH_PACKED_ADDITION, halfContentWidth);
  
  yPos = Math.max(exporterEndY, consigneeEndY);
  yPos += SPACE_BETWEEN_HEADER_SECTIONS;

  // --- HORIZONTAL LINE 1 (Content) ---
  doc.setDrawColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.setLineWidth(HORIZONTAL_LINE_THICKNESS);
  doc.line(PAGE_MARGIN_X, yPos, pageWidth - PAGE_MARGIN_X, yPos);
  yPos += SPACE_AFTER_HORIZONTAL_LINE_CONTENT;

  // --- Invoice Date/No & Final Destination (Below Line 1) ---
  const invDestBlockStartY = yPos;
  let invDateBlockEndY = invDestBlockStartY;
  let finalDestBlockEndY = invDestBlockStartY;

  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(leftColumnX, invDestBlockStartY, halfContentWidth, BLUE_BG_LABEL_HEIGHT, 'F');
  const invDateStr = `INVOICE NO & DATE: ${invoice.invoiceNumber} / ${format(new Date(invoice.invoiceDate), 'dd-MM-yyyy')}`;
  const invDateTextYBaseline = invDestBlockStartY + (BLUE_BG_LABEL_HEIGHT / 2) - (FONT_SECTION_LABEL_HEADER / 2);
  drawTextBlockAndGetEndY(doc, invDateStr, leftColumnX + 2, invDateTextYBaseline, FONT_SECTION_LABEL_HEADER, 'normal', 'normal', LH_SINGLE_ADDITION, halfContentWidth - 4);
  invDateBlockEndY = invDestBlockStartY + BLUE_BG_LABEL_HEIGHT;

  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(rightColumnX, invDestBlockStartY, halfContentWidth, BLUE_BG_LABEL_HEIGHT, 'F');
  const finalDestTextYBaseline = invDestBlockStartY + (BLUE_BG_LABEL_HEIGHT / 2) - (FONT_SECTION_LABEL_HEADER / 2);
  drawTextBlockAndGetEndY(doc, `FINAL DESTINATION: ${invoice.finalDestination.toUpperCase()}`, rightColumnX + 2, finalDestTextYBaseline, FONT_SECTION_LABEL_HEADER, 'normal', 'normal', LH_SINGLE_ADDITION, halfContentWidth - 4);
  finalDestBlockEndY = invDestBlockStartY + BLUE_BG_LABEL_HEIGHT;
  
  yPos = Math.max(invDateBlockEndY, finalDestBlockEndY);
  yPos += SPACE_BETWEEN_HEADER_SECTIONS;

  // --- HORIZONTAL LINE 2 (Content) ---
  doc.line(PAGE_MARGIN_X, yPos, pageWidth - PAGE_MARGIN_X, yPos);
  yPos += SPACE_AFTER_HORIZONTAL_LINE_CONTENT;

  // --- IEC Code & Terms (Below Line 2) ---
  const iecTermsBlockStartY = yPos;
  let iecBlockEndY = iecTermsBlockStartY;
  let termsBlockEndY = iecTermsBlockStartY;

  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(leftColumnX, iecTermsBlockStartY, halfContentWidth, BLUE_BG_LABEL_HEIGHT, 'F');
  const iecTextYBaseline = iecTermsBlockStartY + (BLUE_BG_LABEL_HEIGHT / 2) - (FONT_SECTION_LABEL_HEADER / 2);
  drawTextBlockAndGetEndY(doc, `IEC. CODE: ${exporter.iecNumber}`, leftColumnX + 2, iecTextYBaseline, FONT_SECTION_LABEL_HEADER, 'normal', 'normal', LH_SINGLE_ADDITION, halfContentWidth - 4);
  iecBlockEndY = iecTermsBlockStartY + BLUE_BG_LABEL_HEIGHT;

  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  const termsWrapped = doc.splitTextToSize(`TERMS AND CONDITIONS OF DELIVERY & PAYMENT: ${invoice.termsAndConditions}`, halfContentWidth - 4);
  const termsTextTotalHeight = termsWrapped.length * (FONT_SECTION_LABEL_HEADER + LH_PACKED_ADDITION);
  const termsBlueBoxHeight = Math.max(BLUE_BG_LABEL_HEIGHT, termsTextTotalHeight + BLUE_BOX_TEXT_PADDING_Y - LH_PACKED_ADDITION); // Adjust for baseline
  doc.rect(rightColumnX, iecTermsBlockStartY, halfContentWidth, termsBlueBoxHeight, 'F');
  const termsTextYBaseline = iecTermsBlockStartY + (BLUE_BOX_TEXT_PADDING_Y / 2);
  termsBlockEndY = drawTextBlockAndGetEndY(doc, `TERMS AND CONDITIONS OF DELIVERY & PAYMENT: ${invoice.termsAndConditions}`, rightColumnX + 2, termsTextYBaseline, FONT_SECTION_LABEL_HEADER, 'normal', 'normal', LH_PACKED_ADDITION, halfContentWidth - 4);
  termsBlockEndY = Math.max(termsBlockEndY - (FONT_SECTION_LABEL_HEADER + LH_PACKED_ADDITION) + termsBlueBoxHeight , iecTermsBlockStartY + termsBlueBoxHeight);


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
    tableBody.push(['\n ', '\n ', '\n ', '\n ', '\n ', '\n ', '\n ']);
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
    styles: { fontSize: FONT_TABLE_BODY, cellPadding: 1.5, lineColor: COLOR_TABLE_LINE, lineWidth: HORIZONTAL_LINE_THICKNESS, valign: 'middle' },
    headStyles: { fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold', fontSize: FONT_TABLE_HEAD, cellPadding: 2, halign: 'center', valign: 'middle', minCellHeight: FONT_TABLE_HEAD + 4 + LH_SINGLE_ADDITION },
    bodyStyles: { minCellHeight: FONT_TABLE_BODY + LH_PACKED_ADDITION * 2 },
    footStyles: { fontSize: FONT_TABLE_HEAD, cellPadding: 1.5,  lineWidth: HORIZONTAL_LINE_THICKNESS, lineColor: COLOR_TABLE_LINE, valign: 'middle', minCellHeight: FONT_TABLE_HEAD + 4 + LH_SINGLE_ADDITION },
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
  const totalSqmLabelText = "TOTAL SQM";
  const totalSqmBlockHeight = FONT_FOOTER_TOTALS_LABEL_BLUE_BG + 4; 
  const totalSqmLabelWidth = doc.getTextWidth(totalSqmLabelText) + 10; 
  const totalSqmValueWidth = 60; 
  const totalSqmBlockWidth = totalSqmLabelWidth + totalSqmValueWidth;

  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(PAGE_MARGIN_X, yPos, totalSqmLabelWidth, totalSqmBlockHeight, 'F'); 
  const totalSqmLabelYBaseline = yPos + (totalSqmBlockHeight / 2) - (FONT_FOOTER_TOTALS_LABEL_BLUE_BG / 2);
  drawTextBlockAndGetEndY(doc, totalSqmLabelText, PAGE_MARGIN_X + 2, totalSqmLabelYBaseline, FONT_FOOTER_TOTALS_LABEL_BLUE_BG, 'bold', 'normal', LH_SINGLE_ADDITION, totalSqmLabelWidth - 4);
  
  doc.setDrawColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.rect(PAGE_MARGIN_X + totalSqmLabelWidth, yPos, totalSqmValueWidth, totalSqmBlockHeight, 'S'); 
  const totalSqmValueYBaseline = yPos + (totalSqmBlockHeight / 2) - (FONT_FOOTER_TOTALS_LABEL_BLUE_BG / 2);
  drawTextBlockAndGetEndY(doc, totalSqmValue, PAGE_MARGIN_X + totalSqmLabelWidth + (totalSqmValueWidth / 2), totalSqmValueYBaseline, FONT_FOOTER_TOTALS_LABEL_BLUE_BG, 'bold', 'normal', LH_SINGLE_ADDITION, totalSqmValueWidth - 4, COLOR_BLACK_RGB, 'center');

  const amountInWordsStr = amountToWords(invoice.grandTotal || 0, invoice.currencyType);
  const amountInWordsLabelText = "TOTAL INVOICE AMOUNT IN WORDS:";
  const amountWordsLabelX = PAGE_MARGIN_X + totalSqmBlockWidth + 5;
  const amountWordsLabelWidth = doc.getTextWidth(amountInWordsLabelText) + 10;
  const amountWordsValueMaxWidth = contentWidth - totalSqmBlockWidth - 5 - amountWordsLabelWidth - 5;

  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(amountWordsLabelX, yPos, amountWordsLabelWidth, totalSqmBlockHeight, 'F'); 
  const amountInWordsLabelYBaseline = yPos + (totalSqmBlockHeight / 2) - (FONT_FOOTER_TOTALS_LABEL_BLUE_BG / 2);
  drawTextBlockAndGetEndY(doc, amountInWordsLabelText, amountWordsLabelX + 2, amountInWordsLabelYBaseline, FONT_FOOTER_TOTALS_LABEL_BLUE_BG, 'bold', 'normal', LH_SINGLE_ADDITION, amountWordsLabelWidth - 4, COLOR_BLACK_RGB);

  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(amountWordsLabelX + amountWordsLabelWidth, yPos, amountWordsValueMaxWidth, totalSqmBlockHeight, 'F');
  const amountInWordsStrYBaseline = yPos + (totalSqmBlockHeight / 2) - (FONT_FOOTER_TOTALS_LABEL_BLUE_BG / 2);
  drawTextBlockAndGetEndY(doc, amountInWordsStr.toUpperCase(), amountWordsLabelX + amountWordsLabelWidth + 2, amountInWordsStrYBaseline, FONT_FOOTER_TOTALS_LABEL_BLUE_BG, 'bold', 'normal', LH_SINGLE_ADDITION, amountWordsValueMaxWidth - 4, COLOR_BLACK_RGB, 'left');
  
  yPos += totalSqmBlockHeight + SPACE_FOOTER_SECTION_GAP;

  if (invoice.note) {
    let noteY = yPos;
    noteY = drawTextBlockAndGetEndY(doc, "Note:", PAGE_MARGIN_X, noteY, FONT_FOOTER_NOTE_LABEL_BOLD, 'bold', 'normal', LH_FOOTER_SINGLE_ADDITION, contentWidth);
    const noteLines = invoice.note.split('\n');
    noteLines.forEach(line => {
      let style: 'bold' | 'normal' = 'normal';
      const keywordsToBold = ["TRANSSHIPMENT ALLOWED.", "PARTIAL SHIPMENT ALLOWED.", "SHIPMENT : AS EARLY AS POSSIBLE.", "QUANTITY AND VALUE +/-10% ALLOWED.", "NOT ACCEPTED ANY REFUND OR EXCHANGE.", "ANY TRANSACTION CHARGES WILL BE PAIDED BY CONSIGNEE."];
      if (keywordsToBold.some(kw => line.toUpperCase().trim().startsWith(kw))) {
        style = 'bold';
      }
      noteY = drawTextBlockAndGetEndY(doc, line, PAGE_MARGIN_X, noteY, FONT_FOOTER_NOTE_CONTENT, style, 'normal', LH_FOOTER_PACKED_ADDITION, contentWidth);
    });
    yPos = noteY + SPACE_FOOTER_SECTION_GAP; 
  }
  
  if (selectedBank) {
    let bankY = yPos;
    bankY = drawTextBlockAndGetEndY(doc, "BENEFICIARY DETAILS:", PAGE_MARGIN_X, bankY, FONT_FOOTER_BANK_LABEL_BOLD, 'bold', 'normal', LH_FOOTER_SINGLE_ADDITION, contentWidth);
    const bankDetails = [
      `BENEFICIARY NAME: ${selectedBank.bankName.toUpperCase()}`,
      `BENEFICIARY BANK: ${selectedBank.bankName.toUpperCase()}, BRANCH: ${selectedBank.bankAddress.toUpperCase()}`,
      `BENEFICIARY A/C NO: ${selectedBank.accountNumber}, SWIFT CODE: ${selectedBank.swiftCode.toUpperCase()}, IFSC CODE: ${selectedBank.ifscCode.toUpperCase()}`
    ];
    bankDetails.forEach(detail => {
      bankY = drawTextBlockAndGetEndY(doc, detail, PAGE_MARGIN_X, bankY, FONT_FOOTER_BANK_CONTENT, 'normal', 'normal', LH_FOOTER_PACKED_ADDITION, contentWidth);
    });
    yPos = bankY + SPACE_FOOTER_SECTION_GAP;
  }

  let declarationY = yPos;
  declarationY = drawTextBlockAndGetEndY(doc, "Declaration:", PAGE_MARGIN_X, declarationY, FONT_FOOTER_DECLARATION_LABEL_BOLD, 'bold', 'normal', LH_FOOTER_SINGLE_ADDITION, contentWidth);
  declarationY = drawTextBlockAndGetEndY(doc, "CERTIFIED THAT THE PARTICULARS GIVEN ABOVE ARE TRUE AND CORRECT.", PAGE_MARGIN_X, declarationY, FONT_FOOTER_DECLARATION_CONTENT, 'normal', 'normal', LH_FOOTER_PACKED_ADDITION, contentWidth);
  yPos = declarationY + SPACE_BEFORE_SIGNATURE; 

  const signatureTextLine1 = `FOR, ${exporter.companyName.toUpperCase()}`;
  const signatureTextLine2 = "AUTHORISED SIGNATURE";
  
  const signatureBlockHeight = (FONT_SIGNATURE + LH_SINGLE_ADDITION) * 3; 
  if (yPos + signatureBlockHeight > doc.internal.pageSize.getHeight() - PAGE_MARGIN_Y_BOTTOM) {
    doc.addPage();
    yPos = PAGE_MARGIN_Y_TOP;
  }

  let signatureY = yPos;
  signatureY = drawTextBlockAndGetEndY(doc, signatureTextLine1, pageWidth - PAGE_MARGIN_X, signatureY, FONT_SIGNATURE, 'bold', 'normal', LH_SINGLE_ADDITION, undefined, COLOR_BLACK_RGB, 'right');
  signatureY += (FONT_SIGNATURE + LH_SINGLE_ADDITION); 
  drawTextBlockAndGetEndY(doc, signatureTextLine2, pageWidth - PAGE_MARGIN_X, signatureY, FONT_SIGNATURE, 'bold', 'normal', LH_SINGLE_ADDITION, undefined, COLOR_BLACK_RGB, 'right');

  doc.save(`Performa_Invoice_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
}
