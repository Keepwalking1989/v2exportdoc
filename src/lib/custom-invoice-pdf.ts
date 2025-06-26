
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
        result += ` and ${convertLessThanOneThousand(decimalPart).trim()} Cents`;
    }

    return result.replace(/\s+/g, ' ').trim() + " only";
}


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
    
    const drawBlueHeader = (text: string, x: number, y: number, width: number, height: number) => {
        doc.setFillColor(41, 171, 226); // #29ABE2
        doc.rect(x, y, width, height, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(text, x + width / 2, y + height / 2, { align: 'center', baseline: 'middle' });
        doc.setTextColor(0, 0, 0); // Reset text color
    };

    // --- Exporter & Invoice Details ---
    const exporterBoxHeight = 60;
    drawBlueHeader('Exporter', margin, y, contentWidth / 2, 15);
    doc.setDrawColor(0);
    doc.rect(margin, y + 15, contentWidth / 2, exporterBoxHeight - 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const exporterAddress = doc.splitTextToSize(
      `${exporter.companyName}\n${exporter.address || ''}`, 
      contentWidth / 2 - 10
    );
    doc.text(exporterAddress, margin + 5, y + 25);
    
    const invoiceDetailsBoxHeight = 30;
    drawBlueHeader('Export Invoice No & Date', margin + contentWidth / 2, y, contentWidth / 4, 15);
    doc.rect(margin + contentWidth / 2, y + 15, contentWidth / 4, invoiceDetailsBoxHeight - 15);
    doc.text(`${docData.exportInvoiceNumber}\n${format(new Date(docData.exportInvoiceDate), 'dd/MM/yyyy')}`, margin + contentWidth / 2 + 5, y + 25);
    
    drawBlueHeader('Export Ref.', margin + (contentWidth * 3) / 4, y, contentWidth / 4, 15);
    doc.rect(margin + (contentWidth * 3) / 4, y + 15, contentWidth / 4, invoiceDetailsBoxHeight - 15);
    doc.text(`IEC Code:\n${exporter.iecNumber || 'N/A'}`, margin + (contentWidth * 3) / 4 + 5, y + 25);
    
    y += invoiceDetailsBoxHeight;

    drawBlueHeader('Consignee:-', margin, y, contentWidth / 2, 15);
    doc.rect(margin, y + 15, contentWidth / 2, 30);
    doc.text('TO\nTHE\nORDER', margin + 5, y + 25);
    
    drawBlueHeader('Buyer (If Not Consignee)', margin + contentWidth / 2, y, contentWidth / 2, 15);
    doc.rect(margin + contentWidth / 2, y + 15, contentWidth / 2, 30);
    doc.text('TO\nTHE\nORDER', margin + contentWidth / 2 + 5, y + 25);

    y += 45;

    // --- Shipment Details Grid ---
    const shipmentRowHeight = 30;
    const gridY1 = y;
    drawBlueHeader('Pre-Carriage By', margin, gridY1, contentWidth / 4, 15);
    doc.rect(margin, gridY1 + 15, contentWidth / 4, shipmentRowHeight);
    doc.text('By Road', margin + 5, gridY1 + 25);
    
    drawBlueHeader('Place Of Receipt By Pre-Carrier', margin + contentWidth / 4, gridY1, contentWidth / 4, 15);
    doc.rect(margin + contentWidth / 4, gridY1 + 15, contentWidth / 4, shipmentRowHeight);
    doc.text(manufacturer.address.split(',')[0] || 'N/A', margin + contentWidth / 4 + 5, gridY1 + 25);

    drawBlueHeader('Country Of Origin Of Good', margin + contentWidth / 2, gridY1, contentWidth / 4, 15);
    doc.rect(margin + contentWidth / 2, gridY1 + 15, contentWidth / 4, shipmentRowHeight);
    doc.text('INDIA', margin + contentWidth / 2 + 5, gridY1 + 25);

    drawBlueHeader('Country Of Final Destination', margin + (contentWidth * 3) / 4, gridY1, contentWidth / 4, 15);
    doc.rect(margin + (contentWidth * 3) / 4, gridY1 + 15, contentWidth / 4, shipmentRowHeight);
    doc.text(docData.countryOfFinalDestination, margin + (contentWidth * 3) / 4 + 5, gridY1 + 25);
    y += 15 + shipmentRowHeight;
    
    const gridY2 = y;
    drawBlueHeader('Vessel / Flight No.', margin, gridY2, contentWidth / 4, 15);
    doc.rect(margin, gridY2 + 15, contentWidth / 4, shipmentRowHeight);
    doc.text(docData.vesselFlightNo || 'N/A', margin + 5, gridY2 + 25);

    drawBlueHeader('Port Of Loading', margin + contentWidth / 4, gridY2, contentWidth / 4, 15);
    doc.rect(margin + contentWidth / 4, gridY2 + 15, contentWidth / 4, shipmentRowHeight);
    doc.text(docData.portOfLoading || 'N/A', margin + contentWidth / 4 + 5, gridY2 + 25);
    
    drawBlueHeader('Terms Of Delivery & Payments', margin + contentWidth / 2, gridY2, contentWidth / 2, 15);
    doc.rect(margin + contentWidth / 2, gridY2 + 15, contentWidth / 2, shipmentRowHeight * 2); // Double height
    const termsText = doc.splitTextToSize(docData.termsOfDeliveryAndPayment || 'N/A', contentWidth / 2 - 10);
    doc.text(termsText, margin + contentWidth / 2 + 5, gridY2 + 25);
    
    y += 15 + shipmentRowHeight;

    const gridY3 = y;
    drawBlueHeader('Port Of Discharge', margin, gridY3, contentWidth / 4, 15);
    doc.rect(margin, gridY3 + 15, contentWidth / 4, shipmentRowHeight);
    doc.text(docData.portOfDischarge || 'N/A', margin + 5, gridY3 + 25);

    drawBlueHeader('Final Destination', margin + contentWidth / 4, gridY3, contentWidth / 4, 15);
    doc.rect(margin + contentWidth / 4, gridY3 + 15, contentWidth / 4, shipmentRowHeight);
    doc.text(docData.finalDestination || 'N/A', margin + contentWidth / 4 + 5, gridY3 + 25);
    y += 15 + shipmentRowHeight;

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
            0: { halign: 'center', cellWidth: 60 },
            1: { halign: 'center', cellWidth: 40 },
            2: { halign: 'left', cellWidth: 'auto' },
            3: { halign: 'right', cellWidth: 50 },
            4: { halign: 'right', cellWidth: 50 },
            5: { halign: 'right', cellWidth: 50 },
            6: { halign: 'right', cellWidth: 60 },
        },
        didDrawPage: (data) => { y = data.cursor?.y || y; }
    });
    // @ts-ignore
    y = doc.lastAutoTable.finalY;


    // --- Totals Below Table ---
    const totalRow = [
        { content: 'TOTAL', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: grandTotalBoxes.toString(), styles: { halign: 'right' } },
        { content: grandTotalSqm.toFixed(2), styles: { halign: 'right' } },
        { content: '', styles: {} },
        { content: `$ ${grandTotalAmount.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } },
    ];
    
    const exchangeRate = docData.conversationRate || 1;
    const totalINR = grandTotalAmount * exchangeRate;
    
    const exchangeRow = [
        { content: 'EXCHANGE RATE NOTIFICATION NUMBER AND DATE', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `${docData.exchangeNotification || 'N/A'}\n${docData.exchangeDate ? format(new Date(docData.exchangeDate), 'dd/MM/yyyy') : 'N/A'}`, colSpan: 2, styles: { halign: 'center' } },
        { content: 'EXCHANGE RATE', styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `1 USD = ${exchangeRate.toFixed(2)}`, styles: { halign: 'center' } },
    ];
    
    const fobRow = [
      { content: 'FOB', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: 'INR', colSpan: 2, styles: { halign: 'center' } },
      { content: totalINR.toFixed(2), colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } }
    ];
    
    const certifiedRow = [
        { content: 'Certified That Goods Are Of Indian Origin', colSpan: 3, styles: { fillColor: [41, 171, 226], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } },
        { content: 'TOTAL', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: 'INR', styles: { halign: 'center' } },
        { content: totalINR.toFixed(2), styles: { halign: 'right', fontStyle: 'bold' } }
    ];

    autoTable(doc, {
        startY: y,
        body: [totalRow, exchangeRow, fobRow, certifiedRow],
        theme: 'grid',
        margin: { left: margin, right: margin },
    });
    // @ts-ignore
    y = doc.lastAutoTable.finalY;
    
    // --- Amount in Words ---
    drawBlueHeader('Total No. Of Pkgs.', margin, y, contentWidth / 4, 15);
    drawBlueHeader('Amount In Words', margin + contentWidth / 4, y, (contentWidth * 3) / 4, 15);
    const amountInWordsHeight = 30;
    doc.rect(margin, y + 15, contentWidth / 4, amountInWordsHeight);
    doc.rect(margin + contentWidth / 4, y + 15, (contentWidth * 3) / 4, amountInWordsHeight);
    doc.text(grandTotalBoxes.toString(), margin + 5, y + 25);
    
    const amountWordsText = doc.splitTextToSize(amountToWordsUSD(grandTotalAmount), (contentWidth * 3) / 4 - 10);
    doc.text(amountWordsText, margin + contentWidth / 4 + 5, y + 25);
    y += 15 + amountInWordsHeight;

    // --- Footer Section ---
    const footerText = 'Export Under Duty Drawback Scheme, We shall claim the benefit as admissible under , RoDTEP , DBK';
    drawBlueHeader(footerText, margin, y, contentWidth, 15);
    y += 15;

    drawBlueHeader('Supplier No. 1', margin, y, contentWidth, 15);
    y += 15;
    
    const supplierDetails = [
      `Name\t\t: ${manufacturer.companyName}`,
      `GSTTIN No.\t: ${manufacturer.gstNumber}`,
      `Tax Invoice No & Date : ${docData.manufacturerInvoiceNumber || 'N/A'} Dt.${docData.manufacturerInvoiceDate ? format(new Date(docData.manufacturerInvoiceDate), 'dd/MM/yyyy') : 'N/A'}\t\tEPCG LIC NO : N/A`,
      `Export Under GST Circular No. 26/2017 Custom Dt. 01/07/2017`,
      `Letter Of Undertaking No. Acknowledgment For LUT Application Reference Number (ARN) N/A`,
    ];
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(supplierDetails.join('\n'), margin + 5, y + 10);
    y += 60; // Adjust space as needed

    // --- Declaration and Signature ---
    doc.rect(margin, y, contentWidth, 60); // Box for declaration and signature
    
    const declarationText = 'We declare that this Invoice shows the actual price of the goods described and that all particulars are true and correct.';
    doc.setFont('helvetica', 'bold');
    doc.text('Declaration:', margin + 5, y + 10);
    doc.setFont('helvetica', 'normal');
    const declarationLines = doc.splitTextToSize(declarationText, contentWidth / 2 - 15);
    doc.text(declarationLines, margin + 5, y + 22);
    
    doc.line(margin + contentWidth / 2, y, margin + contentWidth / 2, y + 60); // Vertical separator
    
    doc.setFont('helvetica', 'bold');
    doc.text('Signature & Date:', margin + contentWidth / 2 + 5, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(), 'dd/MM/yyyy'), margin + contentWidth / 2 + 80, y + 10);

    doc.setFont('helvetica', 'bold');
    doc.text(`FOR, ${exporter.companyName}`, margin + contentWidth / 2 + 5, y + 30);
    doc.text('AUTHORISED SIGNATURE', margin + contentWidth - 5, y + 55, { align: 'right' });


    // --- Save the PDF ---
    doc.save(`Custom_Invoice_${docData.exportInvoiceNumber.replace(/[\\/:*?"<>|]/g, '_')}.pdf`);
}
