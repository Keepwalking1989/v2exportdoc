
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
const COLOR_BLUE_RGB = [217, 234, 247];
const COLOR_BLACK_RGB = [0, 0, 0];
const COLOR_TABLE_LINE = [150, 150, 150];

// --- Font Sizes (pt) ---
const FONT_MAIN_TITLE = 12;
const FONT_SECTION_LABEL_HEADER = 8;
const FONT_CONTENT_PRIMARY = 8;
const FONT_TABLE_HEAD = 7.5;
const FONT_TABLE_BODY = 7.5;
const FONT_FOOTER_LABEL_BLUE_BG = 7;
const FONT_FOOTER_CONTENT = 7; // For note, bank details
const FONT_FOOTER_LABEL_BOLD = 7; // For labels like "Note:", "Declaration:"
const FONT_SIGNATURE = 8;

// --- Line Heights (pt) - Additional height over font size ---
const LH_PACKED = 1.8; // For multi-line text blocks where lines are close
const LH_SINGLE = 2.0; // For single distinct lines or labels

// --- Element Heights ---
const BLUE_BG_LABEL_HEIGHT = FONT_SECTION_LABEL_HEADER + 4; // Font size + padding

// --- Spacing (pt) ---
const SPACE_AFTER_MAIN_TITLE = 4;
const SPACE_BETWEEN_HEADER_SECTIONS = 1.5;
const SPACE_AFTER_HORIZONTAL_LINE = 2; // Space after a line, before text
const SPACE_BEFORE_TABLE = 3;
const SPACE_AFTER_TABLE = 4;
const SPACE_FOOTER_SECTION_GAP = 3;


/**
 * Helper function to draw text, handle multi-line, and advance yPos.
 * @param text The text string or array of strings.
 * @param x The x-coordinate.
 * @param currentY The starting y-coordinate for this block of text.
 * @param fontSize The font size.
 * @param fontWeight The font weight ('normal' or 'bold').
 * @param fontStyle The font style ('normal' or 'italic').
 * @param lineHeightIncrement The additional space to add after each line (on top of font size).
 * @param maxWidth Optional. Max width for text wrapping.
 * @param color Optional. Text color [r, g, b].
 * @param align Optional. Text alignment.
 * @returns The y-coordinate after drawing the text.
 */
function drawTextLines(
  doc: jsPDF,
  text: string | string[],
  x: number,
  currentY: number,
  fontSize: number,
  fontWeight: 'normal' | 'bold',
  fontStyle: 'normal' | 'italic',
  lineHeightIncrement: number,
  maxWidth?: number,
  color: number[] = COLOR_BLACK_RGB,
  align: 'left' | 'center' | 'right' = 'left'
): number {
  doc.setFontSize(fontSize);
  
  let combinedStyle = 'normal';
  if (fontWeight === 'bold' && fontStyle === 'italic') {
    combinedStyle = 'bolditalic';
  } else if (fontWeight === 'bold') {
    combinedStyle = 'bold';
  } else if (fontStyle === 'italic') {
    combinedStyle = 'italic';
  }
  doc.setFont('helvetica', combinedStyle);

  doc.setTextColor(color[0], color[1], color[2]);

  const lines = Array.isArray(text) ? text : (maxWidth ? doc.splitTextToSize(text || '', maxWidth) : [text || '']);
  let newY = currentY;

  lines.forEach(line => {
    doc.text(line, x, newY + fontSize, { align }); // y is baseline
    newY += fontSize + lineHeightIncrement; // Advance y by full line height
  });
  return newY - (fontSize + lineHeightIncrement); // Return Y of last line's end (before adding its height)
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

  doc.setFont('helvetica');

  // --- MAIN TITLE ---
  yPos = drawTextLines(doc, 'PROFORMA INVOICE', pageWidth / 2, yPos, FONT_MAIN_TITLE, 'bold', 'normal', LH_SINGLE, undefined, COLOR_BLACK_RGB, 'center')
       + FONT_MAIN_TITLE + LH_SINGLE + SPACE_AFTER_MAIN_TITLE;

  // --- EXPORTER & CONSIGNEE ---
  let exporterEndY = yPos;
  let consigneeEndY = yPos;

  // Exporter Details
  exporterEndY = drawTextLines(doc, "EXPORTER:", leftColumnX, exporterEndY, FONT_CONTENT_PRIMARY, 'bold', 'normal', LH_PACKED, halfContentWidth)
             + FONT_CONTENT_PRIMARY + LH_PACKED;
  exporterEndY = drawTextLines(doc, exporter.companyName.toUpperCase(), leftColumnX, exporterEndY, FONT_CONTENT_PRIMARY, 'bold', 'normal', LH_PACKED, halfContentWidth)
             + FONT_CONTENT_PRIMARY + LH_PACKED;
  exporterEndY = drawTextLines(doc, exporter.address, leftColumnX, exporterEndY, FONT_CONTENT_PRIMARY, 'normal', 'normal', LH_PACKED, halfContentWidth)
             + FONT_CONTENT_PRIMARY + LH_PACKED;
  // Tel & IEC are now part of the blue boxes below or handled differently based on image

  // Consignee Details
  consigneeEndY = drawTextLines(doc, "CONSIGNEE / BUYER:", rightColumnX, consigneeEndY, FONT_CONTENT_PRIMARY, 'bold', 'normal', LH_PACKED, halfContentWidth)
              + FONT_CONTENT_PRIMARY + LH_PACKED;
  consigneeEndY = drawTextLines(doc, client.companyName.toUpperCase(), rightColumnX, consigneeEndY, FONT_CONTENT_PRIMARY, 'bold', 'normal', LH_PACKED, halfContentWidth)
              + FONT_CONTENT_PRIMARY + LH_PACKED;
  consigneeEndY = drawTextLines(doc, client.address, rightColumnX, consigneeEndY, FONT_CONTENT_PRIMARY, 'normal', 'normal', LH_PACKED, halfContentWidth)
              + FONT_CONTENT_PRIMARY + LH_PACKED;
  // Contact person, number, city, country, pincode might be part of address or handled differently

  yPos = Math.max(exporterEndY, consigneeEndY) + SPACE_BETWEEN_HEADER_SECTIONS;


  // --- HORIZONTAL LINE 1 ---
  doc.setDrawColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.setLineWidth(0.5);
  doc.line(PAGE_MARGIN_X, yPos, pageWidth - PAGE_MARGIN_X, yPos);
  yPos += SPACE_AFTER_HORIZONTAL_LINE;

  // --- Invoice Date/No & Final Destination (Below Line 1) ---
  let invDateEndY = yPos;
  let finalDestEndY = yPos;

  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(leftColumnX, yPos, halfContentWidth, BLUE_BG_LABEL_HEIGHT, 'F');
  const invDateStr = `INVOICE NO & DATE: ${invoice.invoiceNumber} / ${format(new Date(invoice.invoiceDate), 'dd-MM-yyyy')}`;
  invDateEndY = drawTextLines(doc, invDateStr, leftColumnX + 2, yPos, FONT_SECTION_LABEL_HEADER, 'normal', 'normal', LH_SINGLE, halfContentWidth - 4)
              + FONT_SECTION_LABEL_HEADER + LH_SINGLE;

  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(rightColumnX, yPos, halfContentWidth, BLUE_BG_LABEL_HEIGHT, 'F');
  finalDestEndY = drawTextLines(doc, `FINAL DESTINATION: ${invoice.finalDestination.toUpperCase()}`, rightColumnX + 2, yPos, FONT_SECTION_LABEL_HEADER, 'normal', 'normal', LH_SINGLE, halfContentWidth - 4)
                + FONT_SECTION_LABEL_HEADER + LH_SINGLE;

  yPos = Math.max(invDateEndY, finalDestEndY) + SPACE_BETWEEN_HEADER_SECTIONS;


  // --- HORIZONTAL LINE 2 ---
  doc.line(PAGE_MARGIN_X, yPos, pageWidth - PAGE_MARGIN_X, yPos);
  yPos += SPACE_AFTER_HORIZONTAL_LINE;

  // --- IEC Code & Terms (Below Line 2) ---
  let iecEndY = yPos;
  let termsEndY = yPos;

  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(leftColumnX, yPos, halfContentWidth, BLUE_BG_LABEL_HEIGHT, 'F');
  iecEndY = drawTextLines(doc, `IEC. CODE: ${exporter.iecNumber}`, leftColumnX + 2, yPos, FONT_SECTION_LABEL_HEADER, 'normal', 'normal', LH_SINGLE, halfContentWidth - 4)
          + FONT_SECTION_LABEL_HEADER + LH_SINGLE;

  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  const termsTextHeight = doc.getTextDimensions(invoice.termsAndConditions, { fontSize: FONT_SECTION_LABEL_HEADER, maxWidth: halfContentWidth - 4 }).h + 4;
  const termsBlueBoxHeight = Math.max(BLUE_BG_LABEL_HEIGHT, termsTextHeight);
  doc.rect(rightColumnX, yPos, halfContentWidth, termsBlueBoxHeight, 'F');
  termsEndY = drawTextLines(doc, `TERMS AND CONDITIONS OF DELIVERY & PAYMENT: ${invoice.termsAndConditions}`, rightColumnX + 2, yPos, FONT_SECTION_LABEL_HEADER, 'normal', 'normal', LH_PACKED, halfContentWidth - 4)
            + FONT_SECTION_LABEL_HEADER + LH_PACKED * (doc.splitTextToSize(invoice.termsAndConditions, halfContentWidth - 4).length);


  yPos = Math.max(iecEndY, termsEndY) + SPACE_BEFORE_TABLE;


  // --- PRODUCT TABLE ---
  const tableHead = [['SR.\nNO.', 'HSN\nCODE', 'DESCRIPTION OF GOODS', 'TOTAL\nBOXES', 'TOTAL\nSQMT', `RATE\n${invoice.currencyType}`, `AMOUNT\n${invoice.currencyType}`]];
  const tableBody = invoice.items.map((item, index) => {
    const product = allProducts.find(p => p.id === item.productId);
    const size = allSizes.find(s => s.id === item.sizeId);
    // As per image, goods description is combined
    const goodsDesc = `${product?.designName || 'N/A'} ${size?.size || 'N/A'}`;
    const boxes = item.boxes; // Assuming this is total boxes for this item
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

  // Ensure minimum rows in table if needed, as per original logic, or remove if not desired
  const minTableRows = 3; // Example, adjust based on visual preference from image
  const emptyRowsNeeded = Math.max(0, minTableRows - tableBody.length);
  for (let i = 0; i < emptyRowsNeeded; i++) {
    tableBody.push(['', '', '', '', '', '', '']);
  }
  
  const tableFootData = [
    [{ content: 'SUB TOTAL', colSpan: 6, styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold' } }, { content: (invoice.subTotal || 0).toFixed(2), styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold'} }],
    [{ content: `FREIGHT CHARGES ${invoice.currencyType}`, colSpan: 6, styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold' } }, { content: (invoice.freight || 0).toFixed(2), styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold' } }],
    [{ content: `OTHER CHARGES ${invoice.currencyType}`, colSpan: 6, styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold' } }, { content: '0.00', styles: { halign: 'right', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold' } }], // Assuming no other charges for now
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
    headStyles: { fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold', fontSize: FONT_TABLE_HEAD, cellPadding: 2, halign: 'center', valign: 'middle' },
    footStyles: { fontSize: FONT_TABLE_HEAD, cellPadding: 1.5,  lineWidth: 0.5, lineColor: COLOR_TABLE_LINE, valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 30, halign: 'center' }, // SR. NO.
      1: { cellWidth: 50, halign: 'center' }, // HSN CODE
      2: { cellWidth: 'auto' },                // DESCRIPTION
      3: { cellWidth: 40, halign: 'center' }, // TOTAL BOXES
      4: { cellWidth: 50, halign: 'right' },  // TOTAL SQMT
      5: { cellWidth: 50, halign: 'right' },  // RATE
      6: { cellWidth: 65, halign: 'right' },  // AMOUNT
    },
    didDrawPage: (data) => {
      tableEndY = data.cursor?.y ?? yPos; // Update yPos to after the table
    }
  });
  yPos = tableEndY + SPACE_AFTER_TABLE;

  // --- Total SQM & Amount in Words ---
  const totalSqmValue = invoice.items.reduce((sum, item) => sum + (item.quantitySqmt || 0), 0).toFixed(2);
  const totalSqmLabel = "TOTAL SQM";
  const totalSqmBlockHeight = FONT_FOOTER_LABEL_BLUE_BG + 4;
  const totalSqmLabelWidth = doc.getTextWidth(totalSqmLabel) + 10; // Approx label width + padding
  const totalSqmValueWidth = 60; // Fixed width for the value box
  const totalSqmBlockWidth = totalSqmLabelWidth + totalSqmValueWidth;

  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(PAGE_MARGIN_X, yPos, totalSqmLabelWidth, totalSqmBlockHeight, 'F'); // Label bg
  drawTextLines(doc, totalSqmLabel, PAGE_MARGIN_X + 2, yPos, FONT_FOOTER_LABEL_BLUE_BG, 'bold', 'normal', LH_SINGLE, totalSqmLabelWidth - 4, COLOR_BLACK_RGB);
  
  doc.setDrawColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.rect(PAGE_MARGIN_X + totalSqmLabelWidth, yPos, totalSqmValueWidth, totalSqmBlockHeight, 'S'); // Value box
  drawTextLines(doc, totalSqmValue, PAGE_MARGIN_X + totalSqmLabelWidth + (totalSqmValueWidth / 2), yPos, FONT_FOOTER_LABEL_BLUE_BG, 'bold', 'normal', LH_SINGLE, totalSqmValueWidth - 4, COLOR_BLACK_RGB, 'center');

  // Amount in Words
  const amountInWordsStr = amountToWords(invoice.grandTotal || 0, invoice.currencyType);
  const amountInWordsLabel = "TOTAL INVOICE AMOUNT IN WORDS:";
  const amountWordsLabelX = PAGE_MARGIN_X + totalSqmBlockWidth + 5;
  const amountWordsLabelWidth = doc.getTextWidth(amountInWordsLabel) + 10;
  const amountWordsValueMaxWidth = contentWidth - totalSqmBlockWidth - 5 - 5; // Remaining width

  doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
  doc.rect(amountWordsLabelX, yPos, amountWordsValueMaxWidth, totalSqmBlockHeight, 'F'); // Blue BG for the whole line
  drawTextLines(doc, `${amountInWordsLabel} ${amountInWordsStr.toUpperCase()}`, amountWordsLabelX + 2, yPos, FONT_FOOTER_LABEL_BLUE_BG, 'bold', 'normal', LH_SINGLE, amountWordsValueMaxWidth - 4, COLOR_BLACK_RGB);
  
  yPos += totalSqmBlockHeight + SPACE_FOOTER_SECTION_GAP;


  // --- Note ---
  if (invoice.note) {
    yPos = drawTextLines(doc, "Note:", PAGE_MARGIN_X, yPos, FONT_FOOTER_LABEL_BOLD, 'bold', 'normal', LH_SINGLE, contentWidth)
         + FONT_FOOTER_LABEL_BOLD + LH_SINGLE;
    const noteLines = invoice.note.split('\n');
    noteLines.forEach(line => {
      let style: 'bold' | 'normal' = 'normal';
      const keywordsToBold = ["TRANSSHIPMENT ALLOWED.", "PARTIAL SHIPMENT ALLOWED.", "SHIPMENT : AS EARLY AS POSSIBLE.", "QUANTITY AND VALUE +/-10% ALLOWED.", "NOT ACCEPTED ANY REFUND OR EXCHANGE .", "ANY TRANSACTION CHARGES WILL BE PAIDED BY CONSIGNEE."];
      if (keywordsToBold.some(kw => line.toUpperCase().trim().startsWith(kw))) {
        style = 'bold';
      }
      yPos = drawTextLines(doc, line, PAGE_MARGIN_X, yPos, FONT_FOOTER_CONTENT, style, 'normal', LH_PACKED, contentWidth)
           + FONT_FOOTER_CONTENT + LH_PACKED;
    });
    yPos += SPACE_FOOTER_SECTION_GAP; // Add gap after the note if it exists
  }
  
  // --- Beneficiary Details ---
  if (selectedBank) {
    yPos = drawTextLines(doc, "BENEFICIARY DETAILS:", PAGE_MARGIN_X, yPos, FONT_FOOTER_LABEL_BOLD, 'bold', 'normal', LH_SINGLE, contentWidth)
         + FONT_FOOTER_LABEL_BOLD + LH_SINGLE;
    const bankDetails = [
      `BENEFICIARY NAME: ${selectedBank.bankName.toUpperCase()}`,
      `BENEFICIARY BANK: ${selectedBank.bankName.toUpperCase()}, BRANCH: ${selectedBank.bankAddress.toUpperCase()}`, // Assuming bankAddress contains branch info
      // `BENEFICIARY BANK ADDRESS: ${selectedBank.bankAddress.toUpperCase()}`, // This might be redundant or part of above
      `BENEFICIARY A/C NO: ${selectedBank.accountNumber}, SWIFT CODE: ${selectedBank.swiftCode.toUpperCase()}, IFSC CODE: ${selectedBank.ifscCode.toUpperCase()}`
    ];
    bankDetails.forEach(detail => {
      yPos = drawTextLines(doc, detail, PAGE_MARGIN_X, yPos, FONT_FOOTER_CONTENT, 'normal', 'normal', LH_PACKED, contentWidth)
           + FONT_FOOTER_CONTENT + LH_PACKED;
    });
    yPos += SPACE_FOOTER_SECTION_GAP;
  }

  // --- Declaration ---
  yPos = drawTextLines(doc, "Declaration:", PAGE_MARGIN_X, yPos, FONT_FOOTER_LABEL_BOLD, 'bold', 'normal', LH_SINGLE, contentWidth)
       + FONT_FOOTER_LABEL_BOLD + LH_SINGLE;
  yPos = drawTextLines(doc, "CERTIFIED THAT THE PARTICULARS GIVEN ABOVE ARE TRUE AND CORRECT.", PAGE_MARGIN_X, yPos, FONT_FOOTER_CONTENT, 'normal', 'normal', LH_PACKED, contentWidth)
       + FONT_FOOTER_CONTENT + LH_PACKED;
  yPos += SPACE_FOOTER_SECTION_GAP + 10; // More space before signature

  // --- Signature ---
  const signatureTextLine1 = `FOR, ${exporter.companyName.toUpperCase()}`;
  const signatureTextLine2 = "AUTHORISED SIGNATURE";
  
  const signatureBlockHeight = (FONT_SIGNATURE + LH_SINGLE) * 3; 
  if (yPos + signatureBlockHeight > doc.internal.pageSize.getHeight() - PAGE_MARGIN_Y_BOTTOM) {
    doc.addPage();
    yPos = PAGE_MARGIN_Y_TOP;
  }

  // Calculate widths for right alignment
  const sigLine1Width = doc.getTextWidth(signatureTextLine1);
  const sigLine2Width = doc.getTextWidth(signatureTextLine2);
  const maxSigWidth = Math.max(sigLine1Width, sigLine2Width);
  const sigX = pageWidth - PAGE_MARGIN_X - maxSigWidth;


  yPos = drawTextLines(doc, signatureTextLine1, pageWidth - PAGE_MARGIN_X, yPos, FONT_SIGNATURE, 'bold', 'normal', LH_SINGLE, undefined, COLOR_BLACK_RGB, 'right')
       + FONT_SIGNATURE + LH_SINGLE;
  
  // yPos is now at the baseline of signatureTextLine1 + its full height. We want the line above AUTHORISED SIGNATURE.
  let lineY = yPos + (FONT_SIGNATURE + LH_SINGLE); // Estimated Y for the line
  doc.setDrawColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  doc.setLineWidth(0.8);
  // doc.line(sigX, lineY, pageWidth - PAGE_MARGIN_X, lineY);
  
  yPos += (FONT_SIGNATURE + LH_SINGLE) * 1.5; // More space before "AUTHORISED SIGNATURE"

  yPos = drawTextLines(doc, signatureTextLine2, pageWidth - PAGE_MARGIN_X, yPos, FONT_SIGNATURE, 'bold', 'normal', LH_SINGLE, undefined, COLOR_BLACK_RGB, 'right')
       + FONT_SIGNATURE + LH_SINGLE;

  doc.save(`Performa_Invoice_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
}
