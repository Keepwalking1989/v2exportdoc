
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { ExportDocument } from '@/types/export-document';
import type { Company } from '@/types/company'; // Exporter
import type { Manufacturer } from '@/types/manufacturer';

export async function generateVgmPdf(
    docData: ExportDocument,
    exporter: Company,
    manufacturer: Manufacturer | undefined
) {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let headerImage: Uint8Array | null = null;
    let footerImage: Uint8Array | null = null;
    let headerHeight = 0;
    let footerHeight = 0;

    try {
        const headerResponse = await fetch('/Latter-pad-head.png');
        if (headerResponse.ok) {
            headerImage = new Uint8Array(await headerResponse.arrayBuffer());
            // Set fixed height for layout consistency
            headerHeight = 70; 
        } else {
            console.warn('Header image not found at /Latter-pad-head.png');
        }

        const footerResponse = await fetch('/Latter-pad-bottom.png');
        if (footerResponse.ok) {
            footerImage = new Uint8Array(await footerResponse.arrayBuffer());
            // Set fixed height for layout consistency
            footerHeight = 50; 
        } else {
            console.warn('Footer image not found at /Latter-pad-bottom.png');
        }
    } catch (error) {
        console.error("Error fetching letterhead images for PDF:", error);
    }
    
    const addHeaderFooter = () => {
        if (headerImage) {
            doc.addImage(headerImage, 'PNG', 0, 0, pageWidth, headerHeight);
        }
        if (footerImage) {
            doc.addImage(footerImage, 'PNG', 0, pageHeight - footerHeight, pageWidth, footerHeight);
        }
    };

    let yPos = headerHeight + 20;
    const pageMargin = 30;
    const contentWidth = pageWidth - 2 * pageMargin;

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMATION ABOUT VERIFIED GROSS MASS OF CONTAINER', contentWidth / 2 + pageMargin, yPos, { align: 'center' });
    yPos += 20;

    const hasContainers = docData.containerItems && docData.containerItems.length > 0;

    // Main Information Table
    const mainTableHeader = [['Sr No.', 'Details of information', 'Particulars']];
    const mainTableBody = [
        ['1*', 'Name of the shipper', exporter.companyName],
        ['2*', 'Shipper Registration/License no.( IEC No/CIN No)**', exporter.iecNumber],
        ['3*', 'Name and designation of official of the shipper authorized to sign document', exporter.contactPerson],
        ['4*', '24 x 7 contact details of authorized official of shipper', exporter.phoneNumber],
        ['5*', 'Container No.', hasContainers ? 'ATTACHED SHEET' : 'N/A'],
        ['6*', 'Container Size ( TEU/FEU/other)', hasContainers ? 'ATTACHED SHEET' : 'N/A'],
        ['7*', 'Maximum permissible weight of container as per the CSC plate', '30480'], // Hardcoded as per image
        ['8*', 'Weighbridge registration no. & Address of Weighbridge', `${manufacturer?.companyName || ''}\n${manufacturer?.address || 'N/A'}`.trim()],
        ['9*', 'Verified gross mass of container (method-1/method-2)', 'METHOD-1'],
        ['10*', 'Date and time of weighing', hasContainers ? 'ATTACHED SHEET' : 'N/A'],
        ['11*', 'Weighing slip no.', hasContainers ? 'ATTACHED SHEET' : 'N/A'],
        ['12', 'Type (Normal/Reefer/Hazardous/others)', 'NORMAL'], // Hardcoded
        ['13', 'If Hazardous UN NO.IMDG class', 'N/A'], // Hardcoded
    ];

    autoTable(doc, {
        startY: yPos,
        head: mainTableHeader,
        body: mainTableBody,
        theme: 'grid',
        headStyles: {
            fontStyle: 'bold',
            fillColor: [217, 234, 247], // Light Blue
            textColor: [0, 0, 0],
            halign: 'center',
            lineWidth: 1,
            lineColor: [0, 0, 0],
        },
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
        margin: { left: pageMargin, right: pageMargin, top: headerHeight, bottom: footerHeight },
        didDrawPage: (data) => {
            addHeaderFooter();
            // We re-add the title if a new page is created by this table, below the header.
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('INFORMATION ABOUT VERIFIED GROSS MASS OF CONTAINER', contentWidth / 2 + pageMargin, headerHeight + 20, { align: 'center' });
        },
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 20;

    // Container Weight Details Table (Redesigned)
    const containerTableBody = (docData.containerItems || []).map(container => {
        const cargoWeight = (container.productItems || []).reduce((sum, item) => sum + (item.netWeight || 0), 0) +
                           (container.sampleItems || []).reduce((sum, item) => sum + (item.netWeight || 0), 0);
        const tareWeight = container.tareWeight || 0;
        const totalWeight = cargoWeight + tareWeight; // This is the VGM

        return [
            container.bookingNo || 'N/A',
            container.containerNo || 'N/A',
            cargoWeight.toFixed(2),
            tareWeight.toFixed(2),
            totalWeight.toFixed(2)
        ];
    });

    autoTable(doc, {
        startY: yPos,
        head: [
            [
                { content: 'BOOKING NO', rowSpan: 2 },
                { content: 'CONTAINER NUMBER', rowSpan: 2 },
                { content: 'VGM (KGS)\n( CARGO+TARE WEIGHT)', colSpan: 3, styles: { halign: 'center' } }
            ],
            [
                'CARGO Weight (KGS)',
                'TARE Weight (KGS)',
                'Total Weight'
            ]
        ],
        body: containerTableBody,
        theme: 'grid',
        styles: {
            lineWidth: 1,
            lineColor: [0, 0, 0],
            fontSize: 9,
            valign: 'middle',
            halign: 'center',
        },
        headStyles: { fontStyle: 'bold', valign: 'middle', lineWidth: 1, lineColor: [0,0,0] },
        columnStyles: {
            0: { cellWidth: 'auto' }, // Booking
            1: { cellWidth: 'auto' }, // Container
            2: { halign: 'right' },   // Cargo Wt
            3: { halign: 'right' },   // Tare Wt
            4: { halign: 'right' },   // Total Wt
        },
        margin: { left: pageMargin, right: pageMargin, top: headerHeight, bottom: footerHeight },
        didDrawPage: (data) => {
             addHeaderFooter();
        }
    });

    // Save the PDF
    doc.save(`VGM_${docData.exportInvoiceNumber.replace(/[\\/:*?"<>|]/g, '_')}.pdf`);
}
