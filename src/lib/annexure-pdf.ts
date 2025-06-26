
'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { ExportDocument } from '@/types/export-document';
import type { Company } from '@/types/company'; // Exporter
import type { Manufacturer } from '@/types/manufacturer';

export function generateAnnexurePdf(
    docData: ExportDocument,
    exporter: Company,
    manufacturer: Manufacturer
) {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    let yPos = 20;
    const pageMargin = 30;
    const contentWidth = doc.internal.pageSize.getWidth() - 2 * pageMargin;

    // --- PDF Header ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ANNEXURE', contentWidth / 2 + pageMargin, yPos, { align: 'center' });
    yPos += 16;
    doc.text('Office Of The Superintendent Of Central GST', contentWidth / 2 + pageMargin, yPos, { align: 'center' });
    yPos += 16;
    doc.text('A.R.-IV MORBI. DIVISION - I-MORBI. COMMISSIONERATE - RAJKOT.', contentWidth / 2 + pageMargin, yPos, { align: 'center' });
    yPos += 20;

    // --- Main Body using a structured table for alignment ---
    const bodyData = [];
    
    bodyData.push({ label: '1   Name Of Exporter:', value: `${exporter.companyName}\n${exporter.address}` });
    bodyData.push({ label: '2a  ICE No:', value: exporter.iecNumber || 'N/A' });
    bodyData.push({ label: ' b  Branch Code:', value: 'N/A' });
    bodyData.push({ label: ' c  BIN No:', value: exporter.gstNumber ? exporter.gstNumber.substring(2, 12) : 'N/A' });
    const manufacturerDetails = `STUFFING DETAIL - ${manufacturer.companyName}\n${manufacturer.address}\nPERMISSION NO. - ${docData.permissionNumber || 'N/A'}`;
    bodyData.push({ label: '3   Name Of The Manufacturer (Stuffing Details):', value: manufacturerDetails });
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
    // Using a multiline string to force the layout from the image
    bodyData.push({ label: '8a  Particulars Of Export Invoice:\n b  Export Invoice No.:\n\n c  Total No.Of Packages:', value: `\n${docData.exportInvoiceNumber}\n\n${totalBoxes}` });
    const consigneeDetails = `Davare Floors, Inc.\n19 E 60 TH ST, Hialeah,FL.33013 . USA`; // Hardcoded as per image
    bodyData.push({ label: ' d  Name & Address Of The Conignee', value: consigneeDetails });
    bodyData.push({ label: '9a  Is The Discription Of The Good, The Quality & Their Value\n    As Per Particulars Furnished In The Export Invoice :', value: 'Yes' });
    bodyData.push({ label: ' b  Whether Sample Is Drawn For\n    Forwarded To Port Of Export:', value: 'No' });
    bodyData.push({ label: ' c  If Yes The Number Of The Seal Of The Packge Containing\n    The Sample:', value: 'N/A' });
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
        headStyles: { fontStyle: 'bold', halign: 'center', fontSize: 9 },
        bodyStyles: { fontSize: 9, halign: 'center' },
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
        styles: { fontSize: 9, valign: 'middle' },
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

    const drawCenteredWrappedText = (text: string) => {
        const wrappedLines = doc.splitTextToSize(text, effectiveContentWidth);
        doc.text(wrappedLines, contentWidth / 2 + pageMargin, yPos, { align: 'center' });
        yPos += wrappedLines.length * lineHeight;
    };
    
    const footerLines1 = [
        "Export Under GST Circular No. 26/2017 Customs DT.01/07/2017",
        "\"Supply Goods Under Letter Of Undertaking, Subject To Such Conditions, Safeguards And Procedure As May Be Prescribed.\"",
        "Letter Of Undertaking No.Acknowledgement For Lut Application Reference Number (ARN) AD240324138081L",
    ];
    footerLines1.forEach(drawCenteredWrappedText);

    const underlinedText = "EXPORT UNDER SELF SEALING UNDER Circular No.: 59/2010 Dated : 23.12.2010";
    doc.text(underlinedText, contentWidth / 2 + pageMargin, yPos, { align: 'center' });
    const textWidth = doc.getTextWidth(underlinedText);
    const textX = (contentWidth / 2 + pageMargin) - (textWidth / 2);
    doc.setLineWidth(0.5);
    doc.line(textX, yPos + 1, textX + textWidth, yPos + 1);
    yPos += lineHeight;

    const footerLines2 = [
        "Examined the export goods covered under this invoice description of the goods with reference to DBK & MEIS Scheme Value cap p/kg.Net",
        "Weight of Ceramic Glazed Wall Tiles are as under",
        "Certified that the description and value of the goods covered by this invoice have been checked by me and the goods have been packed and",
        "sealed with lead seal one time lock seal checked by me and the goods have been packed and sealed with lead seal/ one time lock seal."
    ];
    footerLines2.forEach(drawCenteredWrappedText);
    
    yPos += 10;

    // --- Signature ---
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`For, ${exporter.companyName}`, pageMargin, yPos);

    yPos += 24; // Two empty lines

    doc.setFont('helvetica', 'bold');
    doc.text('AUTHORISED SIGN', pageMargin, yPos);
    yPos += 12;
    doc.text('SIGNATURE OF EXPORTER', pageMargin, yPos);

    // --- Save the PDF ---
    doc.save(`ANNEXURE_${docData.exportInvoiceNumber.replace(/[\\/:*?"<>|]/g, '_')}.pdf`);
}
