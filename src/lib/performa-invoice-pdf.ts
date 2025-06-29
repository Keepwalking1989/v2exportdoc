
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
const contentWidth = 595.28 - 2 * PAGE_MARGIN_X;

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
  
  const getCurrencySymbol = (currency: 'INR' | 'USD' | 'Euro'): string => {
    switch (currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'INR': return '₹';
      default: return '';
    }
  };
  const currencySymbol = getCurrencySymbol(invoice.currencyType);

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
      [{ content: exporter.address, styles: {...bodyStyle, halign: 'center'} }, { content: client.address, styles: {...bodyStyle, halign: 'center'} }],
      [{ content: 'INVOICE NO & DATE:', styles: headerStyle }, { content: 'FINAL DESTINATION:', styles: headerStyle }],
      [{ content: `${invoice.invoiceNumber || 'N/A'} / ${format(new Date(invoice.invoiceDate), 'dd-MM-yyyy')}`, styles: {...bodyStyle, halign: 'center'} }, { content: invoice.finalDestination || 'N/A', styles: {...bodyStyle, halign: 'center'} }],
      [{ content: 'IEC. CODE:', styles: headerStyle }, { content: 'TERMS AND CONDITIONS OF DELIVERY & PAYMENT:', styles: headerStyle }],
      [{ content: exporter.iecNumber || 'N/A', styles: {...bodyStyle, halign: 'center'} }, { content: invoice.termsAndConditions || 'N/A', styles: { ...bodyStyle, valign: 'top', halign: 'center' } }],
    ],
    columnStyles: { 0: { cellWidth: halfContentWidth }, 1: { cellWidth: halfContentWidth } },
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
  });
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY;

  // --- PRODUCT TABLE ---
  const tableHeadContent = ['SR.\nNO.', 'HSN\nCODE', 'DESCRIPTION OF GOODS', 'TOTAL\nBOXES', 'TOTAL\nSQMT', 'RATE', 'AMOUNT'];
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
      `${currencySymbol} ${item.ratePerSqmt.toFixed(2)}`,
      `${currencySymbol} ${(item.amount || 0).toFixed(2)}`,
    ];
  });
  
  const actualItemCount = tableBodyContent.length;
  const emptyRowsNeeded = actualItemCount < 6 ? 5 : 3;
  for (let i = 0; i < emptyRowsNeeded; i++) {
    tableBodyContent.push(['', '', '', '', '', '', '']);
  }

  const tableFooterContent = [
    ['SUB TOTAL', `${currencySymbol} ${(invoice.subTotal || 0).toFixed(2)}`],
  ];

  if (invoice.freight && invoice.freight > 0.5) {
    tableFooterContent.push([`FREIGHT CHARGES`, `${currencySymbol} ${invoice.freight.toFixed(2)}`]);
  }

  if (invoice.discount && invoice.discount > 0.5) {
    tableFooterContent.push([`DISCOUNT`, `${currencySymbol} ${invoice.discount.toFixed(2)}`]);
  }
  
  tableFooterContent.push([`GRAND TOTAL`, `${currencySymbol} ${(invoice.grandTotal || 0).toFixed(2)}`]);


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
  });
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY;

  // --- TOTAL SQM and AMOUNT IN WORDS ---
  const totalSqmText = (invoice.items.reduce((sum, item) => sum + (item.quantitySqmt || 0), 0)).toFixed(2);
  const amountInWordsStr = amountToWords(invoice.grandTotal || 0, invoice.currencyType);
  const sqmValsWidth = 100;

  autoTable(doc, {
      startY: yPos,
      body: [[
          { content: "TOTAL INVOICE AMOUNT IN WORDS:", styles: { ...headerStyle, halign: 'left' } },
          { content: "TOTAL SQM", styles: headerStyle }
      ]],
      margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
      columnStyles: {
          0: { cellWidth: contentWidth - sqmValsWidth },
          1: { cellWidth: sqmValsWidth }
      },
      didDrawPage: (data) => {
        // @ts-ignore
        yPos = data.cursor?.y ?? yPos;
      }
  });

  autoTable(doc, {
      body: [[
        {
            content: amountInWordsStr.toUpperCase(),
            styles: { ...bodyStyle, fontSize: FONT_BODY_SMALL, halign: 'left', valign: 'top', fillColor: COLOR_WHITE_RGB }
        },
        {
            content: totalSqmText,
            styles: { ...bodyStyle, halign: 'center' }
        }
      ]],
      startY: yPos,
      theme: 'grid',
      margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
      columnStyles: {
          0: { cellWidth: contentWidth - sqmValsWidth },
          1: { cellWidth: sqmValsWidth }
      },
      didParseCell: (data) => {
         if(data.row.index === 0 && data.column.index === 0) {
            const amountCellWidth = contentWidth - sqmValsWidth;
            const amountLines = doc.splitTextToSize(amountInWordsStr.toUpperCase(), amountCellWidth - data.cell.padding('horizontal'));
            const amountHeight = (amountLines.length * FONT_BODY_SMALL) + data.cell.padding('vertical') + (amountLines.length > 1 ? (amountLines.length - 1) * 2 : 0);
            
            const sqmHeight = (1 * FONT_BODY) + data.cell.padding('vertical');
            
            const maxHeight = Math.max(amountHeight, sqmHeight);
            data.row.height = maxHeight;
        }
      },
      didDrawPage: (data) => {
        // @ts-ignore
        yPos = data.cursor?.y ?? yPos;
      }
  });
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY;

    autoTable(doc, {
    startY: yPos,
    body: [[
        { content: `Note:\n${invoice.note || 'N/A'}`, styles: { ...bodyStyle, halign: 'left' } }
    ]],
    didParseCell: (data) => {
        if (data.section === 'body' && data.cell.raw) {
            const rawContent = data.cell.raw.toString();
            const noteIndex = rawContent.indexOf("Note:");
            if (noteIndex !== -1) {
                const noteText = rawContent.substring(0, noteIndex + 5);
                const restOfText = rawContent.substring(noteIndex + 5);
                data.cell.text = [
                    {text: noteText, styles: {fontStyle: 'bold', fontSize: FONT_HEADER}},
                    {text: restOfText, styles: {fontStyle: 'normal', fontSize: FONT_BODY}}
                ];
            }
        }
    },
    theme: 'grid',
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
    didDrawPage: (data) => {
      // @ts-ignore
      yPos = data.cursor?.y ?? yPos;
    }
  });
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY;

  const bankDetailsText = `BENEFICIARY NAME: ${exporter.companyName.toUpperCase()}\nBENEFICIARY BANK: ${selectedBank?.bankName.toUpperCase() || ''}, BRANCH: ${selectedBank?.bankAddress.toUpperCase() || ''}\nBENEFICIARY A/C NO: ${selectedBank?.accountNumber || ''}, SWIFT CODE: ${selectedBank?.swiftCode.toUpperCase() || ''}, IFSC CODE: ${selectedBank?.ifscCode.toUpperCase() || ''}`;
  autoTable(doc, {
    startY: yPos,
    body: [[
      { content: `Bank Details\n${bankDetailsText}`, styles: {...bodyStyle, halign: 'left'} }
    ]],
    didParseCell: (data) => {
        if (data.section === 'body' && data.cell.raw) {
            const rawContent = data.cell.raw.toString();
            const headerIndex = rawContent.indexOf("Bank Details");
            if (headerIndex !== -1) {
                const headerText = rawContent.substring(0, headerIndex + 12);
                const restOfText = rawContent.substring(headerIndex + 12);
                 data.cell.text = [
                    {text: headerText, styles: {fontStyle: 'bold', fontSize: FONT_HEADER}},
                    {text: restOfText, styles: {fontStyle: 'normal', fontSize: FONT_BODY}}
                ];
            }
        }
    },
    theme: 'grid',
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
    didDrawPage: (data) => {
      // @ts-ignore
      yPos = data.cursor?.y ?? yPos;
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
          rowSpan: 3,
          styles: { ...bodyStyle, valign: 'top' }
        },
        { content: `Signature & Date ${format(new Date(), 'dd-MM-yyyy')}`, styles: { ...bodyStyle, valign: 'bottom' } }
      ],
      [
        { content: `FOR, ${exporter.companyName.toUpperCase()}`, styles: { ...headerStyle, valign: 'bottom' } }
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
