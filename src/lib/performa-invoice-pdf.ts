
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
const LINE_HEIGHT = 7;
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
    if (Array.isArray(text)) {
        text.forEach(line => {
            doc.text(line, x, newY);
            newY += (options.lineHeight || LINE_HEIGHT);
        });
    } else {
        doc.text(text, x, newY);
        newY += (options.lineHeight || LINE_HEIGHT);
    }
    return newY + (options.spacingAfter || 0);
  };
  
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header: PERFORMA INVOICE
  doc.setFontSize(FONT_SIZE_LARGE + 4);
  doc.setFont('helvetica', 'bold');
  yPos = addText('PERFORMA INVOICE', pageWidth / 2, yPos, { align: 'center', spacingAfter: LINE_HEIGHT }); // Adjusted spacing after
  doc.setFont('helvetica', 'normal'); // Reset font

  // Exporter Details (Left)
  const exporterStartY = yPos;
  doc.setFontSize(FONT_SIZE_NORMAL);
  doc.setFont('helvetica', 'bold');
  yPos = addText('EXPORTER:', PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_NORMAL, fontStyle: 'bold', spacingAfter: LINE_HEIGHT / 2 });
  yPos = addText(exporter.companyName, PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_NORMAL, fontStyle: 'bold', spacingAfter: LINE_HEIGHT / 2 });
  doc.setFont('helvetica', 'normal');
  const exporterAddressLines = doc.splitTextToSize(exporter.address, (pageWidth / 2) - PAGE_MARGIN * 2);
  yPos = addText(exporterAddressLines, PAGE_MARGIN, yPos, { lineHeight: LINE_HEIGHT * 0.8, spacingAfter: LINE_HEIGHT / 2 });
  yPos = addText(`TEL: ${exporter.phoneNumber}`, PAGE_MARGIN, yPos, {lineHeight: LINE_HEIGHT * 0.8, spacingAfter: LINE_HEIGHT / 2 });
  yPos = addText(`IEC NO: ${exporter.iecNumber}`, PAGE_MARGIN, yPos, {lineHeight: LINE_HEIGHT * 0.8, spacingAfter: LINE_HEIGHT});
  const exporterYAfter = yPos;


  // Invoice Details (Right)
  let invoiceDetailsYPos = exporterStartY; // Start at same height as EXPORTER: heading
  const rightColumnX = pageWidth / 2 + 10;
  const labelWidth = 35; // Adjusted label width
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
            currentLineY += LINE_HEIGHT * 0.8;
        });
        return currentLineY; // Return Y after last line
    } else {
        doc.text(value, rightColumnX + labelWidth + valueIndent, yPosition);
        return yPosition + LINE_HEIGHT;
    }
  };

  invoiceDetailsYPos = addDetailRow('Invoice No.', invoice.invoiceNumber, invoiceDetailsYPos);
  invoiceDetailsYPos = addDetailRow('Date', format(new Date(invoice.invoiceDate), 'dd/MM/yyyy'), invoiceDetailsYPos);
  invoiceDetailsYPos = addDetailRow('Exporter Ref.', '', invoiceDetailsYPos); // Placeholder
  invoiceDetailsYPos = addDetailRow('Buyer Ref.', '', invoiceDetailsYPos);   // Placeholder
  invoiceDetailsYPos += LINE_HEIGHT / 2; // Extra space
  invoiceDetailsYPos = addDetailRow('Currency', invoice.currencyType.toUpperCase(), invoiceDetailsYPos);
  
  // Payment Terms
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Terms', rightColumnX, invoiceDetailsYPos);
  invoiceDetailsYPos += LINE_HEIGHT /2 ; // Space for the value to start slightly lower if needed or align
  doc.setFont('helvetica', 'normal');
  const paymentTermsValueX = rightColumnX + labelWidth + valueIndent;
  const paymentTermsMaxWidth = pageWidth - paymentTermsValueX - PAGE_MARGIN;
  const paymentTermsLines = doc.splitTextToSize(invoice.termsAndConditions, paymentTermsMaxWidth);
  paymentTermsLines.forEach((line: string) => {
      doc.text(line, paymentTermsValueX, invoiceDetailsYPos);
      invoiceDetailsYPos += LINE_HEIGHT * 0.8; // Use smaller line height for terms
  });
  
  const invoiceDetailsYAfter = invoiceDetailsYPos;

  // Align yPos for next section based on which column is longer
  yPos = Math.max(exporterYAfter, invoiceDetailsYAfter);
  yPos = Math.max(yPos, exporterYAfter); // Ensure yPos is below exporter details if they are longer


  // Horizontal Line
  doc.setLineWidth(0.5);
  doc.line(PAGE_MARGIN, yPos, pageWidth - PAGE_MARGIN, yPos);
  yPos += LINE_HEIGHT;

  // Consignee/Buyer Details (Left)
  const consigneeStartY = yPos;
  doc.setFontSize(FONT_SIZE_NORMAL);
  doc.setFont('helvetica', 'bold');
  yPos = addText('CONSIGNEE / BUYER:', PAGE_MARGIN, yPos, {spacingAfter: LINE_HEIGHT /2});
  doc.setFont('helvetica', 'normal');
  yPos = addText(client.companyName, PAGE_MARGIN, yPos, {fontStyle: 'bold', spacingAfter: LINE_HEIGHT /2});
  const clientAddressLines = doc.splitTextToSize(client.address, (pageWidth / 2) - PAGE_MARGIN * 2);
  yPos = addText(clientAddressLines, PAGE_MARGIN, yPos, {lineHeight: LINE_HEIGHT * 0.8, spacingAfter: LINE_HEIGHT /2});
  yPos = addText(`${client.city}, ${client.country} - ${client.pinCode}`, PAGE_MARGIN, yPos, {lineHeight: LINE_HEIGHT * 0.8, spacingAfter: LINE_HEIGHT});
  // Removed CONTACT: client.person, client.contactNumber
  const consigneeYAfter = yPos;

  // Notify Party Details (Right)
  let notifyPartyYPos = consigneeStartY; // Start after the line, aligned with Consignee heading
  doc.setFont('helvetica', 'bold');
  notifyPartyYPos = addText('NOTIFY PARTY:', rightColumnX, notifyPartyYPos, {spacingAfter: LINE_HEIGHT/2});
  doc.setFont('helvetica', 'normal');
  if (invoice.notifyPartyLine1 || invoice.notifyPartyLine2) {
    if (invoice.notifyPartyLine1) {
        notifyPartyYPos = addText(invoice.notifyPartyLine1, rightColumnX, notifyPartyYPos, {lineHeight: LINE_HEIGHT*0.8, spacingAfter: invoice.notifyPartyLine2 ? LINE_HEIGHT/2 : LINE_HEIGHT});
    }
    if (invoice.notifyPartyLine2) {
        notifyPartyYPos = addText(invoice.notifyPartyLine2, rightColumnX, notifyPartyYPos, {lineHeight: LINE_HEIGHT*0.8, spacingAfter: LINE_HEIGHT});
    }
  } else {
      notifyPartyYPos = addText("SAME AS CONSIGNEE", rightColumnX, notifyPartyYPos, {spacingAfter: LINE_HEIGHT});
  }
  const notifyPartyYAfter = notifyPartyYPos;
  
  yPos = Math.max(consigneeYAfter, notifyPartyYAfter);

  // Horizontal Line
  doc.line(PAGE_MARGIN, yPos, pageWidth - PAGE_MARGIN, yPos);
  yPos += LINE_HEIGHT;

  // Shipment Details (spanning width, split into columns)
  const shipmentCol1X = PAGE_MARGIN;
  const shipmentCol2X = pageWidth / 2 + 5; // Adjusted for better spacing
  // const shipmentCol3X = PAGE_MARGIN + 2 * (pageWidth - 2 * PAGE_MARGIN) / 3; // Not used
  
  let shipmentDetailsY = yPos;
  let currentYLeftCol = shipmentDetailsY;
  let currentYRightCol = shipmentDetailsY;

  doc.setFont('helvetica', 'bold');
  doc.text('Port of Loading:', shipmentCol1X, currentYLeftCol);
  doc.setFont('helvetica', 'normal');
  currentYLeftCol = addText('Mundra', shipmentCol1X + 35, currentYLeftCol, {lineHeight: LINE_HEIGHT, spacingAfter: 0}).currentY - LINE_HEIGHT; // addText returns next line start

  doc.setFont('helvetica', 'bold');
  doc.text('Final Destination:', shipmentCol2X, currentYRightCol);
  doc.setFont('helvetica', 'normal');
  currentYRightCol = addText(invoice.finalDestination, shipmentCol2X + 35, currentYRightCol, {lineHeight: LINE_HEIGHT, spacingAfter: 0}).currentY - LINE_HEIGHT;

  currentYLeftCol += LINE_HEIGHT; // Move to next line for left column
  currentYRightCol += LINE_HEIGHT; // Move to next line for right column


  doc.setFont('helvetica', 'bold');
  doc.text('Container Details:', shipmentCol1X, currentYLeftCol);
  doc.setFont('helvetica', 'normal');
  currentYLeftCol = addText(`${invoice.totalContainer} x ${invoice.containerSize}`, shipmentCol1X + 35, currentYLeftCol, {lineHeight: LINE_HEIGHT, spacingAfter: 0}).currentY - LINE_HEIGHT;


  doc.setFont('helvetica', 'bold');
  doc.text('Total Gross Wt:', shipmentCol2X, currentYRightCol);
  doc.setFont('helvetica', 'normal');
  currentYRightCol = addText(`${invoice.totalGrossWeight} KGS`, shipmentCol2X + 35, currentYRightCol, {lineHeight: LINE_HEIGHT, spacingAfter: 0}).currentY - LINE_HEIGHT;

  yPos = Math.max(currentYLeftCol, currentYRightCol) + LINE_HEIGHT;


  // Product Table
  const tableColumnStyles = {
    0: { cellWidth: 15, halign: 'center' }, // Sr No
    1: { cellWidth: 50 }, // Description
    2: { cellWidth: 20, halign: 'center' }, // HSN
    3: { cellWidth: 20, halign: 'right' }, // Qty/Boxes
    4: { cellWidth: 25, halign: 'right' }, // SQMT
    5: { cellWidth: 25, halign: 'right' }, // Rate/SQMT
    6: { cellWidth: 25, halign: 'right' }, // Amount
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
      // yPos = data.cursor?.y || yPos; // Update yPos after table
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + LINE_HEIGHT;

  // Totals Section (Subtotal, Discount, Freight, Grand Total)
  const totalsXValue = pageWidth - PAGE_MARGIN; 
  const totalsXLabel = totalsXValue - 55;
  
  const addTotalRowPdf = (label: string, value: string | number, currentTableY: number) => {
    doc.setFontSize(FONT_SIZE_SMALL);
    doc.setFont('helvetica', 'bold');
    doc.text(label, totalsXLabel, currentTableY, {align: 'left'});
    doc.setFont('helvetica', 'normal');
    doc.text(typeof value === 'number' ? value.toFixed(2) : value, totalsXValue, currentTableY, {align: 'right'});
    return currentTableY + (LINE_HEIGHT * 0.8);
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
  yPos += LINE_HEIGHT / 2;


  // Total Invoice Amount in Words
  const amountInWordsStr = amountToWords(invoice.grandTotal || 0, invoice.currencyType);
  doc.setFont('helvetica', 'bold');
  yPos = addText(`Total Invoice amount (in words):`, PAGE_MARGIN, yPos, {fontSize: FONT_SIZE_SMALL, spacingAfter: LINE_HEIGHT / 3});
  doc.setFont('helvetica', 'normal');
  const amountWordsLines = doc.splitTextToSize(amountInWordsStr, pageWidth - 2 * PAGE_MARGIN);
  // Use a slightly larger line height for amount in words for clarity
  yPos = addText(amountWordsLines, PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: LINE_HEIGHT * 0.9, spacingAfter: LINE_HEIGHT });
  
  // Removed "Terms & Conditions of Delivery & Payment" section from here

  // Note
  if (invoice.note) {
    doc.setFont('helvetica', 'bold');
    yPos = addText('Note:', PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_SMALL, spacingAfter: LINE_HEIGHT / 3 });
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(invoice.note.replace(/<br>/g, '\n'), pageWidth - 2 * PAGE_MARGIN);
    yPos = addText(noteLines, PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: LINE_HEIGHT * 0.8, spacingAfter: LINE_HEIGHT });
  }

  // Beneficiary Bank Details
  if (selectedBank) {
    doc.setFont('helvetica', 'bold');
    yPos = addText('BENEFICIARY BANK DETAILS:', PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_SMALL, spacingAfter: LINE_HEIGHT / 2 });
    doc.setFont('helvetica', 'normal');
    yPos = addText(`BANK NAME: ${selectedBank.bankName}`, PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: LINE_HEIGHT * 0.8 });
    
    const bankAddrValueX = PAGE_MARGIN + doc.getTextWidth("BANK ADDRESS: ") + 1;
    const bankAddrMaxWidth = pageWidth - bankAddrValueX - PAGE_MARGIN;
    const bankAddressLines = doc.splitTextToSize(selectedBank.bankAddress, bankAddrMaxWidth);
    doc.text(`BANK ADDRESS: `, PAGE_MARGIN, yPos);
    let bankAddrY = yPos;
    bankAddressLines.forEach((line: string) => {
        doc.text(line, bankAddrValueX, bankAddrY);
        bankAddrY += LINE_HEIGHT * 0.8;
    });
    yPos = bankAddrY; // update yPos to be after the bank address

    yPos = addText(`ACCOUNT NO: ${selectedBank.accountNumber}`, PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: LINE_HEIGHT * 0.8 });
    yPos = addText(`SWIFT CODE: ${selectedBank.swiftCode}`, PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: LINE_HEIGHT * 0.8 });
    yPos = addText(`IFSC CODE: ${selectedBank.ifscCode}`, PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: LINE_HEIGHT * 0.8, spacingAfter: LINE_HEIGHT });
  }


  // Signature
  const signatureX = pageWidth - PAGE_MARGIN - 70;
  let finalYPos = yPos;
  // Check if yPos needs to be moved to prevent signature from being too low or on new page alone
  if (finalYPos > doc.internal.pageSize.getHeight() - 40) { 
      doc.addPage();
      finalYPos = PAGE_MARGIN; // Reset to top margin on new page
  } else {
      finalYPos = Math.max(finalYPos, doc.internal.pageSize.getHeight() - 50); 
  }


  doc.setFont('helvetica', 'bold');
  finalYPos = addText(`For ${exporter.companyName}`, signatureX, finalYPos, { align: 'center', fontSize: FONT_SIZE_SMALL, spacingAfter: LINE_HEIGHT * 2.5 });
  doc.line(signatureX - 25, finalYPos, signatureX + 55, finalYPos); // Signature line
  finalYPos += (LINE_HEIGHT * 0.8);
  doc.setFont('helvetica', 'normal');
  addText('Authorized Signatory', signatureX, finalYPos, { align: 'center', fontSize: FONT_SIZE_SMALL});


  doc.save(`Performa_Invoice_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
}

