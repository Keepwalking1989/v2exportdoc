
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
const PAGE_MARGIN_Y_TOP = 28.34; // pt (approx 10mm)

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

export function generatePerformaInvoicePdf(
  invoice: PerformaInvoice,
  exporter: Company,
  client: Client,
  allSizes: Size[],
  allProducts: Product[],
  selectedBank?: Bank
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let yPos = PAGE_MARGIN_Y_TOP;
  const contentWidth = doc.internal.pageSize.getWidth() - 2 * PAGE_MARGIN_X;
  const halfContentWidth = contentWidth / 2;

  // --- Reusable Style Definitions for autoTable ---
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
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
  });
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY;

  // --- Rows 2-8: Exporter & Consignee Details ---
  autoTable(doc, {
    startY: yPos,
    body: [
      [{ content: 'EXPORTER', styles: headerStyle }, { content: 'CONSIGNEE / BUYER:', styles: headerStyle }],
      [{ content: exporter.companyName.toUpperCase(), styles: { ...headerStyle, fontSize: FONT_BODY } }, { content: client.companyName.toUpperCase(), styles: { ...headerStyle, fontSize: FONT_BODY } }],
      [{ content: exporter.address, styles: bodyStyle }, { content: client.address, styles: bodyStyle }],
      [{ content: 'INVOICE NO & DATE:', styles: headerStyle }, { content: 'FINAL DESTINATION:', styles: headerStyle }],
      [{ content: `${invoice.invoiceNumber || 'N/A'} / ${format(new Date(invoice.invoiceDate), 'dd-MM-yyyy')}`, styles: bodyStyle }, { content: invoice.finalDestination || 'N/A', styles: bodyStyle }],
      [{ content: 'IEC. CODE:', styles: headerStyle }, { content: 'TERMS AND CONDITIONS OF DELIVERY & PAYMENT:', styles: headerStyle }],
      [{ content: exporter.iecNumber || 'N/A', styles: bodyStyle }, { content: invoice.termsAndConditions || 'N/A', styles: { ...bodyStyle, valign: 'top' } }],
    ],
    columnStyles: { 0: { cellWidth: halfContentWidth }, 1: { cellWidth: halfContentWidth } },
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
  });
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY;

  // --- PRODUCT TABLE ---
  const tableHeadContent = ['SR.\nNO.', 'HSN\nCODE', 'DESCRIPTION OF GOODS', 'TOTAL\nBOXES', 'TOTAL\nSQMT', `RATE\n${invoice.currencyType}`, `AMOUNT\n${invoice.currencyType}`];
  const tableBodyContent = invoice.items.map((item, index) => {
    const product = allProducts.find(p => p.id === item.productId);
    const size = allSizes.find(s => s.id === item.sizeId);
    const goodsDesc = `${product?.designName || 'N/A'} ${size?.size || 'N/A'}`;
    return [
      (index + 1).toString(),
      size?.hsnCode || 'N/A',
      goodsDesc,
      item.boxes.toString(),
      (item.quantitySqmt || 0).toFixed(2),
      item.ratePerSqmt.toFixed(2),
      (item.amount || 0).toFixed(2),
    ];
  });

  const actualItemCount = tableBodyContent.length;
  const emptyRowsNeeded = actualItemCount < 6 ? 5 : 3;
  for (let i = 0; i < emptyRowsNeeded; i++) {
    tableBodyContent.push(['', '', '', '', '', '', '']);
  }

  const tableFooterContent = [
    ['SUB TOTAL', (invoice.subTotal || 0).toFixed(2)],
    [`FREIGHT CHARGES ${invoice.currencyType}`, (invoice.freight || 0).toFixed(2)],
    [`DISCOUNT ${invoice.currencyType}`, (invoice.discount || 0).toFixed(2)],
    [`GRAND TOTAL ${invoice.currencyType}`, (invoice.grandTotal || 0).toFixed(2)],
  ];

  autoTable(doc, {
    head: [tableHeadContent],
    body: tableBodyContent,
    foot: tableFooterContent.map(row => [
      { content: row[0], colSpan: 6, styles: { halign: 'right' } },
      { content: row[1], styles: { halign: 'right' } }
    ]),
    startY: yPos,
    theme: 'plain',
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
    styles: { lineWidth: 0.5, lineColor: COLOR_BORDER_RGB, cellPadding: CELL_PADDING },
    headStyles: headerStyle,
    bodyStyles: { ...bodyStyle, halign: 'left' },
    footStyles: { ...bodyStyle, fontStyle: 'bold', halign: 'right' },
    columnStyles: {
      0: { halign: 'center' }, 1: { halign: 'center' }, 3: { halign: 'center' },
      4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'foot') {
        data.cell.styles.textColor = COLOR_BLACK_RGB; // Ensure footer value text is black
        if (data.column.index === 0) {
          data.cell.styles.fillColor = COLOR_BLUE_RGB;
        }
      }
    },
    didDrawCell: (data) => {
      doc.setDrawColor(COLOR_BORDER_RGB[0], COLOR_BORDER_RGB[1], COLOR_BORDER_RGB[2]);
      doc.setLineWidth(0.5);
      doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'S');
    },
  });
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY;

  // --- TOTAL SQM and AMOUNT IN WORDS ---
  const totalSqmText = (invoice.items.reduce((sum, item) => sum + (item.quantitySqmt || 0), 0)).toFixed(2);
  const amountInWordsStr = amountToWords(invoice.grandTotal || 0, invoice.currencyType);
  const amountInWordsHeight = calculateNaturalCellHeight(doc, amountInWordsStr.toUpperCase(), halfContentWidth, 3);
  autoTable(doc, {
    startY: yPos,
    body: [
      [{ content: "TOTAL SQM", styles: headerStyle }, { content: totalSqmText, styles: { ...headerStyle, halign: 'center' } }],
      [{ content: "TOTAL INVOICE AMOUNT IN WORDS:", styles: { ...headerStyle, minCellHeight: amountInWordsHeight } }, { content: amountInWordsStr.toUpperCase(), styles: { ...bodyStyle, fontSize: FONT_BODY_SMALL, minCellHeight: amountInWordsHeight, halign: 'center' } }]
    ],
    columnStyles: { 0: { cellWidth: halfContentWidth }, 1: { cellWidth: halfContentWidth } },
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
  });
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY;

  // --- Note and Bank Details ---
  autoTable(doc, {
    startY: yPos,
    body: [
      [{
        content: `Note:\n${invoice.note || 'N/A'}`,
        styles: { ...bodyStyle, halign: 'left', valign: 'top' }
      }],
      [{
        content: `Bank Details`,
        styles: { ...headerStyle, halign: 'left' }
      }],
      [{
        content: `BENEFICIARY NAME: ${exporter.companyName.toUpperCase()}\nBENEFICIARY BANK: ${selectedBank?.bankName.toUpperCase() || ''}, BRANCH: ${selectedBank?.bankAddress.toUpperCase() || ''}\nBENEFICIARY A/C NO: ${selectedBank?.accountNumber || ''}, SWIFT CODE: ${selectedBank?.swiftCode.toUpperCase() || ''}, IFSC CODE: ${selectedBank?.ifscCode.toUpperCase() || ''}`,
        styles: { ...bodyStyle, halign: 'left', valign: 'top', lineWidth: { top: 0 } }
      }]
    ],
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
    didDrawCell: (data) => {
      if (data.row.index === 0 && data.section === 'body') {
        const cell = data.cell;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_HEADER);
        doc.text("Note:", cell.x + cell.padding('left'), cell.y + cell.padding('top') + FONT_HEADER);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FONT_BODY);
        const noteContent = invoice.note || 'N/A';
        const contentLines = doc.splitTextToSize(noteContent, cell.width - cell.padding('left') - cell.padding('right'));
        doc.text(contentLines, cell.x + cell.padding('left'), cell.y + cell.padding('top') + FONT_HEADER + FONT_BODY + 2);
      }
    }
  });
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY;

  // --- Declaration & Signature Block ---
  autoTable(doc, {
    startY: yPos,
    theme: 'plain',
    body: [
      [
        {
          content: `Declaration:\nCERTIFIED THAT THE PARTICULARS GIVEN ABOVE ARE TRUE AND CORRECT.`,
          rowSpan: 4,
          styles: { ...bodyStyle, valign: 'top' }
        },
        { content: `Signature & Date ${format(new Date(), 'dd-MM-yyyy')}`, styles: { ...bodyStyle, valign: 'bottom' } }
      ],
      [
        { content: `FOR, ${exporter.companyName.toUpperCase()}`, styles: { ...headerStyle, valign: 'bottom' } }
      ],
      [
        { content: '', styles: { ...bodyStyle, minCellHeight: 40 } }
      ],
      [
        { content: 'AUTHORISED SIGNATURE', styles: { ...headerStyle, halign: 'right', valign: 'bottom' } }
      ]
    ],
    columnStyles: { 0: { cellWidth: contentWidth * 0.60 }, 1: { cellWidth: contentWidth * 0.40 } },
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
  });

  doc.save(`Performa_Invoice_${invoice.invoiceNumber.replace(/[\\/]/g, '_')}.pdf`);
}


// Helper function to calculate natural height of text in a cell
function calculateNaturalCellHeight(doc: jsPDF, text: string, width: number, category: 1 | 2 | 3 | 'manufacturerName', overrideFontStyle?: Partial<any>): number {
  // Simplified version, a more robust solution would be needed for complex cases
  const style = getPdfCellStyle(category).fontStyle;
  doc.setFontSize(overrideFontStyle?.size || style.size);
  const lines = doc.splitTextToSize(text, width - 2 * CELL_PADDING);
  return lines.length * (overrideFontStyle?.size || style.size) + (lines.length * 2) + (CELL_PADDING * 2);
}

// Simplified styles, autoTable's own styles are more robust
function getPdfCellStyle(category: 1 | 2 | 3 | 'manufacturerName') {
    return {
        fontStyle: { size: category === 1 ? FONT_TITLE : FONT_HEADER, weight: 'bold', style: 'normal', lineHeightAddition: 2 },
        // ... other styles
    };
}
