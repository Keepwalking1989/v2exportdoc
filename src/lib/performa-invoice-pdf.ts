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
  selectedBank?: Bank // Make selectedBank optional for now, can be made mandatory
) {
  const doc = new jsPDF();

  let yPos = PAGE_MARGIN;

  // Function to add text and move yPos
  const addText = (text: string | string[], x: number, y: number, options: any = {}) => {
    doc.setFontSize(options.fontSize || FONT_SIZE_NORMAL);
    doc.setFont(options.fontStyle || 'normal');
    if (Array.isArray(text)) {
        text.forEach(line => {
            doc.text(line, x, y);
            y += (options.lineHeight || LINE_HEIGHT);
        });
        return y - (options.lineHeight || LINE_HEIGHT) + (options.spacingAfter || 0); // Return yPos of last line
    } else {
        doc.text(text, x, y);
        return y + (options.spacingAfter || 0);
    }
  };
  
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header: PERFORMA INVOICE
  doc.setFontSize(FONT_SIZE_LARGE + 4);
  doc.setFont('helvetica', 'bold');
  doc.text('PERFORMA INVOICE', pageWidth / 2, yPos, { align: 'center' });
  yPos += LINE_HEIGHT * 2;

  // Exporter Details (Left)
  doc.setFontSize(FONT_SIZE_NORMAL);
  doc.setFont('helvetica', 'bold');
  yPos = addText(exporter.companyName, PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_NORMAL, fontStyle: 'bold', spacingAfter: LINE_HEIGHT / 2 });
  doc.setFont('helvetica', 'normal');
  const exporterAddressLines = doc.splitTextToSize(exporter.address, (pageWidth / 2) - PAGE_MARGIN * 2);
  yPos = addText(exporterAddressLines, PAGE_MARGIN, yPos, { lineHeight: LINE_HEIGHT * 0.7, spacingAfter: LINE_HEIGHT / 2 });
  yPos = addText(`TEL: ${exporter.phoneNumber}`, PAGE_MARGIN, yPos, {spacingAfter: LINE_HEIGHT / 2 });
  yPos = addText(`IEC NO: ${exporter.iecNumber}`, PAGE_MARGIN, yPos, {spacingAfter: LINE_HEIGHT});
  const exporterYAfter = yPos;


  // Invoice Details (Right)
  let invoiceDetailsYPos = PAGE_MARGIN + LINE_HEIGHT * 2; // Start at same height as exporter name
  const rightColumnX = pageWidth / 2 + 10;
  const labelWidth = 40;

  const addDetailRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, rightColumnX, invoiceDetailsYPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, rightColumnX + labelWidth, invoiceDetailsYPos);
    invoiceDetailsYPos += LINE_HEIGHT;
  };

  addDetailRow('Invoice No.', invoice.invoiceNumber);
  addDetailRow('Date', format(new Date(invoice.invoiceDate), 'dd/MM/yyyy'));
  addDetailRow('Exporter Ref.', ''); // Placeholder, add if available
  addDetailRow('Buyer Ref.', ''); // Placeholder, add if available
  invoiceDetailsYPos += LINE_HEIGHT / 2; // Extra space
  addDetailRow('Currency', invoice.currencyType.toUpperCase());
  addDetailRow('Payment Terms', 'As Arranged'); // Or pull from invoice.termsAndConditions if it's short enough
  
  const invoiceDetailsYAfter = invoiceDetailsYPos;

  // Align yPos for next section based on which column is longer
  yPos = Math.max(exporterYAfter, invoiceDetailsYAfter);


  // Horizontal Line
  doc.setLineWidth(0.5);
  doc.line(PAGE_MARGIN, yPos, pageWidth - PAGE_MARGIN, yPos);
  yPos += LINE_HEIGHT;

  // Consignee/Buyer Details (Left)
  doc.setFontSize(FONT_SIZE_NORMAL);
  doc.setFont('helvetica', 'bold');
  yPos = addText('CONSIGNEE / BUYER:', PAGE_MARGIN, yPos, {spacingAfter: LINE_HEIGHT /2});
  doc.setFont('helvetica', 'normal');
  yPos = addText(client.companyName, PAGE_MARGIN, yPos, {fontStyle: 'bold', spacingAfter: LINE_HEIGHT /2});
  const clientAddressLines = doc.splitTextToSize(client.address, (pageWidth / 2) - PAGE_MARGIN * 2);
  yPos = addText(clientAddressLines, PAGE_MARGIN, yPos, {lineHeight: LINE_HEIGHT * 0.7, spacingAfter: LINE_HEIGHT /2});
  yPos = addText(`${client.city}, ${client.country} - ${client.pinCode}`, PAGE_MARGIN, yPos, {spacingAfter: LINE_HEIGHT /2});
  yPos = addText(`CONTACT: ${client.person}, ${client.contactNumber}`, PAGE_MARGIN, yPos, {spacingAfter: LINE_HEIGHT});
  const consigneeYAfter = yPos;

  // Notify Party Details (Right)
  let notifyPartyYPos = Math.max(exporterYAfter, invoiceDetailsYAfter) + LINE_HEIGHT; // Start after the line
  doc.setFont('helvetica', 'bold');
  notifyPartyYPos = addText('NOTIFY PARTY:', rightColumnX, notifyPartyYPos, {spacingAfter: LINE_HEIGHT/2});
  doc.setFont('helvetica', 'normal');
  if (invoice.notifyPartyLine1) {
    notifyPartyYPos = addText(invoice.notifyPartyLine1, rightColumnX, notifyPartyYPos, {spacingAfter: LINE_HEIGHT/2});
  } else {
      notifyPartyYPos = addText("SAME AS CONSIGNEE", rightColumnX, notifyPartyYPos, {spacingAfter: LINE_HEIGHT/2});
  }
  if (invoice.notifyPartyLine2) {
    notifyPartyYPos = addText(invoice.notifyPartyLine2, rightColumnX, notifyPartyYPos, {spacingAfter: LINE_HEIGHT/2});
  }
  const notifyPartyYAfter = notifyPartyYPos;
  
  yPos = Math.max(consigneeYAfter, notifyPartyYAfter);

  // Horizontal Line
  doc.line(PAGE_MARGIN, yPos, pageWidth - PAGE_MARGIN, yPos);
  yPos += LINE_HEIGHT;

  // Shipment Details (spanning width, split into columns)
  const shipmentCol1X = PAGE_MARGIN;
  const shipmentCol2X = PAGE_MARGIN + (pageWidth - 2 * PAGE_MARGIN) / 3;
  const shipmentCol3X = PAGE_MARGIN + 2 * (pageWidth - 2 * PAGE_MARGIN) / 3;
  
  let shipmentDetailsY = yPos;
  doc.setFont('helvetica', 'bold');
  doc.text('Port of Loading:', shipmentCol1X, shipmentDetailsY);
  doc.setFont('helvetica', 'normal');
  doc.text('ANY INDIAN PORT', shipmentCol1X + 35, shipmentDetailsY);

  doc.setFont('helvetica', 'bold');
  doc.text('Final Destination:', shipmentCol2X, shipmentDetailsY);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.finalDestination, shipmentCol2X + 35, shipmentDetailsY);
  
  shipmentDetailsY += LINE_HEIGHT;

  doc.setFont('helvetica', 'bold');
  doc.text('Container Details:', shipmentCol1X, shipmentDetailsY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${invoice.totalContainer} x ${invoice.containerSize}`, shipmentCol1X + 35, shipmentDetailsY);

  doc.setFont('helvetica', 'bold');
  doc.text('Total Gross Wt:', shipmentCol2X, shipmentDetailsY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${invoice.totalGrossWeight} KGS`, shipmentCol2X + 35, shipmentDetailsY);

  yPos = shipmentDetailsY + LINE_HEIGHT;


  // Product Table
  const tableColumnStyles = {
    0: { cellWidth: 15 }, // Sr No
    1: { cellWidth: 50 }, // Description
    2: { cellWidth: 20 }, // HSN
    3: { cellWidth: 20 }, // Qty/Boxes
    4: { cellWidth: 25 }, // SQMT
    5: { cellWidth: 25 }, // Rate/SQMT
    6: { cellWidth: 25 }, // Amount
  };

  const tableHeader = [['Sr. No.', 'Description of Goods', 'HSN Code', 'Qty (Boxes)', 'Total SQMT', `Rate/${invoice.currencyType}`, `Amount/${invoice.currencyType}`]];
  const tableBody = invoice.items.map((item, index) => {
    const product = allProducts.find(p => p.id === item.productId);
    const size = allSizes.find(s => s.id === item.sizeId);
    return [
      index + 1,
      `${product?.designName || 'N/A'} - ${size?.size || 'N/A'}`,
      size?.hsnCode || 'N/A',
      item.boxes,
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
    headStyles: { fillColor: [200, 200, 200], textColor: [0,0,0], fontStyle: 'bold', halign: 'center' },
    columnStyles: tableColumnStyles,
    didDrawPage: (data) => {
      // yPos = data.cursor?.y || yPos; // Update yPos after table
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + LINE_HEIGHT;

  // Totals Section (Subtotal, Discount, Freight, Grand Total)
  const totalsX = pageWidth - PAGE_MARGIN - 60; // Align to the right
  
  const addTotalRow = (label: string, value: string | number) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, totalsX - 30, yPos, {align: 'right'});
    doc.setFont('helvetica', 'normal');
    doc.text(typeof value === 'number' ? value.toFixed(2) : value, totalsX + 25, yPos, {align: 'right'});
    yPos += LINE_HEIGHT;
  }

  addTotalRow('Sub Total:', invoice.subTotal || 0);
  if (invoice.discount > 0) {
    addTotalRow('Discount:', invoice.discount);
  }
  if (invoice.freight > 0) {
    addTotalRow('Freight:', invoice.freight);
  }
  doc.setFont('helvetica', 'bold');
  addTotalRow('Grand Total:', invoice.grandTotal || 0);
  doc.setFont('helvetica', 'normal');
  yPos += LINE_HEIGHT / 2;


  // Total Invoice Amount in Words
  const amountInWordsStr = amountToWords(invoice.grandTotal || 0, invoice.currencyType);
  doc.setFont('helvetica', 'bold');
  addText(`Total Invoice amount (in words):`, PAGE_MARGIN, yPos, {spacingAfter: LINE_HEIGHT / 2});
  doc.setFont('helvetica', 'normal');
  const amountWordsLines = doc.splitTextToSize(amountInWordsStr, pageWidth - 2 * PAGE_MARGIN);
  yPos = addText(amountWordsLines, PAGE_MARGIN, yPos, {lineHeight: LINE_HEIGHT * 0.8, spacingAfter: LINE_HEIGHT});
  

  // Terms and Conditions
  doc.setFont('helvetica', 'bold');
  addText('Terms & Conditions of Delivery & Payment:', PAGE_MARGIN, yPos, { spacingAfter: LINE_HEIGHT / 2 });
  doc.setFont('helvetica', 'normal');
  const termsLines = doc.splitTextToSize(invoice.termsAndConditions, pageWidth - 2 * PAGE_MARGIN);
  yPos = addText(termsLines, PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: LINE_HEIGHT * 0.7, spacingAfter: LINE_HEIGHT });
  
  // Note
  if (invoice.note) {
    doc.setFont('helvetica', 'bold');
    addText('Note:', PAGE_MARGIN, yPos, { spacingAfter: LINE_HEIGHT / 2 });
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(invoice.note.replace(/<br>/g, '\n'), pageWidth - 2 * PAGE_MARGIN);
    yPos = addText(noteLines, PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: LINE_HEIGHT * 0.7, spacingAfter: LINE_HEIGHT });
  }

  // Beneficiary Bank Details
  if (selectedBank) {
    doc.setFont('helvetica', 'bold');
    yPos = addText('BENEFICIARY BANK DETAILS:', PAGE_MARGIN, yPos, { spacingAfter: LINE_HEIGHT / 2 });
    doc.setFont('helvetica', 'normal');
    yPos = addText(`BANK NAME: ${selectedBank.bankName}`, PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: LINE_HEIGHT * 0.7 });
    const bankAddressLines = doc.splitTextToSize(selectedBank.bankAddress, pageWidth - 2 * PAGE_MARGIN - 30); // Leave space for label
    bankAddressLines.forEach((line, index) => {
        if (index === 0) {
            yPos = addText(`BANK ADDRESS: ${line}`, PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: LINE_HEIGHT * 0.7 });
        } else {
            yPos = addText(line, PAGE_MARGIN + 30, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: LINE_HEIGHT * 0.7 });
        }
    });
    yPos = addText(`ACCOUNT NO: ${selectedBank.accountNumber}`, PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: LINE_HEIGHT * 0.7 });
    yPos = addText(`SWIFT CODE: ${selectedBank.swiftCode}`, PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: LINE_HEIGHT * 0.7 });
    yPos = addText(`IFSC CODE: ${selectedBank.ifscCode}`, PAGE_MARGIN, yPos, { fontSize: FONT_SIZE_SMALL, lineHeight: LINE_HEIGHT * 0.7, spacingAfter: LINE_HEIGHT });
  }


  // Signature
  const signatureX = pageWidth - PAGE_MARGIN - 70;
  yPos = Math.max(yPos, doc.internal.pageSize.getHeight() - 50); // Ensure there's space for signature
  if (yPos > doc.internal.pageSize.getHeight() - 50) { // Check if we need a new page
      doc.addPage();
      yPos = PAGE_MARGIN;
  }

  doc.setFont('helvetica', 'bold');
  doc.text(`For ${exporter.companyName}`, signatureX, yPos, { align: 'center' });
  yPos += LINE_HEIGHT * 3; // Space for signature
  doc.line(signatureX - 20, yPos, signatureX + 50, yPos);
  yPos += LINE_HEIGHT;
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signatory', signatureX, yPos, { align: 'center' });


  doc.save(`Performa_Invoice_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
}
