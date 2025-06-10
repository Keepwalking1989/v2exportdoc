
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
const LINE_HEIGHT_ADDITION = 2.5; // For general text
const MANUFACTURER_NAME_LINE_HEIGHT_ADDITION = 3.0; // Slightly more for 14pt bold
const MANUFACTURER_ADDRESS_LINE_HEIGHT_ADDITION = 2.0; // For 8pt regular

// --- Cell Padding (pt) ---
const CELL_PADDING = 4;

interface PdfCellStyle {
  fontStyle: {
    size: number;
    weight: 'normal' | 'bold';
    style: 'normal' | 'italic';
    lineHeightAddition: number;
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
        fontStyle: { size: FONT_CAT1_SIZE, weight: 'bold', style: 'normal', lineHeightAddition: MANUFACTURER_NAME_LINE_HEIGHT_ADDITION },
        backgroundColor: COLOR_BLUE_RGB,
        textColor: COLOR_BLACK_RGB,
        textAlign: 'center',
        borderColor: COLOR_BORDER_RGB,
        borderWidth: 0.5,
        padding: CELL_PADDING,
      };
    case 2: // Fixed Labels / Sub-headers
      return {
        fontStyle: { size: FONT_CAT2_SIZE, weight: 'bold', style: 'normal', lineHeightAddition: LINE_HEIGHT_ADDITION },
        backgroundColor: COLOR_BLUE_RGB,
        textColor: COLOR_BLACK_RGB,
        textAlign: 'center',
        borderColor: COLOR_BORDER_RGB,
        borderWidth: 0.5,
        padding: CELL_PADDING,
      };
    case 3: // Dynamic Data / Values
    default:
      return {
        fontStyle: { size: FONT_CAT3_SIZE, weight: 'normal', style: 'normal', lineHeightAddition: MANUFACTURER_ADDRESS_LINE_HEIGHT_ADDITION },
        backgroundColor: COLOR_WHITE_RGB,
        textColor: COLOR_BLACK_RGB,
        textAlign: 'left',
        borderColor: COLOR_BORDER_RGB,
        borderWidth: 0.5,
        padding: CELL_PADDING,
      };
  }
}

function calculateNaturalCellHeight(doc: jsPDF, text: string | string[], width: number, category: 1 | 2 | 3, overrideFontStyle?: Partial<PdfCellStyle['fontStyle']>): number {
  const baseStyle = getPdfCellStyle(category);
  const cellStyle: PdfCellStyle = {
    ...baseStyle,
    fontStyle: overrideFontStyle ? { ...baseStyle.fontStyle, ...overrideFontStyle } : baseStyle.fontStyle,
  };

  doc.setFont('helvetica', `${cellStyle.fontStyle.weight === 'bold' ? 'bold' : ''}${cellStyle.fontStyle.style === 'italic' ? 'italic' : ''}`.replace(/^$/, 'normal') as any);
  doc.setFontSize(cellStyle.fontStyle.size);

  const textToProcess = Array.isArray(text) ? text.join('\n') : (text || ' ');
  const lines = doc.splitTextToSize(textToProcess, width - 2 * cellStyle.padding);

  const textBlockHeight = lines.length * cellStyle.fontStyle.size + (lines.length > 0 ? (lines.length - 1) * cellStyle.fontStyle.lineHeightAddition : 0);
  return textBlockHeight + 2 * cellStyle.padding;
}

function drawPdfCell(
  doc: jsPDF,
  text: string | string[],
  x: number,
  y: number,
  width: number,
  category: 1 | 2 | 3,
  fixedHeight: number | null = null,
  overrideTextAlign: 'left' | 'center' | 'right' | null = null,
  overrideFontStyle?: Partial<PdfCellStyle['fontStyle']>,
  forceNoBackground?: boolean,
  forceNoBorder?: boolean
): number {
  const baseStyle = getPdfCellStyle(category);
  const cellStyle: PdfCellStyle = {
    ...baseStyle,
    fontStyle: overrideFontStyle ? { ...baseStyle.fontStyle, ...overrideFontStyle } : baseStyle.fontStyle,
    backgroundColor: forceNoBackground ? COLOR_WHITE_RGB : baseStyle.backgroundColor,
  };

  if (overrideTextAlign) {
    cellStyle.textAlign = overrideTextAlign;
  }

  doc.setFont('helvetica', `${cellStyle.fontStyle.weight === 'bold' ? 'bold' : ''}${cellStyle.fontStyle.style === 'italic' ? 'italic' : ''}`.replace(/^$/, 'normal') as any);
  doc.setFontSize(cellStyle.fontStyle.size);

  const textToProcess = Array.isArray(text) ? text.join('\n') : (text || ' ');
  const lines = doc.splitTextToSize(textToProcess, width - 2 * cellStyle.padding);

  const naturalTextHeight = lines.length * cellStyle.fontStyle.size + (lines.length > 0 ? (lines.length - 1) * cellStyle.fontStyle.lineHeightAddition : 0);
  const cellHeight = fixedHeight !== null ? fixedHeight : naturalTextHeight + 2 * cellStyle.padding;

  if (!forceNoBackground && cellStyle.backgroundColor) {
    doc.setFillColor(cellStyle.backgroundColor[0], cellStyle.backgroundColor[1], cellStyle.backgroundColor[2]);
    doc.rect(x, y, width, cellHeight, 'F');
  }

  if (!forceNoBorder) {
    doc.setDrawColor(cellStyle.borderColor[0], cellStyle.borderColor[1], cellStyle.borderColor[2]);
    doc.setLineWidth(cellStyle.borderWidth);
    doc.rect(x, y, width, cellHeight, 'S');
  }

  doc.setTextColor(cellStyle.textColor[0], cellStyle.textColor[1], cellStyle.textColor[2]);

  let startYText = y + cellStyle.padding + cellStyle.fontStyle.size;
  if (fixedHeight !== null && cellHeight > naturalTextHeight + 2 * cellStyle.padding) {
    startYText += (cellHeight - (naturalTextHeight + 2 * cellStyle.padding)) / 2;
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
    doc.text(line, textX, startYText + (index * (cellStyle.fontStyle.size + cellStyle.fontStyle.lineHeightAddition)));
  });

  return y + cellHeight;
}

export function generatePurchaseOrderPdf(
  po: PurchaseOrder,
  exporter: Company,
  manufacturer: Manufacturer,
  poSize: Size | undefined,
  allProducts: Product[],
  sourcePi: PerformaInvoice | undefined
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let yPos = PAGE_MARGIN_Y_TOP;
  const halfContentWidth = CONTENT_WIDTH / 2;
  const poDetailBoxWidth = halfContentWidth / 2;
  const threePartBoxWidth = halfContentWidth / 3;

  yPos = drawPdfCell(doc, exporter.companyName.toUpperCase(), PAGE_MARGIN_X, yPos, CONTENT_WIDTH, 1);
  yPos = drawPdfCell(doc, "PURCHASE ORDER", PAGE_MARGIN_X, yPos, CONTENT_WIDTH, 1);
  yPos += 5; 

  const col1X = PAGE_MARGIN_X;
  const col2X = PAGE_MARGIN_X + halfContentWidth;

  let yPosCol1 = yPos;
  let currentYCol2 = yPos;

  // --- Column 1: Manufacturer Details in a single box ---
  const initialYCol1 = yPosCol1;
  yPosCol1 = drawPdfCell(doc, "TO", col1X, yPosCol1, halfContentWidth, 2); // "TO" Label

  // Prepare Manufacturer Name and Address text with spacing
  const manufacturerNameText = manufacturer.companyName.toUpperCase();
  const manufacturerAddressDetailsText = [
    manufacturer.address,
    `GSTIN: ${manufacturer.gstNumber}`,
    `PIN: ${manufacturer.pinCode}`
  ].filter(Boolean).join('\n');

  // Calculate height for manufacturer name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_CAT1_SIZE);
  const nameLines = doc.splitTextToSize(manufacturerNameText, halfContentWidth - 2 * CELL_PADDING);
  const nameBlockHeight = nameLines.length * FONT_CAT1_SIZE + (nameLines.length > 0 ? (nameLines.length - 1) * MANUFACTURER_NAME_LINE_HEIGHT_ADDITION : 0);

  // Double line space (approx one 14pt line height)
  const doubleLineSpaceHeight = FONT_CAT1_SIZE + MANUFACTURER_NAME_LINE_HEIGHT_ADDITION;

  // Calculate height for manufacturer address
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT_CAT3_SIZE);
  const addressLines = doc.splitTextToSize(manufacturerAddressDetailsText, halfContentWidth - 2 * CELL_PADDING);
  const addressBlockHeight = addressLines.length * FONT_CAT3_SIZE + (addressLines.length > 0 ? (addressLines.length - 1) * MANUFACTURER_ADDRESS_LINE_HEIGHT_ADDITION : 0);

  const totalInternalContentHeight = nameBlockHeight + doubleLineSpaceHeight + addressBlockHeight;
  const combinedManufacturerCellHeight = totalInternalContentHeight + 2 * CELL_PADDING;

  // Draw the single border for the combined manufacturer cell
  doc.setDrawColor(COLOR_BORDER_RGB[0], COLOR_BORDER_RGB[1], COLOR_BORDER_RGB[2]);
  doc.setLineWidth(getPdfCellStyle(3).borderWidth); // Use Category 3 border style
  doc.rect(col1X, yPosCol1, halfContentWidth, combinedManufacturerCellHeight, 'S');

  // Draw Manufacturer Name inside the box
  let currentYInCombinedCell = yPosCol1 + CELL_PADDING;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_CAT1_SIZE);
  doc.setTextColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  nameLines.forEach((line: string, index: number) => {
    doc.text(line, col1X + CELL_PADDING, currentYInCombinedCell + FONT_CAT1_SIZE + (index * (FONT_CAT1_SIZE + MANUFACTURER_NAME_LINE_HEIGHT_ADDITION)));
  });
  currentYInCombinedCell += nameBlockHeight;

  // Add double line space
  currentYInCombinedCell += doubleLineSpaceHeight;

  // Draw Manufacturer Address inside the box
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT_CAT3_SIZE);
  addressLines.forEach((line: string, index: number) => {
    doc.text(line, col1X + CELL_PADDING, currentYInCombinedCell + FONT_CAT3_SIZE + (index * (FONT_CAT3_SIZE + MANUFACTURER_ADDRESS_LINE_HEIGHT_ADDITION)));
  });
  
  yPosCol1 += combinedManufacturerCellHeight; // Update yPosCol1 to after the combined cell
  yPosCol1 += 5; // Extra line after manufacturer address block
  const heightCol1 = yPosCol1 - initialYCol1;


  // --- Column 2: PO Details ---
  const initialYCol2 = currentYCol2;

  const poNumLabelH = calculateNaturalCellHeight(doc, "PO Number", poDetailBoxWidth, 2);
  const poDateLabelH = calculateNaturalCellHeight(doc, "PO Date", poDetailBoxWidth, 2);
  const fixedLabelH1 = Math.max(poNumLabelH, poDateLabelH);
  drawPdfCell(doc, "PO Number", col2X, currentYCol2, poDetailBoxWidth, 2, fixedLabelH1, 'center');
  drawPdfCell(doc, "PO Date", col2X + poDetailBoxWidth, currentYCol2, poDetailBoxWidth, 2, fixedLabelH1, 'center');
  currentYCol2 += fixedLabelH1;

  const poNumValText = po.poNumber;
  const poDateValText = format(new Date(po.poDate), 'dd/MM/yyyy');
  const poNumValH = calculateNaturalCellHeight(doc, poNumValText, poDetailBoxWidth, 3);
  const poDateValH = calculateNaturalCellHeight(doc, poDateValText, poDetailBoxWidth, 3);
  const fixedValueH1 = Math.max(poNumValH, poDateValH);
  drawPdfCell(doc, poNumValText, col2X, currentYCol2, poDetailBoxWidth, 3, fixedValueH1, 'center');
  drawPdfCell(doc, poDateValText, col2X + poDetailBoxWidth, currentYCol2, poDetailBoxWidth, 3, fixedValueH1, 'center');
  currentYCol2 += fixedValueH1;

  const sizeLabelH = calculateNaturalCellHeight(doc, "Size", threePartBoxWidth, 2);
  const hsnLabelH = calculateNaturalCellHeight(doc, "HSN Code", threePartBoxWidth, 2);
  const noContLabelH = calculateNaturalCellHeight(doc, "No. of Containers", threePartBoxWidth, 2);
  const fixedLabelH2 = Math.max(sizeLabelH, hsnLabelH, noContLabelH);
  drawPdfCell(doc, "Size", col2X, currentYCol2, threePartBoxWidth, 2, fixedLabelH2, 'center');
  drawPdfCell(doc, "HSN Code", col2X + threePartBoxWidth, currentYCol2, threePartBoxWidth, 2, fixedLabelH2, 'center');
  drawPdfCell(doc, "No. of Containers", col2X + 2 * threePartBoxWidth, currentYCol2, threePartBoxWidth, 2, fixedLabelH2, 'center');
  currentYCol2 += fixedLabelH2;

  const sizeValText = poSize?.size || "N/A";
  const hsnValText = poSize?.hsnCode || "N/A";
  const noContValText = po.numberOfContainers.toString();
  const sizeValH = calculateNaturalCellHeight(doc, sizeValText, threePartBoxWidth, 3);
  const hsnValH = calculateNaturalCellHeight(doc, hsnValText, threePartBoxWidth, 3);
  const noContValH = calculateNaturalCellHeight(doc, noContValText, threePartBoxWidth, 3);
  const fixedValueH2 = Math.max(sizeValH, hsnValH, noContValH);
  drawPdfCell(doc, sizeValText, col2X, currentYCol2, threePartBoxWidth, 3, fixedValueH2, 'center');
  drawPdfCell(doc, hsnValText, col2X + threePartBoxWidth, currentYCol2, threePartBoxWidth, 3, fixedValueH2, 'center');
  drawPdfCell(doc, noContValText, col2X + 2 * threePartBoxWidth, currentYCol2, threePartBoxWidth, 3, fixedValueH2, 'center');
  currentYCol2 += fixedValueH2;

  if (sourcePi) {
    const piLabelH = calculateNaturalCellHeight(doc, "Ref. PI No.", halfContentWidth, 2);
    currentYCol2 = drawPdfCell(doc, "Ref. PI No.", col2X, currentYCol2, halfContentWidth, 2, piLabelH, 'left');

    const piValText = sourcePi.invoiceNumber;
    const piValH = calculateNaturalCellHeight(doc, piValText, halfContentWidth, 3);
    currentYCol2 = drawPdfCell(doc, piValText, col2X, currentYCol2, halfContentWidth, 3, piValH, 'left');
  }
  const heightCol2 = currentYCol2 - initialYCol2;

  yPos = Math.max(yPosCol1, initialYCol2 + heightCol2);
  // yPos += 5; // Removed extra space as per combination

  const tableHead = [['SR', 'DESCRIPTION OF GOODS', 'Design Image Ref.', 'WEIGHT/BOX (Kg)', 'BOXES', 'THICKNESS', 'TOTAL WEIGHT (Kg)']];
  let totalBoxesOverall = 0;
  let totalWeightOverall = 0;

  const actualTableBodyItems = po.items.map((item, index) => {
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

  const tableBodyWithEmptyRows = [...actualTableBodyItems];
  const emptyRowCount = actualTableBodyItems.length >= 5 ? 2 : 4;
  const emptyRowData = Array(tableHead[0].length).fill(' ');

  for (let i = 0; i < emptyRowCount; i++) {
    tableBodyWithEmptyRows.push([...emptyRowData]);
  }

  const tableFooter = [
    [
      { content: 'Total Box:', styles: { halign: 'right', fontStyle: 'bold', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontSize: FONT_CAT2_SIZE, cellPadding: CELL_PADDING } },
      { content: totalBoxesOverall.toString(), styles: { halign: 'center', fontStyle: 'normal', fillColor: COLOR_WHITE_RGB, textColor: COLOR_BLACK_RGB, fontSize: FONT_CAT3_SIZE, cellPadding: CELL_PADDING } },
      { content: '', styles: { fillColor: COLOR_WHITE_RGB } }, 
      { content: 'Total Weight (Kg):', styles: { halign: 'right', fontStyle: 'bold', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontSize: FONT_CAT2_SIZE, cellPadding: CELL_PADDING } },
      { content: totalWeightOverall.toFixed(2), styles: { halign: 'center', fontStyle: 'normal', fillColor: COLOR_WHITE_RGB, textColor: COLOR_BLACK_RGB, fontSize: FONT_CAT3_SIZE, cellPadding: CELL_PADDING } },
      { content: '', styles: { fillColor: COLOR_WHITE_RGB } }, 
      { content: '', styles: { fillColor: COLOR_WHITE_RGB } }, 
    ]
  ];

  autoTable(doc, {
    head: tableHead,
    body: tableBodyWithEmptyRows,
    foot: tableFooter,
    startY: yPos,
    theme: 'grid',
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
    footStyles: {
      lineWidth: 0.5,
      lineColor: COLOR_BORDER_RGB,
      cellPadding: CELL_PADDING,
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 30 }, 
      1: { halign: 'left', cellWidth: 'auto' }, 
      2: { halign: 'left', cellWidth: 'auto' }, 
      3: { halign: 'right', cellWidth: 70 }, 
      4: { halign: 'right', cellWidth: 50 }, 
      5: { halign: 'center', cellWidth: 70 }, 
      6: { halign: 'right', cellWidth: 70 }, 
    },
    didParseCell: function (data) {
      if (data.section === 'foot') {
        if (data.cell.raw === '') { // Style empty cells in footer to be white
          data.cell.styles.fillColor = COLOR_WHITE_RGB;
          data.cell.styles.lineWidth = 0.5; 
          data.cell.styles.lineColor = COLOR_BORDER_RGB;
        }
      }
      if (data.section === 'body' && (data.cell.raw === ' ' || data.cell.raw === '')) {
         data.cell.styles.fillColor = COLOR_WHITE_RGB; // Ensure empty body rows are white
      }
    },
    didDrawPage: (data) => {
      // @ts-ignore
      yPos = data.cursor?.y ?? yPos;
    }
  });
  yPos += 10; 

  // Display Terms & Conditions from PO data
  const termsHeaderH = calculateNaturalCellHeight(doc, "Terms & Conditions:", CONTENT_WIDTH, 2);
  yPos = drawPdfCell(doc, "Terms & Conditions:", PAGE_MARGIN_X, yPos, CONTENT_WIDTH, 2, termsHeaderH, 'left');
  
  const poTermsText = po.termsAndConditions || "Ø Tiles should be stamped with MADE IN INDIA, & No any punch should be there on the back side of tiles.\nØ Dispatch Immediately.\nØ Quality check under supervision by seller and exporter.";
  const poTermsHeight = calculateNaturalCellHeight(doc, poTermsText, CONTENT_WIDTH, 3);
  yPos = drawPdfCell(doc, poTermsText, PAGE_MARGIN_X, yPos, CONTENT_WIDTH, 3, poTermsHeight, 'left');
  yPos += 15; // Space after terms

  // Removed "Please supply..." line

  const signatureBlockHeight = (FONT_CAT2_SIZE + 2 * CELL_PADDING) * 2 + 40; 
  const availableSpace = doc.internal.pageSize.getHeight() - PAGE_MARGIN_Y_BOTTOM - yPos;

  if (availableSpace < signatureBlockHeight) {
    doc.addPage();
    yPos = PAGE_MARGIN_Y_TOP;
  }

  const signatureX = PAGE_MARGIN_X + CONTENT_WIDTH / 2; 
  const signatureWidth = CONTENT_WIDTH / 2;
  let signatureY = doc.internal.pageSize.getHeight() - PAGE_MARGIN_Y_BOTTOM - signatureBlockHeight;
  if (signatureY < yPos) { 
      signatureY = yPos;
  }

  const forExporterText = `FOR ${exporter.companyName.toUpperCase()}`;
  // Recalculate height for signature lines with specific font styles
  const forExporterLabelStyle = { size: FONT_CAT2_SIZE, weight: 'bold', style: 'normal', lineHeightAddition: LINE_HEIGHT_ADDITION } as const;
  const forExporterH = calculateNaturalCellHeight(doc, forExporterText, signatureWidth, 2, forExporterLabelStyle);

  const authSignText = "Authorised Signatory";
  const authSignH = calculateNaturalCellHeight(doc, authSignText, signatureWidth, 2, forExporterLabelStyle);
  
  const fixedSigLineHeight = Math.max(forExporterH, authSignH) + 20; 

  drawPdfCell(doc, forExporterText, signatureX, signatureY, signatureWidth, 2, fixedSigLineHeight, 'center', forExporterLabelStyle, true, true);
  drawPdfCell(doc, authSignText, signatureX, signatureY + fixedSigLineHeight, signatureWidth, 2, authSignH, 'center', forExporterLabelStyle, true, true);

  doc.save(`Purchase_Order_${po.poNumber.replace(/\//g, '_')}.pdf`);
}

