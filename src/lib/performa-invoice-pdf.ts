
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { PerformaInvoice } from '@/types/performa-invoice';
import type { Company } from '@/types/company';
import type { Client } from '@/types/client';
import type { Size } from '@/types/size';
import type { Product } from '@/types/product';
import type { Bank } from '@/types/bank';
import { amountToWords } from '@/lib/utils'; // Import the new utility

// Constants for PDF layout
const PAGE_MARGIN = 15;
const BASE_LINE_HEIGHT = 7; // Base line height
const COMPACT_LINE_HEIGHT = 5; // Reduced line height for addresses
const FONT_SIZE_NORMAL = 10;
const FONT_SIZE_SMALL = 8;
const FONT_SIZE_LARGE = 12;

export function generatePerformaInvoicePdf(
  invoice: PerformaInvoice,
  exporter: Company,
  client: Client,
  allSizes: Size[],
  allProducts: Product[],
  selectedBank?: Bank
) {
  const doc = new jsPDF();

  let yPos = PAGE_MARGIN;

  // Function to add text and return the yPos after the text
  const addText = (text: string | string[], x: number, currentY: number, options: any = {}) => {
    doc.setFontSize(options.fontSize || FONT_SIZE_NORMAL);
    doc.setFont(options.fontStyle || 'normal');
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
  doc.setFontSize(FONT_SIZE_LARGE + 4);
  doc.setFont('helvetica', 'bold');
  yPos = addText('PERFORMA INVOICE', pageWidth / 2, yPos, { align: 'center', spacingAfter: BASE_LINE_HEIGHT, lineHeight: BASE_LINE_HEIGHT }); 
  doc.setFont('helvetica', 'normal'); 

  // Exporter Details (Left)
  const exporterStartY = yPos;
  doc.setFontSize(FONT_SIZE_NORMAL);
  doc.setFont('helvetica', 'bold');
  yPos = addText('EXPORTER:', PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_NORMAL, fontStyle: 'bold', spacingAfter: COMPACT_LINE_HEIGHT / 2, lineHeight: COMPACT_LINE_HEIGHT });
  yPos = addText(exporter.companyName, PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_NORMAL, fontStyle: 'bold', spacingAfter: COMPACT_LINE_HEIGHT / 2, lineHeight: COMPACT_LINE_HEIGHT });
  doc.setFont('helvetica', 'normal');
  const exporterAddressLines = doc.splitTextToSize(exporter.address, (pageWidth / 2) - PAGE_MARGIN * 2);
  yPos = addText(exporterAddressLines, PAGE_MARGIN, yPos, { lineHeight: COMPACT_LINE_HEIGHT, spacingAfter: COMPACT_LINE_HEIGHT / 2 });
  yPos = addText(`TEL: ${exporter.phoneNumber}`, PAGE_MARGIN, yPos, {lineHeight: COMPACT_LINE_HEIGHT, spacingAfter: COMPACT_LINE_HEIGHT / 2 });
  yPos = addText(`IEC NO: ${exporter.iecNumber}`, PAGE_MARGIN, yPos, {lineHeight: COMPACT_LINE_HEIGHT, spacingAfter: BASE_LINE_HEIGHT}); 
  const exporterYAfter = yPos;


  // Invoice Details (Right)
  let invoiceDetailsYPos = exporterStartY; 
  const rightColumnX = pageWidth / 2 + 10;
  const labelWidth = 35; 
  const valueIndent = 5;

  const addDetailRow = (label: string, value: string, yPosition: number, options: {isMultiLine?: boolean, valueMaxWidth?: number} = {}) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, rightColumnX, yPosition);
    doc.setFont('helvetica', 'normal');
    if (options.isMultiLine && options.valueMaxWidth) {
        const valueLines = doc.splitTextToSize(value, options.valueMaxWidth);
        let currentLineY = yPosition;
        valueLines.forEach((line: string) => {
            doc.text(line, rightColumnX + labelWidth + valueIndent, currentLineY);
            currentLineY += COMPACT_LINE_HEIGHT; 
        });
        return currentLineY; 
    } else {
        doc.text(value, rightColumnX + labelWidth + valueIndent, yPosition);
        return yPosition + BASE_LINE_HEIGHT; 
    }
  };

  invoiceDetailsYPos = addDetailRow('Invoice No.', invoice.invoiceNumber, invoiceDetailsYPos);
  invoiceDetailsYPos = addDetailRow('Date', format(new Date(invoice.invoiceDate), 'dd/MM/yyyy'), invoiceDetailsYPos);
  // Exporter Ref. removed
  invoiceDetailsYPos += BASE_LINE_HEIGHT / 2; 
  invoiceDetailsYPos = addDetailRow('Currency', invoice.currencyType.toUpperCase(), invoiceDetailsYPos);
  
  // Payment Terms
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Terms', rightColumnX, invoiceDetailsYPos);
  invoiceDetailsYPos += COMPACT_LINE_HEIGHT ; 
  doc.setFont('helvetica', 'normal');
  const paymentTermsValueX = rightColumnX + labelWidth + valueIndent;
  const paymentTermsMaxWidth = pageWidth - paymentTermsValueX - PAGE_MARGIN;
  const paymentTermsLines = doc.splitTextToSize(invoice.termsAndConditions, paymentTermsMaxWidth);
  paymentTermsLines.forEach((line: string) => {
      doc.text(line, paymentTermsValueX, invoiceDetailsYPos);
      invoiceDetailsYPos += COMPACT_LINE_HEIGHT; 
  });
  
  const invoiceDetailsYAfter = invoiceDetailsYPos;

  yPos = Math.max(exporterYAfter, invoiceDetailsYAfter); 

  // Horizontal Line
  doc.setLineWidth(0.5);
  doc.line(PAGE_MARGIN, yPos, pageWidth - PAGE_MARGIN, yPos);
  yPos += BASE_LINE_HEIGHT;

  // Consignee/Buyer Details (Left)
  const consigneeStartY = yPos;
  doc.setFontSize(FONT_SIZE_NORMAL);
  doc.setFont('helvetica', 'bold');
  yPos = addText('CONSIGNEE / BUYER:', PAGE_MARGIN, yPos, {spacingAfter: COMPACT_LINE_HEIGHT /2, lineHeight: COMPACT_LINE_HEIGHT});
  doc.setFont('helvetica', 'normal');
  yPos = addText(client.companyName, PAGE_MARGIN, yPos, {fontStyle: 'bold', spacingAfter: COMPACT_LINE_HEIGHT /2, lineHeight: COMPACT_LINE_HEIGHT});
  const clientAddressLines = doc.splitTextToSize(client.address, (pageWidth / 2) - PAGE_MARGIN * 2);
  yPos = addText(clientAddressLines, PAGE_MARGIN, yPos, {lineHeight: COMPACT_LINE_HEIGHT, spacingAfter: COMPACT_LINE_HEIGHT /2});
  yPos = addText(`${client.city}, ${client.country} - ${client.pinCode}`, PAGE_MARGIN, yPos, {lineHeight: COMPACT_LINE_HEIGHT, spacingAfter: COMPACT_LINE_HEIGHT / 2}); // Reduced spacingAfter
  const consigneeYAfter = yPos;

  // Notify Party Details (Right)
  let notifyPartyYPos = consigneeStartY; 
  doc.setFont('helvetica', 'bold');
  notifyPartyYPos = addText('NOTIFY PARTY:', rightColumnX, notifyPartyYPos, {spacingAfter: COMPACT_LINE_HEIGHT/2, lineHeight: COMPACT_LINE_HEIGHT});
  doc.setFont('helvetica', 'normal');
  if (invoice.notifyPartyLine1 || invoice.notifyPartyLine2) {
    if (invoice.notifyPartyLine1) {
        notifyPartyYPos = addText(invoice.notifyPartyLine1, rightColumnX, notifyPartyYPos, {lineHeight: COMPACT_LINE_HEIGHT, spacingAfter: invoice.notifyPartyLine2 ? COMPACT_LINE_HEIGHT/2 : COMPACT_LINE_HEIGHT / 2});
    }
    if (invoice.notifyPartyLine2) {
        notifyPartyYPos = addText(invoice.notifyPartyLine2, rightColumnX, notifyPartyYPos, {lineHeight: COMPACT_LINE_HEIGHT, spacingAfter: COMPACT_LINE_HEIGHT / 2});
    }
  } else {
      notifyPartyYPos = addText("SAME AS CONSIGNEE", rightColumnX, notifyPartyYPos, {spacingAfter: COMPACT_LINE_HEIGHT / 2, lineHeight: COMPACT_LINE_HEIGHT});
  }
  const notifyPartyYAfter = notifyPartyYPos;
  
  yPos = Math.max(consigneeYAfter, notifyPartyYAfter);

  // Horizontal Line (ensure yPos is tight before drawing this line)
  doc.line(PAGE_MARGIN, yPos, pageWidth - PAGE_MARGIN, yPos);
  yPos += BASE_LINE_HEIGHT / 2; // Reduced space after line

  // Shipment Details (spanning width, split into columns)
  const shipmentCol1X = PAGE_MARGIN;
  const shipmentCol2X = pageWidth / 2 + 5; 
  const shipmentLabelOffset = 35; 

  let currentYLeftCol = yPos;
  let currentYRightCol = yPos;

  doc.setFont('helvetica', 'bold');
  doc.text('Port of Loading:', shipmentCol1X, currentYLeftCol);
  doc.setFont('helvetica', 'normal');
  doc.text('Mundra', shipmentCol1X + shipmentLabelOffset, currentYLeftCol);

  doc.setFont('helvetica', 'bold');
  doc.text('Final Destination:', shipmentCol2X, currentYRightCol);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.finalDestination, shipmentCol2X + shipmentLabelOffset, currentYRightCol);

  currentYLeftCol += BASE_LINE_HEIGHT;
  currentYRightCol += BASE_LINE_HEIGHT;

  doc.setFont('helvetica', 'bold');
  doc.text('Container Details:', shipmentCol1X, currentYLeftCol);
  doc.setFont('helvetica', 'normal');
  doc.text(`${invoice.totalContainer} x ${invoice.containerSize}`, shipmentCol1X + shipmentLabelOffset, currentYLeftCol);

  doc.setFont('helvetica', 'bold');
  doc.text('Total Gross Wt:', shipmentCol2X, currentYRightCol);
  doc.setFont('helvetica', 'normal');
  doc.text(`${invoice.totalGrossWeight} KGS`, shipmentCol2X + shipmentLabelOffset, currentYRightCol);

  yPos = Math.max(currentYLeftCol, currentYRightCol) + BASE_LINE_HEIGHT;


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

  const tableHeader = [['Sr. No.', 'Description of Goods', 'HSN Code', 'Qty (Boxes)', 'Total SQMT', `Rate/${invoice.currencyType}`, `Amount/${invoice.currencyType}`]];
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
    headStyles: { fillColor: [220, 220, 220], textColor: [0,0,0], fontStyle: 'bold', halign: 'center', fontSize: FONT_SIZE_SMALL },
    bodyStyles: { fontSize: FONT_SIZE_SMALL, cellPadding: 1.5 },
    columnStyles: tableColumnStyles,
    didDrawPage: (data) => {
      // yPos = data.cursor?.y || yPos; 
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + BASE_LINE_HEIGHT;

  // Totals Section
  const totalsXValue = pageWidth - PAGE_MARGIN; 
  const totalsXLabel = totalsXValue - 55;
  
  const addTotalRowPdf = (label: string, value: string | number, currentTableY: number) => {
    doc.setFontSize(FONT_SIZE_SMALL);
    doc.setFont('helvetica', 'bold');
    doc.text(label, totalsXLabel, currentTableY, {align: 'left'});
    doc.setFont('helvetica', 'normal');
    doc.text(typeof value === 'number' ? value.toFixed(2) : value, totalsXValue, currentTableY, {align: 'right'});
    return currentTableY + (COMPACT_LINE_HEIGHT * 1.5); 
  }

  yPos = addTotalRowPdf('Sub Total:', invoice.subTotal || 0, yPos);
  if (invoice.discount > 0) {
    yPos = addTotalRowPdf('Discount:', invoice.discount, yPos);
  }
  if (invoice.freight > 0) {
    yPos = addTotalRowPdf('Freight:', invoice.freight, yPos);
  }
  doc.setFont('helvetica', 'bold');
  yPos = addTotalRowPdf('Grand Total:', invoice.grandTotal || 0, yPos);
  doc.setFont('helvetica', 'normal');
  yPos += BASE_LINE_HEIGHT / 2;


  // Total Invoice Amount in Words
  const amountInWordsStr = amountToWords(invoice.grandTotal || 0, invoice.currencyType);
  doc.setFont('helvetica', 'bold');
  yPos = addText(`Total Invoice amount (in words):`, PAGE_MARGIN, yPos, {fontSize: FONT_SIZE_SMALL, spacingAfter: COMPACT_LINE_HEIGHT / 2, lineHeight: COMPACT_LINE_HEIGHT});
  doc.setFont('helvetica', 'normal');
  const amountWordsLines = doc.splitTextToSize(amountInWordsStr, pageWidth - 2 * PAGE_MARGIN);
  // Using lineHeight COMPACT_LINE_HEIGHT and spacingAfter: COMPACT_LINE_HEIGHT / 2 for tighter spacing
  yPos = addText(amountWordsLines, PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: COMPACT_LINE_HEIGHT * 1.2, spacingAfter: COMPACT_LINE_HEIGHT / 2 }); 
  
  // Note
  if (invoice.note) {
    doc.setFont('helvetica', 'bold');
    yPos = addText('Note:', PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_SMALL, spacingAfter: COMPACT_LINE_HEIGHT / 2, lineHeight: COMPACT_LINE_HEIGHT });
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(invoice.note.replace(/<br>/g, '\n'), pageWidth - 2 * PAGE_MARGIN);
    yPos = addText(noteLines, PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: COMPACT_LINE_HEIGHT, spacingAfter: BASE_LINE_HEIGHT });
  }

  // Beneficiary Bank Details
  if (selectedBank) {
    doc.setFont('helvetica', 'bold');
    yPos = addText('BENEFICIARY BANK DETAILS:', PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_SMALL, spacingAfter: COMPACT_LINE_HEIGHT / 2, lineHeight: COMPACT_LINE_HEIGHT });
    doc.setFont('helvetica', 'normal');
    yPos = addText(`BANK NAME: ${selectedBank.bankName}`, PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: COMPACT_LINE_HEIGHT });
    
    const bankAddrLabel = "BANK ADDRESS: ";
    const bankAddrValueX = PAGE_MARGIN + doc.getTextWidth(bankAddrLabel) +1; 
    const bankAddrMaxWidth = pageWidth - bankAddrValueX - PAGE_MARGIN;

    doc.setFontSize(FONT_SIZE_SMALL);
    doc.text(bankAddrLabel, PAGE_MARGIN, yPos);

    const bankAddressLines = doc.splitTextToSize(selectedBank.bankAddress, bankAddrMaxWidth);
    let bankAddrY = yPos;
    bankAddressLines.forEach((line: string) => {
        doc.text(line, bankAddrValueX, bankAddrY);
        bankAddrY += COMPACT_LINE_HEIGHT;
    });
    yPos = bankAddrY; 

    yPos = addText(`ACCOUNT NO: ${selectedBank.accountNumber}`, PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: COMPACT_LINE_HEIGHT });
    yPos = addText(`SWIFT CODE: ${selectedBank.swiftCode}`, PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: COMPACT_LINE_HEIGHT });
    yPos = addText(`IFSC CODE: ${selectedBank.ifscCode}`, PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: COMPACT_LINE_HEIGHT, spacingAfter: BASE_LINE_HEIGHT });
  }


  // Signature
  const signatureX = pageWidth - PAGE_MARGIN - 70;
  let finalYPos = yPos;
  const signatureBlockHeight = 40; 
  if (finalYPos > doc.internal.pageSize.getHeight() - signatureBlockHeight) { 
      doc.addPage();
      finalYPos = PAGE_MARGIN; 
  } else if (doc.internal.pageSize.getHeight() - finalYPos < signatureBlockHeight) {
      if (doc.internal.pageSize.getHeight() - finalYPos < signatureBlockHeight / 2) {
      } else {
        doc.addPage();
        finalYPos = PAGE_MARGIN;
      }
  }

  doc.setFont('helvetica', 'bold');
  finalYPos = addText(`For ${exporter.companyName}`, signatureX, finalYPos, { align: 'center', fontSize: FONT_SIZE_SMALL, spacingAfter: BASE_LINE_HEIGHT * 2, lineHeight: BASE_LINE_HEIGHT });
  doc.line(signatureX - 25, finalYPos, signatureX + 55, finalYPos); 
  finalYPos += (COMPACT_LINE_HEIGHT);
  doc.setFont('helvetica', 'normal');
  addText('Authorized Signatory', signatureX, finalYPos, { align: 'center', fontSize: FONT_SIZE_SMALL, lineHeight: COMPACT_LINE_HEIGHT});


  doc.save(`Performa_Invoice_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
}

