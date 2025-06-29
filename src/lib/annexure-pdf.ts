
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { ExportDocument, ManufacturerInfo } from '@/types/export-document';
import type { Company } from '@/types/company'; // Exporter
import type { Manufacturer } from '@/types/manufacturer';

function drawDocument(doc: jsPDF, docData: ExportDocument, exporter: Company, manufacturersWithDetails: (Manufacturer & { invoiceNumber: string, invoiceDate?: Date })[], padding: number, signatureImage: Uint8Array | null): number {
    let yPos = 20;
    const pageMargin = 30;
    const contentWidth = doc.internal.pageSize.getWidth() - 2 * pageMargin;
    const COLOR_BLUE_RGB = [217, 234, 247];

    // --- PDF Header ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ANNEXURE', contentWidth / 2 + pageMargin, yPos, { align: 'center' });
    yPos += 16;
    doc.text('Office Of The Superintendent Of Central GST', contentWidth / 2 + pageMargin, yPos, { align: 'center' });
    yPos += 16;
    doc.text('A.R.-IV MORBI. DIVISION - I-MORBI. COMMISSIONERATE - RAJKOT.', contentWidth / 2 + pageMargin, yPos, { align: 'center' });
    yPos += 20;

    const manufacturerDetailsText = manufacturersWithDetails.map(m => 
        `STUFFING DETAIL - ${m.companyName}\n${m.address}\nPERMISSION NO. - ${docData.permissionNumber || 'N/A'}`
    ).join('\n\n');

    // --- Main Body using a structured table for alignment ---
    const bodyData = [];
    
    bodyData.push({ label: '1   Name Of Exporter:', value: `${exporter.companyName}\n${exporter.address}` });
    bodyData.push({ label: '2a  ICE No:', value: exporter.iecNumber || 'N/A' });
    bodyData.push({ label: ' b  Branch Code:', value: 'N/A' });
    bodyData.push({ label: ' c  BIN No:', value: exporter.gstNumber ? exporter.gstNumber.substring(2, 12) : 'N/A' });
    bodyData.push({ label: '3   Name Of The Manufacturer (Stuffing Details):', value: manufacturerDetailsText });
    bodyData.push({ label: '4   Date Of Examination:', value: docData.exportInvoiceDate ? format(new Date(docData.exportInvoiceDate), 'dd/MM/yyyy') : 'N/A' });
    bodyData.push({ label: '5   Name of the Inspector of GST', value: 'SELF SEALNG' });
    bodyData.push({ label: '6   Name of the supdt. Of GST', value: 'SELF SEALNG' });
    bodyData.push({ label: '7a  Name Of The Commissionerate/ Division/Range', value: 'RAJKOTI-MORBI / AR - IV, MORBI' });
    bodyData.push({ label: ' b  Location Code:', value: 'WV0401' });
    const totalBoxes = (docData.containerItems || []).reduce((acc, container) => {
        const productBoxes = (container.productItems || []).reduce((sum, item) => sum + (item.boxes || 0), 0);
        const sampleBoxes = (container.sampleItems || []).reduce((sum, item) => sum + (item.boxes || 0), 0);
        return acc + productBoxes + sampleBoxes;
    }, 0);
    bodyData.push({ label: '8   Particulars Of Export Invoice: a  Export Invoice No.: b  Total No.Of Packages:', value: `${docData.exportInvoiceNumber}\n${totalBoxes}` });
    const consigneeDetails = `Davare Floors, Inc.\n19 E 60 TH ST, Hialeah,FL.33013 . USA`; // Hardcoded as per image
    bodyData.push({ label: ' d  Name & Address Of The Conignee', value: consigneeDetails });
    bodyData.push({ label: '9a Is The Discription Of The Good, The Quality & Their Value As Per Particulars Furnished In The Export Invoice :', value: 'Yes' });
    bodyData.push({ label: ' b Whether Sample Is Drawn For Forwarded To Port Of Export:', value: 'No' });
    bodyData.push({ label: ' c If Yes The Number Of The Seal Of The Packge Containing The Sample:', value: 'N/A' });
    bodyData.push({ label: '10  Central GST/ CUSTOMS SEAL NOS.:\n  a For Non-Containerised Cargo No.Of Packages:\n  b For Containerised Cargo', value: '\nSELF SEALNG\nSELF SEALNG' });

    autoTable(doc, {
        startY: yPos,
        body: bodyData.map(row => [row.label, row.value]),
        theme: 'plain',
        tableLineWidth: 0.5,
        tableLineColor: [0,0,0],
        styles: {
            lineWidth: 0.5,
            lineColor: [0,0,0],
            valign: 'top',
            cellPadding: padding,
        },
        columnStyles: {
            0: { cellWidth: contentWidth * 0.45, fontStyle: 'bold', fontSize: 9 },
            1: { cellWidth: contentWidth * 0.55, fontSize: 9 },
        },
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    // --- Container Table ---
    const containerTableHead = [['CONTAINER NUMBER', 'Line Seal No.', 'RFID Seal No.', 'Size', 'Pallet', 'Kinds Of Pkgs']];
    const containerTableBody = (docData.containerItems || []).map(container => {
        const totalBoxes = (container.productItems || []).reduce((sum, item) => sum + (item.boxes || 0), 0) +
                           (container.sampleItems || []).reduce((sum, item) => sum + (item.boxes || 0), 0);
        return [
            container.containerNo || 'N/A',
            container.lineSeal || 'N/A',
            container.rfidSeal || 'N/A',
            "1X20'", // Hardcoded from image
            `${container.startPalletNo || 'N/A'} to ${container.endPalletNo || 'N/A'}`,
            totalBoxes.toString()
        ];
    });

    autoTable(doc, {
        head: containerTableHead,
        body: containerTableBody,
        startY: yPos,
        theme: 'grid',
        headStyles: { fontStyle: 'bold', halign: 'center', fontSize: 9, fillColor: COLOR_BLUE_RGB, textColor: [0, 0, 0], lineColor: [0, 0, 0], cellPadding: padding },
        bodyStyles: { fontSize: 9, halign: 'center', lineColor: [0, 0, 0], cellPadding: padding },
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    // --- Totals and Permission Table ---
    const totalNetWeight = (docData.containerItems || []).reduce((acc, container) => 
        acc + (container.productItems || []).reduce((sum, item) => sum + (item.netWeight || 0), 0) +
        (container.sampleItems || []).reduce((sum, item) => sum + (item.netWeight || 0), 0), 0);
    const totalGrossWeight = (docData.containerItems || []).reduce((acc, container) => 
        acc + (container.productItems || []).reduce((sum, item) => sum + (item.grossWeight || 0), 0) +
        (container.sampleItems || []).reduce((sum, item) => sum + (item.grossWeight || 0), 0), 0);
        
    const totalsTableBody = [
        [
            { content: '11  Total Net Weight (In Kgs):', styles: { fontStyle: 'bold' } },
            { content: totalNetWeight.toFixed(2) },
            { content: 'Total Gross Weight (In Kgs):', styles: { fontStyle: 'bold' } },
            { content: totalGrossWeight.toFixed(2) },
        ],
        [
            { content: '12  Custome Permission Order File No.:', styles: { fontStyle: 'bold' }, colSpan: 2 },
            { content: `PERMISSION NO. -${docData.permissionNumber || 'N/A'}`, colSpan: 2 },
        ]
    ];

    autoTable(doc, {
        body: totalsTableBody,
        startY: yPos,
        theme: 'grid',
        styles: { fontSize: 9, valign: 'middle', lineColor: [0, 0, 0], cellPadding: padding },
        margin: { left: pageMargin, right: pageMargin },
        didDrawPage: data => { yPos = data.cursor?.y ?? yPos; }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;
    yPos += 20;

    // --- Footer Text ---
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const lineHeight = 12;
    const effectiveContentWidth = contentWidth - 20;

    const drawCenteredWrappedText = (text: string, isUnderlined = false) => {
        const wrappedLines = doc.splitTextToSize(text, effectiveContentWidth);
        const textHeight = wrappedLines.length * lineHeight;
        if (yPos + textHeight > doc.internal.pageSize.getHeight() - 30) {
            doc.addPage();
            yPos = 30;
        }
        
        const textYStart = yPos;
        doc.text(wrappedLines, contentWidth / 2 + pageMargin, yPos, { align: 'center' });
        yPos += textHeight;

        if (isUnderlined) {
            let currentLineY = textYStart;
            wrappedLines.forEach((line: string) => {
                const textWidth = doc.getTextWidth(line);
                const textX = (contentWidth / 2 + pageMargin) - (textWidth / 2);
                doc.setLineWidth(0.5);
                doc.line(textX, currentLineY + 1, textX + textWidth, currentLineY + 1);
                currentLineY += lineHeight;
            });
        }
    };
    
    const footerLines1 = [
        "Export Under GST Circular No. 26/2017 Customs DT.01/07/2017",
        "\"Supply Goods Under Letter Of Undertaking, Subject To Such Conditions, Safeguards And Procedure As May Be Prescribed.\"",
        "Letter Of Undertaking No.Acknowledgement For Lut Application Reference Number (ARN) AD240324138081L",
    ];
    footerLines1.forEach(line => drawCenteredWrappedText(line));

    const underlinedText = "EXPORT UNDER SELF SEALING UNDER Circular No.: 59/2010 Dated : 23.12.2010";
    drawCenteredWrappedText(underlinedText, true);

    const combinedFooterText = "Examined the export goods covered under this invoice description of the goods with reference to DBK & MEIS Scheme Value cap p/kg.Net Weight of Ceramic Glazed Wall Tiles are as under. Certified that the description and value of the goods covered by this invoice have been checked by me and the goods have been packed and sealed with lead seal one time lock seal checked by me and the goods have been packed and sealed with lead seal/ one time lock seal.";
    drawCenteredWrappedText(combinedFooterText);
    
    yPos += 20;

    // --- Signature ---
    const signatureBlockHeight = 80;
    if (yPos + signatureBlockHeight > doc.internal.pageSize.getHeight() - pageMargin) {
        doc.addPage();
        yPos = pageMargin;
    }

    const signatureTableBody = [
        [{ content: `For, ${exporter.companyName.toUpperCase()}`, styles: { halign: 'center', fontStyle: 'bold' } }],
        [{ content: '', styles: { minCellHeight: 40 } }]
    ];

    autoTable(doc, {
        startY: yPos,
        body: signatureTableBody,
        theme: 'plain',
        tableWidth: 'wrap',
        margin: { left: contentWidth / 2 + pageMargin + 80 },
        styles: { fontSize: 9 },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.row.index === 1) {
                if (signatureImage) {
                    const cell = data.cell;
                    const imgWidth = 80;
                    const imgHeight = 40;
                    const imgX = cell.x + (cell.width - imgWidth) / 2;
                    const imgY = cell.y + (cell.height - imgHeight) / 2;
                    doc.addImage(signatureImage, 'PNG', imgX, imgY, imgWidth, imgHeight);
                }
            }
        }
    });
    
    return doc.internal.getNumberOfPages();
}


export async function generateAnnexurePdf(
    docData: ExportDocument,
    exporter: Company,
    manufacturersWithDetails: (Manufacturer & { invoiceNumber: string, invoiceDate?: Date })[]
) {
    const largePadding = 4;
    const smallPadding = 2;

    let signatureImage: Uint8Array | null = null;
    try {
        const signatureResponse = await fetch('/signature.png');
        if (signatureResponse.ok) {
            signatureImage = new Uint8Array(await signatureResponse.arrayBuffer());
        } else {
            console.warn('Signature image not found at /signature.png');
        }
    } catch (error) {
        console.error("Error fetching signature image for PDF:", error);
    }

    // 1. Dry run with large padding to check page count
    const tempDoc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageCountWithLargePadding = drawDocument(tempDoc, docData, exporter, manufacturersWithDetails, largePadding, signatureImage);
    
    // 2. Decide final padding
    const finalPadding = pageCountWithLargePadding > 1 ? smallPadding : largePadding;

    // 3. Draw the final document with the chosen padding
    const finalDoc = new jsPDF({ unit: 'pt', format: 'a4' });
    drawDocument(finalDoc, docData, exporter, manufacturersWithDetails, finalPadding, signatureImage);

    // 4. Save the final PDF
    finalDoc.save(`ANNEXURE_${docData.exportInvoiceNumber.replace(/[\\/:*?"<>|]/g, '_')}.pdf`);
}
