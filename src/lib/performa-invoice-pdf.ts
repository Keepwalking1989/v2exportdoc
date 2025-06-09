
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
const PAGE_MARGIN_TOP = 8;
const PAGE_MARGIN_SIDES = 15;

// --- Font Sizes ---
const FONT_SIZE_MAIN_TITLE = 12; // As per image reference
const FONT_SIZE_SECTION_LABEL = 9;
const FONT_SIZE_CONTENT_PRIMARY = 9;
const FONT_SIZE_TABLE_HEAD = 8;
const FONT_SIZE_TABLE_BODY = 8;
const FONT_SIZE_FOOTER_TEXT = 8;

// --- Line Heights (Very Tight, based on image) ---
const LH_MAIN_TITLE = FONT_SIZE_MAIN_TITLE + 1; // 13
const LH_SECTION_LABEL = FONT_SIZE_SECTION_LABEL + 0.5; // 9.5
const LH_CONTENT_PACKED = FONT_SIZE_CONTENT_PRIMARY + 0.2; // 9.2 (for multi-line addresses/text)
const LH_CONTENT_SINGLE = FONT_SIZE_CONTENT_PRIMARY + 0.3; // 9.3 (for single lines like Tel, IEC)
const LH_TABLE_CELL = FONT_SIZE_TABLE_BODY + 0.5; // 8.5
const LH_FOOTER_PACKED = FONT_SIZE_FOOTER_TEXT + 0.2; // 8.2
const LH_FOOTER_SINGLE = FONT_SIZE_FOOTER_TEXT + 0.3; // 8.3


// --- Spacing Between Elements (Minimal, based on image and request) ---
const SPACE_AFTER_MAIN_TITLE = 1; // Reduced to 1
const SPACE_AFTER_BLOCK_HEADER = 1; // Reduced to 1 (space AFTER text block, BEFORE line)
const SPACE_AFTER_HORIZONTAL_LINE = 1; // Reduced to 1 (space AFTER line, BEFORE next text block)
const SPACE_BEFORE_TABLE = 1; // Reduced to 1
const SPACE_AFTER_TABLE = 1.5;
const SPACE_AFTER_TOTALS = 1.5;
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
    const fontWeight = options.fontWeight || 'normal';
    const fontStyle = options.fontStyle || 'normal';
    const effectiveLineHeight = options.lineHeight || (fontSize + 0.3); // Default very tight
    const align = options.align || 'left';
    const maxWidth = options.maxWidth;

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontWeight === 'bold' ? 'bold' : fontStyle);
    if (options.color) {
      doc.setTextColor(options.color[0], options.color[1], options.color[2]);
    } else {
      doc.setTextColor(0, 0, 0);
    }

    let newY = currentY;
    const textToProcess = Array.isArray(text) ? text : [text];

    textToProcess.forEach(lineContent => {
      let lines = [lineContent];
      if (maxWidth && lineContent) {
        lines = doc.splitTextToSize(lineContent, maxWidth);
      }
      
      lines.forEach(line => {
        let actualX = x;
        if (align === 'center') {
          actualX = pageWidth / 2;
        } else if (align === 'right') {
          actualX = x; 
        }
        doc.text(line, actualX, newY, { align: align === 'center' ? 'center' : (align === 'right' ? 'right' : 'left') });
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
  const rightColumnX = pageWidth / 2 + 5;
  const invoiceLabelWidth = 25; 
  const invoiceValueX = rightColumnX + invoiceLabelWidth + 1;
  const addressMaxWidth = pageWidth / 2 - PAGE_MARGIN_SIDES - 8;
  const paymentTermsMaxWidth = pageWidth - invoiceValueX - PAGE_MARGIN_SIDES;


  // Exporter
  exporterY = addText('EXPORTER:', leftColumnX, exporterY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: 0.2 });
  exporterY = addText(exporter.companyName, leftColumnX, exporterY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, fontWeight: 'bold', lineHeight: LH_CONTENT_PACKED, spacingAfter: 0.2 });
  exporterY = addText(exporter.address, leftColumnX, exporterY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: 0.2, maxWidth: addressMaxWidth });
  exporterY = addText(`TEL: ${exporter.phoneNumber}`, leftColumnX, exporterY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter: 0.2 });
  exporterY = addText(`IEC NO: ${exporter.iecNumber}`, leftColumnX, exporterY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter: 0 });

  // Invoice Details
  const drawInvoiceDetailLine = (label: string, value: string, currentY: number) => {
    doc.setFontSize(FONT_SIZE_SECTION_LABEL);
    doc.setFont('helvetica', 'bold');
    doc.text(label, rightColumnX, currentY);
    doc.setFontSize(FONT_SIZE_CONTENT_PRIMARY);
    doc.setFont('helvetica', 'normal');
    doc.text(value, invoiceValueX, currentY);
    return currentY + LH_CONTENT_SINGLE;
  };
  
  invoiceDetailsY = drawInvoiceDetailLine('Invoice No.', invoice.invoiceNumber, invoiceDetailsY);
  invoiceDetailsY = drawInvoiceDetailLine('Date', format(new Date(invoice.invoiceDate), 'dd/MM/yyyy'), invoiceDetailsY);
  invoiceDetailsY = drawInvoiceDetailLine('Currency', invoice.currencyType.toUpperCase(), invoiceDetailsY);
  
  invoiceDetailsY = addText('Payment Terms', rightColumnX, invoiceDetailsY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: 0.2 });
  invoiceDetailsY = addText(invoice.termsAndConditions, invoiceValueX, invoiceDetailsY - LH_SECTION_LABEL, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: 0, maxWidth: paymentTermsMaxWidth });
  
  const exporterYAfter = exporterY;
  const invoiceDetailsYAfter = invoiceDetailsY;
  yPos = Math.max(exporterYAfter, invoiceDetailsYAfter);
  yPos += SPACE_AFTER_BLOCK_HEADER; 

  // --- 3. First Horizontal Line ---
  doc.setLineWidth(0.2);
  doc.line(PAGE_MARGIN_SIDES, yPos, pageWidth - PAGE_MARGIN_SIDES, yPos);
  yPos += SPACE_AFTER_HORIZONTAL_LINE;

  // --- 4. Consignee/Buyer (Left) & Notify Party (Right) ---
  const middleSectionStartY = yPos;
  let consigneeY = middleSectionStartY;
  let notifyPartyY = middleSectionStartY;

  consigneeY = addText('CONSIGNEE / BUYER:', leftColumnX, consigneeY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: 0.5 });
  consigneeY = addText(client.companyName, leftColumnX, consigneeY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, fontWeight: 'bold', lineHeight: LH_CONTENT_PACKED, spacingAfter: 0.2 });
  consigneeY = addText(`${client.address}\n${client.city}, ${client.country} - ${client.pinCode}`, leftColumnX, consigneeY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: 0, maxWidth: addressMaxWidth });

  notifyPartyY = addText('NOTIFY PARTY:', rightColumnX, notifyPartyY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: 0.5 });
  if (invoice.notifyPartyLine1 || invoice.notifyPartyLine2) {
    if (invoice.notifyPartyLine1) {
      notifyPartyY = addText(invoice.notifyPartyLine1, rightColumnX, notifyPartyY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: invoice.notifyPartyLine2 ? 0.2 : 0, maxWidth: addressMaxWidth });
    }
    if (invoice.notifyPartyLine2) {
      notifyPartyY = addText(invoice.notifyPartyLine2, rightColumnX, notifyPartyY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: 0, maxWidth: addressMaxWidth });
    }
  } else {
    notifyPartyY = addText("SAME AS CONSIGNEE", rightColumnX, notifyPartyY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter: 0 });
  }

  const consigneeYAfter = consigneeY;
  const notifyPartyYAfter = notifyPartyY;
  yPos = Math.max(consigneeYAfter, notifyPartyYAfter);
  yPos += SPACE_AFTER_BLOCK_HEADER;

  // --- 5. Second Horizontal Line ---
  doc.line(PAGE_MARGIN_SIDES, yPos, pageWidth - PAGE_MARGIN_SIDES, yPos);
  yPos += SPACE_AFTER_HORIZONTAL_LINE;

  // --- 6. Shipment Details ---
  let shipmentRowY = yPos;
  const shipmentLabelValueXOffset = 35;

  const drawShipmentDetailLine = (label: string, value: string, currentY: number, col1X: number, col2X: number) => {
    let yVal = currentY;
    doc.setFontSize(FONT_SIZE_SECTION_LABEL);
    doc.setFont('helvetica', 'bold');
    doc.text(label, col1X, yVal);
    doc.setFontSize(FONT_SIZE_CONTENT_PRIMARY);
    doc.setFont('helvetica', 'normal');
    doc.text(value, col1X + shipmentLabelValueXOffset, yVal);
    return yVal; // Return y of this line for alignment
  };

  let currentYLeftCol = shipmentRowY;
  let currentYRightCol = shipmentRowY;

  drawShipmentDetailLine('Port of Loading:', 'Mundra', currentYLeftCol, leftColumnX, rightColumnX);
  drawShipmentDetailLine('Final Destination:', invoice.finalDestination, currentYRightCol, rightColumnX, 0); // No second col for this pair
  currentYLeftCol += LH_CONTENT_SINGLE;
  currentYRightCol += LH_CONTENT_SINGLE;
  
  drawShipmentDetailLine('Container Details:', `${invoice.totalContainer} x ${invoice.containerSize}`, currentYLeftCol, leftColumnX, rightColumnX);
  drawShipmentDetailLine('Total Gross Wt:', `${invoice.totalGrossWeight} KGS`, currentYRightCol, rightColumnX, 0);
  currentYLeftCol += LH_CONTENT_SINGLE;
  currentYRightCol += LH_CONTENT_SINGLE;
  
  shipmentRowY = Math.max(currentYLeftCol, currentYRightCol);
  yPos = shipmentRowY;
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
  const tableBody = invoice.items.map((item, index) => {
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
    headStyles: { fillColor: [220, 220, 220], textColor: [0,0,0], fontStyle: 'bold', halign: 'center', fontSize: FONT_SIZE_TABLE_HEAD, cellPadding: 0.8, minCellHeight: LH_TABLE_CELL }, 
    bodyStyles: { fontSize: FONT_SIZE_TABLE_BODY, cellPadding: 0.8, minCellHeight: LH_TABLE_CELL }, 
    columnStyles: tableColumnStyles,
    didDrawPage: (data) => { 
        yPos = data.cursor?.y || yPos;
    }
  });
  yPos += SPACE_AFTER_TABLE; 

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
  yPos = addText(`Total Invoice amount (in words):`, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, spacingAfter: 0.2 });
  const amountInWordsStr = amountToWords(invoice.grandTotal || 0, invoice.currencyType);
  yPos = addText(amountInWordsStr, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_PACKED, spacingAfter: SPACE_BETWEEN_FOOTER_BLOCKS, maxWidth: pageWidth - (2 * PAGE_MARGIN_SIDES) }); 
  
  // --- 10. Note ---
  if (invoice.note) {
    yPos = addText('Note:', leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, spacingAfter: 0.2 });
    yPos = addText(invoice.note.replace(/<br>/g, '\n'), leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_PACKED, spacingAfter: SPACE_BETWEEN_FOOTER_BLOCKS, maxWidth: pageWidth - (2 * PAGE_MARGIN_SIDES) });
  }

  // --- 11. Beneficiary Bank Details ---
  if (selectedBank) {
    yPos = addText('BENEFICIARY BANK DETAILS:', leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, spacingAfter: 0.2 });
    yPos = addText(`BANK NAME: ${selectedBank.bankName}`, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_SINGLE, spacingAfter: 0.2 });
    
    const bankAddrLabel = "BANK ADDRESS: ";
    const bankAddrValueX = leftColumnX + doc.getTextWidth(bankAddrLabel);
    const bankAddrMaxWidth = pageWidth - bankAddrValueX - PAGE_MARGIN_SIDES;

    doc.setFontSize(FONT_SIZE_FOOTER_TEXT);
    doc.setFont('helvetica', 'normal');
    doc.text(bankAddrLabel, leftColumnX, yPos);
    yPos = addText(selectedBank.bankAddress, bankAddrValueX, yPos - LH_FOOTER_SINGLE, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_PACKED, spacingAfter: 0.2, maxWidth: bankAddrMaxWidth});

    yPos = addText(`ACCOUNT NO: ${selectedBank.accountNumber}`, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_SINGLE, spacingAfter: 0.2 });
    yPos = addText(`SWIFT CODE: ${selectedBank.swiftCode}`, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_SINGLE, spacingAfter: 0.2 });
    yPos = addText(`IFSC CODE: ${selectedBank.ifscCode}`, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_SINGLE, spacingAfter: 0 }); 
  }

  // --- 12. Signature ---
  const signatureBlockHeight = LH_FOOTER_SINGLE * 2.5 + SPACE_BEFORE_SIGNATURE_BLOCK; 
  const availableSpaceBottom = doc.internal.pageSize.getHeight() - yPos - PAGE_MARGIN_TOP; 

  if (availableSpaceBottom < signatureBlockHeight) {
      doc.addPage();
      yPos = PAGE_MARGIN_TOP; 
  } else {
    yPos += SPACE_BEFORE_SIGNATURE_BLOCK;
  }

  const signatureX = pageWidth - PAGE_MARGIN_SIDES - 70; 
  const signatureLineWidth = 60;

  if (yPos > doc.internal.pageSize.getHeight() - PAGE_MARGIN_TOP - signatureBlockHeight + SPACE_BEFORE_SIGNATURE_BLOCK) { // Check again before drawing
      if(availableSpaceBottom < signatureBlockHeight) { // Only add page if truly necessary
        doc.addPage();
        yPos = PAGE_MARGIN_TOP;
      }
  }

  yPos = addText(`For ${exporter.companyName}`, signatureX + signatureLineWidth / 2, yPos, { fontWeight: 'bold', align: 'center', fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_SINGLE, spacingAfter: LH_FOOTER_SINGLE * 0.8 }); 
  doc.line(signatureX, yPos, signatureX + signatureLineWidth, yPos); 
  yPos += (LH_FOOTER_SINGLE * 0.5); 
  addText('Authorized Signatory', signatureX + signatureLineWidth / 2, yPos, { align: 'center', fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_SINGLE});

  doc.save(`Performa_Invoice_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
}

