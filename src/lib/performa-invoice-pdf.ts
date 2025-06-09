
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
const PAGE_MARGIN_TOP = 10;
const PAGE_MARGIN_SIDES = 15;
const PAGE_WIDTH = 210; // A4 width in mm

// --- Font Sizes ---
const FONT_SIZE_MAIN_TITLE = 12; // "PERFORMA INVOICE"
const FONT_SIZE_SECTION_LABEL = 9; // "EXPORTER:", "Invoice No."
const FONT_SIZE_CONTENT_PRIMARY = 9; // Company names, main address lines
const FONT_SIZE_CONTENT_SECONDARY = 9; // Tel, IEC, smaller details
const FONT_SIZE_TABLE_HEAD = 8;
const FONT_SIZE_TABLE_BODY = 8;
const FONT_SIZE_FOOTER_TEXT = 8; // For amount in words, note, bank details

// --- Line Heights (relative to font size for tight packing) ---
// These are effectively the 'leading' or space between baselines.
// For very tight packing, lineHeight can be very close to fontSize.
const LH_MAIN_TITLE = FONT_SIZE_MAIN_TITLE + 2;
const LH_SECTION_LABEL = FONT_SIZE_SECTION_LABEL + 1; // Label itself
const LH_CONTENT_PACKED = FONT_SIZE_CONTENT_PRIMARY + 0.5; // For multi-line addresses
const LH_CONTENT_SINGLE = FONT_SIZE_CONTENT_PRIMARY + 1; // For single lines like Tel, IEC
const LH_TABLE_CELL = FONT_SIZE_TABLE_BODY + 1;
const LH_FOOTER_PACKED = FONT_SIZE_FOOTER_TEXT + 0.5; // For multi-line note/bank address
const LH_FOOTER_SINGLE = FONT_SIZE_FOOTER_TEXT + 1;

// --- Spacing Between Elements ---
const SPACE_AFTER_MAIN_TITLE = 5;
const SPACE_AFTER_BLOCK_HEADER = 3; // Space after Exporter block before line
const SPACE_AFTER_HORIZONTAL_LINE = 2;
const SPACE_BEFORE_TABLE = 3;
const SPACE_AFTER_TABLE = 2;
const SPACE_AFTER_TOTALS = 3;
const SPACE_BETWEEN_FOOTER_BLOCKS = 2.5;
const SPACE_BEFORE_SIGNATURE_BLOCK = 5;


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
  const pageWidth = doc.internal.pageSize.getWidth(); // Use actual page width from doc

  // Helper to add text and manage yPos
  const addText = (
    text: string | string[],
    x: number,
    currentY: number,
    options: {
      fontSize?: number;
      fontWeight?: 'normal' | 'bold';
      fontStyle?: 'normal' | 'italic'; // Added fontStyle
      lineHeight?: number;
      spacingAfter?: number;
      align?: 'left' | 'center' | 'right';
      color?: [number, number, number];
      maxWidth?: number; // For auto-wrapping
    } = {}
  ): number => {
    const fontSize = options.fontSize || FONT_SIZE_CONTENT_PRIMARY;
    const fontWeight = options.fontWeight || 'normal';
    const fontStyle = options.fontStyle || 'normal';
    const effectiveLineHeight = options.lineHeight || (fontSize + 1); // Default if not provided
    const align = options.align || 'left';
    const maxWidth = options.maxWidth;

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontWeight === 'bold' ? 'bold' : fontStyle);
    if (options.color) {
      doc.setTextColor(options.color[0], options.color[1], options.color[2]);
    } else {
      doc.setTextColor(0, 0, 0); // Default to black
    }

    let newY = currentY;
    const textToProcess = Array.isArray(text) ? text : [text];

    textToProcess.forEach(lineContent => {
      let lines = [lineContent];
      if (maxWidth) {
        lines = doc.splitTextToSize(lineContent, maxWidth);
      }
      
      lines.forEach(line => {
        let actualX = x;
        if (align === 'center') {
          actualX = pageWidth / 2;
        } else if (align === 'right') {
          actualX = x - doc.getTextWidth(line); // x is the right boundary
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
  const rightColumnX = pageWidth / 2 + 5; // Start of right column
  const invoiceLabelWidth = 30; // Width for labels like "Invoice No."
  const invoiceValueX = rightColumnX + invoiceLabelWidth + 1; // Start of values for invoice details
  const addressMaxWidth = pageWidth / 2 - PAGE_MARGIN_SIDES - 5;


  // Exporter
  exporterY = addText('EXPORTER:', leftColumnX, exporterY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: 0.5 });
  exporterY = addText(exporter.companyName, leftColumnX, exporterY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, fontWeight: 'bold', lineHeight: LH_CONTENT_PACKED, spacingAfter: 0.5 });
  exporterY = addText(exporter.address, leftColumnX, exporterY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: 0.5, maxWidth: addressMaxWidth });
  exporterY = addText(`TEL: ${exporter.phoneNumber}`, leftColumnX, exporterY, { fontSize: FONT_SIZE_CONTENT_SECONDARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter: 0.5 });
  exporterY = addText(`IEC NO: ${exporter.iecNumber}`, leftColumnX, exporterY, { fontSize: FONT_SIZE_CONTENT_SECONDARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter: 0 });

  // Invoice Details
  const paymentTermsMaxWidth = pageWidth - invoiceValueX - PAGE_MARGIN_SIDES;

  invoiceDetailsY = addText('Invoice No.', rightColumnX, invoiceDetailsY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_CONTENT_SINGLE, spacingAfter: 0 });
  addText(invoice.invoiceNumber, invoiceValueX, invoiceDetailsY - LH_CONTENT_SINGLE, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter: 0 }); // place value on same logical line

  invoiceDetailsY = addText('Date', rightColumnX, invoiceDetailsY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_CONTENT_SINGLE, spacingAfter: 0 });
  addText(format(new Date(invoice.invoiceDate), 'dd/MM/yyyy'), invoiceValueX, invoiceDetailsY - LH_CONTENT_SINGLE, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter: 0 });

  invoiceDetailsY = addText('Currency', rightColumnX, invoiceDetailsY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_CONTENT_SINGLE, spacingAfter: 0 });
  addText(invoice.currencyType.toUpperCase(), invoiceValueX, invoiceDetailsY - LH_CONTENT_SINGLE, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter: 0 });
  
  invoiceDetailsY = addText('Payment Terms', rightColumnX, invoiceDetailsY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_CONTENT_SINGLE, spacingAfter: 0.5}); // spacing after label before multi-line value
  invoiceDetailsY = addText(invoice.termsAndConditions, invoiceValueX, invoiceDetailsY - LH_CONTENT_SINGLE, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: 0, maxWidth: paymentTermsMaxWidth });


  yPos = Math.max(exporterY, invoiceDetailsY) + SPACE_AFTER_BLOCK_HEADER;

  // --- 3. First Horizontal Line ---
  doc.setLineWidth(0.2);
  doc.line(PAGE_MARGIN_SIDES, yPos, pageWidth - PAGE_MARGIN_SIDES, yPos);
  yPos += SPACE_AFTER_HORIZONTAL_LINE;

  // --- 4. Consignee/Buyer (Left) & Notify Party (Right) ---
  const middleSectionStartY = yPos;
  let consigneeY = middleSectionStartY;
  let notifyPartyY = middleSectionStartY;

  // Consignee/Buyer
  consigneeY = addText('CONSIGNEE / BUYER:', leftColumnX, consigneeY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: 0.5 });
  consigneeY = addText(client.companyName, leftColumnX, consigneeY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, fontWeight: 'bold', lineHeight: LH_CONTENT_PACKED, spacingAfter: 0.5 });
  consigneeY = addText(`${client.address}\n${client.city}, ${client.country} - ${client.pinCode}`, leftColumnX, consigneeY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: 0, maxWidth: addressMaxWidth });

  // Notify Party
  notifyPartyY = addText('NOTIFY PARTY:', rightColumnX, notifyPartyY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_SECTION_LABEL, spacingAfter: 0.5 });
  if (invoice.notifyPartyLine1 || invoice.notifyPartyLine2) {
    if (invoice.notifyPartyLine1) {
      notifyPartyY = addText(invoice.notifyPartyLine1, rightColumnX, notifyPartyY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: invoice.notifyPartyLine2 ? 0.5 : 0 });
    }
    if (invoice.notifyPartyLine2) {
      notifyPartyY = addText(invoice.notifyPartyLine2, rightColumnX, notifyPartyY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: 0 });
    }
  } else {
    notifyPartyY = addText("SAME AS CONSIGNEE", rightColumnX, notifyPartyY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter: 0 });
  }

  yPos = Math.max(consigneeY, notifyPartyY) + SPACE_AFTER_BLOCK_HEADER;

  // --- 5. Second Horizontal Line ---
  doc.line(PAGE_MARGIN_SIDES, yPos, pageWidth - PAGE_MARGIN_SIDES, yPos);
  yPos += SPACE_AFTER_HORIZONTAL_LINE;

  // --- 6. Shipment Details ---
  const shipmentLabelX = leftColumnX;
  const shipmentValueX = shipmentLabelX + 35; // Offset for values
  const shipmentRightLabelX = rightColumnX;
  const shipmentRightValueX = shipmentRightLabelX + 35;

  let shipmentRowY = yPos;
  addText('Port of Loading:', shipmentLabelX, shipmentRowY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_CONTENT_SINGLE, spacingAfter:0 });
  addText('Mundra', shipmentValueX, shipmentRowY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter:0 });
  
  addText('Final Destination:', shipmentRightLabelX, shipmentRowY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_CONTENT_SINGLE, spacingAfter:0 });
  addText(invoice.finalDestination, shipmentRightValueX, shipmentRowY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter:0 });
  shipmentRowY += LH_CONTENT_SINGLE;

  addText('Container Details:', shipmentLabelX, shipmentRowY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_CONTENT_SINGLE, spacingAfter:0 });
  addText(`${invoice.totalContainer} x ${invoice.containerSize}`, shipmentValueX, shipmentRowY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter:0 });

  addText('Total Gross Wt:', shipmentRightLabelX, shipmentRowY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_CONTENT_SINGLE, spacingAfter:0 });
  addText(`${invoice.totalGrossWeight} KGS`, shipmentRightValueX, shipmentRowY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter:0 });
  shipmentRowY += LH_CONTENT_SINGLE;

  yPos = shipmentRowY + SPACE_BEFORE_TABLE;

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
    headStyles: { fillColor: [220, 220, 220], textColor: [0,0,0], fontStyle: 'bold', halign: 'center', fontSize: FONT_SIZE_TABLE_HEAD, cellPadding: 0.5, minCellHeight: LH_TABLE_CELL }, 
    bodyStyles: { fontSize: FONT_SIZE_TABLE_BODY, cellPadding: 0.5, minCellHeight: LH_TABLE_CELL }, 
    columnStyles: tableColumnStyles,
  });

  yPos = (doc as any).lastAutoTable.finalY + SPACE_AFTER_TABLE;

  // --- 8. Totals Section ---
  const totalsValueX = pageWidth - PAGE_MARGIN_SIDES; 
  const totalsLabelX = totalsValueX - 50; // Adjusted for better alignment
  
  let totalsY = yPos;
  doc.setFontSize(FONT_SIZE_FOOTER_TEXT);
  doc.setFont('helvetica', 'normal');
  doc.text('Sub Total:', totalsLabelX, totalsY, {align: 'left'});
  doc.setFont('helvetica', 'bold'); // Value is bold
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

  doc.setFont('helvetica', 'bold'); // Both label and value are bold for Grand Total
  doc.text('Grand Total:', totalsLabelX, totalsY, {align: 'left'});
  doc.text((invoice.grandTotal || 0).toFixed(2), totalsValueX, totalsY, {align: 'right'});
  yPos = totalsY + SPACE_AFTER_TOTALS;


  // --- 9. Total Invoice Amount in Words ---
  yPos = addText(`Total Invoice amount (in words):`, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, spacingAfter: 0.5 });
  const amountInWordsStr = amountToWords(invoice.grandTotal || 0, invoice.currencyType);
  yPos = addText(amountInWordsStr, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_PACKED, spacingAfter: SPACE_BETWEEN_FOOTER_BLOCKS, maxWidth: pageWidth - (2 * PAGE_MARGIN_SIDES) }); 
  
  // --- 10. Note ---
  if (invoice.note) {
    yPos = addText('Note:', leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, spacingAfter: 0.5 });
    yPos = addText(invoice.note.replace(/<br>/g, '\n'), leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_PACKED, spacingAfter: SPACE_BETWEEN_FOOTER_BLOCKS, maxWidth: pageWidth - (2 * PAGE_MARGIN_SIDES) });
  }

  // --- 11. Beneficiary Bank Details ---
  if (selectedBank) {
    yPos = addText('BENEFICIARY BANK DETAILS:', leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, spacingAfter: 0.5 });
    yPos = addText(`BANK NAME: ${selectedBank.bankName}`, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_SINGLE, spacingAfter: 0.5 });
    
    const bankAddrLabel = "BANK ADDRESS: ";
    const bankAddrValueX = leftColumnX + doc.getTextWidth(bankAddrLabel) + 0.5; 
    const bankAddrMaxWidth = pageWidth - bankAddrValueX - PAGE_MARGIN_SIDES;

    addText(bankAddrLabel, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_PACKED, spacingAfter:0 });
    yPos = addText(selectedBank.bankAddress, bankAddrValueX, yPos-LH_FOOTER_PACKED, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_PACKED, spacingAfter: 0.5, maxWidth: bankAddrMaxWidth});

    yPos = addText(`ACCOUNT NO: ${selectedBank.accountNumber}`, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_SINGLE, spacingAfter: 0.5 });
    yPos = addText(`SWIFT CODE: ${selectedBank.swiftCode}`, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_SINGLE, spacingAfter: 0.5 });
    yPos = addText(`IFSC CODE: ${selectedBank.ifscCode}`, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_SINGLE, spacingAfter: 0 }); 
  }

  // --- 12. Signature ---
  const signatureBlockHeight = LH_FOOTER_SINGLE * 3; 
  const availableSpaceBottom = doc.internal.pageSize.getHeight() - yPos - PAGE_MARGIN_TOP; // Use PAGE_MARGIN_TOP as bottom margin too

  if (availableSpaceBottom < signatureBlockHeight) {
      doc.addPage();
      yPos = PAGE_MARGIN_TOP; 
  } else {
    yPos += SPACE_BEFORE_SIGNATURE_BLOCK;
  }

  const signatureX = pageWidth - PAGE_MARGIN_SIDES - 70; // Position from right
  const signatureLineWidth = 60;

  yPos = addText(`For ${exporter.companyName}`, signatureX + signatureLineWidth / 2, yPos, { fontWeight: 'bold', align: 'center', fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_SINGLE, spacingAfter: LH_FOOTER_SINGLE * 1.5 }); 
  doc.line(signatureX, yPos, signatureX + signatureLineWidth, yPos); 
  yPos += (LH_FOOTER_SINGLE * 0.8); 
  addText('Authorized Signatory', signatureX + signatureLineWidth / 2, yPos, { align: 'center', fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_SINGLE});

  doc.save(`Performa_Invoice_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
}
