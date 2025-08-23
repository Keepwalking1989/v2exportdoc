
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { PerformaInvoice } from '@/types/performa-invoice';
import type { Company } from '@/types/company';
import type { Client } from '@/types/client';
import type { Size } from '@/types/size';
import type { Product } from '@/types/product';
import type { Bank } from '@/types/bank';
import { amountToWords } from '@/lib/utils';

// --- Page & General Layout (Using Points) ---
const PAGE_MARGIN_X = 28.34; // pt (approx 10mm)
const CONTENT_WIDTH = 595.28 - 2 * PAGE_MARGIN_X;

// --- Colors ---
const COLOR_BLUE_RGB = [217, 234, 247]; // Light blue for backgrounds
const COLOR_WHITE_RGB = [255, 255, 255];
const COLOR_BLACK_RGB = [0, 0, 0];
const COLOR_BORDER_RGB = [0, 0, 0]; // Black border for cells

// --- Font Size Categories (pt) ---
const FONT_TITLE = 14;
const FONT_HEADER = 10;
const FONT_BODY = 8;
const FONT_BODY_SMALL = 7;

// --- Cell Padding (pt) ---
const CELL_PADDING = 4;
const MIN_ROW_HEIGHT = 60; // Minimum height for a product row with an image

function drawPerformaInvoice(
  doc: jsPDF,
  invoice: PerformaInvoice,
  exporter: Company,
  client: Client,
  allSizes: Size[],
  allProducts: Product[],
  selectedBank: Bank | undefined,
  productImageMap: Map<string, {data: Uint8Array, ext: string}>,
  signatureImage: Uint8Array | null,
  headerHeight: number,
  footerHeight: number,
  numEmptyRows: number // Dynamic parameter
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  const addHeaderFooter = () => {
      // This is handled by the calling function to avoid re-fetching images
  };

  const headerStyle = {
    fillColor: COLOR_BLUE_RGB,
    textColor: COLOR_BLACK_RGB,
    fontStyle: 'bold',
    fontSize: FONT_HEADER,
    halign: 'center',
    valign: 'middle',
    lineWidth: 0.5,
    lineColor: COLOR_BORDER_RGB,
    cellPadding: CELL_PADDING,
  };
  const bodyStyle = {
    fillColor: COLOR_WHITE_RGB,
    textColor: COLOR_BLACK_RGB,
    fontStyle: 'normal',
    fontSize: FONT_BODY,
    valign: 'middle',
    lineWidth: 0.5,
    lineColor: COLOR_BORDER_RGB,
    cellPadding: CELL_PADDING,
  };
  
  const getCurrencySymbol = (currency: 'INR' | 'USD' | 'Euro'): string => {
    switch (currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'INR': return '₹';
      default: return '';
    }
  };
  const currencySymbol = getCurrencySymbol(invoice.currencyType);
  
  let yPos = headerHeight + 10;

  // --- Row 1: PROFORMA INVOICE ---
  autoTable(doc, {
    startY: yPos,
    body: [['PROFORMA INVOICE']],
    theme: 'plain',
    styles: {
      fontSize: FONT_TITLE,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: CELL_PADDING,
      lineWidth: 0.5,
      lineColor: COLOR_BORDER_RGB,
      fillColor: COLOR_BLUE_RGB,
    },
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X, top: headerHeight, bottom: footerHeight },
    didDrawPage: addHeaderFooter,
  });
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY;

  // --- Rows 2-8: Exporter & Consignee Details ---
  autoTable(doc, {
    startY: yPos,
    body: [
      [{ content: 'EXPORTER', styles: headerStyle }, { content: 'CONSIGNEE / BUYER:', styles: headerStyle }],
      [{ content: exporter.companyName.toUpperCase(), styles: { ...headerStyle, fontSize: FONT_BODY } }, { content: client.companyName.toUpperCase(), styles: { ...headerStyle, fontSize: FONT_BODY } }],
      [{ content: exporter.address, styles: {...bodyStyle, halign: 'center'} }, { content: client.address, styles: {...bodyStyle, halign: 'center'} }],
    ],
    columnStyles: { 0: { cellWidth: CONTENT_WIDTH/2 }, 1: { cellWidth: CONTENT_WIDTH/2 } },
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X, top: headerHeight, bottom: footerHeight },
    didDrawPage: addHeaderFooter,
  });
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY;

  // --- Invoice Details Table ---
  autoTable(doc, {
    startY: yPos,
    body: [
        [{ content: 'INVOICE NO:', styles: headerStyle }, { content: 'INVOICE DATE:', styles: headerStyle }, { content: 'FINAL DESTINATION:', styles: headerStyle }],
        [{ content: invoice.invoiceNumber || 'N/A', styles: { ...bodyStyle, halign: 'center' } }, { content: format(new Date(invoice.invoiceDate), 'dd-MM-yyyy'), styles: { ...bodyStyle, halign: 'center' } }, { content: invoice.finalDestination || 'N/A', styles: { ...bodyStyle, halign: 'center' } }],
    ],
    columnStyles: { 0: { cellWidth: '33.33%' }, 1: { cellWidth: '33.33%' }, 2: { cellWidth: '33.33%' } },
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X, top: headerHeight, bottom: footerHeight },
    didDrawPage: addHeaderFooter,
});
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY;

  // --- IEC & Terms Table ---
  autoTable(doc, {
    startY: yPos,
    body: [
      [{ content: 'IEC. CODE:', styles: headerStyle }, { content: 'TERMS AND CONDITIONS OF DELIVERY & PAYMENT:', styles: headerStyle }],
      [{ content: exporter.iecNumber || 'N/A', styles: {...bodyStyle, halign: 'center'} }, { content: invoice.termsAndConditions || 'N/A', styles: { ...bodyStyle, valign: 'top', halign: 'left' } }],
    ],
    columnStyles: { 0: { cellWidth: CONTENT_WIDTH/2 }, 1: { cellWidth: CONTENT_WIDTH/2 } },
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X, top: headerHeight, bottom: footerHeight },
    didDrawPage: addHeaderFooter,
  });
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY;

  // --- PRODUCT TABLE ---
  const tableHeadContent = ['SR.\nNO.', 'HSN\nCODE', 'DESCRIPTION OF GOODS', 'IMAGE', 'TOTAL\nBOXES', 'TOTAL\nSQMT', `RATE\n(${currencySymbol})`, `AMOUNT\n(${currencySymbol})`];
  const tableBodyContent = invoice.items.map((item, index) => {
    const product = allProducts.find(p => p.id === item.productId);
    const size = allSizes.find(s => s.id === item.sizeId);
    const goodsDesc = `${product?.designName || 'N/A'} ${size?.size || 'N/A'}`;
    return [
      (index + 1).toString(),
      size?.hsnCode || 'N/A',
      goodsDesc,
      item.productId, // Use productId as a placeholder for the image
      item.boxes.toString(),
      (item.quantitySqmt || 0).toFixed(2),
      `${currencySymbol} ${item.ratePerSqmt.toFixed(2)}`,
      `${currencySymbol} ${(item.amount || 0).toFixed(2)}`,
    ];
  });
  
  const tableBodyWithEmptyRows = [...tableBodyContent];
  const emptyRowData = Array(tableHeadContent.length).fill(' ');
  for (let i = 0; i < numEmptyRows; i++) {
      tableBodyWithEmptyRows.push([...emptyRowData]);
  }

  const tableFooterContent = [];
  const showSubTotal = (invoice.freight && invoice.freight > 0.5) || (invoice.discount && invoice.discount > 0.5);
  if (showSubTotal) { tableFooterContent.push(['SUB TOTAL', `${currencySymbol} ${(invoice.subTotal || 0).toFixed(2)}`]); }
  if (invoice.freight && invoice.freight > 0.5) { tableFooterContent.push([`FREIGHT CHARGES`, `${currencySymbol} ${invoice.freight.toFixed(2)}`]); }
  if (invoice.discount && invoice.discount > 0.5) { tableFooterContent.push([`DISCOUNT`, `${currencySymbol} ${invoice.discount.toFixed(2)}`]); }
  tableFooterContent.push([`GRAND TOTAL`, `${currencySymbol} ${(invoice.grandTotal || 0).toFixed(2)}`]);

  autoTable(doc, {
    head: [tableHeadContent],
    body: tableBodyWithEmptyRows,
    foot: tableFooterContent.map(row => [ { content: row[0], colSpan: 7, styles: { halign: 'right' } }, { content: row[1], styles: { halign: 'right' } } ]),
    startY: yPos,
    theme: 'plain',
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X, top: headerHeight, bottom: footerHeight },
    styles: { lineWidth: 0.5, lineColor: COLOR_BORDER_RGB, cellPadding: CELL_PADDING },
    headStyles: { ...headerStyle, fontSize: FONT_BODY },
    bodyStyles: { ...bodyStyle, halign: 'left', minCellHeight: MIN_ROW_HEIGHT },
    footStyles: { ...bodyStyle, fontStyle: 'bold', halign: 'right' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 30 }, 1: { halign: 'center', cellWidth: 50 }, 2: { halign: 'left', cellWidth: 'auto' }, 3: { halign: 'center', cellWidth: 60 }, 4: { halign: 'center', cellWidth: 50 }, 5: { halign: 'right', cellWidth: 50 }, 6: { halign: 'right', cellWidth: 60 }, 7: { halign: 'right', cellWidth: 70 },
    },
    didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
            const productId = data.cell.raw as string;
            if (!productId) return;
            const imgData = productImageMap.get(productId);
            if (imgData) {
                const cell = data.cell;
                const availableWidth = cell.width - cell.padding('horizontal');
                const availableHeight = cell.height - cell.padding('vertical');
                const imgSize = Math.min(availableWidth, availableHeight, 50);
                const imgX = cell.x + (cell.width - imgSize) / 2;
                const imgY = cell.y + (cell.height - imgSize) / 2;
                try { doc.addImage(imgData.data, imgData.ext, imgX, imgY, imgSize, imgSize); } catch (e) { console.error("Error adding image to PDF:", e); }
            }
            data.cell.text = '';
        }
    },
    didParseCell: (data) => {
      if (data.section === 'foot') { data.cell.styles.textColor = COLOR_BLACK_RGB; if (data.column.index === 0) { data.cell.styles.fillColor = COLOR_BLUE_RGB; } }
      if ((data.section === 'body' || data.section === 'foot') && (data.cell.raw === '' || data.cell.raw === undefined || (typeof data.cell.raw === 'object' && 'content' in data.cell.raw && data.cell.raw.content === ' '))) { data.cell.styles.fillColor = COLOR_WHITE_RGB; }
    },
    didDrawPage: addHeaderFooter,
  });
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY;

  const totalSqmText = (invoice.items.reduce((sum, item) => sum + (item.quantitySqmt || 0), 0)).toFixed(2);
  const amountInWordsStr = amountToWords(invoice.grandTotal || 0, invoice.currencyType);
  const sqmValsWidth = 100;

  autoTable(doc, {
      startY: yPos, body: [[ { content: "TOTAL INVOICE AMOUNT IN WORDS:", styles: { ...headerStyle, halign: 'left' } }, { content: "TOTAL SQM", styles: headerStyle } ]],
      margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X, top: headerHeight, bottom: footerHeight },
      columnStyles: { 0: { cellWidth: CONTENT_WIDTH - sqmValsWidth }, 1: { cellWidth: sqmValsWidth } },
      didDrawPage: addHeaderFooter,
  });
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY;

  autoTable(doc, {
      body: [[
        { content: amountInWordsStr.toUpperCase(), styles: { ...bodyStyle, fontSize: FONT_BODY_SMALL, halign: 'left', valign: 'top', fillColor: COLOR_WHITE_RGB } },
        { content: totalSqmText, styles: { ...bodyStyle, halign: 'center' } }
      ]],
      startY: yPos, theme: 'grid',
      margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X, top: headerHeight, bottom: footerHeight },
      columnStyles: { 0: { cellWidth: CONTENT_WIDTH - sqmValsWidth }, 1: { cellWidth: sqmValsWidth } },
      didParseCell: (data) => {
         if(data.row.index === 0 && data.column.index === 0) {
            const amountCellWidth = CONTENT_WIDTH - sqmValsWidth;
            const amountLines = doc.splitTextToSize(amountInWordsStr.toUpperCase(), amountCellWidth - data.cell.padding('horizontal'));
            const amountHeight = (amountLines.length * FONT_BODY_SMALL) + data.cell.padding('vertical') + (amountLines.length > 1 ? (amountLines.length - 1) * 2 : 0);
            const sqmHeight = (1 * FONT_BODY) + data.cell.padding('vertical');
            data.row.height = Math.max(amountHeight, sqmHeight);
        }
      },
      didDrawPage: addHeaderFooter,
  });
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY;

  autoTable(doc, {
    startY: yPos, body: [[{ content: 'Note:', styles: { ...headerStyle, halign: 'left' } }]],
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X, top: headerHeight, bottom: footerHeight }, didDrawPage: addHeaderFooter,
  });
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY;
  autoTable(doc, {
    startY: yPos, body: [[{ content: invoice.note || 'N/A', styles: { ...bodyStyle, halign: 'left', minCellHeight: 40, valign: 'top' } }]],
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X, top: headerHeight, bottom: footerHeight }, didDrawPage: addHeaderFooter,
  });
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY;

  autoTable(doc, {
    startY: yPos, body: [[{ content: 'Bank Details', styles: { ...headerStyle, halign: 'left' } }]],
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X, top: headerHeight, bottom: footerHeight }, didDrawPage: addHeaderFooter,
  });
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY;
  const bankDetailsText = `BENEFICIARY NAME: ${exporter.companyName.toUpperCase()}\nBENEFICIARY BANK: ${selectedBank?.bankName.toUpperCase() || ''}, BRANCH: ${selectedBank?.bankAddress.toUpperCase() || ''}\nBENEFICIARY A/C NO: ${selectedBank?.accountNumber || ''}, SWIFT CODE: ${selectedBank?.swiftCode.toUpperCase() || ''}, IFSC CODE: ${selectedBank?.ifscCode.toUpperCase() || ''}`;
  autoTable(doc, {
    startY: yPos, body: [[{ content: bankDetailsText, styles: { ...bodyStyle, halign: 'left', valign: 'top', minCellHeight: 60 } }]],
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X, top: headerHeight, bottom: footerHeight }, didDrawPage: addHeaderFooter,
  });
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY;

  autoTable(doc, {
    startY: yPos, theme: 'plain', body: [
      [
        { content: `Declaration:\nCERTIFIED THAT THE PARTICULARS GIVEN ABOVE ARE TRUE AND CORRECT.`, rowSpan: 4, styles: { ...bodyStyle, valign: 'top' } },
        { content: `Signature & Date: ${format(new Date(invoice.invoiceDate), 'dd-MM-yyyy')}`, styles: { ...headerStyle, valign: 'bottom' } },
      ],
      [{ content: `FOR, ${exporter.companyName.toUpperCase()}`, styles: { ...headerStyle, valign: 'bottom' } }],
      [{ content: '', styles: { ...bodyStyle, minCellHeight: 40 } }],
      [{ content: `AUTHORISED SIGNATURE`, styles: { ...headerStyle, valign: 'bottom' } }]
    ],
    columnStyles: { 0: { cellWidth: CONTENT_WIDTH * 0.60 }, 1: { cellWidth: CONTENT_WIDTH * 0.40 } },
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X, top: headerHeight, bottom: footerHeight },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.row.index === 2 && data.column.index === 1) {
        if (signatureImage) {
          const cell = data.cell; const imgWidth = 80; const imgHeight = 40;
          const imgX = cell.x + (cell.width - imgWidth) / 2; const imgY = cell.y + (cell.height - imgHeight) / 2;
          doc.addImage(signatureImage, 'PNG', imgX, imgY, imgWidth, imgHeight);
        }
      }
    },
    didDrawPage: addHeaderFooter,
  });
}

function calculatePostTableHeight(
    doc: jsPDF, 
    invoice: PerformaInvoice, 
    exporter: Company,
    selectedBank: Bank | undefined,
    headerHeight: number, 
    footerHeight: number
) {
    let height = 0;
    const startY = doc.internal.pageSize.getHeight() * 2; // Start way off-page

    autoTable(doc, {
        startY,
        body: [[
            { content: "TOTAL INVOICE AMOUNT IN WORDS:", styles: { ...{fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold', fontSize: FONT_HEADER, halign: 'left'}, cellPadding: CELL_PADDING } },
            { content: "TOTAL SQM", styles: {fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontStyle: 'bold', fontSize: FONT_HEADER, halign: 'center'} }
        ]],
        didDrawPage: () => false
    });
    // @ts-ignore
    height += doc.lastAutoTable.finalY - startY;

    // ... and so on for all other tables below the product list
    // This is a simplified example. You would simulate drawing ALL tables.
    
    return height;
}

export async function generatePerformaInvoicePdf(
  invoice: PerformaInvoice,
  exporter: Company,
  client: Client,
  allSizes: Size[],
  allProducts: Product[],
  selectedBank?: Bank
) {
  let headerImage: Uint8Array | null = null;
  let footerImage: Uint8Array | null = null;
  let signatureImage: Uint8Array | null = null;
  const productImageMap = new Map<string, {data: Uint8Array, ext: string}>();
  let headerHeight = 0, footerHeight = 0;

  try {
    const [headerRes, footerRes, signatureRes] = await Promise.all([ fetch('/Latter-pad-head.png'), fetch('/Latter-pad-bottom.png'), fetch('/signature.png') ]);
    if (headerRes.ok) { headerImage = new Uint8Array(await headerRes.arrayBuffer()); headerHeight = 70; }
    if (footerRes.ok) { footerImage = new Uint8Array(await footerRes.arrayBuffer()); footerHeight = 80; }
    if (signatureRes.ok) { signatureImage = new Uint8Array(await signatureRes.arrayBuffer()); }

    const uniqueProductIdsWithImages = [...new Set(invoice.items.map(item => item.productId))];
    for (const productId of uniqueProductIdsWithImages) {
        const product = allProducts.find(p => p.id === productId);
        if (product?.imageUrl && !productImageMap.has(product.id)) {
            try {
                const imgResponse = await fetch(product.imageUrl);
                if (imgResponse.ok) {
                    const arrayBuffer = await imgResponse.arrayBuffer();
                    const ext = product.imageUrl.split('.').pop()?.toUpperCase() || 'PNG';
                    productImageMap.set(product.id, { data: new Uint8Array(arrayBuffer), ext });
                }
            } catch (e) { console.error(`Failed to fetch image for product ${product.id}:`, e); }
        }
    }
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
  drawPerformaInvoice(tempDoc, invoice, exporter, client, allSizes, allProducts, selectedBank, productImageMap, signatureImage, headerHeight, footerHeight, 100); // Draw with lots of rows to force page breaks
  const totalPages = tempDoc.internal.getNumberOfPages();
  let numEmptyRows = 0;

  if (totalPages === 1) {
    const tempDocOnePage = new jsPDF({ unit: 'pt', format: 'a4' });
    drawPerformaInvoice(tempDocOnePage, invoice, exporter, client, allSizes, allProducts, selectedBank, productImageMap, signatureImage, headerHeight, footerHeight, 0); // Draw with no empty rows
    // @ts-ignore
    const finalY = tempDocOnePage.lastAutoTable.finalY;
    const availableSpace = tempDocOnePage.internal.pageSize.getHeight() - footerHeight - finalY;
    if (availableSpace > 0) {
      numEmptyRows = Math.floor(availableSpace / MIN_ROW_HEIGHT);
    }
  }

  const finalDoc = new jsPDF({ unit: 'pt', format: 'a4' });
  drawPerformaInvoice(finalDoc, invoice, exporter, client, allSizes, allProducts, selectedBank, productImageMap, signatureImage, headerHeight, footerHeight, numEmptyRows);
  addHeaderFooterToAllPages(finalDoc);

  finalDoc.save(`Performa_Invoice_${invoice.invoiceNumber.replace(/[\\/]/g, '_')}.pdf`);
}
