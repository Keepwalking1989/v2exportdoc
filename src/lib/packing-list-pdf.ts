
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
    manufacturer: Manufacturer, // Though not directly displayed, might be useful in future
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
            // Row 1: Labels
            [
                { content: 'Exporter', styles: { ...classOneStyles } },
                { content: 'Export Invoice No & Date', styles: { ...classOneStyles } },
                { content: 'Export Ref.', styles: { ...classOneStyles } }
            ],
            // Row 2: Data
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
             // Row 1: Labels
            [
                { content: 'Consignee:-', styles: { ...classOneStyles, halign: 'center' } },
                { content: 'Buyer (If Not Consignee)', styles: { ...classOneStyles, halign: 'center' } }
            ],
             // Row 2: Data 
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
                { content: '', colSpan: 2, styles: {...classTwoStyles} },
            ],
             [
                { content: docData.portOfDischarge || 'N/A', styles: {...classTwoStyles, halign: 'center', cellPadding: 1} },
                { content: docData.finalDestination || 'N/A', styles: {...classTwoStyles, halign: 'center', cellPadding: 1} },
                { content: '', colSpan: 2, styles: {...classTwoStyles} },
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

    // Process all items together to calculate totals correctly
    const allItems: ExportDocumentProductItem[] = [];
    docData.containerItems?.forEach(container => {
        (container.productItems || []).forEach(item => allItems.push(item));
        (container.sampleItems || []).forEach(item => allItems.push(item));
    });

    const groupedItems = allItems.reduce((acc, item) => {
        const key = item.productId; // Group only by product for packing list
        if (!acc[key]) {
            const product = allProducts.find(p => p.id === item.productId);
            const size = product ? allSizes.find(s => s.id === product.sizeId) : undefined;
            acc[key] = {
                hsnCode: size?.hsnCode || 'N/A',
                description: `${product?.designName || 'Unknown'} (${size?.size || 'N/A'})`,
                boxes: 0,
                sqm: 0,
                netWt: 0,
                grossWt: 0,
            };
        }
        const product = allProducts.find(p => p.id === item.productId);
        const size = product ? allSizes.find(s => s.id === product.sizeId) : undefined;
        const sqmForThisItem = (item.boxes || 0) * (size?.sqmPerBox || 0);
        
        acc[key].boxes += item.boxes || 0;
        acc[key].sqm += sqmForThisItem;
        acc[key].netWt += item.netWeight || 0;
        acc[key].grossWt += item.grossWeight || 0;
        return acc;
    }, {} as Record<string, any>);

    Object.values(groupedItems).forEach(item => {
        grandTotalBoxes += item.boxes;
        grandTotalSqm += item.sqm;
        grandTotalNetWt += item.netWt;
        grandTotalGrossWt += item.grossWt;

        tableBody.push([
            { content: item.hsnCode, rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: srNoCounter++, rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'Glazed Vitrified Tiles' },
            { content: item.boxes.toString() },
            { content: item.sqm.toFixed(2) },
            { content: item.netWt.toFixed(2) },
            { content: item.grossWt.toFixed(2) },
        ]);
        tableBody.push([
            { content: item.description },
            { content: '' },
            { content: '' },
            { content: '' },
            { content: '' },
        ]);
    });

    // Add empty rows
    const emptyRowCount = 5;
    for (let i = 0; i < emptyRowCount; i++) {
        tableBody.push(['', '', '', '', '', '', '']);
    }

    autoTable(doc, {
        startY: yPos,
        head: [['Marks & Nos.\n1 X 20\'', 'Description Of Goods', 'Net Wt.', 'Gross Wt.']],
        body: [
            [{ content: 'HSN Code' }, { content: 'Sr. No.' }, { content: '' }, { content: 'Boxes' }, { content: 'Sq.Mtr' }, { content: 'Kgs' }, { content: 'Kgs' }]
        ],
        theme: 'grid',
        headStyles: { ...classOneStyles, halign: 'left' },
        bodyStyles: { ...classOneStyles, cellPadding: 1 },
        columnStyles: {
            0: { cellWidth: 70, halign: 'center' },
            1: { cellWidth: 70, halign: 'center' },
            2: { cellWidth: 'auto', halign: 'left'},
            3: { cellWidth: 50, halign: 'right' },
            4: { cellWidth: 60, halign: 'right' },
            5: { cellWidth: 60, halign: 'right' },
            6: { cellWidth: 60, halign: 'right' },
        },
        tableWidth: 'auto',
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; },
    });
    // @ts-ignore
    const headerFinalY = doc.lastAutoTable.finalY;

    autoTable(doc, {
        startY: headerFinalY,
        body: tableBody,
        foot: [[
             { content: 'TOTAL', colSpan: 3, styles: {...classOneStyles, halign: 'left'} },
             { content: grandTotalBoxes.toString(), styles: {...classTwoStyles, halign: 'right'} },
             { content: grandTotalSqm.toFixed(2), styles: {...classTwoStyles, halign: 'right'} },
             { content: grandTotalNetWt.toFixed(2), styles: {...classTwoStyles, halign: 'right'} },
             { content: grandTotalGrossWt.toFixed(2), styles: {...classTwoStyles, halign: 'right'} },
        ]],
        theme: 'grid',
        bodyStyles: {...classTwoStyles, cellPadding: 1, valign: 'top' },
        footStyles: {...classOneStyles, cellPadding: 1 },
        margin: { left: pageMargin, right: pageMargin },
        columnStyles: {
            0: { cellWidth: 70, halign: 'center' },
            1: { cellWidth: 70, halign: 'center' },
            2: { cellWidth: 'auto', halign: 'left'},
            3: { cellWidth: 50, halign: 'right' },
            4: { cellWidth: 60, halign: 'right' },
            5: { cellWidth: 60, halign: 'right' },
            6: { cellWidth: 60, halign: 'right' },
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


    // --- Total Packages Footer ---
    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [
            [{ content: 'TOTAL >>>>>>>>>>', styles: {...classOneStyles, halign: 'left'} }, { content: grandTotalBoxes.toString(), styles: {...classTwoStyles, halign: 'center'} }, { content: 'BOXES', styles: {...classTwoStyles, halign: 'left'} }],
        ],
        margin: { left: pageMargin, right: pageMargin },
        columnStyles: { 0: {cellWidth: 'auto'}, 1: {cellWidth: 100}, 2: {cellWidth: 100}},
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;
    
    // --- Final Declarations & Signature ---
    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [[
            { content: `Export Under Duty Drawback Scheme, We shall claim the benefit as admissible under "MEIS" Scheme , RoDTEP , DBK\nLUT Application Reference Number (ARN) AD240324138081L`, styles: {...classTwoStyles, ...classThreeStyles, halign: 'left'} },
            { content: 'Certified That Goods Are Of Indian Origin', styles: {...classTwoStyles, ...classThreeStyles, halign: 'center'} }
        ]],
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    autoTable(doc, {
        startY: yPos,
        theme: 'grid',
        body: [[
            { content: `Declaration:\nWe declare that this Invoice shows the actual price of the goods described and that all particulars are true and correct.`, styles: {...classTwoStyles, ...classThreeStyles, halign: 'left', minCellHeight: 50} },
            { content: `Signature & Date:\n${format(new Date(), 'dd/MM/yyyy')}\n\nFOR, ${exporter.companyName}\n\n\nAUTHORISED SIGNATURE`, styles: {...classTwoStyles, halign: 'center', minCellHeight: 50} }
        ]],
        columnStyles: { 0: { cellWidth: '50%' }, 1: { cellWidth: '50%' } },
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });

    // --- Save the PDF ---
    doc.save(`Packing_List_${docData.exportInvoiceNumber.replace(/[\\/:*?"<>|]/g, '_')}.pdf`);
}
