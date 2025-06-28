
'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { ExportDocument, ExportDocumentProductItem } from '@/types/export-document';
import type { Company } from '@/types/company'; // For Exporter
import type { Manufacturer } from '@/types/manufacturer';
import type { Size } from '@/types/size';
import type { Product } from '@/types/product';

// --- Reusable Style Definitions ---
const classOneStyles = { 
    fontStyle: 'bold',
    textColor: '#000000',
    halign: 'center',
    valign: 'middle',
    lineWidth: 0.5,
    lineColor: '#000000',
    fillColor: [217, 234, 247], // Light Blue
};
const classTwoStyles = { 
    fontStyle: 'normal',
    textColor: '#000000',
    valign: 'middle',
    lineWidth: 0.5,
    lineColor: '#000000',
};
const classThreeStyles = { 
    fontStyle: 'normal',
    textColor: '#000000',
    fontSize: 8,
};

// --- Main PDF Generation Function ---
export function generatePackingListPdf(
    docData: ExportDocument,
    exporter: Company,
    manufacturer: Manufacturer | undefined, // Though not directly displayed, might be useful in future
    allProducts: Product[],
    allSizes: Size[]
) {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    let yPos = 20;
    const pageMargin = 20;
    
    // --- Document Header ---
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('PACKING LIST', doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });
    yPos += 20;

    // --- Exporter, Invoice Details, Ref (as a table) ---
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
        columnStyles: { 0: { cellWidth: '40%' }, 1: { cellWidth: '40%' }, 2: { cellWidth: '20%' } },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    // --- Consignee & Buyer ---
    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [
            [
                { content: 'Consignee:-', styles: { ...classOneStyles, halign: 'center' } },
                { content: 'Buyer (If Not Consignee)', styles: { ...classOneStyles, halign: 'center' } }
            ],
            [
                { content: `Davare Floors, Inc.\n19 E 60 TH ST, Hialeah,FL.33013 . USA`, styles: { ...classTwoStyles, minCellHeight: 35, halign: 'left' } },
                { content: `Davare Floors, Inc.\n19 E 60 TH ST, Hialeah,FL.33013 . USA`, styles: { ...classTwoStyles, minCellHeight: 35, halign: 'left' } }
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
                { content: 'Terms Of Delivery & Payments', colSpan: 2, styles: {...classOneStyles} },
            ],
             [
                { content: docData.vesselFlightNo || 'N/A', styles: {...classTwoStyles, halign: 'center', cellPadding: 1} },
                { content: docData.portOfLoading || 'N/A', styles: {...classTwoStyles, halign: 'center', cellPadding: 1} },
                { content: docData.termsOfDeliveryAndPayment || 'N/A', colSpan: 2, styles: {...classTwoStyles, halign: 'left', minCellHeight: 20, cellPadding: 1} },
            ],
             [
                { content: 'Port Of Discharge', styles: {...classOneStyles} },
                { content: 'Final Destination', styles: {...classOneStyles} },
                { content: 'Marks & Nos.', colSpan: 2, styles: {...classOneStyles} },
            ],
             [
                { content: docData.portOfDischarge || 'N/A', styles: {...classTwoStyles, halign: 'center', cellPadding: 1} },
                { content: docData.finalDestination || 'N/A', styles: {...classTwoStyles, halign: 'center', cellPadding: 1} },
                { content: `${docData.containerItems?.length || 0} Container(s)`, colSpan: 2, styles: {...classTwoStyles, halign: 'center', cellPadding: 1} },
            ],
        ],
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    // --- Main Product Table ---
    let grandTotalBoxes = 0;
    let grandTotalSqm = 0;
    let grandTotalNetWt = 0;
    let grandTotalGrossWt = 0;

    const tableBody: any[] = [];
    let srNoCounter = 1;

    const allProductItems: ExportDocumentProductItem[] = [];
    const allSampleItems: ExportDocumentProductItem[] = [];
    docData.containerItems?.forEach(container => {
        (container.productItems || []).forEach(item => allProductItems.push(item));
        (container.sampleItems || []).forEach(item => allSampleItems.push(item));
    });

    const groupItems = (items: ExportDocumentProductItem[]) => {
        return items.reduce((acc, item) => {
            const product = allProducts.find(p => p.id === item.productId);
            const size = product ? allSizes.find(s => s.id === product.sizeId) : undefined;
            if (!size) return acc; // Skip if size info is missing

            // Group by size only for packing list
            const key = size.id;

            if (!acc[key]) {
                const hsnCode = size.hsnCode || 'N/A';
                const description = hsnCode === '69072100'
                    ? `Polished Glazed Vitrified Tiles ( PGVT ) (${size.size})`
                    : `Vitrified Tiles (${size.size})`; // Generic for grouping

                acc[key] = {
                    hsnCode: hsnCode,
                    description: description,
                    boxes: 0,
                    sqm: 0,
                    netWt: 0,
                    grossWt: 0,
                };
            }
            
            const sqmForThisItem = (item.boxes || 0) * (size.sqmPerBox || 0);
            acc[key].boxes += item.boxes || 0;
            acc[key].sqm += sqmForThisItem;
            acc[key].netWt += item.netWeight || 0;
            acc[key].grossWt += item.grossWeight || 0;
            return acc;
        }, {} as Record<string, any>);
    };

    const groupedProducts = Object.values(groupItems(allProductItems));
    groupedProducts.forEach(item => {
        grandTotalBoxes += item.boxes;
        grandTotalSqm += item.sqm;
        grandTotalNetWt += item.netWt;
        grandTotalGrossWt += item.grossWt;

        tableBody.push([
            item.hsnCode,
            srNoCounter++,
            item.description,
            item.boxes.toString(),
            item.sqm.toFixed(2),
            item.netWt.toFixed(2),
            item.grossWt.toFixed(2)
        ]);
    });

    if (allSampleItems.length > 0) {
        tableBody.push([
            { 
                content: 'Free Of Cost Samples', 
                colSpan: 7,
                styles: { fontStyle: 'bold', halign: 'center' } 
            }
        ]);

        const groupedSamples = Object.values(groupItems(allSampleItems));
        groupedSamples.forEach(item => {
            grandTotalBoxes += item.boxes;
            grandTotalSqm += item.sqm;
            grandTotalNetWt += item.netWt;
            grandTotalGrossWt += item.grossWt;

            tableBody.push([
                item.hsnCode,
                srNoCounter++,
                item.description,
                item.boxes.toString(),
                item.sqm.toFixed(2),
                item.netWt.toFixed(2),
                item.grossWt.toFixed(2)
            ]);
        });
    }

    const emptyRowCount = 5;
    for (let i = 0; i < emptyRowCount; i++) {
        tableBody.push(['', '', '', '', '', '', '']);
    }

    autoTable(doc, {
        startY: yPos,
        head: [['HSN Code', 'Sr. No.', 'Description Of Goods', 'Boxes', 'Sq.Mtr', 'Net Wt. (Kgs)', 'Gross Wt. (Kgs)']],
        body: tableBody,
        foot: [[
             { content: 'TOTAL', colSpan: 3, styles: {...classOneStyles, halign: 'left'} },
             { content: grandTotalBoxes.toString(), styles: {...classTwoStyles, halign: 'right'} },
             { content: grandTotalSqm.toFixed(2), styles: {...classTwoStyles, halign: 'right'} },
             { content: grandTotalNetWt.toFixed(2), styles: {...classTwoStyles, halign: 'right'} },
             { content: grandTotalGrossWt.toFixed(2), styles: {...classTwoStyles, halign: 'right'} },
        ]],
        theme: 'grid',
        headStyles: classOneStyles,
        bodyStyles: {...classTwoStyles, cellPadding: 1, valign: 'top' },
        footStyles: {...classOneStyles, cellPadding: 1 },
        margin: { left: pageMargin, right: pageMargin },
        columnStyles: {
            0: { cellWidth: 70, halign: 'center' },
            1: { cellWidth: 40, halign: 'center' },
            2: { cellWidth: 'auto', halign: 'left' },
            3: { cellWidth: 50, halign: 'right' },
            4: { cellWidth: 60, halign: 'right' },
            5: { cellWidth: 65, halign: 'right' },
            6: { cellWidth: 65, halign: 'right' },
        },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    // --- Container Details Table ---
    const containerTableBody: any[] = [];
    docData.containerItems?.forEach(container => {
        const totalBoxes = (container.productItems || []).reduce((sum, item) => sum + (item.boxes || 0), 0) + 
                           (container.sampleItems || []).reduce((sum, item) => sum + (item.boxes || 0), 0);
        const totalNetWt = (container.productItems || []).reduce((sum, item) => sum + (item.netWeight || 0), 0) +
                           (container.sampleItems || []).reduce((sum, item) => sum + (item.netWeight || 0), 0);
        const totalGrossWt = (container.productItems || []).reduce((sum, item) => sum + (item.grossWeight || 0), 0) +
                             (container.sampleItems || []).reduce((sum, item) => sum + (item.grossWeight || 0), 0);

        containerTableBody.push([
            container.containerNo || 'N/A',
            container.lineSeal || 'N/A',
            container.rfidSeal || 'N/A',
            container.description || 'N/A',
            totalBoxes.toString(),
            `${container.startPalletNo || 'N/A'} to ${container.endPalletNo || 'N/A'}`,
            totalNetWt.toFixed(2),
            totalGrossWt.toFixed(2),
        ]);
    });
    autoTable(doc, {
        startY: yPos,
        head: [['CONTAINER NO.', 'Line Seal', 'RFID SEAL', 'DISCRIPTION', 'BOXES', 'Pallet No.', 'Net Wt.', 'Gross Wt.']],
        body: containerTableBody,
        theme: 'grid',
        headStyles: classOneStyles,
        bodyStyles: {...classTwoStyles, halign: 'center', cellPadding: 2},
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;
    
    // --- Final Declarations & Signature ---
    const dutyDrawbackText = `Export Under Duty Drawback Scheme, We shall claim the benefit as admissible under "MEIS" Scheme , RoDTEP , DBK ,LUT Application Reference Number (ARN) AD240324138081L`;
    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [[{ content: dutyDrawbackText, styles: { ...classTwoStyles, ...classThreeStyles, halign: 'left'} }]],
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [[
            { content: 'Certified That Goods Are Of Indian Origin', styles: {...classTwoStyles, ...classThreeStyles, halign: 'center'} }
        ]],
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    const declarationText = 'We declare that this Invoice shows the actual price of the goods described and that all particulars are true and correct.';
    autoTable(doc, {
        startY: yPos,
        theme: 'plain',
        body: [
            [ // Row 1 of the whole block
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
            [ // Row 2 of the signature block (declaration cell is spanned)
                {
                    content: `FOR, ${exporter.companyName.toUpperCase()}`,
                    colSpan: 2,
                    styles: {lineWidth: 0.5, lineColor: [0,0,0], ...classOneStyles}
                }
            ],
            [ // Row 3 (empty for signature)
                 {
                    content: '',
                    colSpan: 2,
                    styles: {lineWidth: 0.5, lineColor: [0,0,0], minCellHeight: 40}
                }
            ],
            [ // Row 4
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

    // --- Save the PDF ---
    doc.save(`Packing_List_${docData.exportInvoiceNumber.replace(/[\\/:*?"<>|]/g, '_')}.pdf`);
}
