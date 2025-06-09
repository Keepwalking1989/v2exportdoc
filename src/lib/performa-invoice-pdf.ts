
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

// Constants for PDF layout
const PAGE_MARGIN_TOP = 10; // Reduced top margin
const PAGE_MARGIN_SIDES = 15;
const MINIMAL_SPACING = 1; // Smallest explicit space after a block

// Font sizes
const FONT_SIZE_NORMAL = 9;
const FONT_SIZE_SMALL = 8; // For table content and some details
const FONT_SIZE_LARGE_TITLE = 14; // For "PERFORMA INVOICE"
const FOOTER_FONT_SIZE = 8;

// Line heights (generally font size + a small buffer)
const LINE_HEIGHT_NORMAL = FONT_SIZE_NORMAL + 1;
const LINE_HEIGHT_SMALL_TABLE = FONT_SIZE_SMALL + 1; // For table content
const LINE_HEIGHT_LARGE_TITLE = FONT_SIZE_LARGE_TITLE + 1;
const FOOTER_LINE_HEIGHT = FOOTER_FONT_SIZE + 1;
const FOOTER_MINIMAL_SPACING = 1;


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
    const fontSize = options.fontSize || FONT_SIZE_NORMAL;
    const fontStyle = options.fontStyle || 'normal'; // Default fontStyle to 'normal'
    const fontWeight = options.fontWeight || 'normal'; // Default fontWeight to 'normal'
    const effectiveLineHeight = options.lineHeight || (fontSize + 1); // Default line height based on font size
    const align = options.align || 'left';
    
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontWeight === 'bold' ? 'bold' : fontStyle); // Use helvetica, manage bold via fontWeight

    let newY = currentY;
    const textToProcess = Array.isArray(text) ? text : [text];

    textToProcess.forEach(lineContent => {
        const textWidth = doc.getTextWidth(lineContent);
        let actualX = x;
        if (align === 'center') {
            actualX = (doc.internal.pageSize.getWidth() / 2); // Center based on page width
        } else if (align === 'right') {
            actualX = x - textWidth; // x is the right edge
        }
        doc.text(lineContent, actualX, newY, { align: align === 'center' ? 'center' : 'left' }); // Pass align to doc.text for center
        newY += effectiveLineHeight;
    });
    
    return newY + (options.spacingAfter || 0);
  };
  
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header: PERFORMA INVOICE
  yPos = addText('PERFORMA INVOICE', pageWidth / 2, yPos, { 
    align: 'center', 
    fontSize: FONT_SIZE_LARGE_TITLE, 
    fontWeight: 'bold', 
    spacingAfter: LINE_HEIGHT_NORMAL, 
    lineHeight: LINE_HEIGHT_LARGE_TITLE 
  }); 

  // Exporter Details (Left)
  const exporterStartY = yPos;
  yPos = addText('EXPORTER:', PAGE_MARGIN_SIDES, yPos, { fontSize: FONT_SIZE_NORMAL, fontWeight: 'bold', spacingAfter: MINIMAL_SPACING, lineHeight: LINE_HEIGHT_NORMAL });
  yPos = addText(exporter.companyName, PAGE_MARGIN_SIDES, yPos, { fontSize: FONT_SIZE_NORMAL, fontWeight: 'bold', spacingAfter: MINIMAL_SPACING, lineHeight: LINE_HEIGHT_NORMAL });
  const exporterAddressLines = doc.splitTextToSize(exporter.address, (pageWidth / 2) - PAGE_MARGIN_SIDES * 1.5); 
  yPos = addText(exporterAddressLines, PAGE_MARGIN_SIDES, yPos, { fontSize: FONT_SIZE_NORMAL, lineHeight: LINE_HEIGHT_NORMAL, spacingAfter: MINIMAL_SPACING });
  yPos = addText(`TEL: ${exporter.phoneNumber}`, PAGE_MARGIN_SIDES, yPos, { fontSize: FONT_SIZE_NORMAL, lineHeight: LINE_HEIGHT_NORMAL, spacingAfter: MINIMAL_SPACING });
  yPos = addText(`IEC NO: ${exporter.iecNumber}`, PAGE_MARGIN_SIDES, yPos, { fontSize: FONT_SIZE_NORMAL, lineHeight: LINE_HEIGHT_NORMAL, spacingAfter: 0 }); 
  const exporterYAfter = yPos;

  // Invoice Details (Right)
  let invoiceDetailsYPos = exporterStartY; 
  const rightColumnX = pageWidth / 2 + 5; 
  const labelWidth = 30; 
  const valueIndent = 1; 

  const addDetailRow = (label: string, value: string, currentY: number, options: {isMultiLine?: boolean, valueMaxWidth?: number, labelFontWeight?: string, valueFontWeight?: string, itemLineHeight?: number } = {}) => {
    const itemLineHeight = options.itemLineHeight || LINE_HEIGHT_NORMAL;
    doc.setFontSize(FONT_SIZE_NORMAL);
    doc.setFont('helvetica', options.labelFontWeight || 'bold');
    doc.text(label, rightColumnX, currentY);
    doc.setFont('helvetica', options.valueFontWeight || 'normal');
    
    if (options.isMultiLine && options.valueMaxWidth) {
        const valueLines = doc.splitTextToSize(value, options.valueMaxWidth);
        let lineY = currentY;
        valueLines.forEach((line: string) => {
            doc.text(line, rightColumnX + labelWidth + valueIndent, lineY);
            lineY += itemLineHeight; 
        });
        return lineY; 
    } else {
        doc.text(value, rightColumnX + labelWidth + valueIndent, currentY);
        return currentY + itemLineHeight; 
    }
  };

  invoiceDetailsYPos = addDetailRow('Invoice No.', invoice.invoiceNumber, invoiceDetailsYPos, { itemLineHeight: LINE_HEIGHT_NORMAL });
  invoiceDetailsYPos = addDetailRow('Date', format(new Date(invoice.invoiceDate), 'dd/MM/yyyy'), invoiceDetailsYPos, { itemLineHeight: LINE_HEIGHT_NORMAL });
  invoiceDetailsYPos = addDetailRow('Currency', invoice.currencyType.toUpperCase(), invoiceDetailsYPos, { itemLineHeight: LINE_HEIGHT_NORMAL });
  
  const paymentTermsValueX = rightColumnX + labelWidth + valueIndent;
  const paymentTermsMaxWidth = pageWidth - paymentTermsValueX - PAGE_MARGIN_SIDES;
  invoiceDetailsYPos = addDetailRow('Payment Terms', invoice.termsAndConditions, invoiceDetailsYPos, {
    isMultiLine: true, 
    valueMaxWidth: paymentTermsMaxWidth,
    itemLineHeight: LINE_HEIGHT_NORMAL 
  });
  
  const invoiceDetailsYAfter = invoiceDetailsYPos;

  yPos = Math.max(exporterYAfter, invoiceDetailsYAfter) + LINE_HEIGHT_NORMAL / 2; 

  // Horizontal Line
  doc.setLineWidth(0.2); 
  doc.line(PAGE_MARGIN_SIDES, yPos, pageWidth - PAGE_MARGIN_SIDES, yPos);
  yPos += LINE_HEIGHT_NORMAL / 2; 

  // Consignee/Buyer Details (Left)
  const consigneeStartY = yPos;
  yPos = addText('CONSIGNEE / BUYER:', PAGE_MARGIN_SIDES, yPos, { fontSize: FONT_SIZE_NORMAL, fontWeight: 'bold', spacingAfter: MINIMAL_SPACING, lineHeight: LINE_HEIGHT_NORMAL });
  yPos = addText(client.companyName, PAGE_MARGIN_SIDES, yPos, { fontSize: FONT_SIZE_NORMAL, fontWeight: 'bold', spacingAfter: MINIMAL_SPACING, lineHeight: LINE_HEIGHT_NORMAL });
  const clientAddressLines = doc.splitTextToSize(client.address, (pageWidth / 2) - PAGE_MARGIN_SIDES * 1.5);
  yPos = addText(clientAddressLines, PAGE_MARGIN_SIDES, yPos, { fontSize: FONT_SIZE_NORMAL, lineHeight: LINE_HEIGHT_NORMAL, spacingAfter: MINIMAL_SPACING });
  yPos = addText(`${client.city}, ${client.country} - ${client.pinCode}`, PAGE_MARGIN_SIDES, yPos, { fontSize: FONT_SIZE_NORMAL, lineHeight: LINE_HEIGHT_NORMAL, spacingAfter: 0 });
  const consigneeYAfter = yPos;

  // Notify Party Details (Right)
  let notifyPartyYPos = consigneeStartY; 
  notifyPartyYPos = addText('NOTIFY PARTY:', rightColumnX, notifyPartyYPos, { fontSize: FONT_SIZE_NORMAL, fontWeight: 'bold', spacingAfter: MINIMAL_SPACING, lineHeight: LINE_HEIGHT_NORMAL });
  if (invoice.notifyPartyLine1 || invoice.notifyPartyLine2) {
    if (invoice.notifyPartyLine1) {
        notifyPartyYPos = addText(invoice.notifyPartyLine1, rightColumnX, notifyPartyYPos, { fontSize: FONT_SIZE_NORMAL, lineHeight: LINE_HEIGHT_NORMAL, spacingAfter: invoice.notifyPartyLine2 ? MINIMAL_SPACING : 0 });
    }
    if (invoice.notifyPartyLine2) {
        notifyPartyYPos = addText(invoice.notifyPartyLine2, rightColumnX, notifyPartyYPos, { fontSize: FONT_SIZE_NORMAL, lineHeight: LINE_HEIGHT_NORMAL, spacingAfter: 0 });
    }
  } else {
      notifyPartyYPos = addText("SAME AS CONSIGNEE", rightColumnX, notifyPartyYPos, { fontSize: FONT_SIZE_NORMAL, spacingAfter: 0, lineHeight: LINE_HEIGHT_NORMAL });
  }
  const notifyPartyYAfter = notifyPartyYPos;
  
  yPos = Math.max(consigneeYAfter, notifyPartyYAfter);
  yPos += LINE_HEIGHT_NORMAL / 2; // Margin before the line

  // Horizontal Line (ensure yPos is tight before drawing this line)
  doc.line(PAGE_MARGIN_SIDES, yPos, pageWidth - PAGE_MARGIN_SIDES, yPos);
  yPos += LINE_HEIGHT_NORMAL / 2; // Margin after the line, before shipment details

  // Shipment Details (spanning width, split into columns)
  const shipmentCol1X = PAGE_MARGIN_SIDES;
  const shipmentCol2X = rightColumnX; 
  const shipmentLabelOffset = 35; 

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

  currentYLeftCol += LINE_HEIGHT_NORMAL; 
  currentYRightCol += LINE_HEIGHT_NORMAL;

  doc.setFont('helvetica', 'bold');
  doc.text('Container Details:', shipmentCol1X, currentYLeftCol);
  doc.setFont('helvetica', 'normal');
  doc.text(`${invoice.totalContainer} x ${invoice.containerSize}`, shipmentCol1X + shipmentLabelOffset, currentYLeftCol);

  doc.setFont('helvetica', 'bold');
  doc.text('Total Gross Wt:', shipmentCol2X, currentYRightCol);
  doc.setFont('helvetica', 'normal');
  doc.text(`${invoice.totalGrossWeight} KGS`, shipmentCol2X + shipmentLabelOffset, currentYRightCol);

  yPos = Math.max(currentYLeftCol, currentYRightCol) + LINE_HEIGHT_NORMAL; 


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
    headStyles: { fillColor: [220, 220, 220], textColor: [0,0,0], fontStyle: 'bold', halign: 'center', fontSize: FONT_SIZE_SMALL, cellPadding: 1, minCellHeight: LINE_HEIGHT_SMALL_TABLE }, 
    bodyStyles: { fontSize: FONT_SIZE_SMALL, cellPadding: 1, minCellHeight: LINE_HEIGHT_SMALL_TABLE }, 
    columnStyles: tableColumnStyles,
    didDrawPage: (data) => {
       // yPos = data.cursor?.y || yPos; 
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + FOOTER_MINIMAL_SPACING + 2; // Add a bit more space after table

  // Totals Section
  const totalsXValue = pageWidth - PAGE_MARGIN_SIDES; 
  const totalsXLabel = totalsXValue - 55; 
  
  const addTotalRowPdf = (label: string, value: string | number, currentTableY: number, isBold: boolean = false) => {
    doc.setFontSize(FOOTER_FONT_SIZE); 
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.text(label, totalsXLabel, currentTableY, {align: 'left'});
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.text(typeof value === 'number' ? value.toFixed(2) : value, totalsXValue, currentTableY, {align: 'right'});
    return currentTableY + FOOTER_LINE_HEIGHT; 
  }

  yPos = addTotalRowPdf('Sub Total:', invoice.subTotal || 0, yPos);
  if (invoice.discount > 0) {
    yPos = addTotalRowPdf('Discount:', invoice.discount, yPos);
  }
  if (invoice.freight > 0) {
    yPos = addTotalRowPdf('Freight:', invoice.freight, yPos);
  }
  yPos = addTotalRowPdf('Grand Total:', invoice.grandTotal || 0, yPos, true); 
  yPos += FOOTER_LINE_HEIGHT / 2;


  // Total Invoice Amount in Words
  yPos = addText(`Total Invoice amount (in words):`, PAGE_MARGIN_SIDES, yPos, { fontSize: FOOTER_FONT_SIZE, fontWeight: 'bold', spacingAfter: FOOTER_MINIMAL_SPACING, lineHeight: FOOTER_LINE_HEIGHT });
  const amountInWordsStr = amountToWords(invoice.grandTotal || 0, invoice.currencyType);
  const amountWordsLines = doc.splitTextToSize(amountInWordsStr, pageWidth - 2 * PAGE_MARGIN_SIDES);
  yPos = addText(amountWordsLines, PAGE_MARGIN_SIDES, yPos, { fontSize: FOOTER_FONT_SIZE, lineHeight: FOOTER_LINE_HEIGHT, spacingAfter: FOOTER_LINE_HEIGHT / 2 }); 
  
  // Note
  if (invoice.note) {
    yPos = addText('Note:', PAGE_MARGIN_SIDES, yPos, { fontSize: FOOTER_FONT_SIZE, fontWeight: 'bold', spacingAfter: FOOTER_MINIMAL_SPACING, lineHeight: FOOTER_LINE_HEIGHT });
    const noteLines = doc.splitTextToSize(invoice.note.replace(/<br>/g, '\n'), pageWidth - 2 * PAGE_MARGIN_SIDES);
    yPos = addText(noteLines, PAGE_MARGIN_SIDES, yPos, { fontSize: FOOTER_FONT_SIZE, lineHeight: FOOTER_LINE_HEIGHT, spacingAfter: FOOTER_LINE_HEIGHT / 2 });
  }

  // Beneficiary Bank Details
  if (selectedBank) {
    yPos = addText('BENEFICIARY BANK DETAILS:', PAGE_MARGIN_SIDES, yPos, { fontSize: FOOTER_FONT_SIZE, fontWeight: 'bold', spacingAfter: FOOTER_MINIMAL_SPACING, lineHeight: FOOTER_LINE_HEIGHT });
    yPos = addText(`BANK NAME: ${selectedBank.bankName}`, PAGE_MARGIN_SIDES, yPos, { fontSize: FOOTER_FONT_SIZE, lineHeight: FOOTER_LINE_HEIGHT, spacingAfter: FOOTER_MINIMAL_SPACING });
    
    const bankAddrLabel = "BANK ADDRESS: ";
    const bankAddrValueX = PAGE_MARGIN_SIDES + doc.getTextWidth(bankAddrLabel) + 0.5; 
    const bankAddrMaxWidth = pageWidth - bankAddrValueX - PAGE_MARGIN_SIDES;

    doc.setFontSize(FOOTER_FONT_SIZE);
    doc.setFont('helvetica', 'normal');
    doc.text(bankAddrLabel, PAGE_MARGIN_SIDES, yPos);

    const bankAddressLines = doc.splitTextToSize(selectedBank.bankAddress, bankAddrMaxWidth);
    let bankAddrY = yPos;
    bankAddressLines.forEach((line: string) => {
        doc.text(line, bankAddrValueX, bankAddrY);
        bankAddrY += FOOTER_LINE_HEIGHT;
    });
    yPos = bankAddrY + FOOTER_MINIMAL_SPACING; 

    yPos = addText(`ACCOUNT NO: ${selectedBank.accountNumber}`, PAGE_MARGIN_SIDES, yPos, { fontSize: FOOTER_FONT_SIZE, lineHeight: FOOTER_LINE_HEIGHT, spacingAfter: FOOTER_MINIMAL_SPACING });
    yPos = addText(`SWIFT CODE: ${selectedBank.swiftCode}`, PAGE_MARGIN_SIDES, yPos, { fontSize: FOOTER_FONT_SIZE, lineHeight: FOOTER_LINE_HEIGHT, spacingAfter: FOOTER_MINIMAL_SPACING });
    yPos = addText(`IFSC CODE: ${selectedBank.ifscCode}`, PAGE_MARGIN_SIDES, yPos, { fontSize: FOOTER_FONT_SIZE, lineHeight: FOOTER_LINE_HEIGHT, spacingAfter: FOOTER_LINE_HEIGHT }); 
  }

  // Signature
  const signatureX = pageWidth - PAGE_MARGIN_SIDES - 60; 
  let finalYPos = yPos;
  const signatureBlockHeight = FOOTER_LINE_HEIGHT * 3; 
  
  if (finalYPos > doc.internal.pageSize.getHeight() - PAGE_MARGIN_TOP - signatureBlockHeight - 10) { 
      doc.addPage();
      finalYPos = PAGE_MARGIN_TOP; 
  } else {
    finalYPos += FOOTER_LINE_HEIGHT; 
  }

  finalYPos = addText(`For ${exporter.companyName}`, signatureX + 30, finalYPos, { fontWeight: 'bold', align: 'center', fontSize: FOOTER_FONT_SIZE, spacingAfter: FOOTER_LINE_HEIGHT * 2, lineHeight: FOOTER_LINE_HEIGHT }); 
  doc.line(signatureX, finalYPos, signatureX + 60, finalYPos); 
  finalYPos += (FOOTER_LINE_HEIGHT * 0.8); 
  addText('Authorized Signatory', signatureX + 30, finalYPos, { align: 'center', fontSize: FOOTER_FONT_SIZE, lineHeight: FOOTER_LINE_HEIGHT});


  doc.save(`Performa_Invoice_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
}
