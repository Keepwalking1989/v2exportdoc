
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
const FONT_CAT2_SIZE = 10;

// --- Main PDF Generation Function ---
export async function generatePackingListPdf(
    docData: ExportDocument,
    exporter: Company,
    manufacturer: Manufacturer | undefined, // Though not directly displayed, might be useful in future
    allProducts: Product[],
    allSizes: Size[]
) {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    let yPos = 20;
    const pageMargin = 20;
    const contentWidth = doc.internal.pageSize.getWidth() - (2 * pageMargin);

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
                { content: `To The\nOrder.`, styles: { ...classTwoStyles, minCellHeight: 35, halign: 'center' } },
                { content: `To The\nOrder.`, styles: { ...classTwoStyles, minCellHeight: 35, halign: 'center' } }
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
        const grouped = new Map<string, any>();

        items.forEach(item => {
            const product = allProducts.find(p => p.id === item.productId);
            const size = product ? allSizes.find(s => s.id === product.sizeId) : undefined;
            if (!size) return;

            const key = `${size.id}-${item.rate || 0}`; // Group by size AND rate

            if (!grouped.has(key)) {
                const hsnCode = size.hsnCode || 'N/A';
                const description = hsnCode === '69072100'
                    ? `Polished Glazed Vitrified Tiles ( PGVT ) (${size.size})`
                    : `Vitrified Tiles (${size.size})`;

                grouped.set(key, {
                    hsnCode: hsnCode,
                    description: description,
                    boxes: 0,
                    sqm: 0,
                    netWt: 0,
                    grossWt: 0,
                });
            }

            const existing = grouped.get(key);
            const sqmForThisItem = (item.boxes || 0) * (size.sqmPerBox || 0);

            existing.boxes += item.boxes || 0;
            existing.sqm += sqmForThisItem;
            existing.netWt += item.netWeight || 0;
            existing.grossWt += item.grossWeight || 0;
        });
        
        return Array.from(grouped.values());
    };

    const groupedProducts = groupItems(allProductItems);
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

        const groupedSamples = groupItems(allSampleItems);
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
             { content: 'TOTAL', colSpan: 3, styles: {...classOneStyles, halign: 'center'} },
             { content: grandTotalBoxes.toString(), styles: {...classTwoStyles, halign: 'right'} },
             { content: grandTotalSqm.toFixed(2), styles: {...classTwoStyles, halign: 'right'} },
             { content: grandTotalNetWt.toFixed(2), styles: {...classTwoStyles, halign: 'right'} },
             { content: grandTotalGrossWt.toFixed(2), styles: {...classTwoStyles, halign: 'right'} },
        ]],
        theme: 'grid',
        headStyles: classOneStyles,
        bodyStyles: {...classTwoStyles, cellPadding: 4, valign: 'top' },
        footStyles: {...classOneStyles, cellPadding: 1 },
        margin: { left: pageMargin, right: pageMargin },
        columnStyles: {
            0: { cellWidth: 55, halign: 'center' },    // HSN Code
            1: { cellWidth: 30, halign: 'center' },    // Sr. No.
            2: { cellWidth: 'auto', halign: 'left' },  // Description Of Goods
            3: { cellWidth: 40, halign: 'right' },     // Boxes
            4: { cellWidth: 45, halign: 'right' },     // Sq.Mtr
            5: { cellWidth: 60, halign: 'right' },     // Net Wt. (Kgs)
            6: { cellWidth: 60, halign: 'right' },     // Gross Wt. (Kgs)
        },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    // --- Container Details Table ---
    const containerTableBody: any[] = [];
    let totalContainerBoxes = 0;
    let totalContainerPallets = 0;
    let totalContainerNetWt = 0;
    let totalContainerGrossWt = 0;

    (docData.containerItems || []).forEach(container => {
        const boxes = (container.productItems || []).reduce((sum, item) => sum + (item.boxes || 0), 0) + 
                       (container.sampleItems || []).reduce((sum, item) => sum + (item.boxes || 0), 0);
        const pallets = parseInt(container.totalPallets || '0', 10);
        const netWt = (container.productItems || []).reduce((sum, item) => sum + (item.netWeight || 0), 0) +
                       (container.sampleItems || []).reduce((sum, item) => sum + (item.netWeight || 0), 0);
        const grossWt = (container.productItems || []).reduce((sum, item) => sum + (item.grossWeight || 0), 0) +
                         (container.sampleItems || []).reduce((sum, item) => sum + (item.grossWeight || 0), 0);
        
        totalContainerBoxes += boxes;
        totalContainerPallets += pallets;
        totalContainerNetWt += netWt;
        totalContainerGrossWt += grossWt;

        containerTableBody.push([
            container.containerNo || 'N/A',
            container.lineSeal || 'N/A',
            container.rfidSeal || 'N/A',
            container.description || 'N/A',
            boxes.toString(),
            container.totalPallets || 'N/A',
            netWt.toFixed(2),
            grossWt.toFixed(2),
        ]);
    });

    autoTable(doc, {
        startY: yPos,
        head: [
            [
                { content: 'CONTAINER NO.', rowSpan: 2 },
                { content: 'Line Seal', rowSpan: 2 },
                { content: 'RFID SEAL', rowSpan: 2 },
                { content: 'DISCRIPTION', rowSpan: 2 },
                { content: 'BOXES', rowSpan: 2 },
                { content: 'Pallet No.', rowSpan: 2 },
                { content: 'Net Wt.', rowSpan: 2 },
                { content: 'Gross Wt.', rowSpan: 2 },
            ],
        ],
        body: containerTableBody,
        foot: [
            [
                { content: 'TOTAL', colSpan: 4, styles: { ...classOneStyles, halign: 'center' } },
                { content: totalContainerBoxes.toString(), styles: { ...classTwoStyles, halign: 'center' } },
                { content: totalContainerPallets.toString(), styles: { ...classTwoStyles, halign: 'center' } },
                { content: totalContainerNetWt.toFixed(2), styles: { ...classTwoStyles, halign: 'center' } },
                { content: totalContainerGrossWt.toFixed(2), styles: { ...classTwoStyles, halign: 'center' } },
            ]
        ],
        theme: 'grid',
        headStyles: classOneStyles,
        bodyStyles: {...classTwoStyles, halign: 'center', cellPadding: 2},
        footStyles: { ...classOneStyles, cellPadding: 2 },
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    // --- New fixed text lines ---
    const textLine1 = 'Export Under Duty Drawback Scheme, We shall claim the benefit as admissible under "MEIS" Scheme , RoDTEP , DBK\nLUT Application Reference Number (ARN) AD240324138081L';
    const textLine2 = 'Certified That Goods Are Of Indian Origin';

    autoTable(doc, {
        startY: yPos,
        body: [
            [{ content: textLine1, styles: { ...classTwoStyles, halign: 'center', fontSize: 8, fontStyle: 'bold' } }],
            [{ content: textLine2, styles: { ...classTwoStyles, halign: 'center', fontSize: 8, fontStyle: 'bold' } }],
        ],
        theme: 'grid',
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });

    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;
    
    // --- Final Declarations & Signature ---
    const declarationText = 'We declare that this Invoice shows the actual price of the goods described \nand that all particulars are true and correct.';
    
    autoTable(doc, {
        startY: yPos,
        theme: 'plain',
        body: [
            [ // Row 0
                { 
                    content: `Declaration:\n${declarationText}`, 
                    rowSpan: 3, 
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
            [ // Row 1 (New) - for signature image
                { content: '', colSpan: 2, styles: {lineWidth: 0.5, lineColor: [0,0,0], minCellHeight: 40} }
            ],
            [ // Row 2
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
        columnStyles: { 0: { cellWidth: contentWidth * 0.65 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 'auto' } },
        margin: { left: pageMargin, right: pageMargin },
        didDrawCell: (data) => {
             // Round Seal in Declaration box
            if (data.section === 'body' && data.row.index === 0 && data.column.index === 0) {
                if (roundSealImage) { doc.addImage(roundSealImage, 'PNG', data.cell.x + data.cell.width - 50, data.cell.y + 10, 40, 40); }
            }
            // Signature in its own empty box
            if (data.section === 'body' && data.row.index === 1 && data.column.index === 1) {
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


    // --- Save the PDF ---
    doc.save(`Packing_List_${docData.exportInvoiceNumber.replace(/[\\/:*?"<>|]/g, '_')}.pdf`);
}
