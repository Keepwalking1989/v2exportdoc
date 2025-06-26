
'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { ExportDocument, ExportDocumentContainerItem, ExportDocumentProductItem } from '@/types/export-document';
import type { Company } from '@/types/company'; // For Exporter
import type { Manufacturer } from '@/types/manufacturer';
import type { Size } from '@/types/size';
import type { Product } from '@/types/product';

// --- Helper for amount in words ---
function amountToWordsUSD(amount: number): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const scales = ['', 'Thousand', 'Million', 'Billion'];

    function convertLessThanOneThousand(n: number): string {
        if (n === 0) return '';
        if (n < 20) return ones[n] + ' ';
        if (n < 100) return tens[Math.floor(n / 10)] + ' ' + convertLessThanOneThousand(n % 10);
        return ones[Math.floor(n / 100)] + ' Hundred ' + convertLessThanOneThousand(n % 100);
    }

    if (amount === 0) return 'Zero Dollars';

    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);

    let words = '';
    let scaleIndex = 0;
    let num = integerPart;

    while (num > 0) {
        if (num % 1000 !== 0) {
            words = convertLessThanOneThousand(num % 1000) + scales[scaleIndex] + ' ' + words;
        }
        num = Math.floor(num / 1000);
        scaleIndex++;
    }
    
    let result = `${words.trim()} Dollars`;

    if (decimalPart > 0) {
        const centsText = convertLessThanOneThousand(decimalPart).trim();
        result += ` and ${centsText} Cents`;
    }

    return result.replace(/\s+/g, ' ').trim() + " only";
}

// Helper to draw vertical text
const drawVerticalText = (doc: jsPDF, text: string, x: number, y: number, options: { charSpacing: number }) => {
    let currentY = y;
    for (let i = 0; i < text.length; i++) {
        doc.text(text[i], x, currentY, { align: 'center' });
        currentY += options.charSpacing;
    }
};

// --- Main PDF Generation Function ---
export function generateCustomInvoicePdf(
    docData: ExportDocument,
    exporter: Company,
    manufacturer: Manufacturer,
    allProducts: Product[],
    allSizes: Size[]
) {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    let y = margin;

    // --- Header ---
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOM INVOICE', pageWidth / 2, y, { align: 'center' });
    y += 20;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('"Supply Meant For Export Under Bond & LUT - Letter Of Undertaking Without Payment Of Integrated Tax"', pageWidth / 2, y, { align: 'center' });
    y += 15;
    
    const drawBlueHeader = (text: string, x: number, y: number, width: number, height: number, align: 'center' | 'left' = 'center') => {
        doc.setFillColor(41, 171, 226); // #29ABE2
        doc.rect(x, y, width, height, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        let textX = x + width / 2;
        if (align === 'left') {
            textX = x + 5;
        }
        doc.text(text, textX, y + height / 2, { align: align, baseline: 'middle' });
        doc.setTextColor(0, 0, 0); // Reset text color
    };

    // --- Exporter & Invoice Details ---
    const exporterBoxX = margin;
    const exporterBoxWidth = contentWidth * 0.5;
    const invoiceDetailsX = exporterBoxX + exporterBoxWidth;
    const invoiceDetailsWidth = contentWidth * 0.25;
    const exportRefX = invoiceDetailsX + invoiceDetailsWidth;
    const exportRefWidth = contentWidth * 0.25;
    const headerHeight = 15;

    drawBlueHeader('Exporter', exporterBoxX, y, exporterBoxWidth, headerHeight, 'left');
    drawBlueHeader('Export Invoice No & Date', invoiceDetailsX, y, invoiceDetailsWidth, headerHeight);
    drawBlueHeader('Export Ref.', exportRefX, y, exportRefWidth, headerHeight);
    
    y += headerHeight;
    const addressBoxHeight = 35;
    doc.setDrawColor(0);
    doc.rect(exporterBoxX, y, exporterBoxWidth, addressBoxHeight);
    doc.rect(invoiceDetailsX, y, invoiceDetailsWidth, addressBoxHeight);
    doc.rect(exportRefX, y, exportRefWidth, addressBoxHeight);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const exporterAddress = doc.splitTextToSize(`${exporter.companyName}\n${exporter.address || ''}`, exporterBoxWidth - 10);
    doc.text(exporterAddress, exporterBoxX + 5, y + 10);
    const invoiceData = `${docData.exportInvoiceNumber}\n${format(new Date(docData.exportInvoiceDate), 'dd/MM/yyyy')}`;
    doc.text(invoiceData, invoiceDetailsX + 5, y + 10);
    doc.text(`IEC Code: ${exporter.iecNumber || 'N/A'}`, exportRefX + 5, y + 10);
    
    y += addressBoxHeight;
    
    // --- Consignee & Buyer ---
    drawBlueHeader('Consignee:-', exporterBoxX, y, exporterBoxWidth, headerHeight, 'left');
    drawBlueHeader('Buyer (If Not Consignee)', invoiceDetailsX, y, contentWidth * 0.5, headerHeight, 'left');
    
    y += headerHeight;
    const consigneeBoxHeight = 25;
    doc.rect(exporterBoxX, y, exporterBoxWidth, consigneeBoxHeight);
    doc.rect(invoiceDetailsX, y, contentWidth * 0.5, consigneeBoxHeight);
    doc.text('TO\nTHE\nORDER', exporterBoxX + 5, y + 10);
    doc.text('TO\nTHE\nORDER', invoiceDetailsX + 5, y + 10);
    
    y += consigneeBoxHeight;

    // --- Shipment Details Grid ---
    const gridRowHeight = 25;
    const colWidth = contentWidth / 4;
    
    drawBlueHeader('Pre-Carriage By', margin, y, colWidth, headerHeight);
    drawBlueHeader('Place Of Receipt By Pre-Carrier', margin + colWidth, y, colWidth, headerHeight);
    drawBlueHeader('Country Of Origin Of Good', margin + 2 * colWidth, y, colWidth, headerHeight);
    drawBlueHeader('Country Of Final Destination', margin + 3 * colWidth, y, colWidth, headerHeight);
    y += headerHeight;
    
    doc.rect(margin, y, colWidth, gridRowHeight);
    doc.text('By Road', margin + 5, y + 15);
    doc.rect(margin + colWidth, y, colWidth, gridRowHeight);
    doc.text(manufacturer.address.split(',')[0] || 'N/A', margin + colWidth + 5, y + 15);
    doc.rect(margin + 2 * colWidth, y, colWidth, gridRowHeight);
    doc.text('INDIA', margin + 2 * colWidth + 5, y + 15);
    doc.rect(margin + 3 * colWidth, y, colWidth, gridRowHeight);
    doc.text(docData.countryOfFinalDestination, margin + 3 * colWidth + 5, y + 15);
    y += gridRowHeight;

    drawBlueHeader('Vessel / Flight No.', margin, y, colWidth, headerHeight);
    drawBlueHeader('Port Of Loading', margin + colWidth, y, colWidth, headerHeight);
    drawBlueHeader('Terms Of Delivery & Payments', margin + 2 * colWidth, y, colWidth * 2, headerHeight);
    y += headerHeight;

    doc.rect(margin, y, colWidth, gridRowHeight);
    doc.text(docData.vesselFlightNo || 'N/A', margin + 5, y + 15);
    doc.rect(margin + colWidth, y, colWidth, gridRowHeight);
    doc.text(docData.portOfLoading || 'N/A', margin + colWidth + 5, y + 15);
    doc.rect(margin + 2 * colWidth, y, colWidth * 2, gridRowHeight * 2); // Double height
    const termsText = doc.splitTextToSize(docData.termsOfDeliveryAndPayment || 'N/A', colWidth * 2 - 10);
    doc.text(termsText, margin + 2 * colWidth + 5, y + 15);
    y += gridRowHeight;

    drawBlueHeader('Port Of Discharge', margin, y, colWidth, headerHeight);
    drawBlueHeader('Final Destination', margin + colWidth, y, colWidth, headerHeight);
    y += headerHeight;
    doc.rect(margin, y, colWidth, gridRowHeight);
    doc.text(docData.portOfDischarge || 'N/A', margin + 5, y + 15);
    doc.rect(margin + colWidth, y, colWidth, gridRowHeight);
    doc.text(docData.finalDestination || 'N/A', margin + colWidth + 5, y + 15);
    y += gridRowHeight;


    // --- Main Product Table ---
    const allItems: (ExportDocumentProductItem & { type: 'product' | 'sample' })[] = [];
    docData.containerItems?.forEach(container => {
        container.productItems?.forEach(item => allItems.push({ ...item, type: 'product' }));
        container.sampleItems?.forEach(item => allItems.push({ ...item, type: 'sample' }));
    });
    
    const groupedByProduct = allItems.reduce((acc, item) => {
        const key = `${item.productId}-${item.type}-${item.rate}`;
        if (!acc[key]) {
            const product = allProducts.find(p => p.id === item.productId);
            const size = product ? allSizes.find(s => s.id === product.sizeId) : undefined;
            acc[key] = {
                hsnCode: size?.hsnCode || 'N/A',
                description: `${product?.designName || 'Unknown'} (${size?.size || 'N/A'})`,
                isSample: item.type === 'sample',
                boxes: 0,
                sqm: 0,
                rate: item.rate || 0,
                total: 0,
            };
        }
        const product = allProducts.find(p => p.id === item.productId);
        const size = product ? allSizes.find(s => s.id === product.sizeId) : undefined;
        const sqmForThisItem = (item.boxes || 0) * (size?.sqmPerBox || 0);
        acc[key].boxes += item.boxes || 0;
        acc[key].sqm += sqmForThisItem;
        acc[key].total += sqmForThisItem * (item.rate || 0);
        return acc;
    }, {} as Record<string, any>);

    let grandTotalBoxes = 0;
    let grandTotalSqm = 0;
    let grandTotalAmount = 0;

    const tableBody = Object.values(groupedByProduct).map((item, index) => {
        grandTotalBoxes += item.boxes;
        grandTotalSqm += item.sqm;
        grandTotalAmount += item.total;
        
        let desc = item.description;
        if (item.isSample) {
            desc += '\nFREE OF COST SAMPLE';
        }

        return [
            item.hsnCode,
            index + 1,
            desc,
            item.boxes,
            item.sqm.toFixed(2),
            `$ ${item.rate.toFixed(2)}`,
            `$ ${item.total.toFixed(2)}`
        ];
    });

    // Add total row to the body
    tableBody.push([
        { content: 'TOTAL', rowSpan: 2, styles: { halign: 'right', valign: 'middle', fontStyle: 'bold' } },
        { content: grandTotalBoxes.toString(), styles: { halign: 'right', valign: 'middle' } },
        { content: grandTotalSqm.toFixed(2), styles: { halign: 'right', valign: 'middle' } },
        { content: '', styles: {} },
        { content: `$ ${grandTotalAmount.toFixed(2)}`, styles: { halign: 'right', valign: 'middle', fontStyle: 'bold' } }
    ]);

    autoTable(doc, {
        startY: y,
        head: [['Marks & Nos.\n3 X 20\'', 'Sr. No', 'Description Of Goods', 'Boxes', 'Sq.Mtr', 'Rate in $', 'Total Amount\nIn USD $']],
        body: tableBody,
        theme: 'grid',
        margin: { left: margin, right: margin },
        headStyles: {
            fillColor: [41, 171, 226], // Blue
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 60, halign: 'center', valign: 'middle' },
            1: { cellWidth: 40, halign: 'center', valign: 'middle' },
            2: { cellWidth: 'auto', halign: 'left', valign: 'middle' },
            3: { cellWidth: 50, halign: 'right', valign: 'middle' },
            4: { cellWidth: 50, halign: 'right', valign: 'middle' },
            5: { cellWidth: 50, halign: 'right', valign: 'middle' },
            6: { cellWidth: 60, halign: 'right', valign: 'middle' },
        },
        didDrawPage: (data) => { y = data.cursor?.y || y; }
    });
    // @ts-ignore
    y = doc.lastAutoTable.finalY;

    // --- Custom Totals Section (Manual Drawing) ---
    const exchangeRate = docData.conversationRate || 1;
    const totalINR = grandTotalAmount * exchangeRate;
    const totalSectionHeight = 110;
    
    const verticalText = "EXCHANGE RATE NOTIFICATION NUMBER AND DATE";
    const fobText = "FOB";

    doc.rect(margin, y, contentWidth, totalSectionHeight);
    const col1W = 120;
    const col1X = margin;
    const col2X = col1X + col1W;
    const col2W = contentWidth - col1W;
    const col3X = col2X + col2W / 2;
    const col3W = col2W / 2;

    // Vertical line between main areas
    doc.line(col2X, y, col2X, y + totalSectionHeight);

    // Exchange Rate section
    doc.line(col2X, y + totalSectionHeight / 2, col2X + col2W, y + totalSectionHeight / 2); // Horizontal line
    doc.line(col3X, y + totalSectionHeight / 2, col3X, y + totalSectionHeight); // Vertical line
    
    doc.setFontSize(9).setFont('helvetica', 'bold');
    drawVerticalText(doc, verticalText, col1X + col1W / 2, y + 10, { charSpacing: 10 });
    drawVerticalText(doc, fobText, col1X + col1W / 2, y + totalSectionHeight / 2 + 30, { charSpacing: 12 });
    
    doc.text('EXCHANGE RATE', col2X + col2W / 4, y + totalSectionHeight / 2 + 20, { align: 'center' });
    doc.text(`1 USD = ${exchangeRate.toFixed(2)}`, col3X + col3W / 2, y + totalSectionHeight / 2 + 20, { align: 'center' });
    
    doc.text('INR', col2X + col2W / 4, y + totalSectionHeight - 20, { align: 'center' });
    doc.text(totalINR.toFixed(2), col3X + col3W / 2, y + totalSectionHeight - 20, { align: 'center' });
    
    y += totalSectionHeight;
    
    // --- Amount in Words ---
    drawBlueHeader('Total No. Of Pkgs.', margin, y, contentWidth / 4, headerHeight);
    drawBlueHeader('Amount In Words', margin + contentWidth / 4, y, (contentWidth * 3) / 4, headerHeight);
    const amountInWordsHeight = 30;
    y += headerHeight;
    doc.rect(margin, y, contentWidth / 4, amountInWordsHeight);
    doc.rect(margin + contentWidth / 4, y, (contentWidth * 3) / 4, amountInWordsHeight);
    doc.text(grandTotalBoxes.toString(), margin + 5, y + 15);
    const amountWordsText = doc.splitTextToSize(amountToWordsUSD(grandTotalAmount), (contentWidth * 3) / 4 - 10);
    doc.text(amountWordsText, margin + contentWidth / 4 + 5, y + 15);
    y += amountInWordsHeight;

    // --- Footer Section ---
    const footerText = 'Export Under Duty Drawback Scheme, We shall claim the benefit as admissible under , RoDTEP , DBK';
    drawBlueHeader(footerText, margin, y, contentWidth, headerHeight);
    y += headerHeight;

    drawBlueHeader('Supplier No. 1', margin, y, contentWidth, headerHeight, 'left');
    y += headerHeight;
    
    const supplierDetailsHeight = 60;
    doc.rect(margin, y, contentWidth, supplierDetailsHeight);
    const supplierDetails = [
      `Name: ${manufacturer.companyName}`,
      `GSTTIN No.: ${manufacturer.gstNumber}`,
      `Tax Invoice No & Date : ${docData.manufacturerInvoiceNumber || 'N/A'} Dt.${docData.manufacturerInvoiceDate ? format(new Date(docData.manufacturerInvoiceDate), 'dd/MM/yyyy') : 'N/A'} EPCG LIC NO : N/A`,
      `Export Under GST Circular No. 26/2017 Custom Dt. 01/07/2017`,
      `Letter Of Undertaking No. Acknowledgment For LUT Application Reference Number (ARN) N/A`,
    ];
    doc.setFontSize(8).setFont('helvetica', 'normal');
    doc.text(supplierDetails.join('\n'), margin + 5, y + 10);
    y += supplierDetailsHeight;

    // --- Declaration and Signature ---
    if (y > pageHeight - 100) {
        doc.addPage();
        y = margin;
    }
    const declarationBoxHeight = 60;
    doc.rect(margin, y, contentWidth, declarationBoxHeight);
    
    const declarationText = 'We declare that this Invoice shows the actual price of the goods described and that all particulars are true and correct.';
    doc.setFont('helvetica', 'bold').setFontSize(9);
    doc.text('Declaration:', margin + 5, y + 12);
    doc.setFont('helvetica', 'normal').setFontSize(8);
    const declarationLines = doc.splitTextToSize(declarationText, contentWidth / 2 - 15);
    doc.text(declarationLines, margin + 5, y + 24);
    
    doc.line(margin + contentWidth / 2, y, margin + contentWidth / 2, y + declarationBoxHeight); // Vertical separator
    
    doc.setFont('helvetica', 'bold').setFontSize(9);
    doc.text('Signature & Date:', margin + contentWidth / 2 + 5, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(), 'dd/MM/yyyy'), margin + contentWidth / 2 + 80, y + 12);

    doc.setFont('helvetica', 'bold');
    doc.text(`FOR, ${exporter.companyName}`, margin + contentWidth / 2 + 5, y + 30);
    doc.text('AUTHORISED SIGNATURE', margin + contentWidth - 5, y + 55, { align: 'right' });


    // --- Save the PDF ---
    doc.save(`Custom_Invoice_${docData.exportInvoiceNumber.replace(/[\\/:*?"<>|]/g, '_')}.pdf`);
}
