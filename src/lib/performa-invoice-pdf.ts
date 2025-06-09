
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

// --- Page & General Layout ---
const PAGE_MARGIN_TOP = 6;
const PAGE_MARGIN_SIDES = 12;

// --- Font Sizes (Mimicking Image) ---
const FONT_SIZE_MAIN_TITLE = 12;
const FONT_SIZE_SECTION_LABEL = 8; // For "EXPORTER:", "CONSIGNEE:" etc.
const FONT_SIZE_CONTENT_PRIMARY = 8; // For addresses, main text values
const FONT_SIZE_TABLE_HEAD = 7.5;
const FONT_SIZE_TABLE_BODY = 7.5;
const FONT_SIZE_FOOTER_PRIMARY = 7; // For labels in footer like "TOTAL SQM"
const FONT_SIZE_FOOTER_SECONDARY = 6.5; // For actual values in footer, note content

// --- Line Heights (Extremely Tight, very close to font size) ---
const LH_MAIN_TITLE = FONT_SIZE_MAIN_TITLE; // Was +0.5
const LH_SECTION_LABEL = FONT_SIZE_SECTION_LABEL; // Was +0.2
const LH_CONTENT_PACKED = FONT_SIZE_CONTENT_PRIMARY; // For multi-line addresses etc. Was +0.1
const LH_CONTENT_SINGLE = FONT_SIZE_CONTENT_PRIMARY; // For single lines of text. Was +0.15

const LH_TABLE_CELL = FONT_SIZE_TABLE_BODY; // For table cells. Was +0.5

const LH_FOOTER_PACKED = FONT_SIZE_FOOTER_SECONDARY; // For multi-line text in footer. Was +0.1
const LH_FOOTER_SINGLE = FONT_SIZE_FOOTER_PRIMARY; // For single lines in footer. Was +0.2

// --- Spacing Between Elements (User set to 0) ---
const MINIMAL_INTERNAL_SPACING = 0.0; // Smallest gap between lines within a conceptual block
const SPACE_AFTER_MAIN_TITLE = 0.0;
const SPACE_AFTER_SECTION_LABEL = 0.0; // Default space after a section label
const SPACE_AFTER_BLOCK_HEADER = 0.0; // Space after a text block (like Exporter details), before the horizontal line below it
const SPACE_AFTER_HORIZONTAL_LINE = 0.0; // Space after a horizontal line, before the text block below it
const SPACE_BEFORE_TABLE_CONTENT = 0.0; // Space after the last header block (IEC Code), before the table
const SPACE_AFTER_TABLE = 0.0;
const SPACE_BETWEEN_FOOTER_BLOCKS = 0.0;
const SPACE_BEFORE_SIGNATURE = 0.0;

export function generatePerformaInvoicePdf(
  invoice: PerformaInvoice,
  exporter: Company,
  client: Client,
  allSizes: Size[],
  allProducts: Product[],
  selectedBank?: Bank
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' }); // Using points for finer control
  let yPos = PAGE_MARGIN_TOP * (72 / 25.4); // Convert mm to points
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageMarginSidesPt = PAGE_MARGIN_SIDES * (72 / 25.4);
  const contentMaxWidthLeft = pageWidth / 2 - pageMarginSidesPt - 2;
  const contentMaxWidthRight = pageWidth / 2 - pageMarginSidesPt - 2;

  const addText = (
    text: string | string[],
    x: number,
    currentY: number,
    options: {
      fontSize?: number;
      fontWeight?: 'normal' | 'bold';
      fontStyle?: 'normal' | 'italic';
      lineHeight?: number; // Explicit line height
      spacingAfter?: number; // Space after this entire text block
      align?: 'left' | 'center' | 'right';
      color?: [number, number, number];
      maxWidth?: number;
      isFooter?: boolean; // Flag to use footer default line height
    } = {}
  ): number => {
    const fontSize = options.fontSize || FONT_SIZE_CONTENT_PRIMARY;
    // Extremely tight default line height, equal to font size
    const effectiveLineHeight = options.lineHeight || fontSize;
    const align = options.align || 'left';
    const maxWidth = options.maxWidth;
    const fontWeight = options.fontWeight || 'normal';
    const fontStyle = options.fontStyle || 'normal';

    let combinedStyle = 'normal';
    if (fontWeight === 'bold' && fontStyle === 'italic') combinedStyle = 'bolditalic';
    else if (fontWeight === 'bold') combinedStyle = 'bold';
    else if (fontStyle === 'italic') combinedStyle = 'italic';

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', combinedStyle);

    if (options.color) {
      doc.setTextColor(options.color[0], options.color[1], options.color[2]);
    } else {
      doc.setTextColor(0, 0, 0);
    }

    let newY = currentY;
    const textToProcess = Array.isArray(text) ? text : [text || ""];

    textToProcess.forEach(lineContent => {
      let lines = [lineContent];
      if (maxWidth && lineContent) {
        lines = doc.splitTextToSize(lineContent, maxWidth);
      }
      lines.forEach(line => {
        let actualX = x;
        if (align === 'center') actualX = pageWidth / 2;
        else if (align === 'right') { /* x is already the rightmost point for text() */ }
        doc.text(line, actualX, newY, { align: align, lineHeightFactor: 1.0 }); // lineHeightFactor 1.0 tries to respect exact fontSize
        newY += effectiveLineHeight;
      });
    });
    return newY + (options.spacingAfter || 0);
  };

  // --- 1. "PROFORMA INVOICE" Title ---
  yPos = addText('PROFORMA INVOICE', pageWidth / 2, yPos, {
    fontSize: FONT_SIZE_MAIN_TITLE, fontWeight: 'bold', align: 'center',
    lineHeight: LH_MAIN_TITLE, spacingAfter: SPACE_AFTER_MAIN_TITLE,
  });

  const leftColumnX = pageMarginSidesPt;
  const rightColumnX = pageWidth / 2 + 2;

  let yPosLeft = yPos;
  let yPosRight = yPos;

  // --- EXPORTER ---
  yPosLeft = addText('EXPORTER', leftColumnX, yPosLeft, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: SPACE_AFTER_SECTION_LABEL });
  yPosLeft = addText(exporter.companyName, leftColumnX, yPosLeft, { fontSize: FONT_SIZE_CONTENT_PRIMARY, fontWeight: 'bold', lineHeight: LH_CONTENT_PACKED, spacingAfter: MINIMAL_INTERNAL_SPACING, maxWidth: contentMaxWidthLeft });
  yPosLeft = addText(exporter.address, leftColumnX, yPosLeft, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: MINIMAL_INTERNAL_SPACING, maxWidth: contentMaxWidthLeft });

  // --- CONSIGNEE ---
  yPosRight = addText('CONSIGNEE', rightColumnX, yPosRight, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: SPACE_AFTER_SECTION_LABEL });
  yPosRight = addText(client.companyName, rightColumnX, yPosRight, { fontSize: FONT_SIZE_CONTENT_PRIMARY, fontWeight: 'bold', lineHeight: LH_CONTENT_PACKED, spacingAfter: MINIMAL_INTERNAL_SPACING, maxWidth: contentMaxWidthRight });
  const consigneeAddress = `${client.address}\n${client.city}, ${client.country} - ${client.pinCode}`;
  yPosRight = addText(consigneeAddress, rightColumnX, yPosRight, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: MINIMAL_INTERNAL_SPACING, maxWidth: contentMaxWidthRight });

  yPos = Math.max(yPosLeft, yPosRight);
  yPos += SPACE_AFTER_BLOCK_HEADER;
  doc.setLineWidth(0.2);
  doc.line(pageMarginSidesPt, yPos, pageWidth - pageMarginSidesPt, yPos);
  yPos += SPACE_AFTER_HORIZONTAL_LINE;

  // --- Invoice Date/Number & Final Destination ---
  yPosLeft = yPos;
  yPosRight = yPos;

  yPosLeft = addText('Invoice Date And Number', leftColumnX, yPosLeft, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: SPACE_AFTER_SECTION_LABEL });
  yPosLeft = addText(`${invoice.invoiceNumber} / ${format(new Date(invoice.invoiceDate), 'dd-MM-yyyy')}`, leftColumnX, yPosLeft, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING });

  yPosRight = addText('Final Destination', rightColumnX, yPosRight, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: SPACE_AFTER_SECTION_LABEL });
  yPosRight = addText(invoice.finalDestination, rightColumnX, yPosRight, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING, maxWidth: contentMaxWidthRight });

  yPos = Math.max(yPosLeft, yPosRight);
  yPos += SPACE_AFTER_BLOCK_HEADER;
  doc.setLineWidth(0.2);
  doc.line(pageMarginSidesPt, yPos, pageWidth - pageMarginSidesPt, yPos);
  yPos += SPACE_AFTER_HORIZONTAL_LINE;

  // --- IEC Code & Terms and Conditions ---
  yPosLeft = yPos;
  yPosRight = yPos;

  if (exporter.iecNumber) {
    yPosLeft = addText('IEC. Code', leftColumnX, yPosLeft, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: SPACE_AFTER_SECTION_LABEL });
    yPosLeft = addText(exporter.iecNumber, leftColumnX, yPosLeft, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING });
  } else {
    yPosLeft += (LH_SECTION_LABEL + SPACE_AFTER_SECTION_LABEL) + (LH_CONTENT_SINGLE + MINIMAL_INTERNAL_SPACING);
  }

  yPosRight = addText('Terms And Conditions Of Delivery And Payment', rightColumnX, yPosRight, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: SPACE_AFTER_SECTION_LABEL });
  yPosRight = addText(invoice.termsAndConditions, rightColumnX, yPosRight, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: MINIMAL_INTERNAL_SPACING, maxWidth: contentMaxWidthRight });

  yPos = Math.max(yPosLeft, yPosRight);
  yPos += SPACE_BEFORE_TABLE_CONTENT;

  // --- Product Table ---
  const tableCellPadding = 0.2; // Extremely small cell padding
  const tableColumnStyles = {
    0: { cellWidth: 15 * (72/25.4), halign: 'center' },
    1: { cellWidth: 20 * (72/25.4), halign: 'center' },
    2: { cellWidth: 65 * (72/25.4) },
    3: { cellWidth: 25 * (72/25.4), halign: 'right' },
    4: { cellWidth: 25 * (72/25.4), halign: 'right' },
    5: { cellWidth: 30 * (72/25.4), halign: 'right' },
  };

  const tableHeader = [['S. No.', 'HSN Code', 'Goods Description', 'SQM', `Rate/${invoice.currencyType}`, `Amount/${invoice.currencyType}`]];
  let tableBody = invoice.items.map((item, index) => {
    const product = allProducts.find(p => p.id === item.productId);
    const size = allSizes.find(s => s.id === item.sizeId);
    return [
      index + 1,
      size?.hsnCode || 'N/A',
      `${product?.designName || 'N/A'} ( ${size?.size || 'N/A'} )`,
      item.quantitySqmt?.toFixed(2) || '0.00',
      item.ratePerSqmt.toFixed(2),
      item.amount?.toFixed(2) || '0.00',
    ];
  });

  const numberOfItems = invoice.items.length;
  const numberOfEmptyRows = numberOfItems > 5 ? 2 : 4;
  for (let i = 0; i < numberOfEmptyRows; i++) {
    tableBody.push(['', '', '', '', '', '']);
  }

  let yPosAfterTable = yPos;
  autoTable(doc, {
    head: tableHeader,
    body: tableBody,
    startY: yPos,
    theme: 'grid',
    headStyles: {
      fillColor: [217, 234, 247],
      textColor: [0,0,0],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: FONT_SIZE_TABLE_HEAD,
      cellPadding: tableCellPadding,
      minCellHeight: LH_TABLE_CELL,
      lineWidth: 0.1,
      lineColor: [120, 120, 120]
    },
    bodyStyles: {
      fontSize: FONT_SIZE_TABLE_BODY,
      cellPadding: tableCellPadding,
      minCellHeight: LH_TABLE_CELL,
      lineWidth: 0.1,
      lineColor: [150, 150, 150]
    },
    columnStyles: tableColumnStyles,
    footStyles: {
      fillColor: [217, 234, 247],
      textColor: [0,0,0],
      fontStyle: 'bold',
      fontSize: FONT_SIZE_TABLE_HEAD,
      cellPadding: tableCellPadding,
      minCellHeight: LH_TABLE_CELL,
      lineWidth: 0.1,
      lineColor: [120,120,120],
      halign: 'right'
    },
    showFoot: 'lastPage',
    foot: [
        [{ content: 'SUB TOTAL', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } }, { content: (invoice.subTotal || 0).toFixed(2), styles: { halign: 'right', fontStyle: 'bold'} }],
        [{ content: 'FREIGHT CHARGES', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } }, { content: (invoice.freight || 0).toFixed(2), styles: { halign: 'right', fontStyle: 'bold' } }],
        [{ content: 'OTHER CHARGES', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } }, { content: '0.00', styles: { halign: 'right', fontStyle: 'bold' } }],
        [{ content: 'GRAND TOTAL', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } }, { content: (invoice.grandTotal || 0).toFixed(2), styles: { halign: 'right', fontStyle: 'bold' } }],
    ],
    didDrawPage: (data) => {
        yPosAfterTable = data.cursor?.y ?? yPosAfterTable;
    }
  });
  yPos = yPosAfterTable + SPACE_AFTER_TABLE;

  // --- Total SQM and Amount in Words (Side-by-side) ---
  let yPosTemp = yPos;
  const totalSqmValue = invoice.items.reduce((sum, item) => sum + (item.quantitySqmt || 0), 0).toFixed(2);
  const amountInWordsStr = amountToWords(invoice.grandTotal || 0, invoice.currencyType);

  const totalSQMLabel = "Total SQM";
  const totalSQMLabelWidth = doc.getTextWidth(totalSQMLabel) + 2;
  const totalSQMValueWidth = doc.getTextWidth(totalSqmValue) + 4;

  doc.setFillColor(217, 234, 247);
  doc.rect(leftColumnX, yPosTemp, totalSQMLabelWidth, LH_FOOTER_SINGLE, 'F');
  addText(totalSQMLabel, leftColumnX + 1, yPosTemp + (LH_FOOTER_SINGLE - FONT_SIZE_FOOTER_PRIMARY) / 2 + FONT_SIZE_FOOTER_PRIMARY*0.8 , { fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, isFooter:true});

  doc.rect(leftColumnX + totalSQMLabelWidth, yPosTemp, totalSQMValueWidth, LH_FOOTER_SINGLE, 'F');
  addText(totalSqmValue, leftColumnX + totalSQMLabelWidth + 2, yPosTemp + (LH_FOOTER_SINGLE - FONT_SIZE_FOOTER_PRIMARY) / 2 + FONT_SIZE_FOOTER_PRIMARY*0.8, { fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, isFooter:true });

  yPosTemp += LH_FOOTER_SINGLE;

  let yPosAmountWords = yPos;
  const amountWordsLabel = "TOTAL INVOICE AMOUNT IN WORDS:";
  const amountWordsLabelWidth = doc.getTextWidth(amountWordsLabel) + 2;

  doc.setFillColor(217, 234, 247);
  doc.rect(rightColumnX, yPosAmountWords, amountWordsLabelWidth, LH_FOOTER_SINGLE, 'F');
  addText(amountWordsLabel, rightColumnX + 1, yPosAmountWords + (LH_FOOTER_SINGLE - FONT_SIZE_FOOTER_PRIMARY) / 2 + FONT_SIZE_FOOTER_PRIMARY*0.8, { fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, isFooter: true });

  yPosAmountWords += LH_FOOTER_SINGLE;
  const amountWordsValueY = addText(amountInWordsStr, rightColumnX, yPosAmountWords, {
    fontSize: FONT_SIZE_FOOTER_SECONDARY, fontWeight: 'bold', lineHeight: LH_FOOTER_PACKED, spacingAfter: MINIMAL_INTERNAL_SPACING,
    maxWidth: pageWidth - rightColumnX - pageMarginSidesPt, isFooter: true
  });

  yPos = Math.max(yPosTemp, amountWordsValueY) + SPACE_BETWEEN_FOOTER_BLOCKS;

  // --- Note ---
  if (invoice.note) {
    yPos = addText('Note:', leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING, isFooter: true });
    const noteLines = invoice.note.split('\n');
    let currentNoteY = yPos;
    noteLines.forEach(line => {
      let textToPrint = line;
      let isBold = false;
      if (line.startsWith('TRANSSHIPMENT') || line.startsWith('PARTIAL SHIPMENT') || line.startsWith('SHIPMENT') || line.startsWith('QUANTITY AND VALUE') || line.startsWith('NOT ACCEPTED') || line.startsWith('ANY TRANSACTION')) {
        isBold = true;
      }
       currentNoteY = addText(textToPrint, leftColumnX, currentNoteY, {
        fontSize: FONT_SIZE_FOOTER_SECONDARY,
        fontWeight: isBold ? 'bold' : 'normal',
        lineHeight: LH_FOOTER_PACKED,
        spacingAfter: MINIMAL_INTERNAL_SPACING,
        maxWidth: pageWidth - (2 * pageMarginSidesPt),
        isFooter: true
      });
    });
    yPos = currentNoteY;
    yPos += SPACE_BETWEEN_FOOTER_BLOCKS;
  }

  // --- Beneficiary Bank Details ---
  if (selectedBank) {
    yPos = addText('BENEFICIARY DETAILS:', leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING, isFooter: true });
    yPos = addText(`BENEFICIARY NAME: ${selectedBank.bankName.toUpperCase()}`, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_SECONDARY, lineHeight: LH_FOOTER_PACKED, spacingAfter: MINIMAL_INTERNAL_SPACING, maxWidth: contentMaxWidthLeft, isFooter: true });
    yPos = addText(`BENEFICIARY BANK ADDRESS: ${selectedBank.bankAddress.toUpperCase()}`, leftColumnX, yPos, {
        fontSize: FONT_SIZE_FOOTER_SECONDARY, lineHeight: LH_FOOTER_PACKED, spacingAfter: MINIMAL_INTERNAL_SPACING,
        maxWidth: pageWidth - (2 * pageMarginSidesPt), isFooter: true
    });
    yPos = addText(`BENEFICIARY A/C No: ${selectedBank.accountNumber}, SWIFT CODE: ${selectedBank.swiftCode.toUpperCase()}, IFSC CODE: ${selectedBank.ifscCode.toUpperCase()}`, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_SECONDARY, lineHeight: LH_FOOTER_PACKED, spacingAfter: MINIMAL_INTERNAL_SPACING, maxWidth: pageWidth - (2*pageMarginSidesPt), isFooter: true });
    yPos += SPACE_BETWEEN_FOOTER_BLOCKS;
  }

  // --- Declaration ---
  yPos = addText('Declaration:', leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING, isFooter: true });
  yPos = addText('Certified that the particulars given above are true and correct.', leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_SECONDARY, lineHeight: LH_FOOTER_PACKED, spacingAfter: MINIMAL_INTERNAL_SPACING, maxWidth: pageWidth - (2*pageMarginSidesPt), isFooter: true });

  // --- Signature ---
  const signatureText = `FOR, ${exporter.companyName.toUpperCase()}`;
  const signatureX = pageWidth - pageMarginSidesPt - (70 * (72/25.4)); // 70mm from right
  const signatureLineWidth = 60 * (72/25.4); // 60mm width

  const requiredSpaceForSignature = (LH_FOOTER_SINGLE * 2) + SPACE_BEFORE_SIGNATURE + 5 + (PAGE_MARGIN_TOP * (72 / 25.4));
  if (yPos + requiredSpaceForSignature > doc.internal.pageSize.getHeight()) {
      doc.addPage();
      yPos = PAGE_MARGIN_TOP * (72 / 25.4);
  }

  yPos += SPACE_BEFORE_SIGNATURE + 3;

  yPos = addText(signatureText, signatureX + signatureLineWidth / 2, yPos, {
    fontWeight: 'bold', align: 'center', fontSize: FONT_SIZE_FOOTER_SECONDARY,
    lineHeight: LH_FOOTER_SINGLE, spacingAfter: LH_FOOTER_SINGLE + 1, isFooter: true
  });
  doc.setLineWidth(0.3);
  doc.line(signatureX, yPos, signatureX + signatureLineWidth, yPos);
  yPos += (LH_FOOTER_SINGLE * 0.5) + 0.5;
  addText('AUTHORISED SIGNATURE', signatureX + signatureLineWidth / 2, yPos, {
    align: 'center', fontSize: FONT_SIZE_FOOTER_SECONDARY, fontWeight: 'bold',
    lineHeight: LH_FOOTER_SINGLE, isFooter: true
  });

  doc.save(`Performa_Invoice_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
}

    