
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
const FONT_CAT3_SIZE = 9;
const FONT_BODY_SIZE = 9;


// --- Helper for amount in words ---
function amountToWordsUSD(amount: number): string {
    if (amount === null || amount === undefined) return 'Zero Dollars only';
    if (amount === 0) return 'Zero Dollars only';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertLessThanOneThousand(n: number): string {
        if (n === 0) return '';
        let currentWords = '';
        if (n >= 100) {
            currentWords += ones[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
        }
        if (n >= 20) {
            currentWords += tens[Math.floor(n / 10)] + ' ';
            n %= 10;
        }
        if (n > 0) {
            currentWords += ones[n] + ' ';
        }
        return currentWords.trim();
    }
    
    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);

    let integerWords = '';
    if (integerPart > 0) {
        let num = integerPart;
        const scales = ['', 'Thousand', 'Million', 'Billion'];
        let scaleIndex = 0;
        let parts: string[] = [];
        while (num > 0) {
            const chunk = num % 1000;
            if (chunk > 0) {
                parts.unshift(convertLessThanOneThousand(chunk) + ' ' + scales[scaleIndex]);
            }
            num = Math.floor(num / 1000);
            scaleIndex++;
        }
        integerWords = parts.join(' ').trim();
    }

    const dollarString = integerPart > 0 ? `${integerWords} Dollars` : 'Zero Dollars';
    
    let centString = '';
    if (decimalPart > 0) {
        centString = ` and ${convertLessThanOneThousand(decimalPart)} Cents`;
    }

    return `${dollarString}${centString} only`.replace(/\s\s+/g, ' ').trim();
}


// --- Reusable Drawing Function ---
function drawCustomInvoice(
    doc: jsPDF,
    docData: ExportDocument,
    exporter: Company,
    manufacturersWithDetails: (Manufacturer & { invoiceNumber: string, invoiceDate?: Date })[],
    allProducts: Product[],
    allSizes: Size[],
    signatureImage: Uint8Array | null,
    roundSealImage: Uint8Array | null,
    padding: number
): number {
    let yPos = 20;
    const pageMargin = 20;
    const contentWidth = doc.internal.pageSize.getWidth() - (2 * pageMargin);
    
    const COLOR_BLUE_RGB = [217, 234, 247]; // Light Blue

    const classOneStyles = { 
        fontStyle: 'bold',
        textColor: '#000000',
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.5,
        lineColor: '#000000',
        fillColor: COLOR_BLUE_RGB,
        cellPadding: padding,
        fontSize: FONT_CAT2_SIZE,
    };
    const classTwoStyles = { 
        fontStyle: 'normal',
        textColor: '#000000',
        valign: 'middle',
        lineWidth: 0.5,
        lineColor: '#000000',
        cellPadding: padding,
        fontSize: FONT_CAT3_SIZE,
    };
    
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

    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [
            [
                { content: 'Exporter', styles: { ...classOneStyles } },
                { content: 'Export Invoice No & Date', styles: { ...classOneStyles } },
                { content: 'Export Ref.', styles: { ...classOneStyles } }
            ],
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

    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [
            [
                { content: 'Consignee:-', styles: { ...classOneStyles, halign: 'center' } },
                { content: 'Buyer (If Not Consignee)', styles: { ...classOneStyles, halign: 'center' } }
            ],
            [
                { content: 'TO THE\nORDER', styles: { ...classTwoStyles, halign: 'center', minCellHeight: 10 } },
                { content: 'TO THE\nORDER', styles: { ...classTwoStyles, halign: 'center', minCellHeight: 10 } }
            ]
        ],
        margin: { left: pageMargin, right: pageMargin },
        columnStyles: {
            0: { cellWidth: '50%' },
            1: { cellWidth: '50%' },
        },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

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
                { content: 'By Road', styles: {...classTwoStyles, halign: 'center' } },
                { content: 'Morbi', styles: {...classTwoStyles, halign: 'center' } },
                { content: 'INDIA', styles: {...classTwoStyles, halign: 'center' } },
                { content: docData.countryOfFinalDestination, styles: {...classTwoStyles, halign: 'center' } },
            ],
            [
                { content: 'Vessel / Flight No.', styles: {...classOneStyles} },
                { content: 'Port Of Loading', styles: {...classOneStyles} },
                { content: 'Port Of Discharge', styles: {...classOneStyles} },
                { content: 'Final Destination', styles: {...classOneStyles} },
            ],
             [
                { content: docData.vesselFlightNo || 'N/A', styles: {...classTwoStyles, halign: 'center' } },
                { content: docData.portOfLoading || 'N/A', styles: {...classTwoStyles, halign: 'center' } },
                { content: docData.portOfDischarge || 'N/A', styles: {...classTwoStyles, halign: 'center' } },
                { content: docData.finalDestination || 'N/A', styles: {...classTwoStyles, halign: 'center' } },
            ],
        ],
        margin: { left: pageMargin, right: pageMargin },
        columnStyles: {
            0: { cellWidth: '25%' },
            1: { cellWidth: '25%' },
            2: { cellWidth: '25%' },
            3: { cellWidth: '25%' },
        },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [
            [{ content: 'Terms Of Delivery & Payments', styles: {...classOneStyles, halign: 'left'} }],
            [{ content: docData.termsOfDeliveryAndPayment || 'N/A', styles: {...classTwoStyles, halign: 'left'} }],
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
            const key = `${size.id}-${item.rate}`;
            if (!grouped.has(key)) {
                const hsnCode = size.hsnCode || 'N/A';
                const description = hsnCode === '69072100' ? `Polished Glazed Vitrified Tiles ( PGVT ) (${size.size})` : `Vitrified Tiles (${size.size})`;
                grouped.set(key, { hsnCode: hsnCode, description: description, rate: item.rate || 0, boxes: 0, sqm: 0, total: 0 });
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
    let grandTotalAmountUSD = 0;
    let srNoCounter = 1;

    const tableBody: any[] = [];
    groupedProducts.forEach(item => {
        grandTotalBoxes += item.boxes;
        grandTotalSqm += item.sqm;
        grandTotalAmountUSD += item.total;
        const effectiveRate = item.sqm > 0 ? item.total / item.sqm : 0;
        tableBody.push([item.hsnCode, srNoCounter++, item.description, item.boxes.toString(), item.sqm.toFixed(2), `$ ${effectiveRate.toFixed(2)}`, `$ ${item.total.toFixed(2)}`]);
    });
    if (groupedSamples.length > 0) {
        tableBody.push([{ content: 'Free Of Cost Samples', colSpan: 7, styles: { fontStyle: 'bold', halign: 'center' } }]);
        groupedSamples.forEach(item => {
            grandTotalBoxes += item.boxes;
            grandTotalSqm += item.sqm;
            // Samples don't add to total amount
            // grandTotalAmountUSD += item.total;
            const effectiveRate = item.sqm > 0 ? item.total / item.sqm : 0;
            tableBody.push([item.hsnCode, srNoCounter++, item.description, item.boxes.toString(), item.sqm.toFixed(2), `$ ${effectiveRate.toFixed(2)}`, `$ ${item.total.toFixed(2)}`]);
        });
    }
    const emptyRowCount = 5;
    for (let i = 0; i < emptyRowCount; i++) { tableBody.push(['', '', '', '', '', '', '']); }

    // --- Corrected Calculation Flow ---
    const freightUSD = docData.freight || 0;
    const discountUSD = docData.discount || 0;
    const finalTotalUSD = grandTotalAmountUSD + freightUSD - discountUSD;
    
    const conversationRate = parseFloat(String(docData.conversationRate)) || 0;
    const totalAmountInr = finalTotalUSD * conversationRate; // Correctly calculate INR total based on final USD amount
    
    const gstString = docData.gst || "0";
    const gstRate = parseFloat(gstString.replace('%', '')) / 100 || 0;
    const gstAmount = totalAmountInr * gstRate; // GST is on the INR value


    const tableFooter: any[] = [
        [
            { content: 'TOTAL', colSpan: 3, styles: {...classOneStyles, halign: 'center', fontSize: FONT_CAT2_SIZE} },
            { content: grandTotalBoxes.toString(), styles: {...classTwoStyles, halign: 'right'} },
            { content: grandTotalSqm.toFixed(2), styles: {...classTwoStyles, halign: 'right'} },
            { content: '', styles: {...classTwoStyles} },
            { content: `$ ${grandTotalAmountUSD.toFixed(2)}`, styles: {...classTwoStyles, halign: 'right'} },
        ],
    ];

    if (freightUSD > 0.1) {
        tableFooter.push([
            { content: 'FREIGHT', colSpan: 6, styles: { ...classTwoStyles, fontStyle: 'bold', halign: 'right' } },
            { content: `$ ${freightUSD.toFixed(2)}`, styles: { ...classTwoStyles, halign: 'right' } }
        ]);
    }

    if (discountUSD > 0.1) {
        tableFooter.push([
            { content: 'DISCOUNT', colSpan: 6, styles: { ...classTwoStyles, fontStyle: 'bold', halign: 'right' } },
            { content: `(-) $ ${discountUSD.toFixed(2)}`, styles: { ...classTwoStyles, halign: 'right' } }
        ]);
    }

    // Always show final total if freight/discount is applied
    if (freightUSD > 0.1 || discountUSD > 0.1) {
        tableFooter.push([
            { content: 'TOTAL INVOICE VALUE', colSpan: 6, styles: { ...classOneStyles, halign: 'right' } },
            { content: `$ ${finalTotalUSD.toFixed(2)}`, styles: { ...classTwoStyles, fontStyle: 'bold', halign: 'right' } }
        ]);
    }
    
    tableFooter.push(
        [
            { content: 'Total No. Of Pkgs.', colSpan: 3, styles: { ...classOneStyles, halign: 'center', fontSize: 9 } },
            { content: 'EXCHANGE RATE NOTIFICATION NUMBER AND DATE', colSpan: 4, styles: { ...classOneStyles, fontSize: 8, halign: 'center' } }
        ],
        [
            { content: grandTotalBoxes.toString(), colSpan: 3, styles: { ...classTwoStyles, halign: 'center' } },
            { content: docData.exchangeNotification || 'N/A', colSpan: 2, styles: { ...classTwoStyles, halign: 'center' } },
            { content: docData.exchangeDate ? format(new Date(docData.exchangeDate), 'dd/MM/yyyy') : 'N/A', colSpan: 2, styles: { ...classTwoStyles, halign: 'center' } }
        ],
        [
            { content: 'Amount In Words', colSpan: 3, styles: { ...classOneStyles, fontSize: 9, halign: 'center' } },
            { content: 'EXCHANGE RATE', styles: { ...classOneStyles, fontSize: 8, halign: 'center' } },
            { content: '1 USD', styles: { ...classTwoStyles, halign: 'center' } },
            { content: conversationRate.toFixed(2), colSpan: 2, styles: { ...classTwoStyles, halign: 'center' } }
        ]
    );
    
    const amountInWordsStr = amountToWordsUSD(finalTotalUSD);
    const amountInWordsLines = doc.splitTextToSize(amountInWordsStr, (contentWidth * 0.65) - (2 * padding)); // Width of the first cell
    const amountInWordsHeight = (FONT_CAT3_SIZE + 2) * amountInWordsLines.length + (2 * padding);
    
    tableFooter.push(
        [
            { content: amountInWordsStr, rowSpan: 2, colSpan: 3, styles: { ...classTwoStyles, halign: 'left', valign: 'top', cellPadding: padding, minCellHeight: amountInWordsHeight } },
            { content: 'FOB', styles: { ...classOneStyles, fontSize: 9, halign: 'center', cellPadding: padding } },
            { content: 'INR', styles: { ...classTwoStyles, halign: 'center', cellPadding: padding } },
            { content: totalAmountInr.toFixed(2), colSpan: 2, styles: { ...classTwoStyles, halign: 'right', cellPadding: padding } }
        ],
        [
            { content: 'IGST %', styles: { ...classOneStyles, fontSize: 9, halign: 'center', cellPadding: padding } },
            { content: docData.gst || '0%', styles: { ...classTwoStyles, halign: 'center', cellPadding: padding } },
            { content: gstAmount.toFixed(2), colSpan: 2, styles: { ...classTwoStyles, halign: 'right', cellPadding: padding } }
        ]
    );

    autoTable(doc, {
        startY: yPos,
        head: [['HSN Code', 'Sr.\nNo', 'Description Of Goods', 'Boxes', 'Sq.Mtr', 'Rate Per SQM', 'Total Amount']],
        body: tableBody,
        foot: tableFooter,
        theme: 'grid',
        margin: { left: pageMargin, right: pageMargin },
        headStyles: { ...classOneStyles, cellPadding: padding },
        bodyStyles: {...classTwoStyles, halign: 'left', fontSize: 10, cellPadding: padding },
        footStyles: { ...classOneStyles, lineWidth: 0.5 },
        columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 25 }, 2: { cellWidth: 260.28 }, 3: { cellWidth: 40, halign: 'right' }, 4: { cellWidth: 45, halign: 'right' }, 5: { cellWidth: 60, halign: 'right' }, 6: { cellWidth: 70, halign: 'right' } },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    const dutyDrawbackText = 'Export Under Duty Drawback Scheme, We shall claim the benefit as admissible under , RoDTEP , DBK';
    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [[{ content: dutyDrawbackText, styles: { ...classTwoStyles, halign: 'center', fontSize: 9, fontStyle: 'bold' } }]],
        margin: { left: pageMargin, right: pageMargin },
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
                    { content: 'Name', styles: { ...classOneStyles, halign: 'left', cellPadding: padding } },
                    { content: manu.companyName, styles: { ...classTwoStyles, halign: 'left', cellPadding: padding } },
                    { content: 'GST NO', styles: { ...classOneStyles, fontSize: 8, cellPadding: padding } },
                    { content: manu.gstNumber, styles: { ...classTwoStyles, halign: 'left', cellPadding: padding } },
                ],
                [
                    { content: 'Tax Invoice No & Date', styles: { ...classOneStyles, halign: 'left', cellPadding: padding } },
                    { content: taxInvoiceText, styles: { ...classTwoStyles, halign: 'left', cellPadding: padding }, colSpan: 3 },
                ]
            ],
            columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 60 }, 3: { cellWidth: 'auto' } },
            margin: { left: pageMargin, right: pageMargin },
            didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
        });
        // @ts-ignore
        yPos = doc.lastAutoTable.finalY;
    });

    const lutText1 = 'Export Under GST Circular No. 26/2017 Custom Dt. 01/07/2017';
    const lutText2 = 'Letter Of Undertaking No. Acknowledgment For LUT Application Reference Number (ARN) AD2404250084791';

    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [
            [{ content: lutText1, styles: { ...classTwoStyles, halign: 'center', cellPadding: padding, fontSize: 9, fontStyle: 'bold' } }],
            [{ content: lutText2, styles: { ...classTwoStyles, halign: 'center', cellPadding: padding, fontSize: 9, fontStyle: 'bold' } }]
        ],
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    const declarationText = 'We declare that this Invoice shows the actual price of the goods described\nand that all particulars are true and correct.';
    
    autoTable(doc, {
        startY: yPos,
        theme: 'plain',
        body: [
            [ // Row 0
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
                    content: `Signature & Date:`,
                    styles: {
                        ...classOneStyles, 
                        halign: 'left', 
                        cellPadding: 2,
                    }
                },
                {
                    content: `${format(new Date(docData.exportInvoiceDate), 'dd/MM/yyyy')}`,
                    styles: {
                        ...classTwoStyles,
                        halign: 'right',
                        cellPadding: 2,
                    }
                }
            ],
            [ // Row 1
                { 
                    content: `FOR, ${exporter.companyName.toUpperCase()}`, 
                    colSpan: 2, 
                    styles: {
                        lineWidth: 0.5, 
                        lineColor: [0,0,0], 
                        ...classOneStyles, 
                        halign: 'center', 
                        fontSize: FONT_CAT2_SIZE,
                        cellPadding: 2,
                    } 
                }
            ],
            [ // Row 2 - for signature image
                { content: '', colSpan: 2, styles: {lineWidth: 0.5, lineColor: [0,0,0], minCellHeight: 40} }
            ],
            [ // Row 3
                { 
                    content: 'AUTHORISED SIGNATURE', 
                    colSpan: 2, 
                    styles: {
                        lineWidth: 0.5, 
                        lineColor: [0,0,0], 
                        ...classTwoStyles, 
                        fontStyle: 'bold', 
                        halign: 'center',
                        cellPadding: 2,
                    } 
                }
            ]
        ],
        columnStyles: { 
            0: { cellWidth: contentWidth * 0.65 }, 
            1: { cellWidth: (contentWidth * 0.35) / 2 },
            2: { cellWidth: (contentWidth * 0.35) / 2 } 
        },
        margin: { left: pageMargin, right: pageMargin },
        didDrawCell: (data) => {
             // Round Seal in Declaration box
            if (data.section === 'body' && data.row.index === 0 && data.column.index === 0) {
                if (roundSealImage) { doc.addImage(roundSealImage, 'PNG', data.cell.x + data.cell.width - 50, data.cell.y + 10, 40, 40); }
            }
            // Signature in its own empty box
            if (data.section === 'body' && data.row.index === 2 && data.column.index === 1) {
                if (signatureImage) {
                    const cell = data.cell;
                    const imgWidth = 80;
                    const imgHeight = 40;
                    // Center the image in the cell
                    const imgX = cell.x + (cell.width - imgWidth) / 2;
                    const imgY = cell.y + (cell.height - imgHeight) / 2;
                    doc.addImage(signatureImage, 'PNG', imgX, imgY, imgWidth, imgHeight);
                }
            }
        }
    });

    return doc.internal.getNumberOfPages();
}

// --- Main PDF Generation Function (Wrapper) ---
export async function generateCustomInvoicePdf(
    docData: ExportDocument,
    exporter: Company,
    manufacturersWithDetails: (Manufacturer & { invoiceNumber: string, invoiceDate?: Date })[],
    allProducts: Product[],
    allSizes: Size[]
) {
    let signatureImage: Uint8Array | null = null;
    let roundSealImage: Uint8Array | null = null;

    try {
        const signatureResponse = await fetch('/signature.png');
        if (signatureResponse.ok) { signatureImage = new Uint8Array(await signatureResponse.arrayBuffer()); } 
        else { console.warn('Signature image not found at /signature.png'); }

        const roundSealResponse = await fetch('/Hemith-Round.png');
        if (roundSealResponse.ok) { roundSealImage = new Uint8Array(await roundSealResponse.arrayBuffer()); } 
        else { console.warn('Hemith-Round.png not found at /public/Hemith-Round.png'); }
    } catch (error) {
        console.error("Error fetching images for PDF:", error);
    }
    
    const largePadding = 4;
    const smallPadding = 1.5;

    const tempDoc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageCountWithLargePadding = drawCustomInvoice(tempDoc, docData, exporter, manufacturersWithDetails, allProducts, allSizes, signatureImage, roundSealImage, largePadding);
    
    const finalPadding = pageCountWithLargePadding > 1 ? smallPadding : largePadding;

    const finalDoc = new jsPDF({ unit: 'pt', format: 'a4' });
    drawCustomInvoice(finalDoc, docData, exporter, manufacturersWithDetails, allProducts, allSizes, signatureImage, roundSealImage, finalPadding);

    finalDoc.save(`Custom_Invoice_${docData.exportInvoiceNumber.replace(/[\\/:*?"<>|]/g, '_')}.pdf`);
}
