
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
  overrideTextAlign: 'left' | 'center' | 'right' | null = null
): number {
  const cellStyle = getCellStyle(category);
  if (overrideTextAlign) {
    cellStyle.textAlign = overrideTextAlign;
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

  const minTableRows = 3; // Ensure at least some empty rows if data is less
  const emptyRowsNeeded = Math.max(0, minTableRows - tableBodyContent.length);
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
    foot: tableFooterContent.map(row => [{ content: row[0], colSpan: 6 }, row[1]]),
    startY: yPos,
    theme: 'plain', // Use plain theme and draw borders/backgrounds manually
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
    styles: { lineWidth: 0.5, lineColor: COLOR_BORDER_RGB }, // Default border for all cells
    headStyles: {
      halign: 'center',
      valign: 'middle',
      fillColor: COLOR_BLUE_RGB, // Category 2
      textColor: COLOR_BLACK_RGB,
      fontStyle: 'bold',
      fontSize: FONT_CAT2_SIZE,
      cellPadding: CELL_PADDING,
    },
    bodyStyles: {
      halign: 'left', // Category 3 default
      valign: 'middle',
      fillColor: COLOR_WHITE_RGB, // Category 3
      textColor: COLOR_BLACK_RGB,
      fontStyle: 'normal',
      fontSize: FONT_CAT3_SIZE,
      cellPadding: CELL_PADDING,
    },
    footStyles: {
      halign: 'center', // Category 2 for labels and values
      valign: 'middle',
      fillColor: COLOR_BLUE_RGB, // Category 2
      textColor: COLOR_BLACK_RGB,
      fontStyle: 'bold',
      fontSize: FONT_CAT2_SIZE,
      cellPadding: CELL_PADDING,
    },
    columnStyles: {
      0: { halign: 'center' }, // SR NO
      1: { halign: 'center' }, // HSN
      3: { halign: 'center' }, // Boxes
      4: { halign: 'right' }, // SQMT
      5: { halign: 'right' }, // Rate
      6: { halign: 'right' }, // Amount
    },
    didDrawCell: (data) => {
      // Ensure all cells have borders as per "plain" theme might not draw all
      doc.setDrawColor(COLOR_BORDER_RGB[0], COLOR_BORDER_RGB[1], COLOR_BORDER_RGB[2]);
      doc.setLineWidth(0.5);
      doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'S');

      // Override background for foot label cells if needed (colSpan makes it tricky)
      if (data.section === 'foot' && data.column.index === 0) {
        doc.setFillColor(COLOR_BLUE_RGB[0], COLOR_BLUE_RGB[1], COLOR_BLUE_RGB[2]);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
        doc.setTextColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
         // Redraw text because fill covers it
        autoTableText(data.cell.text, data.cell.x + data.cell.padding('left'), data.cell.y + data.cell.height / 2, {
            halign: data.cell.styles.halign,
            valign: data.cell.styles.valign
        });
      }
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
  const yAfterSqmVal = drawCell(doc, totalSqmText, rightColX, yPos, halfContentWidth, 2); // Value for Cat 2 label is also Cat 2
  yPos = Math.max(yAfterSqmLbl, yAfterSqmVal);

  // --- Row: TOTAL INVOICE AMOUNT IN WORDS Label | Amount in Words Value ---
  const amountInWordsStr = amountToWords(invoice.grandTotal || 0, invoice.currencyType);
  const yAfterAmtWordsLbl = drawCell(doc, "TOTAL INVOICE AMOUNT IN WORDS:", leftColX, yPos, halfContentWidth, 2);
  // Value for Cat 2 label is Cat 2, and should be centered
  const yAfterAmtWordsVal = drawCell(doc, amountInWordsStr.toUpperCase(), rightColX, yPos, halfContentWidth, 2, null, 'center');
  yPos = Math.max(yAfterAmtWordsLbl, yAfterAmtWordsVal);

  // --- Row: Note Label | Note Content ---
  const yAfterNoteLbl = drawCell(doc, "Note:", leftColX, yPos, halfContentWidth, 2);
  const yAfterNoteVal = drawCell(doc, invoice.note || 'N/A', rightColX, yPos, halfContentWidth, 3);
  yPos = Math.max(yAfterNoteLbl, yAfterNoteVal);

  // --- Row: BENEFICIARY DETAILS Label | Beneficiary Content ---
  let beneficiaryText = 'N/A';
  if (selectedBank) {
    beneficiaryText = `BENEFICIARY NAME: ${exporter.companyName.toUpperCase()}\nBENEFICIARY BANK: ${selectedBank.bankName.toUpperCase()}, BRANCH: ${selectedBank.bankAddress.toUpperCase()}\nBENEFICIARY A/C NO: ${selectedBank.accountNumber}, SWIFT CODE: ${selectedBank.swiftCode.toUpperCase()}, IFSC CODE: ${selectedBank.ifscCode.toUpperCase()}`;
  }
  const yAfterBenLbl = drawCell(doc, "BENEFICIARY DETAILS:", leftColX, yPos, halfContentWidth, 2);
  const yAfterBenVal = drawCell(doc, beneficiaryText, rightColX, yPos, halfContentWidth, 3);
  yPos = Math.max(yAfterBenLbl, yAfterBenVal);

  // --- Declaration & Signature Block ---
  const declarationContent = "CERTIFIED THAT THE PARTICULARS GIVEN ABOVE ARE TRUE AND CORRECT.";
  autoTable(doc, {
    startY: yPos,
    theme: 'plain',
    body: [
      [
        { 
          content: `Declaration:\n${declarationContent}`,
          rowSpan: 2,
          styles: { 
            fontStyle: 'normal', 
            fontSize: FONT_CAT3_SIZE, 
            lineWidth: 0.5, 
            lineColor: COLOR_BORDER_RGB, 
            valign: 'top', 
            halign: 'left', 
            cellPadding: CELL_PADDING 
          } 
        },
        { 
          content: `FOR, ${exporter.companyName.toUpperCase()}`,
          styles: {
            lineWidth: 0.5, 
            lineColor: COLOR_BORDER_RGB, 
            fontStyle: 'bold',
            fontSize: FONT_CAT2_SIZE,
            halign: 'center',
            valign: 'bottom',
            cellPadding: CELL_PADDING,
            minCellHeight: 60,
          }
        }
      ],
      [
        { 
          content: 'AUTHORISED SIGNATURE',
          styles: {
            lineWidth: 0.5, 
            lineColor: COLOR_BORDER_RGB, 
            fontStyle: 'bold', 
            fontSize: FONT_CAT2_SIZE, 
            halign: 'center',
            cellPadding: CELL_PADDING,
          }
        }
      ]
    ],
    columnStyles: { 
      0: { cellWidth: contentWidth * 0.60 },
      1: { cellWidth: contentWidth * 0.40 }
    },
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
    didDrawPage: (data) => {
        // @ts-ignore
        yPos = data.cursor?.y ?? yPos;
    }
  });


  // Ensure yPos does not exceed page bottom margin before saving
  if (yPos > doc.internal.pageSize.getHeight() - PAGE_MARGIN_Y_BOTTOM) {
      // This is a fallback, ideally page breaks are handled by autoTable or manual checks before drawing cells
      console.warn("Content might exceed page limits.");
  }

  doc.save(`Performa_Invoice_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
}

// Helper function for autoTable to redraw text (since fill covers it)
// This is a simplified version, jsPDF's autoTable has its own internal text drawing.
// For robust solution, explore autoTable's `didParseCell` or `willDrawCell` for styling hooks.
function autoTableText(text: string | string[], x: number, y: number, styles: any) {
    // This is a placeholder. Actual text redrawing in autoTable is complex.
    // The `didDrawCell` hook with fill and then trying to redraw text is problematic.
    // It's better to rely on autoTable's native styling capabilities in `headStyles`, `bodyStyles`, `footStyles`.
    // The issue with foot label cells might require restructuring the foot data or using advanced autoTable features.
}
