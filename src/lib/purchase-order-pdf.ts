
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { PurchaseOrder } from '@/types/purchase-order';
import type { Company } from '@/types/company';
import type { Manufacturer } from '@/types/manufacturer';
import type { Size } from '@/types/size';
import type { Product } from '@/types/product';
import type { PerformaInvoice } from '@/types/performa-invoice'; // Keep for sourcePi type if needed

// --- Page & General Layout (Using Points) ---
const PAGE_MARGIN_X = 28.34; // pt (approx 10mm)
const PAGE_MARGIN_Y_TOP = 28.34; // pt (approx 10mm)
const PAGE_MARGIN_Y_BOTTOM = 28.34; // pt (approx 10mm)
const CONTENT_WIDTH = 595.28 - 2 * PAGE_MARGIN_X; // A4 width in points - margins

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
const LINE_HEIGHT_ADDITION = 2.5; // Adjusted for better spacing

// --- Cell Padding (pt) ---
const CELL_PADDING = 4; // Adjusted for better spacing

interface PdfCellStyle {
  fontStyle: {
    size: number;
    weight: 'normal' | 'bold';
    style: 'normal' | 'italic';
  };
  backgroundColor: number[] | null;
  textColor: number[];
  textAlign: 'left' | 'center' | 'right';
  borderColor: number[];
  borderWidth: number;
  padding: number;
}

function getPdfCellStyle(category: 1 | 2 | 3): PdfCellStyle {
  switch (category) {
    case 1: // Main Titles
      return {
        fontStyle: { size: FONT_CAT1_SIZE, weight: 'bold', style: 'normal' },
        backgroundColor: COLOR_BLUE_RGB,
        textColor: COLOR_BLACK_RGB,
        textAlign: 'center',
        borderColor: COLOR_BORDER_RGB,
        borderWidth: 0.5,
        padding: CELL_PADDING,
      };
    case 2: // Fixed Labels / Sub-headers
      return {
        fontStyle: { size: FONT_CAT2_SIZE, weight: 'bold', style: 'normal' },
        backgroundColor: COLOR_BLUE_RGB,
        textColor: COLOR_BLACK_RGB,
        textAlign: 'center', // Default for Cat 2
        borderColor: COLOR_BORDER_RGB,
        borderWidth: 0.5,
        padding: CELL_PADDING,
      };
    case 3: // Dynamic Data / Values
    default:
      return {
        fontStyle: { size: FONT_CAT3_SIZE, weight: 'normal', style: 'normal' },
        backgroundColor: COLOR_WHITE_RGB,
        textColor: COLOR_BLACK_RGB,
        textAlign: 'left', // Default for Cat 3
        borderColor: COLOR_BORDER_RGB,
        borderWidth: 0.5,
        padding: CELL_PADDING,
      };
  }
}

function drawPdfCell(
  doc: jsPDF,
  text: string | string[], // Allow string array for pre-split lines
  x: number,
  y: number,
  width: number,
  category: 1 | 2 | 3,
  fixedHeight: number | null = null,
  overrideTextAlign: 'left' | 'center' | 'right' | null = null
): number {
  const cellStyle = getPdfCellStyle(category);
  if (overrideTextAlign) {
    cellStyle.textAlign = overrideTextAlign;
  }

  doc.setFont('helvetica', `${cellStyle.fontStyle.weight === 'bold' ? 'bold' : ''}${cellStyle.fontStyle.style === 'italic' ? 'italic' : ''}`.replace(/^$/, 'normal') as any);
  doc.setFontSize(cellStyle.fontStyle.size);

  const textToProcess = Array.isArray(text) ? text.join('\n') : (text || ' ');
  const lines = doc.splitTextToSize(textToProcess, width - 2 * cellStyle.padding);
  
  const textBlockHeight = lines.length * cellStyle.fontStyle.size + (lines.length > 1 ? (lines.length -1) * LINE_HEIGHT_ADDITION : 0);
  const cellHeight = fixedHeight !== null ? fixedHeight : textBlockHeight + 2 * cellStyle.padding;

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
  
  let startY = y + cellStyle.padding + cellStyle.fontStyle.size; // Baseline of first line
  // Vertical centering for the text block within the cell
  if (cellHeight > textBlockHeight + 2 * cellStyle.padding) {
    startY += (cellHeight - (textBlockHeight + 2 * cellStyle.padding)) / 2;
  }


  lines.forEach((line: string, index: number) => {
    let textX = x + cellStyle.padding;
    if (cellStyle.textAlign === 'center') {
      const lineWidth = doc.getTextWidth(line);
      textX = x + (width - lineWidth) / 2;
    } else if (cellStyle.textAlign === 'right') {
      const lineWidth = doc.getTextWidth(line);
      textX = x + width - lineWidth - cellStyle.padding;
    }
    doc.text(line, textX, startY + (index * (cellStyle.fontStyle.size + LINE_HEIGHT_ADDITION)));
  });

  return y + cellHeight;
}

export function generatePurchaseOrderPdf(
  po: PurchaseOrder,
  exporter: Company,
  manufacturer: Manufacturer,
  poSize: Size | undefined,
  allProducts: Product[],
  sourcePi: PerformaInvoice | undefined // Optional, for displaying source PI number
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let yPos = PAGE_MARGIN_Y_TOP;
  const halfContentWidth = CONTENT_WIDTH / 2;

  // --- Row 1: Exporter Name (as Main Title) ---
  yPos = drawPdfCell(doc, exporter.companyName.toUpperCase(), PAGE_MARGIN_X, yPos, CONTENT_WIDTH, 1);

  // --- Row 2: "PURCHASE ORDER" Title ---
  yPos = drawPdfCell(doc, "PURCHASE ORDER", PAGE_MARGIN_X, yPos, CONTENT_WIDTH, 1);
  yPos += 5; // Small gap

  // --- Row 3: Two Columns for "TO" and "PO Date/Number/Size" Labels ---
  const col1X = PAGE_MARGIN_X;
  const col2X = PAGE_MARGIN_X + halfContentWidth;
  let yPosCol1 = yPos;
  let yPosCol2 = yPos;

  // Column 1 Labels
  yPosCol1 = drawPdfCell(doc, "TO", col1X, yPosCol1, halfContentWidth, 2);
  const manufacturerDetails = [
    manufacturer.companyName,
    manufacturer.address,
    `GSTIN: ${manufacturer.gstNumber}`,
    `PIN: ${manufacturer.pinCode}`
  ].filter(Boolean).join('\n');
  yPosCol1 = drawPdfCell(doc, manufacturerDetails, col1X, yPosCol1, halfContentWidth, 3, null, 'left');


  // Column 2 Labels and Data
  yPosCol2 = drawPdfCell(doc, "PO Date And Number", col2X, yPosCol2, halfContentWidth, 2);
  yPosCol2 = drawPdfCell(doc, po.poNumber, col2X, yPosCol2, halfContentWidth, 3, null, 'left');
  yPosCol2 = drawPdfCell(doc, format(new Date(po.poDate), 'dd/MM/yyyy'), col2X, yPosCol2, halfContentWidth, 3, null, 'left');
  
  yPosCol2 = drawPdfCell(doc, "Size", col2X, yPosCol2, halfContentWidth, 2);
  yPosCol2 = drawPdfCell(doc, poSize?.size || "N/A", col2X, yPosCol2, halfContentWidth, 3, null, 'left');
  
  yPosCol2 = drawPdfCell(doc, "HSN Code", col2X, yPosCol2, halfContentWidth, 2);
  yPosCol2 = drawPdfCell(doc, poSize?.hsnCode || "N/A", col2X, yPosCol2, halfContentWidth, 3, null, 'left');
  
  yPosCol2 = drawPdfCell(doc, "No. of Containers", col2X, yPosCol2, halfContentWidth, 2);
  yPosCol2 = drawPdfCell(doc, po.numberOfContainers.toString(), col2X, yPosCol2, halfContentWidth, 3, null, 'left');

  if (sourcePi) {
      yPosCol2 = drawPdfCell(doc, "Ref. PI No.", col2X, yPosCol2, halfContentWidth, 2);
      yPosCol2 = drawPdfCell(doc, sourcePi.invoiceNumber, col2X, yPosCol2, halfContentWidth, 3, null, 'left');
  }
  
  yPos = Math.max(yPosCol1, yPosCol2);
  yPos += 5; // Small gap before instruction

  // Instruction Text (Not a cell, plain text)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT_CAT3_SIZE);
  doc.text("Please supply the following goods as per terms and conditions mentioned below:", PAGE_MARGIN_X, yPos);
  yPos += FONT_CAT3_SIZE * 1.2 + 5;


  // --- Product Items Table ---
  const tableHead = [['SR', 'DESCRIPTION OF GOODS', 'Design Image Ref.', 'WEIGHT/BOX (Kg)', 'BOXES', 'THICKNESS', 'TOTAL WEIGHT (Kg)']];
  let totalBoxesOverall = 0;
  let totalWeightOverall = 0;

  const tableBody = po.items.map((item, index) => {
    const productDetail = allProducts.find(p => p.id === item.productId);
    const productName = productDetail?.designName || "Unknown Product";
    const itemTotalWeight = item.weightPerBox * item.boxes;
    totalBoxesOverall += item.boxes;
    totalWeightOverall += itemTotalWeight;
    return [
      (index + 1).toString(),
      productName,
      item.designImage || "AS PER SAMPLE",
      item.weightPerBox.toFixed(2),
      item.boxes.toString(),
      item.thickness,
      itemTotalWeight.toFixed(2)
    ];
  });

  const tableFooter = [
    [
      { content: 'Total Box:', styles: { halign: 'right', fontStyle: 'bold', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontSize: FONT_CAT2_SIZE } },
      { content: totalBoxesOverall.toString(), colSpan: 2, styles: { halign: 'center', fontStyle: 'normal', fillColor: COLOR_WHITE_RGB, textColor: COLOR_BLACK_RGB, fontSize: FONT_CAT3_SIZE } },
      { content: 'Total Weight (Kg):', styles: { halign: 'right', fontStyle: 'bold', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontSize: FONT_CAT2_SIZE } },
      { content: totalWeightOverall.toFixed(2), colSpan: 2, styles: { halign: 'center', fontStyle: 'normal', fillColor: COLOR_WHITE_RGB, textColor: COLOR_BLACK_RGB, fontSize: FONT_CAT3_SIZE } },
    ]
  ];
  
  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    foot: tableFooter,
    startY: yPos,
    theme: 'grid', // 'grid' theme ensures all borders
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
    styles: {
      lineWidth: 0.5,
      lineColor: COLOR_BORDER_RGB,
      cellPadding: CELL_PADDING,
    },
    headStyles: {
      fillColor: COLOR_BLUE_RGB,
      textColor: COLOR_BLACK_RGB,
      fontStyle: 'bold',
      fontSize: FONT_CAT2_SIZE,
      halign: 'center',
      valign: 'middle',
    },
    bodyStyles: {
      fillColor: COLOR_WHITE_RGB,
      textColor: COLOR_BLACK_RGB,
      fontSize: FONT_CAT3_SIZE,
      valign: 'middle',
    },
    footStyles: { // General foot styles, specific overrides in foot content
      lineWidth: 0.5,
      lineColor: COLOR_BORDER_RGB,
      cellPadding: CELL_PADDING,
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 30 }, // SR
      1: { halign: 'left', cellWidth: 'auto' }, // Product Name
      2: { halign: 'left', cellWidth: 'auto' }, // Design Image Ref
      3: { halign: 'right', cellWidth: 70 }, // Weight/Box
      4: { halign: 'right', cellWidth: 50 }, // Boxes
      5: { halign: 'center', cellWidth: 70 }, // Thickness
      6: { halign: 'right', cellWidth: 70 }, // Total Weight
    },
    didDrawPage: (data) => {
      // @ts-ignore
      yPos = data.cursor?.y ?? yPos;
    }
  });
  yPos += 10; // Space after table

  // --- Terms and Conditions Section ---
  const terms = [
    "1. GOODS ONCE SOLD WILL NOT BE TAKEN BACK OR EXCHANGED.",
    "2. SUBJECT TO MORBI JURISDICTION."
  ];
  yPos = drawPdfCell(doc, "Terms & Conditions:", PAGE_MARGIN_X, yPos, CONTENT_WIDTH, 2, null, 'left');
  terms.forEach(term => {
    yPos = drawPdfCell(doc, term, PAGE_MARGIN_X, yPos, CONTENT_WIDTH, 3, null, 'left');
  });
  yPos += 10;

  // --- Signature Section ---
  // Try to position signature block towards the bottom, but after terms
  const signatureBlockHeight = (FONT_CAT2_SIZE + 2 * CELL_PADDING) * 2 + 40; // Approx height for 2 lines + signing space
  const availableSpace = doc.internal.pageSize.getHeight() - PAGE_MARGIN_Y_BOTTOM - yPos;
  
  if (availableSpace < signatureBlockHeight) {
    doc.addPage();
    yPos = PAGE_MARGIN_Y_TOP;
  }
  // Align signature to the right part of the page
  const signatureX = PAGE_MARGIN_X + CONTENT_WIDTH / 2;
  const signatureWidth = CONTENT_WIDTH / 2;
  let signatureY = doc.internal.pageSize.getHeight() - PAGE_MARGIN_Y_BOTTOM - signatureBlockHeight;
  if (signatureY < yPos) signatureY = yPos; // Ensure it doesn't overlap if content is already low


  drawPdfCell(doc, `FOR ${exporter.companyName.toUpperCase()}`, signatureX, signatureY, signatureWidth, 2, (FONT_CAT2_SIZE + 2 * CELL_PADDING) + 30, 'center'); // Extra height for signing
  drawPdfCell(doc, "Authorised Signatory", signatureX, signatureY + (FONT_CAT2_SIZE + 2 * CELL_PADDING) + 30 , signatureWidth, 2, null, 'center');
  
  doc.save(`Purchase_Order_${po.poNumber.replace(/\//g, '_')}.pdf`);
}


    