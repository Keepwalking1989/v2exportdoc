
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
const FONT_SIZE_SECTION_LABEL = 8;
const FONT_SIZE_CONTENT_PRIMARY = 8; // For addresses, main text values
const FONT_SIZE_TABLE_HEAD = 7.5;
const FONT_SIZE_TABLE_BODY = 7.5;
const FONT_SIZE_FOOTER_PRIMARY = 7;
const FONT_SIZE_FOOTER_SECONDARY = 6.5;

// --- Line Heights (Extremely Tight) ---
const LH_MAIN_TITLE = FONT_SIZE_MAIN_TITLE + 0.5; // 12.5
const LH_SECTION_LABEL = FONT_SIZE_SECTION_LABEL + 0.2; // 8.2
const LH_CONTENT_PACKED = FONT_SIZE_CONTENT_PRIMARY + 0.1; // 8.1 (for multi-line addresses, etc.)
const LH_CONTENT_SINGLE = FONT_SIZE_CONTENT_PRIMARY + 0.2; // 8.2 (for single lines of content)

const LH_TABLE_CELL = FONT_SIZE_TABLE_BODY + 0.5; // 8.0

const LH_FOOTER_PACKED = FONT_SIZE_FOOTER_PRIMARY + 0.1; // 7.1
const LH_FOOTER_SINGLE = FONT_SIZE_FOOTER_PRIMARY + 0.2; // 7.2

// --- Spacing Between Elements (Minimal) ---
const MINIMAL_INTERNAL_SPACING = 0.25; // Smallest gap between lines within a conceptual block (e.g. after a label before its value IF NOT 0)
const SPACE_AFTER_MAIN_TITLE = 1.0;
const SPACE_AFTER_SECTION_LABEL = 0.2; // Default space after a section label like "EXPORTER:" before its content - will be overridden to 0 often.
const SPACE_AFTER_BLOCK_HEADER = 0.5; // Space after a text block (like Exporter details), before the horizontal line below it
const SPACE_AFTER_HORIZONTAL_LINE = 0.5; // Space after a horizontal line, before the text block below it
const SPACE_BEFORE_TABLE_CONTENT = 0.5; // Space after the last header block (IEC Code), before the table
const SPACE_AFTER_TABLE = 1.0;
const SPACE_BETWEEN_FOOTER_BLOCKS = 1.0;
const SPACE_BEFORE_SIGNATURE = 2.0;


export function generatePerformaInvoicePdf(
  invoice: PerformaInvoice,
  exporter: Company,
  client: Client,
  allSizes: Size[],
  allProducts: Product[],
  selectedBank?: Bank
) {
  const doc = new jsPDF();
  let yPos = PAGE_MARGIN_TOP;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentMaxWidth = pageWidth / 2 - PAGE_MARGIN_SIDES - 2; // Max width for content in left/right columns

  const addText = (
    text: string | string[],
    x: number,
    currentY: number,
    options: {
      fontSize?: number;
      fontWeight?: 'normal' | 'bold';
      fontStyle?: 'normal' | 'italic';
      lineHeight?: number;
      spacingAfter?: number;
      align?: 'left' | 'center' | 'right';
      color?: [number, number, number];
      maxWidth?: number;
    } = {}
  ): number => {
    const fontSize = options.fontSize || FONT_SIZE_CONTENT_PRIMARY;
    const effectiveLineHeight = options.lineHeight || (fontSize + 0.2); // Default tight
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
      doc.setTextColor(0, 0, 0); // Default to black
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
        doc.text(line, actualX, newY, { align: align });
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

  const leftColumnX = PAGE_MARGIN_SIDES;
  const rightColumnX = pageWidth / 2 + 2; // A small gap between columns

  let exporterEndY = yPos;
  let consigneeEndY = yPos;

  // --- EXPORTER ---
  exporterEndY = addText('EXPORTER', leftColumnX, exporterEndY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: 0 });
  exporterEndY = addText(exporter.companyName, leftColumnX, exporterEndY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, fontWeight: 'bold', lineHeight: LH_CONTENT_PACKED, spacingAfter: 0, maxWidth: contentMaxWidth });
  // Assuming exporter.address contains newlines for formatting or is wrapped by maxWidth
  exporterEndY = addText(exporter.address, leftColumnX, exporterEndY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: 0, maxWidth: contentMaxWidth });
  // Tel and IEC for exporter commented out to match image density; if needed, add here with spacingAfter: 0

  // --- CONSIGNEE ---
  consigneeEndY = addText('CONSIGNEE', rightColumnX, consigneeEndY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: SPACE_AFTER_SECTION_LABEL });
  consigneeEndY = addText(client.companyName, rightColumnX, consigneeEndY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, fontWeight: 'bold', lineHeight: LH_CONTENT_PACKED, spacingAfter: MINIMAL_INTERNAL_SPACING, maxWidth: contentMaxWidth });
  const consigneeAddress = `${client.address}\n${client.city}, ${client.country} - ${client.pinCode}`;
  consigneeEndY = addText(consigneeAddress, rightColumnX, consigneeEndY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: 0, maxWidth: contentMaxWidth });

  yPos = Math.max(exporterEndY, consigneeEndY);
  yPos += SPACE_AFTER_BLOCK_HEADER;
  doc.setLineWidth(0.2);
  doc.line(PAGE_MARGIN_SIDES, yPos, pageWidth - PAGE_MARGIN_SIDES, yPos);
  yPos += SPACE_AFTER_HORIZONTAL_LINE;

  // --- Invoice Date/Number & Final Destination ---
  let invoiceDateNumEndY = yPos;
  let finalDestEndY = yPos;

  invoiceDateNumEndY = addText('Invoice Date And Number', leftColumnX, invoiceDateNumEndY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: 0 });
  invoiceDateNumEndY = addText(`${invoice.invoiceNumber} / ${format(new Date(invoice.invoiceDate), 'dd-MM-yyyy')}`, leftColumnX, invoiceDateNumEndY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter: 0 });

  finalDestEndY = addText('Final Destination', rightColumnX, finalDestEndY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: SPACE_AFTER_SECTION_LABEL });
  finalDestEndY = addText(invoice.finalDestination, rightColumnX, finalDestEndY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter: 0, maxWidth: contentMaxWidth });

  yPos = Math.max(invoiceDateNumEndY, finalDestEndY);
  yPos += SPACE_AFTER_BLOCK_HEADER;
  doc.line(PAGE_MARGIN_SIDES, yPos, pageWidth - PAGE_MARGIN_SIDES, yPos);
  yPos += SPACE_AFTER_HORIZONTAL_LINE;

  // --- IEC Code & Terms and Conditions ---
  let iecCodeEndY = yPos;
  let termsEndY = yPos;

  if (exporter.iecNumber) {
    iecCodeEndY = addText('IEC. Code', leftColumnX, iecCodeEndY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: 0 });
    iecCodeEndY = addText(exporter.iecNumber, leftColumnX, iecCodeEndY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter: 0 });
  } else {
    iecCodeEndY += (LH_SECTION_LABEL + 0) + (LH_CONTENT_SINGLE + 0); // Allocate space even if empty
  }

  termsEndY = addText('Terms And Conditions Of Delivery And Payment', rightColumnX, termsEndY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: SPACE_AFTER_SECTION_LABEL });
  termsEndY = addText(invoice.termsAndConditions, rightColumnX, termsEndY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: 0, maxWidth: contentMaxWidth });

  yPos = Math.max(iecCodeEndY, termsEndY);
  yPos += SPACE_BEFORE_TABLE_CONTENT;


  // --- Product Table ---
  const tableColumnStyles = {
    0: { cellWidth: 15, halign: 'center' }, // S. No.
    1: { cellWidth: 20, halign: 'center' }, // HSN Code
    2: { cellWidth: 65 },                  // Goods Description
    3: { cellWidth: 25, halign: 'right' }, // SQM
    4: { cellWidth: 25, halign: 'right' }, // Rate/SQM
    5: { cellWidth: 30, halign: 'right' }, // Amount
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
  const numberOfEmptyRows = numberOfItems > 5 ? 0 : (numberOfItems > 3 ? 1 : 2 );
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
      fillColor: [217, 234, 247], // Light blueish color
      textColor: [0,0,0],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: FONT_SIZE_TABLE_HEAD,
      cellPadding: 0.8,
      minCellHeight: LH_TABLE_CELL,
      lineWidth: 0.1,
      lineColor: [120, 120, 120]
    },
    bodyStyles: {
      fontSize: FONT_SIZE_TABLE_BODY,
      cellPadding: 0.8,
      minCellHeight: LH_TABLE_CELL,
      lineWidth: 0.1,
      lineColor: [150, 150, 150]
    },
    columnStyles: tableColumnStyles,
    footStyles: {
      fillColor: [217, 234, 247], // Blue background for totals
      textColor: [0,0,0],
      fontStyle: 'bold',
      fontSize: FONT_SIZE_TABLE_HEAD,
      cellPadding: 0.8,
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
  let yPosTemp = yPos; // Temporary yPos for this section
  const totalSqmValue = invoice.items.reduce((sum, item) => sum + (item.quantitySqmt || 0), 0).toFixed(2);
  const amountInWordsStr = amountToWords(invoice.grandTotal || 0, invoice.currencyType);
  
  const totalSQMLabel = "Total SQM";
  const totalSQMLabelWidth = doc.getTextWidth(totalSQMLabel) + 2; // Small padding
  const totalSQMValueWidth = doc.getTextWidth(totalSqmValue) + 4; // Small padding
  
  doc.setFillColor(217, 234, 247); // Blue background
  doc.rect(leftColumnX, yPosTemp, totalSQMLabelWidth, LH_FOOTER_SINGLE + 0.5, 'F');
  addText(totalSQMLabel, leftColumnX + 1, yPosTemp + (LH_FOOTER_SINGLE + 0.5 - FONT_SIZE_FOOTER_PRIMARY)/2 + 0.1, { fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE});
  
  doc.rect(leftColumnX + totalSQMLabelWidth, yPosTemp, totalSQMValueWidth, LH_FOOTER_SINGLE + 0.5, 'F');
  addText(totalSqmValue, leftColumnX + totalSQMLabelWidth + 2, yPosTemp + (LH_FOOTER_SINGLE + 0.5 - FONT_SIZE_FOOTER_PRIMARY)/2 + 0.1, { fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE});
  
  yPosTemp += (LH_FOOTER_SINGLE + 0.5); // Move down for the next line (which is amount in words)

  let yPosAmountWords = yPos; // Start amount in words from original yPos for this section
  const amountWordsLabel = "TOTAL INVOICE AMOUNT IN WORDS:";
  const amountWordsLabelWidth = doc.getTextWidth(amountWordsLabel) + 2;
  
  doc.setFillColor(217, 234, 247);
  doc.rect(rightColumnX, yPosAmountWords, amountWordsLabelWidth, LH_FOOTER_SINGLE + 0.5, 'F');
  addText(amountWordsLabel, rightColumnX + 1, yPosAmountWords + (LH_FOOTER_SINGLE + 0.5 - FONT_SIZE_FOOTER_PRIMARY)/2 + 0.1, { fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE});
  
  yPosAmountWords += (LH_FOOTER_SINGLE + 0.5); // Move yPos down for the value
  const amountWordsValueY = addText(amountInWordsStr, rightColumnX, yPosAmountWords, {
    fontSize: FONT_SIZE_FOOTER_SECONDARY, fontWeight: 'bold', lineHeight: LH_FOOTER_PACKED, spacingAfter: 0,
    maxWidth: pageWidth - rightColumnX - PAGE_MARGIN_SIDES
  });

  yPos = Math.max(yPosTemp, amountWordsValueY) + SPACE_BETWEEN_FOOTER_BLOCKS;


  // --- Note ---
  if (invoice.note) {
    yPos = addText('Note:', leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING });
    const noteText = invoice.note.replace(/<br>/g, '\n');
    yPos = addText(noteText, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_SECONDARY, lineHeight: LH_FOOTER_PACKED, spacingAfter: 0, maxWidth: pageWidth - (2 * PAGE_MARGIN_SIDES) });
    yPos += SPACE_BETWEEN_FOOTER_BLOCKS;
  }

  // --- Beneficiary Bank Details ---
  if (selectedBank) {
    yPos = addText('BENEFICIARY DETAILS:', leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING });
    yPos = addText(`BENEFICIARY NAME: ${selectedBank.bankName.toUpperCase()}`, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_SECONDARY, lineHeight: LH_FOOTER_PACKED, spacingAfter: MINIMAL_INTERNAL_SPACING, maxWidth: contentMaxWidth });
    
    // Handle multi-line bank address properly for yPos calculation
    let bankAddressYAfter = addText(`BENEFICIARY BANK ADDRESS: ${selectedBank.bankAddress.toUpperCase()}`, leftColumnX, yPos, { 
        fontSize: FONT_SIZE_FOOTER_SECONDARY, lineHeight: LH_FOOTER_PACKED, spacingAfter: MINIMAL_INTERNAL_SPACING, 
        maxWidth: pageWidth - (2 * PAGE_MARGIN_SIDES) 
    });
    yPos = bankAddressYAfter;

    yPos = addText(`BENEFICIARY A/C No: ${selectedBank.accountNumber}, SWIFT CODE: ${selectedBank.swiftCode.toUpperCase()}, IFSC CODE: ${selectedBank.ifscCode.toUpperCase()}`, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_SECONDARY, lineHeight: LH_FOOTER_PACKED, spacingAfter: 0, maxWidth: pageWidth - (2*PAGE_MARGIN_SIDES) });
    yPos += SPACE_BETWEEN_FOOTER_BLOCKS;
  }
  
  // --- Declaration ---
  yPos = addText('Declaration:', leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING });
  yPos = addText('Certified that the particulars given above are true and correct.', leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_SECONDARY, lineHeight: LH_FOOTER_PACKED, spacingAfter: 0, maxWidth: pageWidth - (2*PAGE_MARGIN_SIDES) });

  // --- Signature ---
  const signatureBlockHeightEstimate = (LH_FOOTER_SINGLE * 2) + SPACE_BEFORE_SIGNATURE + 5;
  if (yPos + signatureBlockHeightEstimate > doc.internal.pageSize.getHeight() - PAGE_MARGIN_TOP) { // Check if signature fits
      doc.addPage();
      yPos = PAGE_MARGIN_TOP;
  }
  yPos += SPACE_BEFORE_SIGNATURE + 3; // Slightly less space than image, but enough for visual separation

  const signatureText = `FOR, ${exporter.companyName.toUpperCase()}`;
  const signatureX = pageWidth - PAGE_MARGIN_SIDES - 70;
  const signatureLineWidth = 60;

  yPos = addText(signatureText, signatureX + signatureLineWidth / 2, yPos, {
    fontWeight: 'bold', align: 'center', fontSize: FONT_SIZE_FOOTER_SECONDARY, // Smaller font for signature text
    lineHeight: LH_FOOTER_SINGLE, spacingAfter: LH_FOOTER_SINGLE + 1 // Space before line
  });
  doc.setLineWidth(0.3);
  doc.line(signatureX, yPos, signatureX + signatureLineWidth, yPos);
  yPos += (LH_FOOTER_SINGLE * 0.5) + 0.5;
  addText('AUTHORISED SIGNATURE', signatureX + signatureLineWidth / 2, yPos, {
    align: 'center', fontSize: FONT_SIZE_FOOTER_SECONDARY, fontWeight: 'bold', // Smaller font
    lineHeight: LH_FOOTER_SINGLE
  });

  doc.save(`Performa_Invoice_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
}

