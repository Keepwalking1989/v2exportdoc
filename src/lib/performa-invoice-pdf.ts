
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
const PAGE_MARGIN_Y_BOTTOM = 28.34; // pt (approx 10mm)

// --- Colors ---
const COLOR_BLUE_RGB = [217, 234, 247]; // Light blue for backgrounds
const COLOR_WHITE_RGB = [255, 255, 255];
const COLOR_BLACK_RGB = [0, 0, 0];
const COLOR_BORDER_RGB = [0, 0, 0]; // Black border for cells

// --- Font Size Categories (pt) ---
const FONT_CAT1_SIZE = 14;
const FONT_CAT2_SIZE = 10;
const FONT_CAT3_SIZE = 8;

// --- Line Height Additions (pt) ---
const LINE_HEIGHT_ADDITION = 2.0; // Universal addition for simplicity

// --- Cell Padding (pt) ---
const CELL_PADDING = 3;

interface FontStyle {
  size: number;
  weight: 'normal' | 'bold';
  style: 'normal' | 'italic';
}

interface CellStyle {
  fontStyle: FontStyle;
  backgroundColor: number[] | null; // null for transparent/default white
  textColor: number[];
  textAlign: 'left' | 'center' | 'right';
  borderColor: number[];
  borderWidth: number;
  padding: number;
}

function getCellStyle(category: 1 | 2 | 3): CellStyle {
  switch (category) {
    case 1:
      return {
        fontStyle: { size: FONT_CAT1_SIZE, weight: 'bold', style: 'normal' },
        backgroundColor: COLOR_BLUE_RGB,
        textColor: COLOR_BLACK_RGB,
        textAlign: 'center',
        borderColor: COLOR_BORDER_RGB,
        borderWidth: 0.5,
        padding: CELL_PADDING,
      };
    case 2:
      return {
        fontStyle: { size: FONT_CAT2_SIZE, weight: 'bold', style: 'normal' },
        backgroundColor: COLOR_BLUE_RGB,
        textColor: COLOR_BLACK_RGB,
        textAlign: 'center',
        borderColor: COLOR_BORDER_RGB,
        borderWidth: 0.5,
        padding: CELL_PADDING,
      };
    case 3:
    default:
      return {
        fontStyle: { size: FONT_CAT3_SIZE, weight: 'normal', style: 'normal' },
        backgroundColor: COLOR_WHITE_RGB,
        textColor: COLOR_BLACK_RGB,
        textAlign: 'left',
        borderColor: COLOR_BORDER_RGB,
        borderWidth: 0.5,
        padding: CELL_PADDING,
      };
  }
}

function calculateCellHeight(
  doc: jsPDF,
  text: string,
  width: number,
  category: 1 | 2 | 3,
  overrideFontStyle?: Partial<FontStyle>
): number {
    const baseStyle = getCellStyle(category);
    const effectiveFontStyle = overrideFontStyle ? { ...baseStyle.fontStyle, ...overrideFontStyle } : baseStyle.fontStyle;

    doc.setFont('helvetica', `${effectiveFontStyle.weight === 'bold' ? 'bold' : ''}${effectiveFontStyle.style === 'italic' ? 'italic' : ''}`.replace(/^$/, 'normal') as any);
    doc.setFontSize(effectiveFontStyle.size);

    const lines = doc.splitTextToSize(text || ' ', width - 2 * CELL_PADDING);
    const textHeight = lines.length * (effectiveFontStyle.size + LINE_HEIGHT_ADDITION) - LINE_HEIGHT_ADDITION;
    return textHeight + 2 * CELL_PADDING;
}


/**
 * Draws a cell with text, border, and optional background.
 * Returns the Y-coordinate of the bottom of the drawn cell.
 */
function drawCell(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  category: 1 | 2 | 3,
  fixedHeight: number | null = null,
  overrideTextAlign: 'left' | 'center' | 'right' | null = null,
  overrideFontStyle?: Partial<FontStyle>,
  forceNoBackground?: boolean
): number {
  const baseStyle = getCellStyle(category);
   const cellStyle: CellStyle = {
    ...baseStyle,
    fontStyle: overrideFontStyle ? { ...baseStyle.fontStyle, ...overrideFontStyle } : baseStyle.fontStyle,
  };
  if (overrideTextAlign) {
    cellStyle.textAlign = overrideTextAlign;
  }
  if (forceNoBackground) {
      cellStyle.backgroundColor = null;
  }


  doc.setFont( 'helvetica', `${cellStyle.fontStyle.weight === 'bold' ? 'bold' : ''}${cellStyle.fontStyle.style === 'italic' ? 'italic' : ''}`.replace(/^$/, 'normal') as any);
  doc.setFontSize(cellStyle.fontStyle.size);

  const lines = doc.splitTextToSize(text || ' ', width - 2 * cellStyle.padding);
  const textHeight = lines.length * (cellStyle.fontStyle.size + LINE_HEIGHT_ADDITION) - LINE_HEIGHT_ADDITION;
  const cellHeight = fixedHeight !== null ? fixedHeight : textHeight + 2 * cellStyle.padding;

  // Draw background
  if (cellStyle.backgroundColor) {
    doc.setFillColor(cellStyle.backgroundColor[0], cellStyle.backgroundColor[1], cellStyle.backgroundColor[2]);
    doc.rect(x, y, width, cellHeight, 'F');
  }

  // Draw border
  doc.setDrawColor(cellStyle.borderColor[0], cellStyle.borderColor[1], cellStyle.borderColor[2]);
  doc.setLineWidth(cellStyle.borderWidth);
  doc.rect(x, y, width, cellHeight, 'S');

  // Draw text
  doc.setTextColor(cellStyle.textColor[0], cellStyle.textColor[1], cellStyle.textColor[2]);
  let lineY = y + cellStyle.padding + cellStyle.fontStyle.size; // Baseline of first line

  // Vertical centering if fixedHeight is larger than textHeight
  if (fixedHeight !== null && cellHeight > textHeight + 2 * cellStyle.padding) {
      const diff = cellHeight - (textHeight + 2 * cellStyle.padding);
      lineY += diff / 2;
  }


  lines.forEach((line: string, index: number) => {
    let textX = x + cellStyle.padding;
    if (cellStyle.textAlign === 'center') {
      const textWidth = doc.getTextWidth(line);
      textX = x + (width - textWidth) / 2;
    } else if (cellStyle.textAlign === 'right') {
      const textWidth = doc.getTextWidth(line);
      textX = x + width - textWidth - cellStyle.padding;
    }
    doc.text(line, textX, lineY + (index * (cellStyle.fontStyle.size + LINE_HEIGHT_ADDITION)));
  });

  return y + cellHeight;
}

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
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 2 * PAGE_MARGIN_X;
  const halfContentWidth = contentWidth / 2;
  const leftColX = PAGE_MARGIN_X;
  const rightColX = PAGE_MARGIN_X + halfContentWidth;

  // --- Row 1: PROFORMA INVOICE ---
  yPos = drawCell(doc, "PROFORMA INVOICE", leftColX, yPos, contentWidth, 1);

  // --- Row 2: EXPORTER | CONSIGNEE / BUYER ---
  const yAfterRow2Left = drawCell(doc, "EXPORTER", leftColX, yPos, halfContentWidth, 2);
  const yAfterRow2Right = drawCell(doc, "CONSIGNEE / BUYER:", rightColX, yPos, halfContentWidth, 2);
  yPos = Math.max(yAfterRow2Left, yAfterRow2Right);

  // --- Row 3: Exporter Company Name | Client Company Name ---
  const yAfterRow3Left = drawCell(doc, exporter.companyName, leftColX, yPos, halfContentWidth, 2);
  const yAfterRow3Right = drawCell(doc, client.companyName, rightColX, yPos, halfContentWidth, 2);
  yPos = Math.max(yAfterRow3Left, yAfterRow3Right);

  // --- Row 4: Exporter Address | Client Address ---
  const yAfterRow4Left = drawCell(doc, exporter.address, leftColX, yPos, halfContentWidth, 3);
  const yAfterRow4Right = drawCell(doc, client.address, rightColX, yPos, halfContentWidth, 3);
  yPos = Math.max(yAfterRow4Left, yAfterRow4Right);

  // --- Row 5: INVOICE NO & DATE Label | FINAL DESTINATION Label ---
  const yAfterRow5Left = drawCell(doc, "INVOICE NO & DATE:", leftColX, yPos, halfContentWidth, 2);
  const yAfterRow5Right = drawCell(doc, "FINAL DESTINATION:", rightColX, yPos, halfContentWidth, 2);
  yPos = Math.max(yAfterRow5Left, yAfterRow5Right);

  // --- Row 6: Invoice Data | Final Dest Data ---
  const invoiceDateFormatted = invoice.invoiceDate ? format(new Date(invoice.invoiceDate), 'dd-MM-yyyy') : 'N/A';
  const yAfterRow6Left = drawCell(doc, `${invoice.invoiceNumber || 'N/A'} / ${invoiceDateFormatted}`, leftColX, yPos, halfContentWidth, 3);
  const yAfterRow6Right = drawCell(doc, invoice.finalDestination || 'N/A', rightColX, yPos, halfContentWidth, 3);
  yPos = Math.max(yAfterRow6Left, yAfterRow6Right);

  // --- Row 7: IEC. CODE Label | TERMS AND CONDITIONS Label ---
  const yAfterRow7Left = drawCell(doc, "IEC. CODE:", leftColX, yPos, halfContentWidth, 2);
  const yAfterRow7Right = drawCell(doc, "TERMS AND CONDITIONS OF DELIVERY & PAYMENT:", rightColX, yPos, halfContentWidth, 2);
  yPos = Math.max(yAfterRow7Left, yAfterRow7Right);

  // --- Row 8: IEC Data | Terms Data ---
  const yAfterRow8Left = drawCell(doc, exporter.iecNumber || 'N/A', leftColX, yPos, halfContentWidth, 3);
  const yAfterRow8Right = drawCell(doc, invoice.termsAndConditions || 'N/A', rightColX, yPos, halfContentWidth, 3);
  yPos = Math.max(yAfterRow8Left, yAfterRow8Right);


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
    tableBodyContent.push([' ', ' ', ' ', ' ', ' ', ' ', ' ']);
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
    styles: { lineWidth: 0.5, lineColor: COLOR_BORDER_RGB, cellPadding: CELL_PADDING, },
    headStyles: {
      halign: 'center',
      valign: 'middle',
      fillColor: COLOR_BLUE_RGB,
      textColor: COLOR_BLACK_RGB,
      fontStyle: 'bold',
      fontSize: FONT_CAT2_SIZE,
    },
    bodyStyles: {
      halign: 'left',
      valign: 'middle',
      fillColor: COLOR_WHITE_RGB,
      textColor: COLOR_BLACK_RGB,
      fontStyle: 'normal',
      fontSize: FONT_CAT3_SIZE,
    },
    columnStyles: {
      0: { halign: 'center' },
      1: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
    didParseCell: (data) => {
        if (data.section === 'foot') {
            if (data.column.index === 0) { // The label cell
                data.cell.styles.fillColor = COLOR_BLUE_RGB;
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = FONT_CAT2_SIZE;
            }
             if (data.column.index === 6) { // The value cell
                data.cell.styles.fillColor = COLOR_WHITE_RGB;
                data.cell.styles.textColor = COLOR_BLACK_RGB; // Explicitly set font color to black
                data.cell.styles.fontStyle = 'normal';
                data.cell.styles.fontSize = FONT_CAT3_SIZE;
            }
        }
    },
    didDrawCell: (data) => {
      // Manually draw borders for all cells for a consistent grid look
      doc.setDrawColor(COLOR_BORDER_RGB[0], COLOR_BORDER_RGB[1], COLOR_BORDER_RGB[2]);
      doc.setLineWidth(0.5);
      doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'S');
    },
    didDrawPage: (data) => {
      // @ts-ignore
      yPos = data.cursor?.y ?? yPos;
    }
  });
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY;


  // --- Row after table: TOTAL SQM Label | TOTAL SQM Value ---
  const totalSqmText = (invoice.items.reduce((sum, item) => sum + (item.quantitySqmt || 0), 0)).toFixed(2);
  const yAfterSqmLbl = drawCell(doc, "TOTAL SQM", leftColX, yPos, halfContentWidth, 2);
  const yAfterSqmVal = drawCell(doc, totalSqmText, rightColX, yPos, halfContentWidth, 2, null, 'center');
  yPos = Math.max(yAfterSqmLbl, yAfterSqmVal);

  // --- Row: TOTAL INVOICE AMOUNT IN WORDS Label | Amount in Words Value ---
  const amountInWordsStr = amountToWords(invoice.grandTotal || 0, invoice.currencyType);
  const amtInWordsValueCellStyleOverride = { size: FONT_CAT3_SIZE }; // smaller font size
  const amountInWordsHeight = calculateCellHeight(doc, amountInWordsStr.toUpperCase(), halfContentWidth, 2, amtInWordsValueCellStyleOverride);

  const yAfterAmtWordsLbl = drawCell(doc, "TOTAL INVOICE AMOUNT IN WORDS:", leftColX, yPos, halfContentWidth, 2, amountInWordsHeight);
  const yAfterAmtWordsVal = drawCell(doc, amountInWordsStr.toUpperCase(), rightColX, yPos, halfContentWidth, 3, amountInWordsHeight, 'center', amtInWordsValueCellStyleOverride, true);
  yPos = Math.max(yAfterAmtWordsLbl, yAfterAmtWordsVal);
  
  // --- Merged Note box with styled label ---
  autoTable(doc, {
      startY: yPos,
      theme: 'plain',
      body: [[{ content: '', styles: { lineWidth: 0.5, lineColor: COLOR_BORDER_RGB, minCellHeight: 50 } }]],
      margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
      didDrawCell: (data) => {
          if (data.section === 'body') {
              const cell = data.cell;
              let textY = cell.y + cell.padding('top');

              doc.setFont('helvetica', 'bold');
              doc.setFontSize(FONT_CAT2_SIZE); // Increased font size for "Note:"
              doc.text("Note:", cell.x + cell.padding('left'), textY + FONT_CAT2_SIZE);
              textY += FONT_CAT2_SIZE + LINE_HEIGHT_ADDITION;

              doc.setFont('helvetica', 'normal');
              doc.setFontSize(FONT_CAT3_SIZE);
              const noteContent = invoice.note || 'N/A';
              const contentLines = doc.splitTextToSize(noteContent, cell.width - cell.padding('left') - cell.padding('right'));
              doc.text(contentLines, cell.x + cell.padding('left'), textY);
          }
      },
      didDrawPage: data => { 
        // @ts-ignore
        yPos = data.cursor?.y ?? yPos; 
      }
  });
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY;

  // --- Bank Details Section ---
  autoTable(doc, {
      startY: yPos,
      theme: 'plain',
      body: [
          [{ content: 'Bank Details', styles: { ...getCellStyle(2), halign: 'center' } }],
      ],
      margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
  });
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY;
  
  let beneficiaryText = 'N/A';
  if (selectedBank) {
    beneficiaryText = `BENEFICIARY NAME: ${exporter.companyName.toUpperCase()}\nBENEFICIARY BANK: ${selectedBank.bankName.toUpperCase()}, BRANCH: ${selectedBank.bankAddress.toUpperCase()}\nBENEFICIARY A/C NO: ${selectedBank.accountNumber}, SWIFT CODE: ${selectedBank.swiftCode.toUpperCase()}, IFSC CODE: ${selectedBank.ifscCode.toUpperCase()}`;
  }
  autoTable(doc, {
    startY: yPos,
    theme: 'plain',
    body: [[{ content: beneficiaryText, styles: { ...getCellStyle(3), halign: 'left', lineWidth: {top: 0, right: 0.5, bottom: 0.5, left: 0.5} } }]],
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
  });
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY;


  // --- Declaration & Signature Block ---
  const declarationContent = "CERTIFIED THAT THE PARTICULARS GIVEN ABOVE ARE TRUE AND CORRECT.";
  const signatureDateText = `Signature & Date ${format(new Date(), 'dd-MM-yyyy')}`;
  const forExporterText = `FOR, ${exporter.companyName.toUpperCase()}`;
  const authorisedSignatureText = 'AUTHORISED SIGNATURE';
  
  autoTable(doc, {
      startY: yPos,
      theme: 'plain',
      body: [
          [ // Row 1 of the whole block
              { 
                  content: `Declaration:\n${declarationContent}`,
                  rowSpan: 4, 
                  styles: { 
                      fontStyle: 'normal',
                      textColor: [0, 0, 0],
                      fontSize: 8,
                      lineWidth: 0.5,
                      lineColor: COLOR_BORDER_RGB,
                      valign: 'top', 
                      halign: 'left',
                      cellPadding: CELL_PADDING
                  } 
              },
              { 
                  content: signatureDateText,
                  styles: { 
                      lineWidth: 0.5, 
                      lineColor: COLOR_BORDER_RGB, 
                      fontSize: FONT_CAT3_SIZE,
                      halign: 'left',
                      cellPadding: CELL_PADDING,
                  } 
              }
          ],
          [ // Row 2 of the signature block (declaration cell is spanned)
              { 
                  content: forExporterText,
                  styles: { 
                      lineWidth: 0.5, 
                      lineColor: COLOR_BORDER_RGB, 
                      fontStyle: 'bold',
                      fontSize: FONT_CAT2_SIZE,
                      halign: 'center',
                      valign: 'middle',
                      fillColor: COLOR_BLUE_RGB,
                      textColor: COLOR_BLACK_RGB,
                      cellPadding: CELL_PADDING,
                  } 
              }
          ],
          [ // Row 3 (empty for signature)
               { 
                  content: '',
                  styles: {
                      lineWidth: 0.5, 
                      lineColor: COLOR_BORDER_RGB,
                      minCellHeight: 40
                  } 
              }
          ],
          [ // Row 4
              { 
                  content: authorisedSignatureText,
                  styles: { 
                      lineWidth: 0.5, 
                      lineColor: COLOR_BORDER_RGB, 
                      fontStyle: 'bold',
                      fontSize: FONT_CAT2_SIZE,
                      halign: 'right',
                      valign: 'bottom',
                      cellPadding: CELL_PADDING
                  } 
              }
          ]
      ],
      columnStyles: { 
          0: { cellWidth: contentWidth * 0.60 },
          1: { cellWidth: contentWidth * 0.40 }
      },
      margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
  });


  if (yPos > doc.internal.pageSize.getHeight() - PAGE_MARGIN_Y_BOTTOM) {
      console.warn("Content might exceed page limits.");
  }

  doc.save(`Performa_Invoice_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
}
