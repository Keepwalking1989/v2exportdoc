
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { ExportDocument, ManufacturerInfo, ExportDocumentProductItem } from '@/types/export-document';
import type { Company } from '@/types/company'; // For Exporter
import type { Manufacturer } from '@/types/manufacturer';
import type { Size } from '@/types/size';
import type { Product } from '@/types/product';

const FONT_CAT1_SIZE = 14;
const FONT_CAT2_SIZE = 10;
const FONT_SMALL_FOOTER_LABEL_SIZE = 7;
const FONT_CAT3_SIZE = 9;
const FONT_BODY_SIZE = 9;


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
    manufacturersWithDetails: (Manufacturer & { invoiceNumber: string, invoiceDate?: Date })[],
    allProducts: Product[],
    allSizes: Size[]
) {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    let yPos = 20;
    const pageMargin = 20;
    
    const COLOR_BLUE_RGB = [217, 234, 247]; // Light Blue

    // --- Style Definitions (Classes) ---
    const classOneStyles = { 
        fontStyle: 'bold',
        textColor: '#000000',
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.5,
        lineColor: '#000000',
        fillColor: COLOR_BLUE_RGB,
        cellPadding: 2,
    };
    const classTwoStyles = { 
        fontStyle: 'normal',
        textColor: '#000000',
        valign: 'middle',
        lineWidth: 0.5,
        lineColor: '#000000',
        cellPadding: 2,
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
            styles: { ...classOneStyles, fontSize: 9, valign: 'middle', halign: 'center' }
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
                { content: `${exporter.companyName}\n${exporter.address || ''}`, styles: { ...classTwoStyles, halign: 'left', cellPadding: 2 } },
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
                { content: 'TO THE\nORDER', styles: { ...classTwoStyles, halign: 'center', minCellHeight: 10 } },
                { content: 'TO THE\nORDER', styles: { ...classTwoStyles, halign: 'center', minCellHeight: 10 } }
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
                { content: 'By Road', styles: {...classTwoStyles, halign: 'center', cellPadding: 1} },
                { content: 'Morbi', styles: {...classTwoStyles, halign: 'center', cellPadding: 1} },
                { content: 'INDIA', styles: {...classTwoStyles, halign: 'center', cellPadding: 1} },
                { content: docData.countryOfFinalDestination, styles: {...classTwoStyles, halign: 'center', cellPadding: 1} },
            ],
            [
                { content: 'Vessel / Flight No.', styles: {...classOneStyles} },
                { content: 'Port Of Loading', styles: {...classOneStyles} },
                { content: 'Port Of Discharge', styles: {...classOneStyles} },
                { content: 'Final Destination', styles: {...classOneStyles} },
            ],
             [
                { content: docData.vesselFlightNo || 'N/A', styles: {...classTwoStyles, halign: 'center', cellPadding: 1} },
                { content: docData.portOfLoading || 'N/A', styles: {...classTwoStyles, halign: 'center', cellPadding: 1} },
                { content: docData.portOfDischarge || 'N/A', styles: {...classTwoStyles, halign: 'center', cellPadding: 1} },
                { content: docData.finalDestination || 'N/A', styles: {...classTwoStyles, halign: 'center', cellPadding: 1} },
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
            [{ content: 'Terms Of Delivery & Payments', styles: {...classOneStyles, halign: 'left', cellPadding: 1} }],
            [{ content: docData.termsOfDeliveryAndPayment || 'N/A', styles: {...classTwoStyles, halign: 'left', cellPadding: 1} }],
        ],
         margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    const allProductItems: ExportDocumentProductItem[] = [];
    const allSampleItems: ExportDocumentProductItem[] = [];
    docData.containerItems?.forEach(container => {
        (container.productItems || []).forEach(item => allProductItems.push(item));
        (container.sampleItems || []).forEach(item => allSampleItems.push(item));
    });

    const groupItems = (items: ExportDocumentProductItem[]) => {
        const grouped = new Map<string, any>();

        items.forEach(item => {
            const product = allProducts.find(p => p.id === item.productId);
            const size = product ? allSizes.find(s => s.id === product.sizeId) : undefined;
            if (!size) return;

            // Group by both size and rate to handle different prices for the same size
            const key = `${size.id}-${item.rate}`;

            if (!grouped.has(key)) {
                const hsnCode = size.hsnCode || 'N/A';
                const description = hsnCode === '69072100'
                    ? `Polished Glazed Vitrified Tiles ( PGVT ) (${size.size})`
                    : `Vitrified Tiles (${size.size})`;

                grouped.set(key, {
                    hsnCode: hsnCode,
                    description: description,
                    rate: item.rate || 0,
                    boxes: 0,
                    sqm: 0,
                    total: 0,
                });
            }
            
            const existing = grouped.get(key);
            const sqmForThisItem = (item.boxes || 0) * (size.sqmPerBox || 0);

            existing.boxes += item.boxes || 0;
            existing.sqm += sqmForThisItem;
            existing.total += sqmForThisItem * (item.rate || 0);
        });
        
        return Array.from(grouped.values());
    };

    const groupedProducts = groupItems(allProductItems);
    const groupedSamples = groupItems(allSampleItems);

    let grandTotalBoxes = 0;
    let grandTotalSqm = 0;
    let grandTotalAmount = 0;
    let srNoCounter = 1;

    const tableBody: any[] = [];

    groupedProducts.forEach(item => {
        grandTotalBoxes += item.boxes;
        grandTotalSqm += item.sqm;
        grandTotalAmount += item.total;
        
        // After grouping, the effective rate is the total value divided by total sqm for that group
        const effectiveRate = item.sqm > 0 ? item.total / item.sqm : 0;

        tableBody.push([
            item.hsnCode,
            srNoCounter++,
            item.description,
            item.boxes.toString(),
            item.sqm.toFixed(2),
            effectiveRate.toFixed(2),
            item.total.toFixed(2)
        ]);
    });

    if (groupedSamples.length > 0) {
        tableBody.push([
            { 
                content: 'Free Of Cost Samples', 
                colSpan: 7,
                styles: { fontStyle: 'bold', halign: 'center' } 
            }
        ]);

        groupedSamples.forEach(item => {
            grandTotalBoxes += item.boxes;
            grandTotalSqm += item.sqm;
            // Samples have 0 value, do not add to grandTotalAmount
            
            tableBody.push([
                item.hsnCode,
                srNoCounter++,
                item.description,
                item.boxes.toString(),
                item.sqm.toFixed(2),
                (0).toFixed(2), // Rate is 0
                (0).toFixed(2)  // Total is 0
            ]);
        });
    }


    const emptyRowCount = 5;
    for (let i = 0; i < emptyRowCount; i++) {
        tableBody.push(['', '', '', '', '', '', '']);
    }

    const conversationRate = docData.conversationRate || 0;
    const totalAmountInr = grandTotalAmount * conversationRate;
    const gstString = docData.gst || "0";
    const gstRate = parseFloat(gstString.replace('%', '')) / 100 || 0;
    const gstAmount = totalAmountInr * gstRate;
    const finalTotalInr = totalAmountInr + gstAmount;

    const tableFooter = [
        [
            { content: 'TOTAL', colSpan: 3, styles: {...classOneStyles, halign: 'left'} },
            { content: grandTotalBoxes.toString(), styles: {...classTwoStyles, halign: 'right'} },
            { content: grandTotalSqm.toFixed(2), styles: {...classTwoStyles, halign: 'right'} },
            { content: '', styles: {...classTwoStyles} },
            { content: `$ ${grandTotalAmount.toFixed(2)}`, styles: {...classTwoStyles, halign: 'right'} },
        ],
        [
            { content: 'Total No. Of Pkgs.', colSpan: 3, styles: { ...classOneStyles, cellPadding: 2, halign: 'center', fontSize: 6 } },
            { content: 'EXCHANGE RATE NOFICATION NUMBER AND DATE', colSpan: 4, styles: { ...classOneStyles, cellPadding: 2, fontSize: FONT_SMALL_FOOTER_LABEL_SIZE, halign: 'center' } }
        ],
        [
            { content: grandTotalBoxes.toString(), colSpan: 3, styles: { ...classTwoStyles, halign: 'center', cellPadding: 2 } },
            { content: docData.exchangeNotification || 'N/A', colSpan: 2, styles: { ...classTwoStyles, halign: 'center', cellPadding: 2 } },
            { content: docData.exchangeDate ? format(new Date(docData.exchangeDate), 'dd/MM/yyyy') : 'N/A', colSpan: 2, styles: { ...classTwoStyles, halign: 'center', cellPadding: 2 } }
        ],
        [
            { content: 'Amount In Words', colSpan: 3, styles: { ...classOneStyles, cellPadding: 2, halign: 'center', fontSize: 6 } },
            { content: 'EXCHANGE RATE', styles: { ...classOneStyles, cellPadding: 2, fontSize: FONT_SMALL_FOOTER_LABEL_SIZE, halign: 'center' } },
            { content: '1 USD', styles: { ...classTwoStyles, halign: 'center', cellPadding: 2 } },
            { content: conversationRate.toFixed(2), colSpan: 2, styles: { ...classTwoStyles, halign: 'center', cellPadding: 2 } }
        ],
        [
            { content: amountToWordsUSD(grandTotalAmount), rowSpan: 4, colSpan: 3, styles: { ...classTwoStyles, halign: 'left' } },
            { content: 'FOB', styles: { ...classOneStyles, cellPadding: 2, fontSize: 6, halign: 'center' } },
            { content: 'INR', styles: { ...classTwoStyles, halign: 'center', cellPadding: 2 } },
            { content: totalAmountInr.toFixed(2), colSpan: 2, styles: { ...classTwoStyles, halign: 'center', cellPadding: 2 } }
        ],
        [
            { content: 'IGST %', styles: { ...classOneStyles, cellPadding: 2, fontSize: 6, halign: 'center' } },
            { content: docData.gst || '0%', styles: { ...classTwoStyles, halign: 'center', cellPadding: 2 } },
            { content: gstAmount.toFixed(2), colSpan: 2, styles: { ...classTwoStyles, halign: 'center', cellPadding: 2 } }
        ],
        [
            { content: 'TOTAL', styles: { ...classOneStyles, cellPadding: 2, halign: 'center', fontSize: 6 } },
            { content: 'INR', styles: { ...classTwoStyles, halign: 'center', cellPadding: 2 } },
            { content: finalTotalInr.toFixed(2), colSpan: 2, styles: { ...classTwoStyles, halign: 'center', cellPadding: 2 } }
        ],
         [
            { content: '', styles: { ...classTwoStyles, cellPadding: 2, minCellHeight: 10 }, colSpan: 4 } // Empty row for spacing
        ],
    ];

    autoTable(doc, {
        startY: yPos,
        head: [['HSN Code', 'Sr.\nNo', 'Description Of Goods', 'Boxes', 'Sq.Mtr', 'Rate Per SQM in $', 'Total Amount\nIn USD $']],
        body: tableBody,
        foot: tableFooter,
        theme: 'grid',
        margin: { left: pageMargin, right: pageMargin },
        headStyles: classOneStyles,
        bodyStyles: {...classTwoStyles, halign: 'left', cellPadding: 1, fontSize: 9 },
        footStyles: { ...classOneStyles, cellPadding: 2, lineWidth: 0.5 },
        columnStyles: {
            0: { cellWidth: 55 },   // HSN Code
            1: { cellWidth: 25 },   // Sr. No
            2: { cellWidth: 'auto' }, // Description Of Goods
            3: { cellWidth: 40, halign: 'right' },    // Boxes
            4: { cellWidth: 45, halign: 'right' },    // Sq.Mtr
            5: { cellWidth: 60, halign: 'right' },    // Rate
            6: { cellWidth: 70, halign: 'right' },    // Total Amount
        },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    const footerText = 'Export Under GST Circular No. 26/2017 Custom Dt. 01/07/2017';
    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [[{ content: footerText, styles: { ...classOneStyles, halign: 'center', cellPadding: 1 }}]],
        margin: { left: pageMargin, right: pageMargin },
        styles: { cellPadding: 1 },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [[{ content: 'SUPPLIER DETAILS', styles: { ...classOneStyles, halign: 'center' } }]],
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    manufacturersWithDetails.forEach(manu => {
        const taxInvoiceText = `${manu.invoiceNumber || 'N/A'} & ${manu.invoiceDate ? format(new Date(manu.invoiceDate), 'dd/MM/yyyy') : 'N/A'}`;
        autoTable(doc, {
            startY: yPos,
            theme: 'grid',
            body: [
                [
                    { content: 'Name', styles: { ...classOneStyles, cellPadding: 1, halign: 'left' } },
                    { content: manu.companyName, styles: { ...classTwoStyles, halign: 'left', cellPadding: 1 } },
                    { content: 'GST NO', styles: { ...classOneStyles, cellPadding: 1, fontSize: 8 } },
                    { content: manu.gstNumber, styles: { ...classTwoStyles, halign: 'left', cellPadding: 1 } },
                ],
                [
                    { content: 'Tax Invoice No & Date', styles: { ...classOneStyles, cellPadding: 1, halign: 'left' } },
                    { content: taxInvoiceText, styles: { ...classTwoStyles, halign: 'left', cellPadding: 1 }, colSpan: 3 },
                ]
            ],
            columnStyles: {
                0: { cellWidth: 120 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 60 },
                3: { cellWidth: 120 },
            },
            margin: { left: pageMargin, right: pageMargin },
            didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
        });
        // @ts-ignore
        yPos = doc.lastAutoTable.finalY;
    });

    const declarationText = 'We declare that this Invoice shows the actual price of the goods described and that all particulars are true and correct.';
    
    autoTable(doc, {
        startY: yPos,
        theme: 'plain',
        body: [
            [
                {
                    content: `Declaration:\n${declarationText}`,
                    rowSpan: 4, 
                    styles: {
                        fontStyle: 'normal',
                        textColor: [0, 0, 0],
                        fontSize: 8,
                        lineWidth: 0.5,
                        lineColor: [0, 0, 0],
                        valign: 'top',
                        halign: 'left',
                        cellPadding: 2,
                    }
                },
                {
                    content: 'Signature & Date:',
                    styles: {lineWidth: 0.5, lineColor: [0,0,0], ...classTwoStyles, fontStyle: 'bold', halign: 'left'}
                },
                {
                    content: format(new Date(), 'dd/MM/yyyy'),
                    styles: {lineWidth: 0.5, lineColor: [0,0,0], ...classTwoStyles, halign: 'center'}
                }
            ],
            [
                {
                    content: `FOR, ${exporter.companyName.toUpperCase()}`,
                    colSpan: 2,
                    styles: {lineWidth: 0.5, lineColor: [0,0,0], ...classOneStyles}
                }
            ],
            [
                 {
                    content: '',
                    colSpan: 2,
                    styles: {lineWidth: 0.5, lineColor: [0,0,0], minCellHeight: 60}
                }
            ],
            [
                {
                    content: 'AUTHORISED SIGNATURE',
                    colSpan: 2,
                    styles: {lineWidth: 0.5, lineColor: [0,0,0], ...classTwoStyles, fontStyle: 'bold', halign: 'center'}
                }
            ]
        ],
        columnStyles: {
            0: { cellWidth: 350 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 'auto' },
        },
        margin: { left: pageMargin, right: pageMargin },
    });

    doc.save(`Custom_Invoice_${docData.exportInvoiceNumber.replace(/[\\/:*?"<>|]/g, '_')}.pdf`);
}
