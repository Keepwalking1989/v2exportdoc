
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
const PAGE_MARGIN_TOP = 8; // Reduced
const PAGE_MARGIN_SIDES = 15;

// --- Font Sizes ---
const FONT_SIZE_MAIN_TITLE = 12;
const FONT_SIZE_SECTION_LABEL = 9;
const FONT_SIZE_CONTENT_PRIMARY = 9;
const FONT_SIZE_TABLE_HEAD = 8;
const FONT_SIZE_TABLE_BODY = 8;
const FONT_SIZE_FOOTER_TEXT = 8;

// --- Line Heights (Very Tight, based on image) ---
const LH_MAIN_TITLE = FONT_SIZE_MAIN_TITLE + 1; // 13
const LH_CONTENT_PACKED = FONT_SIZE_CONTENT_PRIMARY + 0.5; // 9.5 (for multi-line addresses/text)
const LH_CONTENT_SINGLE = FONT_SIZE_CONTENT_PRIMARY + 1; // 10 (for single lines like Tel, IEC)
const LH_TABLE_CELL = FONT_SIZE_TABLE_BODY + 0.5; // 8.5
const LH_FOOTER_PACKED = FONT_SIZE_FOOTER_TEXT + 0.2; // 8.2
const LH_FOOTER_SINGLE = FONT_SIZE_FOOTER_TEXT + 0.3; // 8.3

// --- Spacing Between Elements (Minimal, based on image and request) ---
const MINIMAL_INTERNAL_SPACING = 0.5; // Space within a logical block (e.g., after a label, before its value)
const SPACE_AFTER_MAIN_TITLE = 1;
const SPACE_AFTER_BLOCK_HEADER = 1; // Space AFTER a text block (like Exporter details) BEFORE a line
const SPACE_AFTER_HORIZONTAL_LINE = 0.50; // Space AFTER a line BEFORE next text block
const SPACE_BEFORE_TABLE = 1;
const SPACE_AFTER_TABLE = 1;
const SPACE_AFTER_TOTALS = 1;
const SPACE_BETWEEN_FOOTER_BLOCKS = 1;
const SPACE_BEFORE_SIGNATURE_BLOCK = 2.5;


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

  // Helper function to add text and update yPos
  const addText = (
    text: string | string[],
    x: number,
    currentY: number,
    options: {
      fontSize?: number;
      fontWeight?: 'normal' | 'bold';
      fontStyle?: 'normal' | 'italic';
      lineHeight?: number; // Explicit line height for this text block
      spacingAfter?: number; // Space to add *after* this text block
      align?: 'left' | 'center' | 'right';
      color?: [number, number, number];
      maxWidth?: number;
    } = {}
  ): number => {
    const fontSize = options.fontSize || FONT_SIZE_CONTENT_PRIMARY;
    const fontWeight = options.fontWeight || 'normal';
    const fontStyle = options.fontStyle || 'normal';
    // Default line height if not provided, very tight
    const effectiveLineHeight = options.lineHeight || (fontSize + 0.3);
    const align = options.align || 'left';
    const maxWidth = options.maxWidth;

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontWeight, fontStyle); // Directly use fontWeight
    if (options.color) {
      doc.setTextColor(options.color[0], options.color[1], options.color[2]);
    } else {
      doc.setTextColor(0, 0, 0); // Default black
    }

    let newY = currentY;
    const textToProcess = Array.isArray(text) ? text : [text];

    textToProcess.forEach(lineContent => {
      let lines = [lineContent]; // Ensure lineContent is never undefined or null
      if (maxWidth && lineContent) {
        lines = doc.splitTextToSize(lineContent, maxWidth);
      }
      
      lines.forEach(line => {
        let actualX = x;
        if (align === 'center') {
          actualX = pageWidth / 2;
        } else if (align === 'right') {
          // For right align, x is the rightmost point
        }
        doc.text(line, actualX, newY, { align: align });
        newY += effectiveLineHeight;
      });
    });
    return newY + (options.spacingAfter || 0);
  };

  // --- 1. "PERFORMA INVOICE" Title ---
  yPos = addText('PERFORMA INVOICE', pageWidth / 2, yPos, {
    fontSize: FONT_SIZE_MAIN_TITLE,
    fontWeight: 'bold',
    align: 'center',
    lineHeight: LH_MAIN_TITLE,
    spacingAfter: SPACE_AFTER_MAIN_TITLE,
  });

  // --- 2. Exporter Details (Left) & Invoice Details (Right) ---
  const topSectionStartY = yPos;
  let exporterY = topSectionStartY;
  let invoiceDetailsY = topSectionStartY;

  const leftColumnX = PAGE_MARGIN_SIDES;
  const rightColumnX = pageWidth / 2 + 5; // Start of right column text
  const invoiceLabelWidth = 25; // Approximate width for labels like "Invoice No."
  const invoiceValueX = rightColumnX + invoiceLabelWidth + 1; // Start of values for invoice details
  const exporterNameAndAddressMaxWidth = pageWidth / 2 - PAGE_MARGIN_SIDES - 5;
  const paymentTermsMaxWidthRight = pageWidth - invoiceValueX - PAGE_MARGIN_SIDES;


  // Exporter
  exporterY = addText('EXPORTER:', leftColumnX, exporterY, {
    fontSize: FONT_SIZE_SECTION_LABEL,
    fontWeight: 'bold',
    lineHeight: LH_CONTENT_SINGLE, // For the label itself
    spacingAfter: MINIMAL_INTERNAL_SPACING * 0.5, // Small space after "EXPORTER:" label
  });
  exporterY = addText(exporter.companyName, leftColumnX, exporterY, {
    fontSize: FONT_SIZE_CONTENT_PRIMARY,
    fontWeight: 'bold',
    lineHeight: LH_CONTENT_PACKED, // Tighter for potentially multi-line company name
    spacingAfter: MINIMAL_INTERNAL_SPACING * 0.5, // Small space after company name
    maxWidth: exporterNameAndAddressMaxWidth,
  });
  exporterY = addText(exporter.address, leftColumnX, exporterY, {
    fontSize: FONT_SIZE_CONTENT_PRIMARY,
    lineHeight: LH_CONTENT_PACKED, // Tighter for multi-line address
    spacingAfter: MINIMAL_INTERNAL_SPACING, // Space after the full address block
    maxWidth: exporterNameAndAddressMaxWidth,
  });
  exporterY = addText(`TEL: ${exporter.phoneNumber}`, leftColumnX, exporterY, {
    fontSize: FONT_SIZE_CONTENT_PRIMARY,
    lineHeight: LH_CONTENT_SINGLE,
    spacingAfter: MINIMAL_INTERNAL_SPACING * 0.5,
  });
  exporterY = addText(`IEC NO: ${exporter.iecNumber}`, leftColumnX, exporterY, {
    fontSize: FONT_SIZE_CONTENT_PRIMARY,
    lineHeight: LH_CONTENT_SINGLE,
    spacingAfter: 0, // No space after the last item in this block
  });

  // Invoice Details
  const drawInvoiceDetailSameLine = (label: string, value: string, currentY: number) => {
    doc.setFontSize(FONT_SIZE_SECTION_LABEL); // Label font
    doc.setFont('helvetica', 'bold');
    doc.text(label, rightColumnX, currentY);

    doc.setFontSize(FONT_SIZE_CONTENT_PRIMARY); // Value font
    doc.setFont('helvetica', 'normal');
    doc.text(value, invoiceValueX, currentY);
    return currentY + LH_CONTENT_SINGLE; // Advance Y by the line height of this composite line
  };
  
  invoiceDetailsY = drawInvoiceDetailSameLine('Invoice No.', invoice.invoiceNumber, invoiceDetailsY);
  invoiceDetailsY = drawInvoiceDetailSameLine('Date', format(new Date(invoice.invoiceDate), 'dd/MM/yyyy'), invoiceDetailsY);
  invoiceDetailsY = drawInvoiceDetailSameLine('Currency', invoice.currencyType.toUpperCase(), invoiceDetailsY);
  
  // Payment Terms - Label on one line, value potentially multi-line starting on same Y as label
  doc.setFontSize(FONT_SIZE_SECTION_LABEL);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Terms', rightColumnX, invoiceDetailsY); // Draw label
  
  // Use addText for the value part, starting at invoiceValueX, using the *current* invoiceDetailsY
  // This will handle multi-line for paymentTerms, advancing Y internally.
  const paymentTermsYAfter = addText(invoice.termsAndConditions, invoiceValueX, invoiceDetailsY, {
    fontSize: FONT_SIZE_CONTENT_PRIMARY,
    lineHeight: LH_CONTENT_PACKED, // Tight packing for terms
    spacingAfter: 0,
    maxWidth: paymentTermsMaxWidthRight,
  });
  // If payment terms took more than one effective line (LH_CONTENT_SINGLE), adjust invoiceDetailsY
  // Otherwise, if it fit on one conceptual line with the label, advance by LH_CONTENT_SINGLE from original start
  invoiceDetailsY = Math.max(invoiceDetailsY + LH_CONTENT_SINGLE, paymentTermsYAfter);

  yPos = Math.max(exporterY, invoiceDetailsY); // Whichever block is longer
  yPos += SPACE_AFTER_BLOCK_HEADER; 

  // --- 3. First Horizontal Line ---
  doc.setLineWidth(0.2);
  doc.line(PAGE_MARGIN_SIDES, yPos, pageWidth - PAGE_MARGIN_SIDES, yPos);
  yPos += SPACE_AFTER_HORIZONTAL_LINE;

  // --- 4. Consignee/Buyer (Left) & Notify Party (Right) ---
  let consigneeY = yPos;
  let notifyPartyY = yPos;
  const addressMaxWidth = pageWidth / 2 - PAGE_MARGIN_SIDES - 5; // Max width for address blocks

  consigneeY = addText('CONSIGNEE / BUYER:', leftColumnX, consigneeY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_CONTENT_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING * 0.5 });
  consigneeY = addText(client.companyName, leftColumnX, consigneeY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, fontWeight: 'bold', lineHeight: LH_CONTENT_PACKED, spacingAfter: MINIMAL_INTERNAL_SPACING * 0.5, maxWidth: addressMaxWidth });
  consigneeY = addText(`${client.address}\n${client.city}, ${client.country} - ${client.pinCode}`, leftColumnX, consigneeY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: 0, maxWidth: addressMaxWidth });

  notifyPartyY = addText('NOTIFY PARTY:', rightColumnX, notifyPartyY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_CONTENT_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING * 0.5 });
  if (invoice.notifyPartyLine1 || invoice.notifyPartyLine2) {
    if (invoice.notifyPartyLine1) {
      notifyPartyY = addText(invoice.notifyPartyLine1, rightColumnX, notifyPartyY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: invoice.notifyPartyLine2 ? MINIMAL_INTERNAL_SPACING * 0.5 : 0, maxWidth: addressMaxWidth });
    }
    if (invoice.notifyPartyLine2) {
      notifyPartyY = addText(invoice.notifyPartyLine2, rightColumnX, notifyPartyY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: 0, maxWidth: addressMaxWidth });
    }
  } else {
    notifyPartyY = addText("SAME AS CONSIGNEE", rightColumnX, notifyPartyY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter: 0 });
  }

  yPos = Math.max(consigneeY, notifyPartyY);
  yPos += SPACE_AFTER_BLOCK_HEADER;

  // --- 5. Second Horizontal Line ---
  doc.line(PAGE_MARGIN_SIDES, yPos, pageWidth - PAGE_MARGIN_SIDES, yPos);
  yPos += SPACE_AFTER_HORIZONTAL_LINE;

  // --- 6. Shipment Details ---
  const shipmentLabelValueXOffset = 35; // Offset for the value part from the label

  const drawShipmentDetailRow = (label1: string, value1: string, label2: string, value2: string, currentY: number) => {
    let maxYForThisRow = currentY;
    // Column 1
    doc.setFontSize(FONT_SIZE_SECTION_LABEL);
    doc.setFont('helvetica', 'bold');
    doc.text(label1, leftColumnX, currentY);
    doc.setFontSize(FONT_SIZE_CONTENT_PRIMARY);
    doc.setFont('helvetica', 'normal');
    const yAfterVal1 = addText(value1, leftColumnX + shipmentLabelValueXOffset, currentY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, maxWidth: addressMaxWidth - shipmentLabelValueXOffset, spacingAfter:0 });
    maxYForThisRow = Math.max(maxYForThisRow, yAfterVal1 - (LH_CONTENT_PACKED) + LH_CONTENT_SINGLE);


    // Column 2
    if (label2) {
      doc.setFontSize(FONT_SIZE_SECTION_LABEL);
      doc.setFont('helvetica', 'bold');
      doc.text(label2, rightColumnX, currentY);
      doc.setFontSize(FONT_SIZE_CONTENT_PRIMARY);
      doc.setFont('helvetica', 'normal');
      const yAfterVal2 = addText(value2, rightColumnX + shipmentLabelValueXOffset, currentY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, maxWidth: addressMaxWidth - shipmentLabelValueXOffset, spacingAfter:0 });
      maxYForThisRow = Math.max(maxYForThisRow, yAfterVal2- (LH_CONTENT_PACKED) + LH_CONTENT_SINGLE);
    }
    return maxYForThisRow; // Return the Y position after the tallest content in this row
  };

  yPos = drawShipmentDetailRow('Port of Loading:', 'Mundra', 'Final Destination:', invoice.finalDestination, yPos);
  yPos = drawShipmentDetailRow('Container Details:', `${invoice.totalContainer} x ${invoice.containerSize}`, 'Total Gross Wt:', `${invoice.totalGrossWeight} KGS`, yPos);
  
  yPos += SPACE_BEFORE_TABLE;

  // --- 7. Product Table ---
  const tableColumnStyles = {
    0: { cellWidth: 15, halign: 'center' }, 
    1: { cellWidth: 50 }, 
    2: { cellWidth: 20, halign: 'center' }, 
    3: { cellWidth: 20, halign: 'right' }, 
    4: { cellWidth: 25, halign: 'right' }, 
    5: { cellWidth: 25, halign: 'right' }, 
    6: { cellWidth: 25, halign: 'right' }, 
  };

  const tableHeader = [['Sr.No.', 'Description of Goods', 'HSN', 'Qty Boxes', 'Total SQMT', `Rate/${invoice.currencyType}`, `Amount/${invoice.currencyType}`]];
  let tableBody = invoice.items.map((item, index) => {
    const product = allProducts.find(p => p.id === item.productId);
    const size = allSizes.find(s => s.id === item.sizeId);
    return [
      index + 1,
      `${product?.designName || 'N/A'} - ${size?.size || 'N/A'}`,
      size?.hsnCode || 'N/A',
      item.boxes.toString(),
      item.quantitySqmt?.toFixed(2) || '0.00',
      item.ratePerSqmt.toFixed(2),
      item.amount?.toFixed(2) || '0.00',
    ];
  });
  
  const numberOfItems = invoice.items.length;
  const numberOfEmptyRows = numberOfItems > 5 ? 2 : 4;
  for (let i = 0; i < numberOfEmptyRows; i++) {
    tableBody.push(['', '', '', '', '', '', '']); 
  }

  autoTable(doc, {
    head: tableHeader,
    body: tableBody,
    startY: yPos,
    theme: 'grid',
    headStyles: { fillColor: [220, 220, 220], textColor: [0,0,0], fontStyle: 'bold', halign: 'center', fontSize: FONT_SIZE_TABLE_HEAD, cellPadding: 1, minCellHeight: LH_TABLE_CELL }, 
    bodyStyles: { fontSize: FONT_SIZE_TABLE_BODY, cellPadding: 1, minCellHeight: LH_TABLE_CELL }, 
    columnStyles: tableColumnStyles,
    didDrawPage: (data) => { 
        yPos = data.cursor?.y || yPos;
    }
  });
  yPos = (doc as any).lastAutoTable.finalY + SPACE_AFTER_TABLE;


  // --- 8. Totals Section ---
  const totalsValueX = pageWidth - PAGE_MARGIN_SIDES; 
  const totalsLabelX = totalsValueX - 45; 
  
  let totalsY = yPos;
  doc.setFontSize(FONT_SIZE_FOOTER_TEXT);
  doc.setFont('helvetica', 'normal');
  doc.text('Sub Total:', totalsLabelX, totalsY, {align: 'left'});
  doc.setFont('helvetica', 'bold');
  doc.text((invoice.subTotal || 0).toFixed(2), totalsValueX, totalsY, {align: 'right'});
  totalsY += LH_FOOTER_SINGLE; 

  if (invoice.discount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('Discount:', totalsLabelX, totalsY, {align: 'left'});
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.discount.toFixed(2), totalsValueX, totalsY, {align: 'right'});
    totalsY += LH_FOOTER_SINGLE;
  }
  if (invoice.freight > 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('Freight:', totalsLabelX, totalsY, {align: 'left'});
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.freight.toFixed(2), totalsValueX, totalsY, {align: 'right'});
    totalsY += LH_FOOTER_SINGLE;
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Grand Total:', totalsLabelX, totalsY, {align: 'left'});
  doc.text((invoice.grandTotal || 0).toFixed(2), totalsValueX, totalsY, {align: 'right'});
  yPos = totalsY + SPACE_AFTER_TOTALS;


  // --- 9. Total Invoice Amount in Words ---
  yPos = addText(`Total Invoice amount (in words):`, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING * 0.5 });
  const amountInWordsStr = amountToWords(invoice.grandTotal || 0, invoice.currencyType);
  yPos = addText(amountInWordsStr, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_PACKED, spacingAfter: SPACE_BETWEEN_FOOTER_BLOCKS, maxWidth: pageWidth - (2 * PAGE_MARGIN_SIDES) }); 
  
  // --- 10. Note ---
  if (invoice.note) {
    yPos = addText('Note:', leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING * 0.5 });
    yPos = addText(invoice.note.replace(/<br>/g, '\n'), leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_PACKED, spacingAfter: SPACE_BETWEEN_FOOTER_BLOCKS, maxWidth: pageWidth - (2 * PAGE_MARGIN_SIDES) });
  }

  // --- 11. Beneficiary Bank Details ---
  if (selectedBank) {
    yPos = addText('BENEFICIARY BANK DETAILS:', leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING * 0.5 });
    
    let bankDetailY = yPos;
    bankDetailY = addText(`BANK NAME: ${selectedBank.bankName}`, leftColumnX, bankDetailY, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING * 0.5 });
    
    const bankAddrLabel = "BANK ADDRESS: ";
    const bankAddrValueX = leftColumnX + doc.getTextWidth(bankAddrLabel) + 0.5; // Small gap after label
    doc.setFontSize(FONT_SIZE_FOOTER_TEXT);
    doc.setFont('helvetica', 'normal');
    doc.text(bankAddrLabel, leftColumnX, bankDetailY);
    // Use addText for the value part, starting from bankAddrValueX and current bankDetailY for proper multi-line handling
    bankDetailY = addText(selectedBank.bankAddress, bankAddrValueX, bankDetailY, { 
        fontSize: FONT_SIZE_FOOTER_TEXT, 
        lineHeight: LH_FOOTER_PACKED, // Use packed for address
        spacingAfter: MINIMAL_INTERNAL_SPACING * 0.5, 
        maxWidth: pageWidth - bankAddrValueX - PAGE_MARGIN_SIDES 
    });

    bankDetailY = addText(`ACCOUNT NO: ${selectedBank.accountNumber}`, leftColumnX, bankDetailY, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING * 0.5 });
    bankDetailY = addText(`SWIFT CODE: ${selectedBank.swiftCode}`, leftColumnX, bankDetailY, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING * 0.5 });
    bankDetailY = addText(`IFSC CODE: ${selectedBank.ifscCode}`, leftColumnX, bankDetailY, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_SINGLE, spacingAfter: 0 }); 
    yPos = bankDetailY; // Update main yPos to after bank details
  }

  // --- 12. Signature ---
  const signatureBlockHeight = LH_FOOTER_SINGLE * 3 + SPACE_BEFORE_SIGNATURE_BLOCK; 
  const availableSpaceBottom = doc.internal.pageSize.getHeight() - yPos - PAGE_MARGIN_TOP; 

  if (availableSpaceBottom < signatureBlockHeight) {
      doc.addPage();
      yPos = PAGE_MARGIN_TOP; 
  }
  // Always ensure there's at least SPACE_BEFORE_SIGNATURE_BLOCK, even if it pushes to new page
  yPos = Math.max(yPos, doc.internal.pageSize.getHeight() - PAGE_MARGIN_TOP - signatureBlockHeight)
  if (yPos < PAGE_MARGIN_TOP + SPACE_BEFORE_SIGNATURE_BLOCK && doc.internal.pages.length > 1) { // if yPos was reset for a new page and is too high
    yPos = PAGE_MARGIN_TOP + SPACE_BEFORE_SIGNATURE_BLOCK
  } else if (doc.internal.pages.length === 1) { // if still on first page
     yPos += SPACE_BEFORE_SIGNATURE_BLOCK;
  }


  const signatureX = pageWidth - PAGE_MARGIN_SIDES - 70; 
  const signatureLineWidth = 60;
  
  // Final check before drawing signature, if yPos is too low, add page.
  if (yPos > doc.internal.pageSize.getHeight() - (LH_FOOTER_SINGLE * 2.5) - PAGE_MARGIN_TOP) {
    const currentSignatureY = yPos; // Store current yPos before potential addPage
    if(availableSpaceBottom < signatureBlockHeight && !(yPos === PAGE_MARGIN_TOP + SPACE_BEFORE_SIGNATURE_BLOCK && doc.internal.pages.length > 1)){
         doc.addPage();
         yPos = PAGE_MARGIN_TOP + SPACE_BEFORE_SIGNATURE_BLOCK; // Reset yPos for new page with spacing
    } else if (yPos < currentSignatureY && doc.internal.pages.length >1) { // yPos was reset due to prev page overflow check
         // keep yPos as is
    } else {
        // if it fits or already spaced on new page, use current yPos
    }
  }


  yPos = addText(`For ${exporter.companyName}`, signatureX + signatureLineWidth / 2, yPos, { fontWeight: 'bold', align: 'center', fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_SINGLE, spacingAfter: LH_FOOTER_SINGLE * 0.8 }); 
  doc.line(signatureX, yPos, signatureX + signatureLineWidth, yPos); 
  yPos += (LH_FOOTER_SINGLE * 0.5); 
  addText('Authorized Signatory', signatureX + signatureLineWidth / 2, yPos, { align: 'center', fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_SINGLE});

  doc.save(`Performa_Invoice_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
}
