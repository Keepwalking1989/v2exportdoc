
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { PurchaseOrder } from '@/types/purchase-order';
import type { Company } from '@/types/company';
import type { Manufacturer } from '@/types/manufacturer';
import type { Size } from '@/types/size';
import type { Product } from '@/types/product';
import type { PerformaInvoice } from '@/types/performa-invoice';

// --- Page & General Layout (Using Points) ---
const PAGE_MARGIN_X = 28.34; // pt (approx 10mm)
const CONTENT_WIDTH = 595.28 - 2 * PAGE_MARGIN_X; // A4 width in points - margins

// --- Colors ---
const COLOR_BLUE_RGB = [217, 234, 247]; // Light blue for backgrounds
const COLOR_WHITE_RGB = [255, 255, 255];
const COLOR_BLACK_RGB = [0, 0, 0];
const COLOR_BORDER_RGB = [0, 0, 0]; // Black border for cells

// --- Font Size Categories (pt) ---
const FONT_CAT1_SIZE = 14;
const FONT_MANUFACTURER_NAME_SIZE = 11;
const FONT_CAT2_SIZE = 10;
const FONT_CAT3_SIZE = 8;

const CELL_PADDING = 4;
const MIN_ROW_HEIGHT = 60; // Minimum height for a product row with an image

function drawPurchaseOrder(
    doc: jsPDF,
    po: PurchaseOrder,
    exporter: Company,
    manufacturer: Manufacturer,
    poSize: Size | undefined,
    allProducts: Product[],
    sourcePi: PerformaInvoice | undefined,
    productImageMap: Map<string, {data: Uint8Array, ext: string}>,
    signatureImage: Uint8Array | null,
    headerHeight: number,
    footerHeight: number,
    numEmptyRows: number // Dynamic parameter
) {
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = headerHeight > 0 ? headerHeight + 10 : PAGE_MARGIN_X;
    
    // Title
    autoTable(doc, {
        startY: yPos,
        body: [['PURCHASE ORDER']],
        theme: 'plain',
        styles: {
            fontSize: FONT_CAT1_SIZE,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: CELL_PADDING,
            lineWidth: 0.5,
            lineColor: COLOR_BORDER_RGB,
            fillColor: COLOR_BLUE_RGB,
        },
        margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 5;

    // --- Manufacturer and PO Details ---
    const manuDetailsBody = [
        [{ content: 'TO', styles: { fillColor: COLOR_BLUE_RGB, fontStyle: 'bold', fontSize: FONT_CAT2_SIZE, halign: 'center' }}],
        [{ content: manufacturer.companyName.toUpperCase(), styles: { fontSize: FONT_MANUFACTURER_NAME_SIZE, fontStyle: 'bold', halign: 'center' }}],
        [{ content: `${manufacturer.address}\nGSTIN: ${manufacturer.gstNumber}\nPIN: ${manufacturer.pinCode}`, styles: { fontSize: FONT_CAT3_SIZE, halign: 'left', minCellHeight: 40 }}]
    ];
    
    const poDetailsBody = [
        [{ content: 'PO Number', styles: { fillColor: COLOR_BLUE_RGB, fontStyle: 'bold' } }, { content: 'PO Date', styles: { fillColor: COLOR_BLUE_RGB, fontStyle: 'bold' } }],
        [{ content: po.poNumber, styles: { fontSize: FONT_CAT3_SIZE } }, { content: format(new Date(po.poDate), 'dd/MM/yyyy'), styles: { fontSize: FONT_CAT3_SIZE } }],
        [{ content: 'Size', styles: { fillColor: COLOR_BLUE_RGB, fontStyle: 'bold' } }, { content: 'HSN Code', styles: { fillColor: COLOR_BLUE_RGB, fontStyle: 'bold' } }],
        [{ content: poSize?.size || "N/A", styles: { fontSize: FONT_CAT3_SIZE } }, { content: poSize?.hsnCode || "N/A", styles: { fontSize: FONT_CAT3_SIZE } }],
        [{ content: 'No. of Containers', colSpan: 2, styles: { fillColor: COLOR_BLUE_RGB, fontStyle: 'bold' } }],
        [{ content: po.numberOfContainers.toString(), colSpan: 2, styles: { fontSize: FONT_CAT3_SIZE } }],
    ];
    if (sourcePi) {
        poDetailsBody.push([{ content: 'Ref. PI No.', colSpan: 2, styles: { fillColor: COLOR_BLUE_RGB, fontStyle: 'bold' } }]);
        poDetailsBody.push([{ content: sourcePi.invoiceNumber, colSpan: 2, styles: { fontSize: FONT_CAT3_SIZE } }]);
    }
    
    autoTable(doc, {
        startY: yPos,
        body: [[
            {
                content: '',
                styles: {
                    didDrawCell: (data) => {
                        autoTable(doc, {
                            body: manuDetailsBody,
                            startY: data.cell.y,
                            margin: { left: data.cell.x, right: doc.internal.pageSize.getWidth() - (data.cell.x + data.cell.width) },
                            theme: 'grid',
                            styles: { lineWidth: 0.5, lineColor: COLOR_BORDER_RGB, cellPadding: CELL_PADDING },
                        });
                    }
                }
            },
            {
                content: '',
                styles: {
                    didDrawCell: (data) => {
                         autoTable(doc, {
                            body: poDetailsBody,
                            startY: data.cell.y,
                            margin: { left: data.cell.x, right: doc.internal.pageSize.getWidth() - (data.cell.x + data.cell.width) },
                            theme: 'grid',
                            styles: { lineWidth: 0.5, lineColor: COLOR_BORDER_RGB, cellPadding: CELL_PADDING, halign: 'center' },
                        });
                    }
                }
            }
        ]],
        theme: 'plain',
        columnStyles: { 0: { cellWidth: CONTENT_WIDTH / 2 }, 1: { cellWidth: CONTENT_WIDTH / 2 } },
        margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY;

    if (numEmptyRows === -1) return; // Stop here for dry run to get yPos

    // --- Product Table ---
    const tableHead = [['SR', 'DESCRIPTION OF GOODS', 'Image', 'WEIGHT/BOX (Kg)', 'BOXES', 'THICKNESS']];
    let totalBoxesOverall = 0;
    const actualTableBodyItems = po.items.map((item, index) => {
        const productDetail = allProducts.find(p => p.id === item.productId);
        const productName = productDetail?.designName || "Unknown Product";
        const goodsDesc = `${poSize?.size || ''} ${productName}`.trim();
        totalBoxesOverall += item.boxes;
        return [
            (index + 1).toString(),
            goodsDesc,
            item.imageUrl || '',
            item.weightPerBox.toFixed(2),
            item.boxes.toString(),
            item.thickness,
        ];
    });

    const tableBodyWithEmptyRows = [...actualTableBodyItems];
    const emptyRowData = Array(tableHead[0].length).fill(' ');
    for (let i = 0; i < numEmptyRows; i++) {
        tableBodyWithEmptyRows.push([...emptyRowData]);
    }

    const tableFooter = [[
        { content: 'Total Box:', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontSize: FONT_CAT2_SIZE, cellPadding: CELL_PADDING } },
        { content: totalBoxesOverall.toString(), styles: { halign: 'center', fontStyle: 'normal', fillColor: COLOR_WHITE_RGB, textColor: COLOR_BLACK_RGB, fontSize: FONT_CAT3_SIZE, cellPadding: CELL_PADDING } },
        { content: '', styles: { fillColor: COLOR_WHITE_RGB } }
    ]];
    
    autoTable(doc, {
        head: tableHead,
        body: tableBodyWithEmptyRows,
        foot: tableFooter,
        startY: yPos,
        theme: 'grid',
        margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X, top: headerHeight, bottom: footerHeight },
        styles: { lineWidth: 0.5, lineColor: COLOR_BORDER_RGB, cellPadding: CELL_PADDING },
        headStyles: { fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold', fontSize: FONT_CAT2_SIZE, halign: 'center', valign: 'middle' },
        bodyStyles: { fillColor: COLOR_WHITE_RGB, textColor: COLOR_BLACK_RGB, fontSize: FONT_CAT3_SIZE, valign: 'middle', minCellHeight: MIN_ROW_HEIGHT },
        footStyles: { lineWidth: 0.5, lineColor: COLOR_BORDER_RGB, cellPadding: CELL_PADDING, valign: 'middle' },
        columnStyles: {
            0: { halign: 'center', cellWidth: 30 },
            1: { halign: 'left', cellWidth: 'auto' },
            2: { halign: 'center', cellWidth: 60 },
            3: { halign: 'right', cellWidth: 70 },
            4: { halign: 'right', cellWidth: 50 },
            5: { halign: 'center', cellWidth: 70 },
        },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
                const imageUrl = data.cell.raw as string;
                const product = po.items[data.row.index];
                const finalImageUrl = imageUrl || product?.imageUrl;

                if (!finalImageUrl) return;
                
                const imgData = productImageMap.get(finalImageUrl);
                if (imgData) {
                    const cell = data.cell;
                    const imgSize = Math.min(cell.width - 4, cell.height - 4, 50);
                    const imgX = cell.x + (cell.width - imgSize) / 2;
                    const imgY = cell.y + (cell.height - imgSize) / 2;
                    try { doc.addImage(imgData.data, imgData.ext, imgX, imgY, imgSize, imgSize); } catch (e) { console.error(e); }
                }
            }
        },
        didParseCell: (data) => {
            if ((data.section === 'foot' || data.section === 'body') && (data.cell.raw === '' || data.cell.raw === undefined || (typeof data.cell.raw === 'object' && 'content' in data.cell.raw && data.cell.raw.content === ' '))) {
                data.cell.styles.fillColor = COLOR_WHITE_RGB;
            }
        }
    });
    // @ts-ignore
    let finalY = doc.lastAutoTable.finalY;

    // --- Terms and Signature ---
    autoTable(doc, {
        startY: finalY,
        body: [
            [{ content: 'Terms & Conditions:', styles: { fillColor: COLOR_BLUE_RGB, fontStyle: 'bold' } }],
            [{ content: po.termsAndConditions, styles: { fontSize: FONT_CAT3_SIZE, valign: 'top', minCellHeight: 40 } }],
        ],
        theme: 'grid',
        margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X, top: headerHeight, bottom: footerHeight },
        styles: { lineWidth: 0.5, lineColor: COLOR_BORDER_RGB, cellPadding: CELL_PADDING },
    });
    // @ts-ignore
    finalY = doc.lastAutoTable.finalY;

    autoTable(doc, {
        startY: finalY,
        body: [
            [
                {
                    content: '', // Placeholder for signature
                    styles: {
                        didDrawCell: (data) => {
                            autoTable(doc, {
                                body: [
                                    [{ content: `FOR, ${exporter.companyName.toUpperCase()}`, styles: { halign: 'center', fontStyle: 'bold' } }],
                                    [{ content: '', styles: { minCellHeight: 40 } }],
                                    [{ content: 'AUTHORISED SIGNATURE', styles: { halign: 'center', fontStyle: 'bold' } }]
                                ],
                                startY: data.cell.y,
                                margin: { left: data.cell.x, right: doc.internal.pageSize.getWidth() - (data.cell.x + data.cell.width) },
                                theme: 'plain',
                                tableWidth: data.cell.width,
                                styles: { fontSize: FONT_CAT2_SIZE },
                                didDrawCell: (sigData) => {
                                    if (sigData.section === 'body' && sigData.row.index === 1 && signatureImage) {
                                        const cell = sigData.cell;
                                        const imgWidth = 80, imgHeight = 40;
                                        const imgX = cell.x + (cell.width - imgWidth) / 2;
                                        const imgY = cell.y + (cell.height - imgHeight) / 2;
                                        doc.addImage(signatureImage, 'PNG', imgX, imgY, imgWidth, imgHeight);
                                    }
                                }
                            });
                        }
                    }
                }
            ]
        ],
        theme: 'plain',
        margin: { left: PAGE_MARGIN_X + (CONTENT_WIDTH / 2), right: PAGE_MARGIN_X },
    });
}

function calculatePostTableHeight(doc: jsPDF, po: PurchaseOrder, exporter: Company): number {
    let height = 0;
    const margin = { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X };
    const startY = doc.internal.pageSize.getHeight() * 2; // Start way off-page

    autoTable(doc, {
        body: [
            [{ content: 'Terms & Conditions:', styles: { fillColor: COLOR_BLUE_RGB, fontStyle: 'bold' } }],
            [{ content: po.termsAndConditions, styles: { fontSize: FONT_CAT3_SIZE, valign: 'top', minCellHeight: 40 } }],
        ],
        startY: startY,
        theme: 'grid',
        margin,
        styles: { lineWidth: 0.5, lineColor: COLOR_BORDER_RGB, cellPadding: CELL_PADDING },
        didDrawPage: () => false
    });
    // @ts-ignore
    height += doc.lastAutoTable.finalY - startY;

    autoTable(doc, {
        body: [
            [{ content: `FOR, ${exporter.companyName.toUpperCase()}`, styles: { halign: 'center', fontStyle: 'bold' } }],
            [{ content: '', styles: { minCellHeight: 40 } }],
            [{ content: 'AUTHORISED SIGNATURE', styles: { halign: 'center', fontStyle: 'bold' } }]
        ],
        startY: startY, // Use a fresh off-page startY
        theme: 'plain',
        tableWidth: (CONTENT_WIDTH / 2),
        margin: { left: PAGE_MARGIN_X + (CONTENT_WIDTH / 2) },
        styles: { fontSize: FONT_CAT2_SIZE },
        didDrawPage: () => false
    });
    // @ts-ignore
    height += doc.lastAutoTable.finalY - startY;
    
    return height;
}

export async function generatePurchaseOrderPdf(
  po: PurchaseOrder,
  exporter: Company,
  manufacturer: Manufacturer,
  poSize: Size | undefined,
  allProducts: Product[],
  sourcePi: PerformaInvoice | undefined
) {
    let headerImage: Uint8Array | null = null;
    let footerImage: Uint8Array | null = null;
    let signatureImage: Uint8Array | null = null;
    const productImageMap = new Map<string, {data: Uint8Array, ext: string}>();
    let headerHeight = 0;
    let footerHeight = 0;

    try {
        const [headerRes, footerRes, signatureRes] = await Promise.all([
            fetch('/Latter-pad-head.png'),
            fetch('/Latter-pad-bottom.png'),
            fetch('/signature.png')
        ]);
        if (headerRes.ok) { headerImage = new Uint8Array(await headerRes.arrayBuffer()); headerHeight = 70; }
        if (footerRes.ok) { footerImage = new Uint8Array(await footerRes.arrayBuffer()); footerHeight = 80; }
        if (signatureRes.ok) { signatureImage = new Uint8Array(await signatureRes.arrayBuffer()); }

        const uniqueImageUrls = [...new Set(po.items.map(item => item.imageUrl).filter(Boolean))];
        await Promise.all(uniqueImageUrls.map(async (url) => {
            if (url) {
                try {
                    const imgResponse = await fetch(url);
                    if (imgResponse.ok) {
                        const arrayBuffer = await imgResponse.arrayBuffer();
                        const ext = url.split('.').pop()?.toUpperCase() || 'PNG';
                        const product = po.items.find(item => item.imageUrl === url);
                        if(product) {
                           productImageMap.set(product.productId, { data: new Uint8Array(arrayBuffer), ext });
                        }
                    }
                } catch (e) { console.error(`Failed to fetch image for PO: ${url}`, e); }
            }
        }));
    } catch (error) { console.error("Error fetching assets for PDF:", error); }
  
    const addHeaderFooterToAllPages = (doc: jsPDF) => {
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            if (headerImage) doc.addImage(headerImage, 'PNG', 0, 0, doc.internal.pageSize.getWidth(), headerHeight);
            if (footerImage) doc.addImage(footerImage, 'PNG', 0, doc.internal.pageSize.getHeight() - footerHeight, doc.internal.pageSize.getWidth(), footerHeight);
        }
    };

    const tempDoc = new jsPDF({ unit: 'pt', format: 'a4' });
    let emptyRowsToAdd = 0;
    
    drawPurchaseOrder(tempDoc, po, exporter, manufacturer, poSize, allProducts, sourcePi, productImageMap, signatureImage, headerHeight, footerHeight, -1);
    // @ts-ignore
    const productTableStartY = tempDoc.lastAutoTable.finalY;

    const postContentHeight = calculatePostTableHeight(tempDoc, po, exporter);
    const availableSpace = tempDoc.internal.pageSize.getHeight() - productTableStartY - postContentHeight - footerHeight;

    const rowHeight = MIN_ROW_HEIGHT;
    const headHeight = 25; 
    const footHeight = 25; 
    const actualTableHeight = headHeight + (po.items.length * rowHeight) + footHeight;

    if (actualTableHeight < availableSpace) {
        const remainingSpace = availableSpace - actualTableHeight;
        if (remainingSpace > 0) {
           emptyRowsToAdd = Math.floor(remainingSpace / rowHeight);
        }
    }
    
    const finalDoc = new jsPDF({ unit: 'pt', format: 'a4' });
    drawPurchaseOrder(finalDoc, po, exporter, manufacturer, poSize, allProducts, sourcePi, productImageMap, signatureImage, headerHeight, footerHeight, emptyRowsToAdd);
    addHeaderFooterToAllPages(finalDoc);

    finalDoc.save(`Purchase_Order_${po.poNumber.replace(/\//g, '_')}.pdf`);
}
