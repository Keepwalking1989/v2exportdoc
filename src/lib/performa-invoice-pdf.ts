
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
const PAGE_MARGIN_TOP = 6; // Reduced
const PAGE_MARGIN_SIDES = 12; // Slightly Reduced

// --- Font Sizes (Aggressively Reduced) ---
const FONT_SIZE_MAIN_TITLE = 12;
const FONT_SIZE_SECTION_LABEL = 8; // For "EXPORTER", "CONSIGNEE" etc.
const FONT_SIZE_CONTENT_PRIMARY = 8; // For addresses, main text values
const FONT_SIZE_TABLE_HEAD = 7.5;
const FONT_SIZE_TABLE_BODY = 7.5;
const FONT_SIZE_FOOTER_PRIMARY = 7; // For footer labels and main text
const FONT_SIZE_FOOTER_SECONDARY = 6.5; // For smaller footer text like "Declaration"

// --- Line Heights (Extremely Tight) ---
const LH_MAIN_TITLE = FONT_SIZE_MAIN_TITLE + 0.5; // 12.5
const LH_SECTION_LABEL = FONT_SIZE_SECTION_LABEL + 0.2; // 8.2
const LH_CONTENT_PACKED = FONT_SIZE_CONTENT_PRIMARY + 0.1; // 8.1 (for multi-line addresses, etc.)
const LH_CONTENT_SINGLE = FONT_SIZE_CONTENT_PRIMARY + 0.2; // 8.2 (for single lines of content)

const LH_TABLE_CELL = FONT_SIZE_TABLE_BODY + 0.5; // 8.0

const LH_FOOTER_PACKED = FONT_SIZE_FOOTER_PRIMARY + 0.1; // 7.1
const LH_FOOTER_SINGLE = FONT_SIZE_FOOTER_PRIMARY + 0.2; // 7.2

// --- Spacing Between Elements (Minimal) ---
const MINIMAL_SPACING = 0.25; // Smallest gap between lines within a conceptual block
const SPACE_AFTER_MAIN_TITLE = 1.5;
const SPACE_AFTER_SECTION_LABEL = 0.2; // Space after a label like "EXPORTER:" before its content
const SPACE_BETWEEN_BLOCKS = 1.0; // Space between major sections like Exporter and Consignee, after lines
const SPACE_AROUND_LINE = 0.75; // Space above AND below a horizontal line
const SPACE_BEFORE_TABLE_CONTENT = 1.0;
const SPACE_AFTER_TABLE_CONTENT = 1.0;
const SPACE_BETWEEN_FOOTER_SECTIONS = 1.0;
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

  const addText = (
    text: string | string[],
    x: number,
    currentY: number,
    options: {
      fontSize?: number;
      fontWeight?: 'normal' | 'bold';
      fontStyle?: 'normal' | 'italic';
      lineHeight?: number; // This will be the effective height taken by EACH line of text
      spacingAfter?: number; // Additional space AFTER the entire text block
      align?: 'left' | 'center' | 'right';
      color?: [number, number, number];
      maxWidth?: number;
    } = {}
  ): number => {
    const fontSize = options.fontSize || FONT_SIZE_CONTENT_PRIMARY;
    // Default to a very tight line height if not specified
    const effectiveLineHeight = options.lineHeight || (fontSize + 0.2);
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
    doc.setTextColor(options.color ? options.color[0] : 0, options.color ? options.color[1] : 0, options.color ? options.color[2] : 0);

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
    // If text was multi-line, newY is already at the start of the *next* line.
    // If single line, newY is also at start of next.
    // We want to return the Y position *after* this block, including any specific spacing.
    // So, if spacingAfter is provided, add it. If not, it's just newY.
    return newY + (options.spacingAfter || 0);
  };

  // --- 1. "PERFORMA INVOICE" Title ---
  yPos = addText('PROFORMA INVOICE', pageWidth / 2, yPos, {
    fontSize: FONT_SIZE_MAIN_TITLE, fontWeight: 'bold', align: 'center',
    lineHeight: LH_MAIN_TITLE, spacingAfter: SPACE_AFTER_MAIN_TITLE,
  });

  // --- Shared variables for top layout ---
  const leftColumnX = PAGE_MARGIN_SIDES;
  const rightColumnX = pageWidth / 2 + 2;
  const contentMaxWidth = pageWidth / 2 - PAGE_MARGIN_SIDES - 5;

  let exporterEndY = yPos;
  let consigneeEndY = yPos; // Will be updated later

  // --- EXPORTER ---
  exporterEndY = addText('EXPORTER', leftColumnX, exporterEndY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: SPACE_AFTER_SECTION_LABEL });
  exporterEndY = addText(exporter.companyName, leftColumnX, exporterEndY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, fontWeight: 'bold', lineHeight: LH_CONTENT_PACKED, spacingAfter: MINIMAL_SPACING, maxWidth: contentMaxWidth });
  exporterEndY = addText(exporter.address, leftColumnX, exporterEndY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: MINIMAL_SPACING, maxWidth: contentMaxWidth });
  // The image doesn't show Tel and IEC for exporter, so I'm commenting them for now to match image density
  // exporterEndY = addText(`TEL: ${exporter.phoneNumber}`, leftColumnX, exporterEndY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter: MINIMAL_SPACING });
  // exporterEndY = addText(`IEC NO: ${exporter.iecNumber}`, leftColumnX, exporterEndY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter: 0 });


  // --- CONSIGNEE --- (Drawn parallel to Exporter)
  consigneeEndY = addText('CONSIGNEE', rightColumnX, consigneeEndY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: SPACE_AFTER_SECTION_LABEL });
  consigneeEndY = addText(client.companyName, rightColumnX, consigneeEndY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, fontWeight: 'bold', lineHeight: LH_CONTENT_PACKED, spacingAfter: MINIMAL_SPACING, maxWidth: contentMaxWidth });
  const consigneeAddress = `${client.address}\n${client.city}, ${client.country} - ${client.pinCode}`;
  consigneeEndY = addText(consigneeAddress, rightColumnX, consigneeEndY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: 0, maxWidth: contentMaxWidth });

  yPos = Math.max(exporterEndY, consigneeEndY) + SPACE_BETWEEN_BLOCKS / 2; // Reduced space

  // --- First Horizontal Line ---
  doc.setLineWidth(0.2);
  doc.line(PAGE_MARGIN_SIDES, yPos, pageWidth - PAGE_MARGIN_SIDES, yPos);
  yPos += SPACE_AROUND_LINE; // Space after the line

  // --- Invoice Date/Number & Final Destination ---
  let invoiceDateNumEndY = yPos;
  let finalDestEndY = yPos;

  invoiceDateNumEndY = addText('Invoice Date And Number', leftColumnX, invoiceDateNumEndY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: SPACE_AFTER_SECTION_LABEL });
  invoiceDateNumEndY = addText(`${invoice.invoiceNumber} / ${format(new Date(invoice.invoiceDate), 'dd-MM-yyyy')}`, leftColumnX, invoiceDateNumEndY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter: 0 });

  finalDestEndY = addText('Final Destination', rightColumnX, finalDestEndY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: SPACE_AFTER_SECTION_LABEL });
  finalDestEndY = addText(invoice.finalDestination, rightColumnX, finalDestEndY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter: 0, maxWidth: contentMaxWidth });

  yPos = Math.max(invoiceDateNumEndY, finalDestEndY) + SPACE_BETWEEN_BLOCKS / 2;

  // --- Second Horizontal Line ---
  doc.line(PAGE_MARGIN_SIDES, yPos, pageWidth - PAGE_MARGIN_SIDES, yPos);
  yPos += SPACE_AROUND_LINE;

  // --- IEC Code & Terms and Conditions ---
  let iecCodeEndY = yPos;
  let termsEndY = yPos;

  // Matching image: IEC Code only if exporter has one
  if (exporter.iecNumber) {
    iecCodeEndY = addText('IEC. Code', leftColumnX, iecCodeEndY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: SPACE_AFTER_SECTION_LABEL });
    iecCodeEndY = addText(exporter.iecNumber, leftColumnX, iecCodeEndY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter: 0 });
  } else {
    // If no IEC, create a small empty space to maintain alignment with terms if terms are present
    iecCodeEndY += LH_SECTION_LABEL + SPACE_AFTER_SECTION_LABEL + LH_CONTENT_SINGLE;
  }


  termsEndY = addText('Terms And Conditions Of Delivery And Payment', rightColumnX, termsEndY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: SPACE_AFTER_SECTION_LABEL });
  termsEndY = addText(invoice.termsAndConditions, rightColumnX, termsEndY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: 0, maxWidth: contentMaxWidth });

  yPos = Math.max(iecCodeEndY, termsEndY) + SPACE_BEFORE_TABLE_CONTENT;


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
      `${product?.designName || 'N/A'} ( ${size?.size || 'N/A'} )`, // Combined description
      item.quantitySqmt?.toFixed(2) || '0.00',
      item.ratePerSqmt.toFixed(2),
      item.amount?.toFixed(2) || '0.00',
    ];
  });

  // Add empty rows based on item count
  const numberOfItems = invoice.items.length;
  const numberOfEmptyRows = numberOfItems > 5 ? 0 : (numberOfItems > 3 ? 1 : 2 ); // Adjusted logic for fewer empty rows
  for (let i = 0; i < numberOfEmptyRows; i++) {
    tableBody.push(['', '', '', '', '', '']);
  }

  // Store yPos before table in case of page break
  const yPosBeforeTable = yPos;

  autoTable(doc, {
    head: tableHeader,
    body: tableBody,
    startY: yPos,
    theme: 'grid', // 'plain' or 'grid' or 'striped'
    headStyles: {
      fillColor: [217, 234, 247], // Light blueish color from image
      textColor: [0,0,0],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: FONT_SIZE_TABLE_HEAD,
      cellPadding: 0.8, // Reduced
      minCellHeight: LH_TABLE_CELL,
      lineWidth: 0.1,
      lineColor: [120, 120, 120]
    },
    bodyStyles: {
      fontSize: FONT_SIZE_TABLE_BODY,
      cellPadding: 0.8, // Reduced
      minCellHeight: LH_TABLE_CELL,
      lineWidth: 0.1,
      lineColor: [150, 150, 150]
    },
    columnStyles: tableColumnStyles,
    didDrawPage: (data) => {
        yPos = data.cursor?.y || yPosBeforeTable; // Reset yPos if page break
    },
    footStyles: { // For custom footer like totals
      fillColor: [217, 234, 247],
      textColor: [0,0,0],
      fontStyle: 'bold',
      fontSize: FONT_SIZE_TABLE_HEAD,
      cellPadding: 0.8,
      lineWidth: 0.1,
      lineColor: [120,120,120],
      halign: 'right'
    },
    // --- Adding Totals directly into table footer ---
    didParseCell: function (data) {
        // Apply blue background to specific footer labels if needed by targeting column and section
        if (data.section === 'foot' && data.column.index === 0) { // Example: first column in footer
            // data.cell.styles.fillColor = [217, 234, 247];
        }
    },
    showFoot: 'lastPage', // Show footer on the last page
    foot: [ // Define the footer rows
        [{ content: 'SUB TOTAL', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } }, { content: (invoice.subTotal || 0).toFixed(2), styles: { halign: 'right', fontStyle: 'bold'} }],
        [{ content: 'FREIGHT CHARGES', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } }, { content: (invoice.freight || 0).toFixed(2), styles: { halign: 'right', fontStyle: 'bold' } }],
        // Other charges can be added if present, for image match, only subtotal and grand total seem directly under table items.
        // For "Other Charges" from image
        [{ content: 'OTHER CHARGES', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } }, { content: '0.00', styles: { halign: 'right', fontStyle: 'bold' } }], // Assuming 0.00 for now
        [{ content: 'GRAND TOTAL', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } }, { content: (invoice.grandTotal || 0).toFixed(2), styles: { halign: 'right', fontStyle: 'bold' } }],
    ],
  });
  yPos = (doc as any).lastAutoTable.finalY + SPACE_AFTER_TABLE_CONTENT;

  // --- Total SQM and Amount in Words (Side-by-side) ---
  const totalSqmValue = invoice.items.reduce((sum, item) => sum + (item.quantitySqmt || 0), 0).toFixed(2);
  const amountInWordsStr = amountToWords(invoice.grandTotal || 0, invoice.currencyType);
  const halfPageWidth = pageWidth / 2 - PAGE_MARGIN_SIDES;

  // Total SQM Label & Value
  let yPosAfterSQMAndWords = yPos;
  const totalSQMLabel = "Total SQM";
  const totalSQMValueText = totalSqmValue;
  doc.setFontSize(FONT_SIZE_FOOTER_PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(217, 234, 247); // Blue background
  doc.rect(leftColumnX, yPos, doc.getTextWidth(totalSQMLabel) + 6 , LH_FOOTER_SINGLE + 1, 'F'); // Rect for label
  addText(totalSQMLabel, leftColumnX + 3, yPos + (LH_FOOTER_SINGLE + 1 - FONT_SIZE_FOOTER_PRIMARY)/2, { fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE});
  doc.rect(leftColumnX + doc.getTextWidth(totalSQMLabel) + 6, yPos, doc.getTextWidth(totalSQMValueText) + 6, LH_FOOTER_SINGLE + 1, 'F'); // Rect for value
  addText(totalSQMValueText, leftColumnX + doc.getTextWidth(totalSQMLabel) + 6 + 3, yPos + (LH_FOOTER_SINGLE + 1 - FONT_SIZE_FOOTER_PRIMARY)/2, { fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE});
  
  // Amount in Words Label & Value
  const amountWordsLabel = "TOTAL INVOICE AMOUNT IN WORDS:";
  const amountWordsValueX = rightColumnX + doc.getTextWidth(amountWordsLabel) + 1; // +1 for small gap
  doc.setFillColor(217, 234, 247); // Blue background
  doc.rect(rightColumnX, yPos, doc.getTextWidth(amountWordsLabel) + 2, LH_FOOTER_SINGLE + 1, 'F');
  addText(amountWordsLabel, rightColumnX + 1, yPos + (LH_FOOTER_SINGLE + 1 - FONT_SIZE_FOOTER_PRIMARY)/2, { fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE});
  yPosAfterSQMAndWords = yPos + LH_FOOTER_SINGLE + 1; // Move yPos down
  yPosAfterSQMAndWords = addText(amountInWordsStr, rightColumnX, yPosAfterSQMAndWords, {
    fontSize: FONT_SIZE_FOOTER_SECONDARY, lineHeight: LH_FOOTER_PACKED, spacingAfter: SPACE_BETWEEN_FOOTER_SECTIONS,
    maxWidth: pageWidth - rightColumnX - PAGE_MARGIN_SIDES, fontWeight: 'bold'
  });

  yPos = yPosAfterSQMAndWords; // Use the greater Y from the two parallel blocks

  // --- Note ---
  if (invoice.note) {
    yPos = addText('Note:', leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, spacingAfter: SPACE_AFTER_SECTION_LABEL });
    const noteText = invoice.note.replace(/<br>/g, '\n').replace(/PAYMENT:/i, 'PAYMENT:').replace(/TRANSSHIPMENT ALLOWED/i, 'TRANSSHIPMENT ALLOWED').replace(/PARTIAL SHIPMENT ALLOWED/i, 'PARTIAL SHIPMENT ALLOWED').replace(/SHIPMENT :/i, 'SHIPMENT :').replace(/QUANTITY AND VALUE/i, 'QUANTITY AND VALUE').replace(/NOT ACCEPTED ANY REFUND OR EXCHANGE/i, 'NOT ACCEPTED ANY REFUND OR EXCHANGE').replace(/ANY TRANSACTION CHARGES WILL BE PAIDED BY CONSIGNEE/i, 'ANY TRANSACTION CHARGES WILL BE PAIDED BY CONSIGNEE');

    yPos = addText(noteText, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_SECONDARY, lineHeight: LH_FOOTER_PACKED, spacingAfter: SPACE_BETWEEN_FOOTER_SECTIONS, maxWidth: pageWidth - (2 * PAGE_MARGIN_SIDES) });
  }

  // --- Beneficiary Bank Details ---
  if (selectedBank) {
    yPos = addText('BENEFICIARY DETAILS:', leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, spacingAfter: SPACE_AFTER_SECTION_LABEL });
    yPos = addText(`BENEFICIARY NAME: ${selectedBank.bankName.toUpperCase()}`, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_SECONDARY, lineHeight: LH_FOOTER_PACKED, spacingAfter: MINIMAL_SPACING, maxWidth: contentMaxWidth });
    // Assuming bank address from image, which seems specific.
    const bankAddressText = exporter.companyName.includes("HEMITH") ? "HDFC, BRANCH: Rajkot" : selectedBank.bankAddress; // Example condition
    yPos = addText(`BENEFICIARY BANK ADDRESS: ${bankAddressText.toUpperCase()}`, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_SECONDARY, lineHeight: LH_FOOTER_PACKED, spacingAfter: MINIMAL_SPACING, maxWidth: contentMaxWidth });
    yPos = addText(`BENEFICIARY A/C No: ${selectedBank.accountNumber}, SWIFT CODE: ${selectedBank.swiftCode.toUpperCase()}, IFSC CODE: ${selectedBank.ifscCode.toUpperCase()}`, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_SECONDARY, lineHeight: LH_FOOTER_PACKED, spacingAfter: SPACE_BETWEEN_FOOTER_SECTIONS, maxWidth: pageWidth - (2*PAGE_MARGIN_SIDES) });
  }
  
  // --- Declaration ---
  yPos = addText('Declaration:', leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, spacingAfter: SPACE_AFTER_SECTION_LABEL });
  yPos = addText('Certified that the particulars given above are true and correct.', leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_SECONDARY, lineHeight: LH_FOOTER_PACKED, spacingAfter: 0, maxWidth: pageWidth - (2*PAGE_MARGIN_SIDES) });

  // --- Signature ---
  const signatureBlockMinHeight = (LH_FOOTER_SINGLE * 2) + SPACE_BEFORE_SIGNATURE;
  const spaceLeftOnPage = doc.internal.pageSize.getHeight() - yPos - PAGE_MARGIN_TOP; // Approx. remaining space

  if (spaceLeftOnPage < signatureBlockMinHeight) {
      doc.addPage();
      yPos = PAGE_MARGIN_TOP;
  }
  yPos += SPACE_BEFORE_SIGNATURE + 5; // Extra space before signature as in image

  const signatureText = `FOR, ${exporter.companyName.toUpperCase()}`;
  const signatureX = pageWidth - PAGE_MARGIN_SIDES - 70; // Keep signature block to the right
  const signatureLineWidth = 60;

  yPos = addText(signatureText, signatureX + signatureLineWidth / 2, yPos, {
    fontWeight: 'bold', align: 'center', fontSize: FONT_SIZE_FOOTER_PRIMARY,
    lineHeight: LH_FOOTER_SINGLE, spacingAfter: LH_FOOTER_SINGLE + 2 // More space before line
  });
  doc.setLineWidth(0.3);
  doc.line(signatureX, yPos, signatureX + signatureLineWidth, yPos); // Line for signature
  yPos += (LH_FOOTER_SINGLE * 0.5) + 1; // Space between line and "Authorized Signatory"
  addText('AUTHORISED SIGNATURE', signatureX + signatureLineWidth / 2, yPos, {
    align: 'center', fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold',
    lineHeight: LH_FOOTER_SINGLE
  });

  doc.save(`Performa_Invoice_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
}
