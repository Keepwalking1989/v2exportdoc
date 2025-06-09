
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
const FONT_SIZE_MAIN_TITLE = 12;
const FONT_SIZE_SECTION_LABEL = 9;
const FONT_SIZE_CONTENT_PRIMARY = 9;
const FONT_SIZE_TABLE_HEAD = 8;
const FONT_SIZE_TABLE_BODY = 8;
const FONT_SIZE_FOOTER_TEXT = 8;

// --- Line Heights (Very Tight, aiming for image match, now reduced by 50% for header) ---
const LH_MAIN_TITLE = FONT_SIZE_MAIN_TITLE + 0.5; // Was + 1
const LH_CONTENT_PACKED = FONT_SIZE_CONTENT_PRIMARY + 0.1; // Was + 0.2
const LH_CONTENT_SINGLE = FONT_SIZE_CONTENT_PRIMARY + 0.15; // Was + 0.3

// Footer line heights (kept as they were, as per request to only change above product table)
const LH_FOOTER_PACKED = FONT_SIZE_FOOTER_TEXT + 0.2;
const LH_FOOTER_SINGLE = FONT_SIZE_FOOTER_TEXT + 0.3;


// --- Spacing Between Elements (Aiming for image match, now reduced by 50% for header) ---
const MINIMAL_INTERNAL_SPACING = 0.25; // Was 0.5
const SPACE_AFTER_MAIN_TITLE = 0.5;    // Was 1
const SPACE_AFTER_BLOCK_HEADER = 0.75; // Was 1.5
const SPACE_AFTER_HORIZONTAL_LINE = 0.25; // Was 0.50
const SPACE_BEFORE_TABLE = 0.5;        // Was 1

// Footer spacing constants (kept as they were)
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
    // Default line height for header part is now tighter
    const effectiveLineHeight = options.lineHeight || (fontSize + 0.15); // Was + 0.3
    const align = options.align || 'left';
    const maxWidth = options.maxWidth;

    let combinedStyle = 'normal';
    if (fontWeight === 'bold' && fontStyle === 'italic') {
      combinedStyle = 'bolditalic';
    } else if (fontWeight === 'bold') {
      combinedStyle = 'bold';
    } else if (fontStyle === 'italic') {
      combinedStyle = 'italic';
    }

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', combinedStyle);
    if (options.color) {
      doc.setTextColor(options.color[0], options.color[1], options.color[2]);
    } else {
      doc.setTextColor(0, 0, 0); // Default black
    }

    let newY = currentY;
    const textToProcess = Array.isArray(text) ? text : [text];

    textToProcess.forEach(lineContent => {
      let lines = [lineContent || ""];
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
  const rightColumnX = pageWidth / 2 + 2; // Slightly adjusted for better visual balance
  const invoiceLabelWidth = 28;
  const invoiceValueX = rightColumnX + invoiceLabelWidth;
  const sharedMaxWidth = pageWidth / 2 - PAGE_MARGIN_SIDES - 5; // Shared max width for left/right columns
  const exporterNameAndAddressMaxWidth = sharedMaxWidth - 2; // For exporter name and address specifically


  // Exporter
  exporterY = addText('EXPORTER:', leftColumnX, exporterY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_CONTENT_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING });
  exporterY = addText(exporter.companyName, leftColumnX, exporterY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, fontWeight: 'bold', lineHeight: LH_CONTENT_PACKED, spacingAfter: MINIMAL_INTERNAL_SPACING, maxWidth: exporterNameAndAddressMaxWidth });
  exporterY = addText(exporter.address, leftColumnX, exporterY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: MINIMAL_INTERNAL_SPACING, maxWidth: exporterNameAndAddressMaxWidth });
  exporterY = addText(`TEL: ${exporter.phoneNumber}`, leftColumnX, exporterY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING * 0.5 });
  exporterY = addText(`IEC NO: ${exporter.iecNumber}`, leftColumnX, exporterY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_SINGLE, spacingAfter: 0 });

  // Invoice Details
  const drawInvoiceDetailSameLine = (label: string, value: string, currentY: number) => {
    addText(label, rightColumnX, currentY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_CONTENT_SINGLE });
    const valueY = addText(value, invoiceValueX, currentY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, maxWidth: sharedMaxWidth - invoiceLabelWidth });
    // Determine the actual height taken by the value (could be multi-line for payment terms)
    const heightOfValue = valueY - currentY - (LH_CONTENT_PACKED - FONT_SIZE_CONTENT_PRIMARY); // approx height of text block itself
    return currentY + Math.max(LH_CONTENT_SINGLE, heightOfValue) + MINIMAL_INTERNAL_SPACING;
};

  invoiceDetailsY = drawInvoiceDetailSameLine('Invoice No.', invoice.invoiceNumber, invoiceDetailsY);
  invoiceDetailsY = drawInvoiceDetailSameLine('Date', format(new Date(invoice.invoiceDate), 'dd/MM/yyyy'), invoiceDetailsY);
  invoiceDetailsY = drawInvoiceDetailSameLine('Currency', invoice.currencyType.toUpperCase(), invoiceDetailsY);
  
  // Payment Terms might be multi-line
  addText('Payment Terms', rightColumnX, invoiceDetailsY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_CONTENT_SINGLE });
  const paymentTermsActualYEnd = addText(invoice.termsAndConditions, invoiceValueX, invoiceDetailsY, { 
      fontSize: FONT_SIZE_CONTENT_PRIMARY, 
      lineHeight: LH_CONTENT_PACKED, // Use packed for multi-line
      maxWidth: sharedMaxWidth - invoiceLabelWidth 
  });
  invoiceDetailsY = paymentTermsActualYEnd; // This includes spacingAfter if any was in addText for terms

  yPos = Math.max(exporterY, invoiceDetailsY);
  yPos += SPACE_AFTER_BLOCK_HEADER;

  // --- 3. First Horizontal Line ---
  doc.setLineWidth(0.2);
  doc.line(PAGE_MARGIN_SIDES, yPos, pageWidth - PAGE_MARGIN_SIDES, yPos);
  yPos += SPACE_AFTER_HORIZONTAL_LINE;

  // --- 4. Consignee/Buyer (Left) & Notify Party (Right) ---
  let consigneeY = yPos;
  let notifyPartyY = yPos;

  consigneeY = addText('CONSIGNEE / BUYER:', leftColumnX, consigneeY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_CONTENT_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING });
  consigneeY = addText(client.companyName, leftColumnX, consigneeY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, fontWeight: 'bold', lineHeight: LH_CONTENT_PACKED, spacingAfter: MINIMAL_INTERNAL_SPACING, maxWidth: sharedMaxWidth });
  consigneeY = addText(`${client.address}\n${client.city}, ${client.country} - ${client.pinCode}`, leftColumnX, consigneeY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: 0, maxWidth: sharedMaxWidth });

  notifyPartyY = addText('NOTIFY PARTY:', rightColumnX, notifyPartyY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_CONTENT_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING });
  if (invoice.notifyPartyLine1 || invoice.notifyPartyLine2) {
    if (invoice.notifyPartyLine1) {
      notifyPartyY = addText(invoice.notifyPartyLine1, rightColumnX, notifyPartyY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: invoice.notifyPartyLine2 ? MINIMAL_INTERNAL_SPACING : 0, maxWidth: sharedMaxWidth });
    }
    if (invoice.notifyPartyLine2) {
      notifyPartyY = addText(invoice.notifyPartyLine2, rightColumnX, notifyPartyY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, spacingAfter: 0, maxWidth: sharedMaxWidth });
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
  const shipmentLabelValueXOffset = 35;

  const drawShipmentDetailRow = (label1: string, value1: string, label2: string, value2: string, currentY: number) => {
    let maxYForThisRow = currentY;
    
    addText(label1, leftColumnX, currentY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_CONTENT_SINGLE});
    const yAfterVal1 = addText(value1, leftColumnX + shipmentLabelValueXOffset, currentY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, maxWidth: sharedMaxWidth - shipmentLabelValueXOffset });
    maxYForThisRow = Math.max(maxYForThisRow, yAfterVal1 - (LH_CONTENT_PACKED - FONT_SIZE_CONTENT_PRIMARY));


    if (label2 && value2) {
      addText(label2, rightColumnX, currentY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', lineHeight: LH_CONTENT_SINGLE});
      const yAfterVal2 = addText(value2, rightColumnX + shipmentLabelValueXOffset, currentY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, lineHeight: LH_CONTENT_PACKED, maxWidth: sharedMaxWidth - shipmentLabelValueXOffset });
      maxYForThisRow = Math.max(maxYForThisRow, yAfterVal2 - (LH_CONTENT_PACKED - FONT_SIZE_CONTENT_PRIMARY));
    }
    return maxYForThisRow + MINIMAL_INTERNAL_SPACING;
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
    headStyles: { fillColor: [220, 220, 220], textColor: [0,0,0], fontStyle: 'bold', halign: 'center', fontSize: FONT_SIZE_TABLE_HEAD, cellPadding: 0.5, minCellHeight: FONT_SIZE_TABLE_HEAD + 0.5 },
    bodyStyles: { fontSize: FONT_SIZE_TABLE_BODY, cellPadding: 0.5, minCellHeight: FONT_SIZE_TABLE_BODY + 0.5 },
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
  addText('Sub Total:', totalsLabelX, totalsY, { fontSize: FONT_SIZE_FOOTER_TEXT, fontWeight: 'normal', lineHeight: LH_FOOTER_SINGLE, align:'left'});
  addText((invoice.subTotal || 0).toFixed(2), totalsValueX, totalsY, { fontSize: FONT_SIZE_FOOTER_TEXT, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, align:'right'});
  totalsY += LH_FOOTER_SINGLE;

  if (invoice.discount > 0) {
    addText('Discount:', totalsLabelX, totalsY, { fontSize: FONT_SIZE_FOOTER_TEXT, fontWeight: 'normal', lineHeight: LH_FOOTER_SINGLE, align:'left'});
    addText(invoice.discount.toFixed(2), totalsValueX, totalsY, { fontSize: FONT_SIZE_FOOTER_TEXT, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, align:'right'});
    totalsY += LH_FOOTER_SINGLE;
  }
  if (invoice.freight > 0) {
    addText('Freight:', totalsLabelX, totalsY, { fontSize: FONT_SIZE_FOOTER_TEXT, fontWeight: 'normal', lineHeight: LH_FOOTER_SINGLE, align:'left'});
    addText(invoice.freight.toFixed(2), totalsValueX, totalsY, { fontSize: FONT_SIZE_FOOTER_TEXT, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, align:'right'});
    totalsY += LH_FOOTER_SINGLE;
  }

  addText('Grand Total:', totalsLabelX, totalsY, { fontSize: FONT_SIZE_FOOTER_TEXT, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, align:'left'});
  addText((invoice.grandTotal || 0).toFixed(2), totalsValueX, totalsY, { fontSize: FONT_SIZE_FOOTER_TEXT, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, align:'right'});
  yPos = totalsY + SPACE_AFTER_TOTALS;


  // --- 9. Total Invoice Amount in Words ---
  yPos = addText(`Total Invoice amount (in words):`, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING }); // Reverted MINIMAL_INTERNAL_SPACING to 0.25 (footer was not meant to change)
  const amountInWordsStr = amountToWords(invoice.grandTotal || 0, invoice.currencyType);
  yPos = addText(amountInWordsStr, leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_PACKED, spacingAfter: SPACE_BETWEEN_FOOTER_BLOCKS, maxWidth: pageWidth - (2 * PAGE_MARGIN_SIDES) });
  
  // --- 10. Note ---
  if (invoice.note) {
    yPos = addText('Note:', leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING });
    yPos = addText(invoice.note.replace(/<br>/g, '\n'), leftColumnX, yPos, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_PACKED, spacingAfter: SPACE_BETWEEN_FOOTER_BLOCKS, maxWidth: pageWidth - (2 * PAGE_MARGIN_SIDES) });
  }

  // --- 11. Beneficiary Bank Details ---
  if (selectedBank) {
    let bankDetailsStartY = yPos;
    bankDetailsStartY = addText('BENEFICIARY BANK DETAILS:', leftColumnX, bankDetailsStartY, { fontSize: FONT_SIZE_FOOTER_TEXT, fontWeight: 'bold', lineHeight: LH_FOOTER_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING });
    
    bankDetailsStartY = addText(`BANK NAME: ${selectedBank.bankName}`, leftColumnX, bankDetailsStartY, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING });
    
    const bankAddrLabel = "BANK ADDRESS: ";
    const bankAddrValueX = leftColumnX + doc.getTextWidth(bankAddrLabel) + 0.5;
    addText(bankAddrLabel, leftColumnX, bankDetailsStartY, {fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_PACKED}); // No spacingAfter here
    bankDetailsStartY = addText(selectedBank.bankAddress, bankAddrValueX, bankDetailsStartY, {
        fontSize: FONT_SIZE_FOOTER_TEXT,
        lineHeight: LH_FOOTER_PACKED, // Use packed for multi-line
        spacingAfter: MINIMAL_INTERNAL_SPACING, // Add spacing after the address block
        maxWidth: pageWidth - bankAddrValueX - PAGE_MARGIN_SIDES
    });

    bankDetailsStartY = addText(`ACCOUNT NO: ${selectedBank.accountNumber}`, leftColumnX, bankDetailsStartY, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING });
    bankDetailsStartY = addText(`SWIFT CODE: ${selectedBank.swiftCode}`, leftColumnX, bankDetailsStartY, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_SINGLE, spacingAfter: MINIMAL_INTERNAL_SPACING });
    bankDetailsStartY = addText(`IFSC CODE: ${selectedBank.ifscCode}`, leftColumnX, bankDetailsStartY, { fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_SINGLE, spacingAfter: 0 });
    yPos = bankDetailsStartY + SPACE_BETWEEN_FOOTER_BLOCKS;
  }

  // --- 12. Signature ---
  const signatureBlockHeight = LH_FOOTER_SINGLE * 2 + SPACE_BEFORE_SIGNATURE_BLOCK; // Approx height for "For CompanyName" and "Auth Sign"
  const availableSpaceBottom = doc.internal.pageSize.getHeight() - yPos - PAGE_MARGIN_TOP;

  if (availableSpaceBottom < signatureBlockHeight) {
      doc.addPage();
      yPos = PAGE_MARGIN_TOP + SPACE_BEFORE_SIGNATURE_BLOCK;
  } else {
    yPos += SPACE_BEFORE_SIGNATURE_BLOCK;
  }

  const signatureX = pageWidth - PAGE_MARGIN_SIDES - 70;
  const signatureLineWidth = 60;
  
  yPos = addText(`For ${exporter.companyName}`, signatureX + signatureLineWidth / 2, yPos, { fontWeight: 'bold', align: 'center', fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_SINGLE, spacingAfter: LH_FOOTER_SINGLE * 0.3 }); // Tighter spacing
  doc.line(signatureX, yPos, signatureX + signatureLineWidth, yPos);
  yPos += (LH_FOOTER_SINGLE * 0.5); // Space between line and "Authorized Signatory"
  addText('Authorized Signatory', signatureX + signatureLineWidth / 2, yPos, { align: 'center', fontSize: FONT_SIZE_FOOTER_TEXT, lineHeight: LH_FOOTER_SINGLE});

  doc.save(`Performa_Invoice_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
}
