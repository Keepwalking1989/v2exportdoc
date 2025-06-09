
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

// Constants for PDF layout - Adjusted for compactness
const PAGE_MARGIN_TOP = 10;
const PAGE_MARGIN_SIDES = 15;
const BASE_LINE_HEIGHT = 5; // Reduced
const COMPACT_LINE_HEIGHT = 4; // Reduced
const FONT_SIZE_NORMAL = 10;
const FONT_SIZE_SMALL = 8;
const FONT_SIZE_LARGE = 12;
const MINIMAL_SPACING = 1; // For very tight layouts

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

  const addText = (text: string | string[], x: number, currentY: number, options: any = {}) => {
    doc.setFontSize(options.fontSize || FONT_SIZE_NORMAL);
    doc.setFont(options.fontStyle || 'normal', options.fontWeight || 'normal'); // Added fontWeight
    let newY = currentY;
    const lineHeight = options.lineHeight || BASE_LINE_HEIGHT;
    if (Array.isArray(text)) {
        text.forEach(line => {
            doc.text(line, x, newY);
            newY += lineHeight;
        });
    } else {
        doc.text(text, x, newY);
        newY += lineHeight;
    }
    return newY + (options.spacingAfter || 0);
  };
  
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header: PERFORMA INVOICE
  doc.setFontSize(FONT_SIZE_LARGE + 2); // Slightly reduced
  doc.setFont('helvetica', 'bold');
  yPos = addText('PERFORMA INVOICE', pageWidth / 2, yPos, { align: 'center', spacingAfter: BASE_LINE_HEIGHT, lineHeight: BASE_LINE_HEIGHT }); 
  doc.setFont('helvetica', 'normal'); 

  // Exporter Details (Left)
  const exporterStartY = yPos;
  doc.setFontSize(FONT_SIZE_NORMAL);
  yPos = addText('EXPORTER:', PAGE_MARGIN_SIDES, yPos, { fontSize: FONT_SIZE_NORMAL, fontWeight: 'bold', spacingAfter: MINIMAL_SPACING, lineHeight: COMPACT_LINE_HEIGHT });
  yPos = addText(exporter.companyName, PAGE_MARGIN_SIDES, yPos, { fontSize: FONT_SIZE_NORMAL, fontWeight: 'bold', spacingAfter: MINIMAL_SPACING, lineHeight: COMPACT_LINE_HEIGHT });
  const exporterAddressLines = doc.splitTextToSize(exporter.address, (pageWidth / 2) - PAGE_MARGIN_SIDES * 2);
  yPos = addText(exporterAddressLines, PAGE_MARGIN_SIDES, yPos, { lineHeight: COMPACT_LINE_HEIGHT, spacingAfter: MINIMAL_SPACING });
  yPos = addText(`TEL: ${exporter.phoneNumber}`, PAGE_MARGIN_SIDES, yPos, {lineHeight: COMPACT_LINE_HEIGHT, spacingAfter: MINIMAL_SPACING });
  yPos = addText(`IEC NO: ${exporter.iecNumber}`, PAGE_MARGIN_SIDES, yPos, {lineHeight: COMPACT_LINE_HEIGHT, spacingAfter: BASE_LINE_HEIGHT / 2}); 
  const exporterYAfter = yPos;


  // Invoice Details (Right)
  let invoiceDetailsYPos = exporterStartY; 
  const rightColumnX = pageWidth / 2 + 5; // Adjusted slightly
  const labelWidth = 30; // Reduced
  const valueIndent = 3; // Reduced

  const addDetailRow = (label: string, value: string, currentY: number, options: {isMultiLine?: boolean, valueMaxWidth?: number, labelFontWeight?: string, valueFontWeight?: string, lineHeight?: number} = {}) => {
    const effectiveLineHeight = options.lineHeight || COMPACT_LINE_HEIGHT;
    doc.setFontSize(FONT_SIZE_NORMAL);
    doc.setFont('helvetica', options.labelFontWeight || 'bold');
    doc.text(label, rightColumnX, currentY);
    doc.setFont('helvetica', options.valueFontWeight || 'normal');
    
    if (options.isMultiLine && options.valueMaxWidth) {
        const valueLines = doc.splitTextToSize(value, options.valueMaxWidth);
        let lineY = currentY;
        valueLines.forEach((line: string) => {
            doc.text(line, rightColumnX + labelWidth + valueIndent, lineY);
            lineY += effectiveLineHeight;
        });
        return lineY; 
    } else {
        doc.text(value, rightColumnX + labelWidth + valueIndent, currentY);
        return currentY + effectiveLineHeight; 
    }
  };

  invoiceDetailsYPos = addDetailRow('Invoice No.', invoice.invoiceNumber, invoiceDetailsYPos, {lineHeight: COMPACT_LINE_HEIGHT});
  invoiceDetailsYPos = addDetailRow('Date', format(new Date(invoice.invoiceDate), 'dd/MM/yyyy'), invoiceDetailsYPos, {lineHeight: COMPACT_LINE_HEIGHT});
  invoiceDetailsYPos = addDetailRow('Currency', invoice.currencyType.toUpperCase(), invoiceDetailsYPos, {lineHeight: COMPACT_LINE_HEIGHT});
  
  const paymentTermsValueX = rightColumnX + labelWidth + valueIndent;
  const paymentTermsMaxWidth = pageWidth - paymentTermsValueX - PAGE_MARGIN_SIDES;
  invoiceDetailsYPos = addDetailRow('Payment Terms', invoice.termsAndConditions, invoiceDetailsYPos, {
    isMultiLine: true, 
    valueMaxWidth: paymentTermsMaxWidth,
    lineHeight: COMPACT_LINE_HEIGHT // Ensure compact line height for multi-line terms
  });
  
  const invoiceDetailsYAfter = invoiceDetailsYPos;

  yPos = Math.max(exporterYAfter, invoiceDetailsYAfter); 

  // Horizontal Line
  doc.setLineWidth(0.3); // Thinner line
  doc.line(PAGE_MARGIN_SIDES, yPos, pageWidth - PAGE_MARGIN_SIDES, yPos);
  yPos += COMPACT_LINE_HEIGHT; // Reduced space after line

  // Consignee/Buyer Details (Left)
  const consigneeStartY = yPos;
  doc.setFontSize(FONT_SIZE_NORMAL);
  yPos = addText('CONSIGNEE / BUYER:', PAGE_MARGIN_SIDES, yPos, {fontWeight: 'bold', spacingAfter: MINIMAL_SPACING, lineHeight: COMPACT_LINE_HEIGHT});
  yPos = addText(client.companyName, PAGE_MARGIN_SIDES, yPos, {fontWeight: 'bold', spacingAfter: MINIMAL_SPACING, lineHeight: COMPACT_LINE_HEIGHT});
  const clientAddressLines = doc.splitTextToSize(client.address, (pageWidth / 2) - PAGE_MARGIN_SIDES * 2);
  yPos = addText(clientAddressLines, PAGE_MARGIN_SIDES, yPos, {lineHeight: COMPACT_LINE_HEIGHT, spacingAfter: MINIMAL_SPACING});
  yPos = addText(`${client.city}, ${client.country} - ${client.pinCode}`, PAGE_MARGIN_SIDES, yPos, {lineHeight: COMPACT_LINE_HEIGHT, spacingAfter: MINIMAL_SPACING});
  const consigneeYAfter = yPos;

  // Notify Party Details (Right)
  let notifyPartyYPos = consigneeStartY; 
  notifyPartyYPos = addText('NOTIFY PARTY:', rightColumnX, notifyPartyYPos, {fontWeight: 'bold', spacingAfter: MINIMAL_SPACING, lineHeight: COMPACT_LINE_HEIGHT});
  if (invoice.notifyPartyLine1 || invoice.notifyPartyLine2) {
    if (invoice.notifyPartyLine1) {
        notifyPartyYPos = addText(invoice.notifyPartyLine1, rightColumnX, notifyPartyYPos, {lineHeight: COMPACT_LINE_HEIGHT, spacingAfter: invoice.notifyPartyLine2 ? MINIMAL_SPACING : MINIMAL_SPACING});
    }
    if (invoice.notifyPartyLine2) {
        notifyPartyYPos = addText(invoice.notifyPartyLine2, rightColumnX, notifyPartyYPos, {lineHeight: COMPACT_LINE_HEIGHT, spacingAfter: MINIMAL_SPACING});
    }
  } else {
      notifyPartyYPos = addText("SAME AS CONSIGNEE", rightColumnX, notifyPartyYPos, {spacingAfter: MINIMAL_SPACING, lineHeight: COMPACT_LINE_HEIGHT});
  }
  const notifyPartyYAfter = notifyPartyYPos;
  
  yPos = Math.max(consigneeYAfter, notifyPartyYAfter) + MINIMAL_SPACING; // Add minimal spacing before next line

  // Horizontal Line (ensure yPos is tight before drawing this line)
  doc.line(PAGE_MARGIN_SIDES, yPos, pageWidth - PAGE_MARGIN_SIDES, yPos);
  yPos += COMPACT_LINE_HEIGHT; // Reduced space after line

  // Shipment Details (spanning width, split into columns)
  const shipmentCol1X = PAGE_MARGIN_SIDES;
  const shipmentCol2X = pageWidth / 2 + 5; 
  const shipmentLabelOffset = 30; // Reduced

  let currentYLeftCol = yPos;
  let currentYRightCol = yPos;

  doc.setFontSize(FONT_SIZE_NORMAL);
  doc.setFont('helvetica', 'bold');
  doc.text('Port of Loading:', shipmentCol1X, currentYLeftCol);
  doc.setFont('helvetica', 'normal');
  doc.text('Mundra', shipmentCol1X + shipmentLabelOffset, currentYLeftCol);

  doc.setFont('helvetica', 'bold');
  doc.text('Final Destination:', shipmentCol2X, currentYRightCol);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.finalDestination, shipmentCol2X + shipmentLabelOffset, currentYRightCol);

  currentYLeftCol += COMPACT_LINE_HEIGHT * 1.2; // Use COMPACT_LINE_HEIGHT
  currentYRightCol += COMPACT_LINE_HEIGHT * 1.2;

  doc.setFont('helvetica', 'bold');
  doc.text('Container Details:', shipmentCol1X, currentYLeftCol);
  doc.setFont('helvetica', 'normal');
  doc.text(`${invoice.totalContainer} x ${invoice.containerSize}`, shipmentCol1X + shipmentLabelOffset, currentYLeftCol);

  doc.setFont('helvetica', 'bold');
  doc.text('Total Gross Wt:', shipmentCol2X, currentYRightCol);
  doc.setFont('helvetica', 'normal');
  doc.text(`${invoice.totalGrossWeight} KGS`, shipmentCol2X + shipmentLabelOffset, currentYRightCol);

  yPos = Math.max(currentYLeftCol, currentYRightCol) + BASE_LINE_HEIGHT; // Space before table


  // Product Table
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

  autoTable(doc, {
    head: tableHeader,
    body: tableBody,
    startY: yPos,
    theme: 'grid',
    headStyles: { fillColor: [220, 220, 220], textColor: [0,0,0], fontStyle: 'bold', halign: 'center', fontSize: FONT_SIZE_SMALL, cellPadding: 1 },
    bodyStyles: { fontSize: FONT_SIZE_SMALL, cellPadding: 1 },
    columnStyles: tableColumnStyles,
    didDrawPage: (data) => {
      // yPos = data.cursor?.y || yPos; 
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + BASE_LINE_HEIGHT / 2; // Reduced space

  // Totals Section
  const totalsXValue = pageWidth - PAGE_MARGIN_SIDES; 
  const totalsXLabel = totalsXValue - 55; // Keep enough space for labels
  
  const addTotalRowPdf = (label: string, value: string | number, currentTableY: number, isBold: boolean = false) => {
    doc.setFontSize(FONT_SIZE_SMALL); // Use FONT_SIZE_SMALL for totals
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.text(label, totalsXLabel, currentTableY, {align: 'left'});
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.text(typeof value === 'number' ? value.toFixed(2) : value, totalsXValue, currentTableY, {align: 'right'});
    return currentTableY + COMPACT_LINE_HEIGHT * 1.3; // Tighter line height for totals
  }

  yPos = addTotalRowPdf('Sub Total:', invoice.subTotal || 0, yPos);
  if (invoice.discount > 0) {
    yPos = addTotalRowPdf('Discount:', invoice.discount, yPos);
  }
  if (invoice.freight > 0) {
    yPos = addTotalRowPdf('Freight:', invoice.freight, yPos);
  }
  yPos = addTotalRowPdf('Grand Total:', invoice.grandTotal || 0, yPos, true); // Make Grand Total bold
  yPos += MINIMAL_SPACING;


  // Total Invoice Amount in Words
  const amountInWordsStr = amountToWords(invoice.grandTotal || 0, invoice.currencyType);
  yPos = addText(`Total Invoice amount (in words):`, PAGE_MARGIN_SIDES, yPos, {fontSize: FONT_SIZE_SMALL, fontWeight: 'bold', spacingAfter: MINIMAL_SPACING, lineHeight: COMPACT_LINE_HEIGHT});
  const amountWordsLines = doc.splitTextToSize(amountInWordsStr, pageWidth - 2 * PAGE_MARGIN_SIDES);
  yPos = addText(amountWordsLines, PAGE_MARGIN_SIDES, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: COMPACT_LINE_HEIGHT, spacingAfter: MINIMAL_SPACING }); 
  
  // Note
  if (invoice.note) {
    yPos = addText('Note:', PAGE_MARGIN_SIDES, yPos, { fontSize: FONT_SIZE_SMALL, fontWeight: 'bold', spacingAfter: MINIMAL_SPACING, lineHeight: COMPACT_LINE_HEIGHT });
    const noteLines = doc.splitTextToSize(invoice.note.replace(/<br>/g, '\n'), pageWidth - 2 * PAGE_MARGIN_SIDES);
    yPos = addText(noteLines, PAGE_MARGIN_SIDES, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: COMPACT_LINE_HEIGHT, spacingAfter: BASE_LINE_HEIGHT / 2 });
  }

  // Beneficiary Bank Details
  if (selectedBank) {
    yPos = addText('BENEFICIARY BANK DETAILS:', PAGE_MARGIN_SIDES, yPos, { fontSize: FONT_SIZE_SMALL, fontWeight: 'bold', spacingAfter: MINIMAL_SPACING, lineHeight: COMPACT_LINE_HEIGHT });
    yPos = addText(`BANK NAME: ${selectedBank.bankName}`, PAGE_MARGIN_SIDES, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: COMPACT_LINE_HEIGHT, spacingAfter: MINIMAL_SPACING });
    
    const bankAddrLabel = "BANK ADDRESS: ";
    const bankAddrValueX = PAGE_MARGIN_SIDES + doc.getTextWidth(bankAddrLabel) + 1; 
    const bankAddrMaxWidth = pageWidth - bankAddrValueX - PAGE_MARGIN_SIDES;

    doc.setFontSize(FONT_SIZE_SMALL);
    doc.setFont('helvetica', 'normal');
    doc.text(bankAddrLabel, PAGE_MARGIN_SIDES, yPos);

    const bankAddressLines = doc.splitTextToSize(selectedBank.bankAddress, bankAddrMaxWidth);
    let bankAddrY = yPos;
    bankAddressLines.forEach((line: string) => {
        doc.text(line, bankAddrValueX, bankAddrY);
        bankAddrY += COMPACT_LINE_HEIGHT;
    });
    yPos = bankAddrY + MINIMAL_SPACING; 

    yPos = addText(`ACCOUNT NO: ${selectedBank.accountNumber}`, PAGE_MARGIN_SIDES, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: COMPACT_LINE_HEIGHT, spacingAfter: MINIMAL_SPACING });
    yPos = addText(`SWIFT CODE: ${selectedBank.swiftCode}`, PAGE_MARGIN_SIDES, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: COMPACT_LINE_HEIGHT, spacingAfter: MINIMAL_SPACING });
    yPos = addText(`IFSC CODE: ${selectedBank.ifscCode}`, PAGE_MARGIN_SIDES, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: COMPACT_LINE_HEIGHT, spacingAfter: BASE_LINE_HEIGHT / 2 });
  }

  // Signature
  const signatureX = pageWidth - PAGE_MARGIN_SIDES - 70; // Keep signature area consistent
  let finalYPos = yPos;
  const signatureBlockHeight = 30; // Reduced height needed for signature block
  
  // Check if we need a new page for the signature
  if (finalYPos > doc.internal.pageSize.getHeight() - PAGE_MARGIN_TOP - signatureBlockHeight) { 
      doc.addPage();
      finalYPos = PAGE_MARGIN_TOP; 
  }

  finalYPos = addText(`For ${exporter.companyName}`, signatureX, finalYPos, { fontWeight: 'bold', align: 'center', fontSize: FONT_SIZE_SMALL, spacingAfter: BASE_LINE_HEIGHT * 1.5, lineHeight: COMPACT_LINE_HEIGHT });
  doc.line(signatureX - 20, finalYPos, signatureX + 50, finalYPos); // Adjusted line length
  finalYPos += (COMPACT_LINE_HEIGHT * 0.8);
  addText('Authorized Signatory', signatureX, finalYPos, { align: 'center', fontSize: FONT_SIZE_SMALL, lineHeight: COMPACT_LINE_HEIGHT});


  doc.save(`Performa_Invoice_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
}
