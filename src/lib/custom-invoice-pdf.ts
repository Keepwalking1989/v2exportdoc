
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
    if (amount === null || amount === undefined) return 'Zero Dollars only';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const scales = ['', 'Thousand', 'Million', 'Billion'];

    function convertLessThanOneThousand(n: number): string {
        if (n === 0) return '';
        if (n < 20) return ones[n] + ' ';
        if (n < 100) return tens[Math.floor(n / 10)] + ' ' + (ones[n % 10] || '') + ' ';
        return ones[Math.floor(n / 100)] + ' Hundred ' + convertLessThanOneThousand(n % 100);
    }

    if (amount === 0) return 'Zero Dollars only';

    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);

    let words = '';
    let scaleIndex = 0;
    let num = integerPart;

    if (num === 0) {
        words = '';
    } else {
         while (num > 0) {
            if (num % 1000 !== 0) {
                words = convertLessThanOneThousand(num % 1000) + scales[scaleIndex] + ' ' + words;
            }
            num = Math.floor(num / 1000);
            scaleIndex++;
        }
    }
    
    let result = `${words.trim()} Dollars`;

    if (decimalPart > 0) {
        const centsText = convertLessThanOneThousand(decimalPart).trim();
        result += ` and ${centsText} Cents`;
    }

    return result.replace(/\s\s+/g, ' ').trim() + " only";
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

    let y = margin + 5; // Start with a bit more top margin

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
        let textX = align === 'left' ? x + 5 : x + width / 2;
        doc.text(text, textX, y + height / 2, { align: align, baseline: 'middle' });
        doc.setTextColor(0, 0, 0); // Reset text color
    };

    // --- Exporter & Invoice Details ---
    const exporterBoxWidth = contentWidth * 0.5;
    const invoiceDetailsWidth = contentWidth * 0.3;
    const exportRefWidth = contentWidth * 0.2;
    const headerHeight = 15;

    drawBlueHeader('Exporter', margin, y, exporterBoxWidth, headerHeight, 'left');
    drawBlueHeader('Export Invoice No & Date', margin + exporterBoxWidth, y, invoiceDetailsWidth, headerHeight);
    drawBlueHeader('Export Ref.', margin + exporterBoxWidth + invoiceDetailsWidth, y, exportRefWidth, headerHeight);
    y += headerHeight;
    
    const addressBoxHeight = 45;
    doc.setDrawColor(0);
    doc.setLineWidth(1);
    doc.rect(margin, y, exporterBoxWidth, addressBoxHeight);
    doc.rect(margin + exporterBoxWidth, y, invoiceDetailsWidth, addressBoxHeight);
    doc.rect(margin + exporterBoxWidth + invoiceDetailsWidth, y, exportRefWidth, addressBoxHeight);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const exporterAddress = doc.splitTextToSize(`${exporter.companyName}\n${exporter.address || ''}`, exporterBoxWidth - 10);
    doc.text(exporterAddress, margin + 5, y + 12);
    const invoiceData = `${docData.exportInvoiceNumber}\n${format(new Date(docData.exportInvoiceDate), 'dd/MM/yyyy')}`;
    doc.text(invoiceData, margin + exporterBoxWidth + 5, y + 12);
    doc.text(`IEC Code: ${exporter.iecNumber || 'N/A'}`, margin + exporterBoxWidth + invoiceDetailsWidth + 5, y + 12);
    y += addressBoxHeight;
    
    // --- Consignee & Buyer ---
    drawBlueHeader('Consignee:-', margin, y, exporterBoxWidth, headerHeight, 'left');
    drawBlueHeader('Buyer (If Not Consignee)', margin + exporterBoxWidth, y, contentWidth - exporterBoxWidth, headerHeight, 'left');
    y += headerHeight;

    const consigneeBoxHeight = 35;
    doc.rect(margin, y, exporterBoxWidth, consigneeBoxHeight);
    doc.rect(margin + exporterBoxWidth, y, contentWidth - exporterBoxWidth, consigneeBoxHeight);
    doc.text('TO\nTHE\nORDER', margin + 5, y + 12);
    doc.text('TO\nTHE\nORDER', margin + exporterBoxWidth + 5, y + 12);
    y += consigneeBoxHeight;

    // --- Shipment Details Grid ---
    const gridRowHeight = 30;
    const colWidths1 = [contentWidth * 0.25, contentWidth * 0.25, contentWidth * 0.25, contentWidth * 0.25];
    
    drawBlueHeader('Pre-Carriage By', margin, y, colWidths1[0], headerHeight);
    drawBlueHeader('Place Of Receipt By Pre-Carrier', margin + colWidths1[0], y, colWidths1[1], headerHeight);
    drawBlueHeader('Country Of Origin Of Good', margin + colWidths1[0] + colWidths1[1], y, colWidths1[2], headerHeight);
    drawBlueHeader('Country Of Final Destination', margin + colWidths1[0] + colWidths1[1] + colWidths1[2], y, colWidths1[3], headerHeight);
    y += headerHeight;
    
    doc.rect(margin, y, colWidths1[0], gridRowHeight);
    doc.text('By Road', margin + 5, y + 18);
    doc.rect(margin + colWidths1[0], y, colWidths1[1], gridRowHeight);
    doc.text(manufacturer.address.split(',')[0] || 'N/A', margin + colWidths1[0] + 5, y + 18);
    doc.rect(margin + colWidths1[0] + colWidths1[1], y, colWidths1[2], gridRowHeight);
    doc.text('INDIA', margin + colWidths1[0] + colWidths1[1] + 5, y + 18);
    doc.rect(margin + colWidths1[0] + colWidths1[1] + colWidths1[2], y, colWidths1[3], gridRowHeight);
    doc.text(docData.countryOfFinalDestination, margin + colWidths1[0] + colWidths1[1] + colWidths1[2] + 5, y + 18);
    y += gridRowHeight;

    const colWidths2 = [contentWidth * 0.25, contentWidth * 0.25, contentWidth * 0.5];
    drawBlueHeader('Vessel / Flight No.', margin, y, colWidths2[0], headerHeight);
    drawBlueHeader('Port Of Loading', margin + colWidths2[0], y, colWidths2[1], headerHeight);
    drawBlueHeader('Terms Of Delivery & Payments', margin + colWidths2[0] + colWidths2[1], y, colWidths2[2], headerHeight);
    y += headerHeight;
    doc.rect(margin, y, colWidths2[0], gridRowHeight);
    doc.text(docData.vesselFlightNo || 'N/A', margin + 5, y + 18);
    doc.rect(margin + colWidths2[0], y, colWidths2[1], gridRowHeight);
    doc.text(docData.portOfLoading || 'N/A', margin + colWidths2[0] + 5, y + 18);
    doc.rect(margin + colWidths2[0] + colWidths2[1], y, colWidths2[2] * 2, gridRowHeight * 2); // Span 2 rows high, 1 row wide
    const termsText = doc.splitTextToSize(docData.termsOfDeliveryAndPayment || 'N/A', colWidths2[2] - 10);
    doc.text(termsText, margin + colWidths2[0] + colWidths2[1] + 5, y + 18);
    
    const yAfterTerms = y + gridRowHeight * 2;
    let tempY = y;
    
    tempY += gridRowHeight;
    drawBlueHeader('Port Of Discharge', margin, tempY, colWidths2[0], headerHeight);
    drawBlueHeader('Final Destination', margin + colWidths2[0], tempY, colWidths2[1], headerHeight);
    tempY += headerHeight;
    doc.rect(margin, tempY, colWidths2[0], gridRowHeight);
    doc.text(docData.portOfDischarge || 'N/A', margin + 5, tempY + 18);
    doc.rect(margin + colWidths2[0], tempY, colWidths2[1], gridRowHeight);
    doc.text(docData.finalDestination || 'N/A', margin + colWidths2[0] + 5, tempY + 18);
    
    y = yAfterTerms;

    // --- Main Product Table ---
    const allItems: (ExportDocumentProductItem & { type: 'product' | 'sample' })[] = [];
    docData.containerItems?.forEach(container => {
        (container.productItems || []).forEach(item => allItems.push({ ...item, type: 'product' }));
        (container.sampleItems || []).forEach(item => allItems.push({ ...item, type: 'sample' }));
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
            desc += '\n(Sample With No Commercial Value)';
        }

        return [
            item.hsnCode,
            index + 1,
            desc,
            item.boxes.toString(),
            item.sqm.toFixed(2),
            item.rate.toFixed(2),
            item.total.toFixed(2)
        ];
    });

    if (tableBody.length === 0) {
        tableBody.push([
            { content: 'No items found in document.', colSpan: 7, styles: { halign: 'center', minCellHeight: 50 } }
        ]);
    }

    autoTable(doc, {
        startY: y,
        head: [['Marks & Nos.\nContainer', 'Sr. No', 'Description Of Goods', 'Boxes', 'Sq.Mtr', 'Rate in $', 'Total Amount\nIn USD $']],
        body: tableBody,
        theme: 'grid',
        margin: { left: margin, right: margin },
        headStyles: {
            fillColor: [41, 171, 226],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            lineWidth: 1,
            lineColor: [0, 0, 0]
        },
        styles: {
            lineWidth: 1,
            lineColor: [0, 0, 0]
        },
        columnStyles: {
            0: { cellWidth: 70, halign: 'center' },
            1: { cellWidth: 40, halign: 'center' },
            2: { cellWidth: 'auto', halign: 'left' },
            3: { cellWidth: 50, halign: 'right' },
            4: { cellWidth: 50, halign: 'right' },
            5: { cellWidth: 50, halign: 'right' },
            6: { cellWidth: 70, halign: 'right' },
        },
        didDrawPage: (data) => { y = data.cursor?.y || y; }
    });
    
    // @ts-ignore
    y = doc.lastAutoTable.finalY;

    const table = (doc as any).lastAutoTable;
    // Only draw the TOTAL row if there were actual items.
    if (Object.keys(groupedByProduct).length > 0 && table && table.columns && table.columns.length > 6) {
        const totalRowHeight = 35;
        doc.setLineWidth(1);
        doc.setDrawColor(0,0,0);
        doc.rect(margin, y, contentWidth, totalRowHeight);
        
        doc.setFont('helvetica', 'bold').setFontSize(9);
        doc.text('TOTAL', margin + 5, y + totalRowHeight / 2 + 3);

        const boxColX = table.columns[3].x + table.columns[3].width;
        const sqmColX = table.columns[4].x + table.columns[4].width;
        const amountColX = table.columns[6].x + table.columns[6].width;

        doc.text(grandTotalBoxes.toString(), boxColX - 5, y + totalRowHeight / 2 + 3, { align: 'right' });
        doc.text(grandTotalSqm.toFixed(2), sqmColX - 5, y + totalRowHeight / 2 + 3, { align: 'right' });
        doc.text(`$ ${grandTotalAmount.toFixed(2)}`, amountColX - 5, y + totalRowHeight / 2 + 3, { align: 'right' });
        y += totalRowHeight;
    }

    // --- Exchange Rate Section ---
    const exchangeRateSectionHeight = 45;
    doc.rect(margin, y, contentWidth, exchangeRateSectionHeight);
    const verticalTextX = margin + 15;
    drawVerticalText(doc, "E X C H A N G E   R A T E", verticalTextX, y + 5, { charSpacing: 10 });
    const lineX = margin + 30;
    doc.line(lineX, y, lineX, y + exchangeRateSectionHeight);
    
    const innerBoxX = lineX + 5;
    const innerBoxW = contentWidth - (lineX - margin) - 10;
    const innerRowH = exchangeRateSectionHeight / 2;
    doc.setFont('helvetica', 'bold').setFontSize(9);
    doc.text('EXCHANGE RATE', innerBoxX + 5, y + innerRowH / 2 + 3);
    doc.text('INR', innerBoxX + 5, y + innerRowH + innerRowH / 2 + 3);
    
    const innerVertLineX = innerBoxX + innerBoxW / 2;
    doc.line(innerVertLineX, y, innerVertLineX, y + exchangeRateSectionHeight);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`1 USD = ${docData.conversationRate?.toFixed(2) || 'N/A'}`, innerVertLineX + 5, y + innerRowH / 2 + 3);
    const totalInr = grandTotalAmount * (docData.conversationRate || 0);
    doc.text(totalInr.toFixed(2), innerVertLineX + 5, y + innerRowH + innerRowH / 2 + 3);
    y += exchangeRateSectionHeight;
    
    // --- Amount in Words ---
    drawBlueHeader('Total No. Of Pkgs.', margin, y, 100, headerHeight, 'left');
    drawBlueHeader('Amount In Words', margin + 100, y, contentWidth - 100, headerHeight, 'left');
    y += headerHeight;
    const amountInWordsHeight = 40;
    doc.rect(margin, y, 100, amountInWordsHeight);
    doc.rect(margin + 100, y, contentWidth - 100, amountInWordsHeight);
    doc.text(grandTotalBoxes.toString(), margin + 5, y + 15);
    const amountWordsText = doc.splitTextToSize(amountToWordsUSD(grandTotalAmount), contentWidth - 100 - 10);
    doc.text(amountWordsText, margin + 105, y + 15);
    y += amountInWordsHeight;

    // --- Footer Section ---
    const footerText = 'Export Under Duty Drawback Scheme, We shall claim the benefit as admissible under , RoDTEP , DBK';
    drawBlueHeader(footerText, margin, y, contentWidth, headerHeight, 'left');
    y += headerHeight;

    // --- Supplier Section ---
    const supplierHeaderHeight = 15;
    drawBlueHeader('Supplier No. 1', margin, y, contentWidth, supplierHeaderHeight, 'left');
    y += supplierHeaderHeight;
    
    const supplierDetailsHeight = 70;
    doc.rect(margin, y, contentWidth, supplierDetailsHeight);
    drawVerticalText(doc, 'C U S T O M', margin + 10, y + 12, { charSpacing: 9 });
    doc.line(margin + 20, y, margin + 20, y + supplierDetailsHeight);

    const supplierDetails = [
      `Name: ${manufacturer.companyName}`,
      `GSTTIN No.: ${manufacturer.gstNumber}`,
      `Tax Invoice No & Date : ${docData.manufacturerInvoiceNumber || 'N/A'} Dt.${docData.manufacturerInvoiceDate ? format(new Date(docData.manufacturerInvoiceDate), 'dd/MM/yyyy') : 'N/A'} EPCG LIC NO : N/A`,
      `Export Under GST Circular No. 26/2017 Custom Dt. 01/07/2017`,
      `Letter Of Undertaking No. Acknowledgment For LUT Application Reference Number (ARN) N/A`,
    ];
    doc.setFontSize(8).setFont('helvetica', 'normal');
    doc.text(supplierDetails, margin + 25, y + 12);
    y += supplierDetailsHeight;

    // --- Declaration and Signature ---
    const declarationBoxHeight = 65;
    doc.rect(margin, y, contentWidth, declarationBoxHeight);
    
    doc.setFont('helvetica', 'bold').setFontSize(9);
    doc.text('Declaration:', margin + 5, y + 12);
    doc.setFont('helvetica', 'normal').setFontSize(8);
    const declarationText = 'We declare that this Invoice shows the actual price of the goods described and that all particulars are true and correct.';
    const declarationLines = doc.splitTextToSize(declarationText, contentWidth / 2 - 15);
    doc.text(declarationLines, margin + 5, y + 24);
    
    doc.line(margin + contentWidth / 2, y, margin + contentWidth / 2, y + declarationBoxHeight); // Vertical separator
    
    doc.setFont('helvetica', 'bold').setFontSize(9);
    doc.text('Signature & Date:', margin + contentWidth / 2 + 5, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(), 'dd/MM/yyyy'), margin + contentWidth / 2 + 85, y + 12);

    doc.setFont('helvetica', 'bold');
    doc.text(`FOR, ${exporter.companyName}`, margin + contentWidth / 2 + 5, y + 35);
    doc.text('AUTHORISED SIGNATURE', contentWidth + margin - 5, y + declarationBoxHeight - 5, { align: 'right' });


    // --- Save the PDF ---
    doc.save(`Custom_Invoice_${docData.exportInvoiceNumber.replace(/[\\/:*?"<>|]/g, '_')}.pdf`);
}

    