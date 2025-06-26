
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

// --- Main PDF Generation Function ---
export function generateCustomInvoicePdf(
    docData: ExportDocument,
    exporter: Company,
    manufacturer: Manufacturer,
    allProducts: Product[],
    allSizes: Size[]
) {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageMargin = 20;
    let yPos = pageMargin;
    
    const COLOR_BLUE_RGB = [217, 234, 247]; // Light blue for backgrounds

    // --- Style Definitions (Classes) ---
    const classOneStyles = { // Labels
        fontStyle: 'bold',
        textColor: '#000000',
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.5,
        lineColor: '#000000',
        fillColor: COLOR_BLUE_RGB,
    };
    const classTwoStyles = { // Data
        fontStyle: 'normal',
        textColor: '#000000',
        valign: 'middle',
        lineWidth: 0.5,
        lineColor: '#000000',
    };
    const classThreeStyles = { // Fine Print
        fontStyle: 'normal',
        textColor: '#000000',
        fontSize: 8,
    };
    
    // --- Document Header ---
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOM INVOICE', doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });
    yPos += 20;

    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [[{
            content: '"Supply Meant For Export Under Bond & LUT - Letter Of Undertaking Without Payment Of Integrated Tax"',
            styles: { ...classOneStyles, fontSize: 9, valign: 'middle' }
        }]],
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: (data) => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;


    // --- Exporter, Invoice Details, Ref (as a table) ---
    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [
            // Row 1: Labels (Class 1)
            [
                { content: 'Exporter', styles: { ...classOneStyles } },
                { content: 'Export Invoice No & Date', styles: { ...classOneStyles } },
                { content: 'Export Ref.', styles: { ...classOneStyles } }
            ],
            // Row 2: Data (Class 2)
            [
                { content: `${exporter.companyName}\n${exporter.address || ''}`, styles: { ...classTwoStyles, halign: 'left' } },
                { content: `${docData.exportInvoiceNumber}\n${format(new Date(docData.exportInvoiceDate), 'dd/MM/yyyy')}`, styles: { ...classTwoStyles, halign: 'center' } },
                { content: `IEC Code: ${exporter.iecNumber || 'N/A'}`, styles: { ...classTwoStyles, halign: 'left' } },
            ]
        ],
        margin: { left: pageMargin, right: pageMargin },
        columnStyles: {
            0: { cellWidth: '40%' },
            1: { cellWidth: '40%' },
            2: { cellWidth: '20%' },
        },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    // --- Consignee & Buyer ---
    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [
             // Row 1: Labels (Class 1)
            [
                { content: 'Consignee:-', styles: { ...classOneStyles, halign: 'center' } },
                { content: 'Buyer (If Not Consignee)', styles: { ...classOneStyles, halign: 'center' } }
            ],
             // Row 2: Data (Class 2)
            [
                { content: 'TO\nTHE\nORDER', styles: { ...classTwoStyles, minCellHeight: 35 } },
                { content: 'TO\nTHE\nORDER', styles: { ...classTwoStyles, minCellHeight: 35 } }
            ]
        ],
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    // --- Shipment Details Grid ---
    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [
            [
                { content: 'Pre-Carriage By', styles: {...classOneStyles} },
                { content: 'Place Of Receipt By Pre-Carrier', styles: {...classOneStyles} },
                { content: 'Country Of Origin Of Good', styles: {...classOneStyles} },
                { content: 'Country Of Final Destination', styles: {...classOneStyles} },
            ],
            [
                { content: 'By Road', styles: {...classTwoStyles, halign: 'center', cellPadding: 2} },
                { content: 'Morbi', styles: {...classTwoStyles, halign: 'center', cellPadding: 2} },
                { content: 'INDIA', styles: {...classTwoStyles, halign: 'center', cellPadding: 2} },
                { content: docData.countryOfFinalDestination, styles: {...classTwoStyles, halign: 'center', cellPadding: 2} },
            ],
            [
                { content: 'Vessel / Flight No.', styles: {...classOneStyles} },
                { content: 'Port Of Loading', styles: {...classOneStyles} },
                { content: 'Port Of Discharge', styles: {...classOneStyles} },
                { content: 'Final Destination', styles: {...classOneStyles} },
            ],
             [
                { content: docData.vesselFlightNo || 'N/A', styles: {...classTwoStyles, halign: 'center', cellPadding: 2} },
                { content: docData.portOfLoading || 'N/A', styles: {...classTwoStyles, halign: 'center', cellPadding: 2} },
                { content: docData.portOfDischarge || 'N/A', styles: {...classTwoStyles, halign: 'center', cellPadding: 2} },
                { content: docData.finalDestination || 'N/A', styles: {...classTwoStyles, halign: 'center', cellPadding: 2} },
            ],
        ],
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    // --- Terms of Delivery ---
    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [
            [{ content: 'Terms Of Delivery & Payments', styles: {...classOneStyles, halign: 'left'} }],
            [{ content: docData.termsOfDeliveryAndPayment || 'N/A', styles: {...classTwoStyles, halign: 'left', minCellHeight: 30} }],
        ],
         margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;


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

    const emptyRowCount = 5;
    for (let i = 0; i < emptyRowCount; i++) {
        tableBody.push(['', '', '', '', '', '', '']);
    }

    // --- Calculations for Footer ---
    const conversationRate = docData.conversationRate || 0;
    const totalAmountInr = grandTotalAmount * conversationRate;
    const gstRate = parseFloat(docData.gst?.replace('%', '') || '0') / 100;
    const gstAmount = totalAmountInr * gstRate;
    const finalTotalInr = totalAmountInr + gstAmount;

    // --- Footer Structure ---
    const tableFooter = [];
    tableFooter.push([
        { content: 'TOTAL', colSpan: 3, styles: {...classOneStyles, halign: 'left'} },
        { content: grandTotalBoxes.toString(), styles: {...classTwoStyles, halign: 'right'} },
        { content: grandTotalSqm.toFixed(2), styles: {...classTwoStyles, halign: 'right'} },
        { content: '', styles: {...classTwoStyles} },
        { content: `$ ${grandTotalAmount.toFixed(2)}`, styles: {...classTwoStyles, halign: 'right'} },
    ]);
    tableFooter.push([
        { content: '', colSpan: 3, styles: { ...classTwoStyles } },
        { content: 'EXCHANGE RATE NOFICATION NUMBER AND DATE', colSpan: 4, styles: { ...classOneStyles } }
    ]);
    tableFooter.push([
        { content: '', colSpan: 3, styles: { ...classTwoStyles } },
        { content: docData.exchangeNotification || 'N/A', colSpan: 2, styles: { ...classTwoStyles, halign: 'left' } },
        { content: docData.exchangeDate ? format(new Date(docData.exchangeDate), 'dd/MM/yyyy') : 'N/A', colSpan: 2, styles: { ...classTwoStyles, halign: 'right' } }
    ]);
    tableFooter.push([
        { content: '', colSpan: 3, styles: { ...classTwoStyles } },
        { content: 'EXCHANGE RATE', styles: { ...classOneStyles } },
        { content: '1 USD', styles: { ...classTwoStyles } },
        { content: conversationRate.toFixed(2), colSpan: 2, styles: { ...classTwoStyles, halign: 'right' } }
    ]);
    tableFooter.push([
        { content: '', colSpan: 3, styles: { ...classTwoStyles } },
        { content: 'FOB', styles: { ...classOneStyles } },
        { content: 'INR', styles: { ...classTwoStyles } },
        { content: totalAmountInr.toFixed(2), colSpan: 2, styles: { ...classTwoStyles, halign: 'right' } }
    ]);
    tableFooter.push([
        { content: '', colSpan: 3, styles: { ...classTwoStyles } },
        { content: 'IGST %', styles: { ...classOneStyles } },
        { content: docData.gst || '0%', styles: { ...classTwoStyles } },
        { content: gstAmount.toFixed(2), colSpan: 2, styles: { ...classTwoStyles, halign: 'right' } }
    ]);
    tableFooter.push([
        { content: '', colSpan: 3, styles: { ...classTwoStyles } },
        { content: 'TOTAL', styles: { ...classOneStyles } },
        { content: 'INR', styles: { ...classTwoStyles } },
        { content: finalTotalInr.toFixed(2), colSpan: 2, styles: { ...classTwoStyles, halign: 'right' } }
    ]);

    autoTable(doc, {
        startY: yPos,
        head: [['HSN Code', 'Sr.\nNo', 'Description Of Goods', 'Boxes', 'Sq.Mtr', 'Rate in\n$', 'Total Amount\nIn USD $']],
        body: tableBody,
        foot: tableFooter,
        theme: 'grid',
        margin: { left: pageMargin, right: pageMargin },
        headStyles: classOneStyles,
        bodyStyles: {...classTwoStyles, halign: 'left'},
        footStyles: { ...classOneStyles, minCellHeight: 25 },
        columnStyles: {
            0: { cellWidth: 70, halign: 'center' },
            1: { cellWidth: 40, halign: 'center' },
            2: { cellWidth: 'auto' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' },
            6: { halign: 'right' },
        },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    // --- Amount in Words & Totals ---
     autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [
            [
                { content: 'Total No. Of Pkgs.', styles: {...classOneStyles, halign: 'left'} },
                { content: 'Amount In Words', styles: {...classOneStyles, halign: 'left'} },
            ],
             [
                { content: grandTotalBoxes.toString(), styles: {...classTwoStyles, halign: 'center', minCellHeight: 30} },
                { content: amountToWordsUSD(grandTotalAmount), styles: {...classTwoStyles, halign: 'left', minCellHeight: 30} },
            ],
        ],
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    // --- Footer Section ---
    const footerText = 'Export Under Duty Drawback Scheme, We shall claim the benefit as admissible under , RoDTEP , DBK';
    const declarationText = 'We declare that this Invoice shows the actual price of the goods described and that all particulars are true and correct.';
    
    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [[{ content: footerText, styles: { ...classOneStyles, halign: 'center' }}]],
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [[{ content: 'supplier No 1', styles: { ...classOneStyles, halign: 'center' }}]],
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [[
            { content: 'Name', styles: { ...classOneStyles } },
            { content: manufacturer.companyName, styles: { ...classTwoStyles, halign: 'left' } },
            { content: 'GST NO', styles: { ...classOneStyles } },
            { content: manufacturer.gstNumber, styles: { ...classTwoStyles, halign: 'left' } },
        ]],
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    const taxInvoiceText = `${docData.manufacturerInvoiceNumber || 'N/A'} & ${docData.manufacturerInvoiceDate ? format(new Date(docData.manufacturerInvoiceDate), 'dd/MM/yyyy') : 'N/A'}`;
    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [[
            { content: 'Tax Invoice No & Date', styles: { ...classOneStyles } },
            { content: taxInvoiceText, styles: { ...classTwoStyles, halign: 'left' } },
        ]],
        columnStyles: {
            0: { cellWidth: '25%' },
            1: { cellWidth: '75%' },
        },
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [[{ content: 'Export Under GST Circular No. 26/2017 Custom Dt. 01/07/2017', styles: { ...classOneStyles, halign: 'center' }}]],
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [[{ content: 'We claim Duty rebate file.', styles: { ...classOneStyles, halign: 'center' }}]],
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [
            [
                { content: `Declaration:\n${declarationText}`, styles: {...classTwoStyles, ...classThreeStyles, halign: 'left', minCellHeight: 50} },
                { content: `Signature & Date:\n${format(new Date(), 'dd/MM/yyyy')}\n\nFOR, ${exporter.companyName}\n\n\nAUTHORISED SIGNATURE`, styles: {...classTwoStyles, halign: 'center', minCellHeight: 50} }
            ]
        ],
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    // --- Save the PDF ---
    doc.save(`Custom_Invoice_${docData.exportInvoiceNumber.replace(/[\\/:*?"<>|]/g, '_')}.pdf`);
}
