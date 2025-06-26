
'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { ExportDocument } from '@/types/export-document';
import type { Company } from '@/types/company'; // Exporter
import type { Manufacturer } from '@/types/manufacturer';

export function generateVgmPdf(
    docData: ExportDocument,
    exporter: Company,
    manufacturer: Manufacturer | undefined
) {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    let yPos = 40;
    const pageMargin = 30;
    const contentWidth = doc.internal.pageSize.getWidth() - 2 * pageMargin;

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMATION ABOUT VERIFIED GROSS MASS OF CONTAINER', contentWidth / 2 + pageMargin, yPos, { align: 'center' });
    yPos += 20;

    const firstContainer = docData.containerItems?.[0];
    const multipleContainers = (docData.containerItems?.length ?? 0) > 1;

    // Main Information Table
    const mainTableBody = [
        ['1*', 'Name of the shipper', exporter.companyName],
        ['2*', 'Shipper Registration/License no.( IEC No/CIN No)**', exporter.iecNumber],
        ['3*', 'Name and designation of official of the shipper authorized to sign document', exporter.contactPerson],
        ['4*', '24 x 7 contact details of authorized official of shipper', exporter.phoneNumber],
        ['5*', 'Container No.', multipleContainers ? 'ATTACHED SHEET' : firstContainer?.containerNo || 'N/A'],
        ['6*', 'Container Size ( TEU/FEU/other)', multipleContainers ? 'ATTACHED SHEET' : '20\''], // Assuming 20' size for single
        ['7*', 'Maximum permissible weight of container as per the CSC plate', '30480'], // Hardcoded as per image
        ['8*', 'Weighbridge registration no. & Address of Weighbridge', manufacturer?.address || 'N/A'],
        ['9*', 'Verified gross mass of container (method-1/method-2)', 'METHOD-1'],
        ['10*', 'Date and time of weighing', multipleContainers ? 'ATTACHED SHEET' : firstContainer?.weighingDateTime ? format(new Date(firstContainer.weighingDateTime), 'dd/MM/yyyy HH:mm:ss') : 'N/A'],
        ['11*', 'Weighing slip no.', multipleContainers ? 'ATTACHED SHEET' : firstContainer?.weighingSlipNo || 'N/A'],
        ['12', 'Type (Normal/Reefer/Hazardous/others)', 'NORMAL'], // Hardcoded
        ['13', 'If Hazardous UN NO.IMDG class', 'N/A'], // Hardcoded
    ];

    autoTable(doc, {
        startY: yPos,
        body: mainTableBody,
        theme: 'grid',
        styles: {
            lineWidth: 1,
            lineColor: [0, 0, 0],
            fontSize: 9,
            valign: 'middle',
        },
        columnStyles: {
            0: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 'auto' },
        },
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 20;


    // Container Weight Details Table
    const containerTableBody = (docData.containerItems || []).map(container => {
        const cargoWeight = (container.productItems || []).reduce((sum, item) => sum + (item.netWeight || 0), 0) +
                           (container.sampleItems || []).reduce((sum, item) => sum + (item.netWeight || 0), 0);
        const tareWeight = container.tareWeight || 0;
        const totalWeight = cargoWeight + tareWeight;

        return [
            container.bookingNo || 'N/A',
            container.containerNo || 'N/A',
            cargoWeight.toFixed(2),
            '+',
            tareWeight.toFixed(2),
            '=',
            totalWeight.toFixed(2)
        ];
    });

    autoTable(doc, {
        startY: yPos,
        head: [
            [
                { content: 'BOOKING NO', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                { content: 'CONTAINER NUMBER', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                { content: 'VGM (KGS)\n( CARGO+TARE WEIGHT )', colSpan: 5, styles: { halign: 'center', valign: 'middle' } }
            ],
            [
                { content: 'CARGO\nWeight', styles: { halign: 'center' } },
                { content: '', styles: { halign: 'center' } }, // Placeholder for +
                { content: 'Tare\nWeight', styles: { halign: 'center' } },
                { content: '', styles: { halign: 'center' } }, // Placeholder for =
                { content: 'Total Weight', styles: { halign: 'center' } }
            ]
        ],
        body: containerTableBody,
        theme: 'grid',
        styles: {
            lineWidth: 1,
            lineColor: [0, 0, 0],
            fontSize: 9,
            valign: 'middle',
        },
        headStyles: { fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 'auto', halign: 'center' }, // Booking
            1: { cellWidth: 'auto', halign: 'center' }, // Container
            2: { cellWidth: 'auto', halign: 'right' }, // Cargo Wt
            3: { cellWidth: 20, halign: 'center' },     // +
            4: { cellWidth: 'auto', halign: 'right' }, // Tare Wt
            5: { cellWidth: 20, halign: 'center' },     // =
            6: { cellWidth: 'auto', halign: 'right' }, // Total Wt
        },
        didParseCell: (data) => {
            // Remove borders from the '+' and '=' columns in the body
            if ((data.column.index === 3 || data.column.index === 5) && data.section === 'body') {
                data.cell.styles.lineWidth = 0;
            }
             // Remove borders from the placeholder columns in the head
            if ((data.column.index === 1 || data.column.index === 3) && data.row.section === 'head' && data.row.index === 1) {
                 data.cell.styles.lineWidth = 0;
            }
        },
        margin: { left: pageMargin, right: pageMargin },
    });


    // Save the PDF
    doc.save(`VGM_${docData.exportInvoiceNumber.replace(/[\\/:*?"<>|]/g, '_')}.pdf`);
}
