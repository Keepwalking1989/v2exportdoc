
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

// --- Font Size Categories (pt) ---
const FONT_CAT_1 = 12;    // For "PROFORMA INVOICE"
const FONT_SECOND_ROW_HEADER_LABEL = 9.5; // For "EXPORTER" and "CONSIGNEE / BUYER:" in blue boxes (was FONT_CAT_2 + 1)
const FONT_CAT_2 = 8.5;   // For company names, main labels, table headers, table footer totals, major footer labels, signature
const FONT_CAT_3 = 8;     // For addresses, secondary values (invoice number value, destination value, IEC value), table body content, detailed note/bank/declaration content

// --- Line Height Additions (pt) ---
const LH_PACKED_ADDITION = 1.8;
const LH_SINGLE_ADDITION = 2.0;
const LH_MAIN_TITLE_ADDITION = LH_SINGLE_ADDITION;
const LH_SECOND_ROW_HEADER_LABEL_ADDITION = LH_SINGLE_ADDITION;


// --- Element Heights & Padding ---
const BLUE_BOX_TEXT_PADDING_Y = 4;

const BLUE_HEADER_BOX_HEIGHT_TOP = FONT_CAT_1 + LH_MAIN_TITLE_ADDITION + BLUE_BOX_TEXT_PADDING_Y;
const BLUE_HEADER_BOX_HEIGHT_SECOND_ROW = FONT_SECOND_ROW_HEADER_LABEL + LH_SECOND_ROW_HEADER_LABEL_ADDITION + BLUE_BOX_TEXT_PADDING_Y;
const BLUE_BG_LABEL_DOUBLE_LINE_HEIGHT = (FONT_CAT_2 + LH_PACKED_ADDITION) + (FONT_CAT_3 + LH_PACKED_ADDITION) + BLUE_BOX_TEXT_PADDING_Y + LH_PACKED_ADDITION;
const BLUE_BG_TOTALS_LINE_HEIGHT = FONT_CAT_2 + LH_SINGLE_ADDITION + BLUE_BOX_TEXT_PADDING_Y;

// --- Spacing (pt) ---
const HORIZONTAL_LINE_THICKNESS = 0.5;
const SPACE_AFTER_MAIN_TITLE_ROW_BOX = 0.0; // No space, line is immediate
const SPACE_AFTER_SECOND_ROW_LINE_CONTENT = 4.0;
const SPACE_BETWEEN_HEADER_SECTIONS = 1.5;
const SPACE_AFTER_HORIZONTAL_LINE_CONTENT = 2.0;
const SPACE_BEFORE_TABLE = 3.0;
const SPACE_AFTER_TABLE = 4.0;
const SPACE_FOOTER_SECTION_GAP = 3.0;
const SPACE_BEFORE_SIGNATURE = 10.0;


/**
 * Draws a block of text, potentially wrapped, and returns the Y-coordinate
 * for the TOP of the NEXT potential line of text (not its baseline).
 */
function drawTextBlockAndGetEndY(
  doc: jsPDF,
  text: string | string[],
  x: number,
  startY: number, // Y position for the TOP of the text block
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
  let currentLineTopY = startY;

  lines.forEach(lineContent => {
    let drawX = x;
    if (align === 'center' && maxWidth) {
      const textWidth = doc.getTextWidth(lineContent);
      drawX = x + (maxWidth - textWidth) / 2;
    } else if (align === 'right' && maxWidth) {
        const textWidth = doc.getTextWidth(lineContent);
        drawX = x + maxWidth - textWidth;
    }
    // Using currentLineTopY directly for the baseline because the function now expects startY to be the top.
    // The text is drawn with its baseline at currentLineTopY + fontSize.
    doc.text(lineContent, drawX, currentLineTopY + fontSize, { baseline: 'alphabetic' });
    currentLineTopY += (fontSize + lineHeightAddition);
  });
  return currentLineTopY; // Returns the Y for the top of the next line
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

  // --- Line above "PROFORMA INVOICE" box ---
  doc.setDrawColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.setLineWidth(HORIZONTAL_LINE_THICKNESS);
  doc.line(PAGE_MARGIN_X, yPos, pageWidth - PAGE_MARGIN_X, yPos);
  yPos += HORIZONTAL_LINE_THICKNESS;

  // --- HEADER: "PROFORMA INVOICE" Box (First Row) ---
  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(PAGE_MARGIN_X, yPos, contentWidth, BLUE_HEADER_BOX_HEIGHT_TOP, 'F');
  drawTextBlockAndGetEndY(doc, "PROFORMA INVOICE", pageWidth / 2, yPos + (BLUE_HEADER_BOX_HEIGHT_TOP - (FONT_CAT_1 + LH_MAIN_TITLE_ADDITION)) / 2, FONT_CAT_1, 'bold', 'normal', LH_MAIN_TITLE_ADDITION, contentWidth, COLOR_BLACK_RGB, 'center');
  yPos += BLUE_HEADER_BOX_HEIGHT_TOP;

  // --- Line between "PROFORMA INVOICE" and "EXPORTER/CONSIGNEE" boxes ---
  doc.setDrawColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.setLineWidth(HORIZONTAL_LINE_THICKNESS);
  doc.line(PAGE_MARGIN_X, yPos, pageWidth - PAGE_MARGIN_X, yPos);
  yPos += HORIZONTAL_LINE_THICKNESS;
  // No SPACE_AFTER_MAIN_TITLE_ROW_BOX as the line is drawn immediately

  // --- HEADER: "EXPORTER" and "CONSIGNEE / BUYER:" Boxes (Second Row) ---
  const secondHeaderRowY = yPos;
  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(leftColumnX, secondHeaderRowY, halfContentWidth, BLUE_HEADER_BOX_HEIGHT_SECOND_ROW, 'F');
  drawTextBlockAndGetEndY(doc, "EXPORTER", leftColumnX + (halfContentWidth / 2), secondHeaderRowY + (BLUE_HEADER_BOX_HEIGHT_SECOND_ROW - (FONT_SECOND_ROW_HEADER_LABEL + LH_SECOND_ROW_HEADER_LABEL_ADDITION)) / 2, FONT_SECOND_ROW_HEADER_LABEL, 'bold', 'normal', LH_SECOND_ROW_HEADER_LABEL_ADDITION, halfContentWidth, COLOR_BLACK_RGB, 'center');

  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(rightColumnX, secondHeaderRowY, halfContentWidth, BLUE_HEADER_BOX_HEIGHT_SECOND_ROW, 'F');
  drawTextBlockAndGetEndY(doc, "CONSIGNEE / BUYER:", rightColumnX + (halfContentWidth / 2), secondHeaderRowY + (BLUE_HEADER_BOX_HEIGHT_SECOND_ROW - (FONT_SECOND_ROW_HEADER_LABEL + LH_SECOND_ROW_HEADER_LABEL_ADDITION)) / 2, FONT_SECOND_ROW_HEADER_LABEL, 'bold', 'normal', LH_SECOND_ROW_HEADER_LABEL_ADDITION, halfContentWidth, COLOR_BLACK_RGB, 'center');

  // Vertical line dividing Exporter and Consignee boxes in the second row header
  doc.setDrawColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.setLineWidth(HORIZONTAL_LINE_THICKNESS);
  doc.line(leftColumnX + halfContentWidth, secondHeaderRowY, leftColumnX + halfContentWidth, secondHeaderRowY + BLUE_HEADER_BOX_HEIGHT_SECOND_ROW);

  yPos = secondHeaderRowY + BLUE_HEADER_BOX_HEIGHT_SECOND_ROW;

  // --- Line below "EXPORTER / CONSIGNEE" boxes ---
  doc.setDrawColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.setLineWidth(HORIZONTAL_LINE_THICKNESS);
  doc.line(PAGE_MARGIN_X, yPos, pageWidth - PAGE_MARGIN_X, yPos);
  yPos += HORIZONTAL_LINE_THICKNESS;
  yPos += SPACE_AFTER_SECOND_ROW_LINE_CONTENT; // Space before actual exporter/client details

  // --- EXPORTER & CONSIGNEE DETAILS (Plain Text) ---
  let detailsStartY = yPos;
  let exporterCurrentY = detailsStartY;
  let consigneeCurrentY = detailsStartY;

  // Apply double line space before Exporter Company Name
  // This effectively creates the double space after the blue header boxes
  exporterCurrentY += (FONT_CAT_2 + LH_PACKED_ADDITION);
  exporterCurrentY = drawTextBlockAndGetEndY(doc, exporter.companyName.toUpperCase(), leftColumnX + 2, exporterCurrentY, FONT_CAT_2, 'bold', 'normal', LH_PACKED_ADDITION, halfContentWidth - 4);
  // Exporter Address
  exporterCurrentY = drawTextBlockAndGetEndY(doc, exporter.address, leftColumnX + 2, exporterCurrentY, FONT_CAT_3, 'normal', 'normal', LH_PACKED_ADDITION, halfContentWidth - 4);

  // Apply double line space before Client Company Name
  consigneeCurrentY += (FONT_CAT_2 + LH_PACKED_ADDITION);
  consigneeCurrentY = drawTextBlockAndGetEndY(doc, client.companyName.toUpperCase(), rightColumnX + 2, consigneeCurrentY, FONT_CAT_2, 'bold', 'normal', LH_PACKED_ADDITION, halfContentWidth - 4);
  // Client Address
  consigneeCurrentY = drawTextBlockAndGetEndY(doc, client.address, rightColumnX + 2, consigneeCurrentY, FONT_CAT_3, 'normal', 'normal', LH_PACKED_ADDITION, halfContentWidth - 4);

  yPos = Math.max(exporterCurrentY, consigneeCurrentY);

  // Vertical line dividing Exporter and Client details
  doc.setDrawColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.setLineWidth(HORIZONTAL_LINE_THICKNESS);
  doc.line(leftColumnX + halfContentWidth, detailsStartY, leftColumnX + halfContentWidth, yPos); // Line from start of details to end of taller column

  yPos += SPACE_BETWEEN_HEADER_SECTIONS;


  // --- HORIZONTAL LINE 1 (Content) ---
  doc.setDrawColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.setLineWidth(HORIZONTAL_LINE_THICKNESS);
  doc.line(PAGE_MARGIN_X, yPos, pageWidth - PAGE_MARGIN_X, yPos);
  yPos += HORIZONTAL_LINE_THICKNESS;
  yPos += SPACE_AFTER_HORIZONTAL_LINE_CONTENT;

  // --- Invoice Date/No & Final Destination (Below Line 1) ---
  const invDestBlockStartY = yPos;
  let tempYInvDest;
  const currentBlockHeightInvDest = BLUE_BG_LABEL_DOUBLE_LINE_HEIGHT;

  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(leftColumnX, invDestBlockStartY, halfContentWidth, currentBlockHeightInvDest, 'F');
  tempYInvDest = invDestBlockStartY + (currentBlockHeightInvDest - ((FONT_CAT_2 + LH_PACKED_ADDITION) + (FONT_CAT_3 + LH_PACKED_ADDITION) + LH_PACKED_ADDITION)) / 2;
  tempYInvDest = drawTextBlockAndGetEndY(doc, "INVOICE NO & DATE:", leftColumnX + 2, tempYInvDest, FONT_CAT_2, 'bold', 'normal', LH_PACKED_ADDITION, halfContentWidth - 4);
  drawTextBlockAndGetEndY(doc, `${invoice.invoiceNumber} / ${format(new Date(invoice.invoiceDate), 'dd-MM-yyyy')}`, leftColumnX + 2, tempYInvDest, FONT_CAT_3, 'normal', 'normal', LH_PACKED_ADDITION, halfContentWidth - 4);

  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(rightColumnX, invDestBlockStartY, halfContentWidth, currentBlockHeightInvDest, 'F');
  tempYInvDest = invDestBlockStartY + (currentBlockHeightInvDest - ((FONT_CAT_2 + LH_PACKED_ADDITION) + (FONT_CAT_3 + LH_PACKED_ADDITION) + LH_PACKED_ADDITION)) / 2;
  tempYInvDest = drawTextBlockAndGetEndY(doc, "FINAL DESTINATION:", rightColumnX + 2, tempYInvDest, FONT_CAT_2, 'bold', 'normal', LH_PACKED_ADDITION, halfContentWidth - 4);
  drawTextBlockAndGetEndY(doc, invoice.finalDestination.toUpperCase(), rightColumnX + 2, tempYInvDest, FONT_CAT_3, 'normal', 'normal', LH_PACKED_ADDITION, halfContentWidth - 4);

  // Vertical line dividing Invoice No/Date and Final Destination boxes
  doc.setDrawColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.setLineWidth(HORIZONTAL_LINE_THICKNESS);
  doc.line(leftColumnX + halfContentWidth, invDestBlockStartY, leftColumnX + halfContentWidth, invDestBlockStartY + currentBlockHeightInvDest);

  yPos = invDestBlockStartY + currentBlockHeightInvDest;
  yPos += SPACE_BETWEEN_HEADER_SECTIONS;

  // --- HORIZONTAL LINE 2 (Content) ---
  doc.setDrawColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.setLineWidth(HORIZONTAL_LINE_THICKNESS);
  doc.line(PAGE_MARGIN_X, yPos, pageWidth - PAGE_MARGIN_X, yPos);
  yPos += HORIZONTAL_LINE_THICKNESS;
  yPos += SPACE_AFTER_HORIZONTAL_LINE_CONTENT;

  // --- IEC Code & Terms (Below Line 2) ---
  const iecTermsBlockStartY = yPos;
  let tempYIecTerms;
  const currentBlockHeightIec = BLUE_BG_LABEL_DOUBLE_LINE_HEIGHT;

  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(leftColumnX, iecTermsBlockStartY, halfContentWidth, currentBlockHeightIec, 'F');
  tempYIecTerms = iecTermsBlockStartY + (currentBlockHeightIec - ((FONT_CAT_2 + LH_PACKED_ADDITION) + (FONT_CAT_3 + LH_PACKED_ADDITION) + LH_PACKED_ADDITION)) / 2;
  tempYIecTerms = drawTextBlockAndGetEndY(doc, "IEC. CODE:", leftColumnX + 2, tempYIecTerms, FONT_CAT_2, 'bold', 'normal', LH_PACKED_ADDITION, halfContentWidth - 4);
  drawTextBlockAndGetEndY(doc, exporter.iecNumber, leftColumnX + 2, tempYIecTerms, FONT_CAT_3, 'normal', 'normal', LH_PACKED_ADDITION, halfContentWidth - 4);

  // Terms and Conditions (Blue Box, height adjusts to content)
  const termsLabel = "TERMS AND CONDITIONS OF DELIVERY & PAYMENT:";
  const termsContent = invoice.termsAndConditions;

  // Calculate required height for terms section
  let termsCombinedTextHeight = 0;
  const termsLabelLines = doc.splitTextToSize(termsLabel, halfContentWidth - 4);
  termsLabelLines.forEach(() => termsCombinedTextHeight += (FONT_CAT_2 + LH_PACKED_ADDITION));
  termsCombinedTextHeight -= LH_PACKED_ADDITION; // Remove last addition for label block

  termsCombinedTextHeight += (FONT_CAT_3 + LH_PACKED_ADDITION) / 2; // Space between label and content

  const termsContentLines = doc.splitTextToSize(termsContent, halfContentWidth - 4);
  termsContentLines.forEach(() => termsCombinedTextHeight += (FONT_CAT_3 + LH_PACKED_ADDITION));
  termsCombinedTextHeight -= LH_PACKED_ADDITION; // Remove last addition for content block

  const termsBlueBoxHeight = termsCombinedTextHeight + BLUE_BOX_TEXT_PADDING_Y;


  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(rightColumnX, iecTermsBlockStartY, halfContentWidth, termsBlueBoxHeight, 'F');
  tempYIecTerms = iecTermsBlockStartY + BLUE_BOX_TEXT_PADDING_Y / 2;
  tempYIecTerms = drawTextBlockAndGetEndY(doc, termsLabel, rightColumnX + 2, tempYIecTerms, FONT_CAT_2, 'bold', 'normal', LH_PACKED_ADDITION, halfContentWidth - 4);
  tempYIecTerms += (FONT_CAT_3 + LH_PACKED_ADDITION) / 2;
  drawTextBlockAndGetEndY(doc, termsContent, rightColumnX + 2, tempYIecTerms, FONT_CAT_3, 'normal', 'normal', LH_PACKED_ADDITION, halfContentWidth - 4);

  // Vertical line dividing IEC Code and Terms boxes
  doc.setDrawColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.setLineWidth(HORIZONTAL_LINE_THICKNESS);
  doc.line(leftColumnX + halfContentWidth, iecTermsBlockStartY, leftColumnX + halfContentWidth, Math.max(iecTermsBlockStartY + currentBlockHeightIec, iecTermsBlockStartY + termsBlueBoxHeight));

  yPos = Math.max(iecTermsBlockStartY + currentBlockHeightIec, iecTermsBlockStartY + termsBlueBoxHeight);
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
    [{ content: 'SUB TOTAL', colSpan: 6, styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold', fontSize: FONT_CAT_2 } }, { content: (invoice.subTotal || 0).toFixed(2), styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold', fontSize: FONT_CAT_2} }],
    [{ content: `FREIGHT CHARGES ${invoice.currencyType}`, colSpan: 6, styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold', fontSize: FONT_CAT_2 } }, { content: (invoice.freight || 0).toFixed(2), styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold', fontSize: FONT_CAT_2 } }],
    [{ content: `DISCOUNT ${invoice.currencyType}`, colSpan: 6, styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold', fontSize: FONT_CAT_2 } }, { content: (invoice.discount || 0).toFixed(2), styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold', fontSize: FONT_CAT_2 } }],
    [{ content: `GRAND TOTAL ${invoice.currencyType}`, colSpan: 6, styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold', fontSize: FONT_CAT_2 } }, { content: (invoice.grandTotal || 0).toFixed(2), styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold', fontSize: FONT_CAT_2 } }],
  ];

  let tableEndY = 0;
  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    foot: tableFootData,
    startY: yPos,
    theme: 'grid',
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
    styles: { fontSize: FONT_CAT_3, cellPadding: 1.5, lineColor: COLOR_TABLE_LINE, lineWidth: HORIZONTAL_LINE_THICKNESS, valign: 'middle' },
    headStyles: { fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold', fontSize: FONT_CAT_2, cellPadding: 2, halign: 'center', valign: 'middle', minCellHeight: FONT_CAT_2 + LH_SINGLE_ADDITION + 4 },
    bodyStyles: { minCellHeight: FONT_CAT_3 + LH_PACKED_ADDITION * 1.5, fontSize: FONT_CAT_3 },
    footStyles: { fontSize: FONT_CAT_2, cellPadding: 2, lineWidth: HORIZONTAL_LINE_THICKNESS, lineColor: COLOR_TABLE_LINE, valign: 'middle', minCellHeight: FONT_CAT_2 + LH_SINGLE_ADDITION + 2},
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
      // @ts-ignore autoTable types might be incomplete
      tableEndY = data.cursor?.y ?? yPos;
    }
  });
  yPos = tableEndY + SPACE_AFTER_TABLE;

  // --- Total SQM & Amount in Words ---
  const totalSqmValue = invoice.items.reduce((sum, item) => sum + (item.quantitySqmt || 0), 0).toFixed(2);
  const totalSqmLabelText = "TOTAL SQM";
  const totalSqmBlockHeight = BLUE_BG_TOTALS_LINE_HEIGHT;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_CAT_2);
  const totalSqmLabelWidth = doc.getTextWidth(totalSqmLabelText) + 10;
  const totalSqmValueWidth = 60;
  const totalSqmBlockWidth = totalSqmLabelWidth + totalSqmValueWidth;

  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(PAGE_MARGIN_X, yPos, totalSqmLabelWidth, totalSqmBlockHeight, 'F');
  drawTextBlockAndGetEndY(
    doc,
    totalSqmLabelText,
    PAGE_MARGIN_X + 2,
    yPos + (totalSqmBlockHeight - (FONT_CAT_2 + LH_SINGLE_ADDITION)) / 2,
    FONT_CAT_2, 'bold', 'normal',
    LH_SINGLE_ADDITION,
    totalSqmLabelWidth - 4
  );

  doc.setDrawColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.setLineWidth(HORIZONTAL_LINE_THICKNESS);
  doc.rect(PAGE_MARGIN_X + totalSqmLabelWidth, yPos, totalSqmValueWidth, totalSqmBlockHeight, 'S');
  drawTextBlockAndGetEndY(
    doc,
    totalSqmValue,
    PAGE_MARGIN_X + totalSqmLabelWidth + (totalSqmValueWidth / 2),
    yPos + (totalSqmBlockHeight - (FONT_CAT_2 + LH_SINGLE_ADDITION)) / 2,
    FONT_CAT_2, 'bold', 'normal',
    LH_SINGLE_ADDITION,
    totalSqmValueWidth - 4,
    COLOR_BLACK_RGB,
    'center'
  );

  const amountInWordsStr = amountToWords(invoice.grandTotal || 0, invoice.currencyType);
  const amountInWordsLabelText = "TOTAL INVOICE AMOUNT IN WORDS:";
  const amountWordsLabelX = PAGE_MARGIN_X + totalSqmBlockWidth + 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_CAT_2);
  const amountWordsLabelActualWidth = doc.getTextWidth(amountInWordsLabelText);
  const amountWordsLabelBoxWidth = amountWordsLabelActualWidth + 10;

  const amountWordsValueMaxWidth = contentWidth - (amountWordsLabelX - PAGE_MARGIN_X) - amountWordsLabelBoxWidth;

  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(amountWordsLabelX, yPos, amountWordsLabelBoxWidth, totalSqmBlockHeight, 'F');
  drawTextBlockAndGetEndY(
    doc,
    amountInWordsLabelText,
    amountWordsLabelX + 5,
    yPos + (totalSqmBlockHeight - (FONT_CAT_2 + LH_SINGLE_ADDITION)) / 2,
    FONT_CAT_2, 'bold', 'normal',
    LH_SINGLE_ADDITION,
    amountWordsLabelActualWidth
  );

  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(amountWordsLabelX + amountWordsLabelBoxWidth, yPos, amountWordsValueMaxWidth, totalSqmBlockHeight, 'F');
  drawTextBlockAndGetEndY(
    doc,
    amountInWordsStr.toUpperCase(),
    amountWordsLabelX + amountWordsLabelBoxWidth + 2,
    yPos + (totalSqmBlockHeight - (FONT_CAT_2 + LH_SINGLE_ADDITION)) / 2,
    FONT_CAT_2, 'bold', 'normal',
    LH_SINGLE_ADDITION,
    amountWordsValueMaxWidth - 4,
    COLOR_BLACK_RGB,
    'left'
  );

  yPos += totalSqmBlockHeight + SPACE_FOOTER_SECTION_GAP;

  if (invoice.note) {
    let noteY = yPos;
    noteY = drawTextBlockAndGetEndY(doc, "Note:", PAGE_MARGIN_X, noteY, FONT_CAT_2, 'bold', 'normal', LH_SINGLE_ADDITION, contentWidth);
    const noteLines = invoice.note.split('\n');
    noteLines.forEach(line => {
      let style: 'bold' | 'normal' = 'normal';
      const keywordsToBold = ["TRANSSHIPMENT ALLOWED.", "PARTIAL SHIPMENT ALLOWED.", "SHIPMENT : AS EARLY AS POSSIBLE.", "QUANTITY AND VALUE +/-10% ALLOWED.", "NOT ACCEPTED ANY REFUND OR EXCHANGE.", "ANY TRANSACTION CHARGES WILL BE PAIDED BY CONSIGNEE."];
      if (keywordsToBold.some(kw => line.toUpperCase().trim().startsWith(kw))) {
        style = 'bold';
      }
      noteY = drawTextBlockAndGetEndY(doc, line, PAGE_MARGIN_X, noteY, FONT_CAT_3, style, 'normal', LH_PACKED_ADDITION, contentWidth);
    });
    yPos = noteY + SPACE_FOOTER_SECTION_GAP;
  }

  if (selectedBank) {
    let bankY = yPos;
    bankY = drawTextBlockAndGetEndY(doc, "BENEFICIARY DETAILS:", PAGE_MARGIN_X, bankY, FONT_CAT_2, 'bold', 'normal', LH_SINGLE_ADDITION, contentWidth);
    const bankDetails = [
      `BENEFICIARY NAME: ${exporter.companyName.toUpperCase()}`,
      `BENEFICIARY BANK: ${selectedBank.bankName.toUpperCase()}, BRANCH: ${selectedBank.bankAddress.toUpperCase()}`,
      `BENEFICIARY A/C NO: ${selectedBank.accountNumber}, SWIFT CODE: ${selectedBank.swiftCode.toUpperCase()}, IFSC CODE: ${selectedBank.ifscCode.toUpperCase()}`
    ];
    bankDetails.forEach(detail => {
      bankY = drawTextBlockAndGetEndY(doc, detail, PAGE_MARGIN_X, bankY, FONT_CAT_3, 'normal', 'normal', LH_PACKED_ADDITION, contentWidth);
    });
    yPos = bankY + SPACE_FOOTER_SECTION_GAP;
  }

  let declarationY = yPos;
  declarationY = drawTextBlockAndGetEndY(doc, "Declaration:", PAGE_MARGIN_X, declarationY, FONT_CAT_2, 'bold', 'normal', LH_SINGLE_ADDITION, contentWidth);
  declarationY = drawTextBlockAndGetEndY(doc, "CERTIFIED THAT THE PARTICULARS GIVEN ABOVE ARE TRUE AND CORRECT.", PAGE_MARGIN_X, declarationY, FONT_CAT_3, 'normal', 'normal', LH_PACKED_ADDITION, contentWidth);
  yPos = declarationY + SPACE_BEFORE_SIGNATURE;

  const signatureTextLine1 = `FOR, ${exporter.companyName.toUpperCase()}`;
  const signatureTextLine2 = "AUTHORISED SIGNATURE";

  const signatureBlockHeight = ((FONT_CAT_2 + LH_SINGLE_ADDITION) * 2) + (FONT_CAT_2 + LH_SINGLE_ADDITION);
  if (yPos + signatureBlockHeight > doc.internal.pageSize.getHeight() - PAGE_MARGIN_Y_BOTTOM) {
    doc.addPage();
    yPos = PAGE_MARGIN_Y_TOP;
  }

  let signatureY = yPos;
  signatureY = drawTextBlockAndGetEndY(doc, signatureTextLine1, pageWidth - PAGE_MARGIN_X, signatureY, FONT_CAT_2, 'bold', 'normal', LH_SINGLE_ADDITION, undefined, COLOR_BLACK_RGB, 'right');
  signatureY += (FONT_CAT_2 + LH_SINGLE_ADDITION);
  drawTextBlockAndGetEndY(doc, signatureTextLine2, pageWidth - PAGE_MARGIN_X, signatureY, FONT_CAT_2, 'bold', 'normal', LH_SINGLE_ADDITION, undefined, COLOR_BLACK_RGB, 'right');

  doc.save(`Performa_Invoice_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
}
    