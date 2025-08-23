
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
const FONT_CAT1_SIZE = 14; // For main "PURCHASE ORDER" title
const FONT_MANUFACTURER_NAME_SIZE = 11; // Specific for Manufacturer Name
const FONT_CAT2_SIZE = 10; // For Exporter name, PO Number label, other labels
const FONT_CAT3_SIZE = 8;  // For addresses, PO values, table body

// --- Line Height Additions (pt) ---
const LINE_HEIGHT_ADDITION = 2.5; // Used for Cat 2, Cat 3, and Manufacturer Name
const CAT1_LINE_HEIGHT_ADDITION = 3.0; // Used for Cat 1

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

function getPdfCellStyle(category: 1 | 2 | 3 | 'manufacturerName'): PdfCellStyle {
  switch (category) {
    case 1: // Main Titles (e.g., "PURCHASE ORDER")
      return {
        fontStyle: { size: FONT_CAT1_SIZE, weight: 'bold', style: 'normal', lineHeightAddition: CAT1_LINE_HEIGHT_ADDITION },
        backgroundColor: COLOR_BLUE_RGB,
        textColor: COLOR_BLACK_RGB,
        textAlign: 'center',
        borderColor: COLOR_BORDER_RGB,
        borderWidth: 0.5,
        padding: CELL_PADDING,
      };
    case 'manufacturerName': // Specific for Manufacturer Name
      return {
        fontStyle: { size: FONT_MANUFACTURER_NAME_SIZE, weight: 'bold', style: 'normal', lineHeightAddition: LINE_HEIGHT_ADDITION },
        backgroundColor: COLOR_WHITE_RGB, 
        textColor: COLOR_BLACK_RGB,
        textAlign: 'center', 
        borderColor: COLOR_BORDER_RGB, 
        borderWidth: 0.5,
        padding: CELL_PADDING,
      };
    case 2: // Fixed Labels / Sub-headers / Exporter Name
      return {
        fontStyle: { size: FONT_CAT2_SIZE, weight: 'bold', style: 'normal', lineHeightAddition: LINE_HEIGHT_ADDITION },
        backgroundColor: COLOR_BLUE_RGB,
        textColor: COLOR_BLACK_RGB,
        textAlign: 'center',
        borderColor: COLOR_BORDER_RGB,
        borderWidth: 0.5,
        padding: CELL_PADDING,
      };
    case 3: // Dynamic Data / Values / Manufacturer Address
    default:
      return {
        fontStyle: { size: FONT_CAT3_SIZE, weight: 'normal', style: 'normal', lineHeightAddition: LINE_HEIGHT_ADDITION },
        backgroundColor: COLOR_WHITE_RGB,
        textColor: COLOR_BLACK_RGB,
        textAlign: 'left',
        borderColor: COLOR_BORDER_RGB,
        borderWidth: 0.5,
        padding: CELL_PADDING,
      };
  }
}

function calculateNaturalCellHeight(doc: jsPDF, text: string | string[], width: number, category: 1 | 2 | 3 | 'manufacturerName', overrideFontStyle?: Partial<PdfCellStyle['fontStyle']>): number {
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
  category: 1 | 2 | 3 | 'manufacturerName',
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

export async function generatePurchaseOrderPdf(
  po: PurchaseOrder,
  exporter: Company,
  manufacturer: Manufacturer,
  poSize: Size | undefined,
  allProducts: Product[],
  sourcePi: PerformaInvoice | undefined
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  let headerImage: Uint8Array | null = null;
  let footerImage: Uint8Array | null = null;
  let signatureImage: Uint8Array | null = null;
  const productImageMap = new Map<string, {data: Uint8Array, ext: string}>();
  let headerHeight = 0;
  let footerHeight = 0;

  try {
      const headerResponse = await fetch('/Latter-pad-head.png');
      if (headerResponse.ok) {
          headerImage = new Uint8Array(await headerResponse.arrayBuffer());
          headerHeight = 70;
      } else {
          console.warn('Header image not found at /Latter-pad-head.png');
      }

      const footerResponse = await fetch('/Latter-pad-bottom.png');
      if (footerResponse.ok) {
          footerImage = new Uint8Array(await footerResponse.arrayBuffer());
          footerHeight = 80;
      } else {
          console.warn('Footer image not found at /Latter-pad-bottom.png');
      }

      const signatureResponse = await fetch('/signature.png');
      if (signatureResponse.ok) {
          signatureImage = new Uint8Array(await signatureResponse.arrayBuffer());
      } else {
          console.warn('Signature image not found at /signature.png');
      }
      
      const uniqueImageUrls = [...new Set(po.items.map(item => item.imageUrl).filter(Boolean))];
      for (const imageUrl of uniqueImageUrls) {
          if (imageUrl) {
            try {
              const imgResponse = await fetch(imageUrl);
              if (imgResponse.ok) {
                  const arrayBuffer = await imgResponse.arrayBuffer();
                  const ext = imageUrl.split('.').pop()?.toUpperCase() || 'PNG';
                  productImageMap.set(imageUrl, { data: new Uint8Array(arrayBuffer), ext });
              }
            } catch (e) {
                console.error(`Failed to fetch image for PO: ${imageUrl}`, e);
            }
          }
      }

  } catch (error) {
      console.error("Error fetching images for PDF:", error);
  }

  const addHeaderFooter = () => {
    for (let i = 1; i <= doc.internal.getNumberOfPages(); i++) {
        doc.setPage(i);
        if (headerImage) {
            doc.addImage(headerImage, 'PNG', 0, 0, pageWidth, headerHeight);
        }
        if (footerImage) {
            doc.addImage(footerImage, 'PNG', 0, pageHeight - footerHeight, pageWidth, footerHeight);
        }
    }
  };

  addHeaderFooter();

  let yPos = headerHeight > 0 ? headerHeight + 10 : PAGE_MARGIN_Y_TOP;

  const halfContentWidth = CONTENT_WIDTH / 2;
  const poDetailBoxWidth = halfContentWidth / 2;
  const threePartBoxWidth = halfContentWidth / 3;

  yPos = drawPdfCell(doc, "PURCHASE ORDER", PAGE_MARGIN_X, yPos, CONTENT_WIDTH, 1);
  yPos += 5;

  const col1X = PAGE_MARGIN_X;
  const col2X = PAGE_MARGIN_X + halfContentWidth;

  let yPosCol1 = yPos;
  let currentYCol2 = yPos;

  // --- Column 1: Manufacturer Details in a single box ---
  const initialYCol1 = yPosCol1;
  yPosCol1 = drawPdfCell(doc, "TO", col1X, yPosCol1, halfContentWidth, 2);

  const manufacturerNameText = manufacturer.companyName.toUpperCase();
  const manufacturerAddressDetailsText = [
    manufacturer.address,
    `GSTIN: ${manufacturer.gstNumber}`,
    `PIN: ${manufacturer.pinCode}`
  ].filter(Boolean).join('\n');
  
  const manuNameFontStyle = getPdfCellStyle('manufacturerName').fontStyle; 
  doc.setFont('helvetica', manuNameFontStyle.weight);
  doc.setFontSize(manuNameFontStyle.size);
  const nameLines = doc.splitTextToSize(manufacturerNameText, halfContentWidth - 2 * CELL_PADDING);
  const nameBlockHeight = nameLines.length * manuNameFontStyle.size + (nameLines.length > 0 ? (nameLines.length - 1) * manuNameFontStyle.lineHeightAddition : 0);

  const spaceAfterNameHeight = (manuNameFontStyle.size + manuNameFontStyle.lineHeightAddition) * 1;


  const manuAddrFontStyle = getPdfCellStyle(3).fontStyle;
  doc.setFont('helvetica', manuAddrFontStyle.weight);
  doc.setFontSize(manuAddrFontStyle.size);
  const addressLines = doc.splitTextToSize(manufacturerAddressDetailsText, halfContentWidth - 2 * CELL_PADDING);
  const addressBlockHeight = addressLines.length * manuAddrFontStyle.size + (addressLines.length > 0 ? (addressLines.length - 1) * manuAddrFontStyle.lineHeightAddition : 0);

  const totalInternalContentHeight = nameBlockHeight + spaceAfterNameHeight + addressBlockHeight;
  const combinedManufacturerCellHeight = totalInternalContentHeight + 2 * CELL_PADDING;

  doc.setDrawColor(COLOR_BORDER_RGB[0], COLOR_BORDER_RGB[1], COLOR_BORDER_RGB[2]);
  doc.setLineWidth(getPdfCellStyle(3).borderWidth);
  doc.rect(col1X, yPosCol1, halfContentWidth, combinedManufacturerCellHeight, 'S');

  let currentYInCombinedCell = yPosCol1 + CELL_PADDING;
  doc.setFont('helvetica', manuNameFontStyle.weight);
  doc.setFontSize(manuNameFontStyle.size);
  doc.setTextColor(COLOR_BLACK_RGB[0], COLOR_BLACK_RGB[1], COLOR_BLACK_RGB[2]);
  nameLines.forEach((line: string, index: number) => {
    const textWidth = doc.getTextWidth(line);
    const textX = col1X + (halfContentWidth - textWidth) / 2; 
    doc.text(line, textX, currentYInCombinedCell + manuNameFontStyle.size + (index * (manuNameFontStyle.size + manuNameFontStyle.lineHeightAddition)));
  });
  currentYInCombinedCell += nameBlockHeight;
  currentYInCombinedCell += spaceAfterNameHeight;

  doc.setFont('helvetica', manuAddrFontStyle.weight);
  doc.setFontSize(manuAddrFontStyle.size);
  addressLines.forEach((line: string, index: number) => {
    doc.text(line, col1X + CELL_PADDING, currentYInCombinedCell + manuAddrFontStyle.size + (index * (manuAddrFontStyle.size + manuAddrFontStyle.lineHeightAddition)));
  });

  yPosCol1 += combinedManufacturerCellHeight;
  yPosCol1 += 5; 
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
  yPos += 5;

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
  const emptyRowCount = actualTableBodyItems.length >= 5 ? 2 : 4;
  const emptyRowData = Array(tableHead[0].length).fill(' ');

  for (let i = 0; i < emptyRowCount; i++) {
    tableBodyWithEmptyRows.push([...emptyRowData]);
  }

  const tableFooter = [
    [
      { content: 'Total Box:', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: COLOR_BLUE_RGB, textColor: COLOR_BLACK_RGB, fontSize: FONT_CAT2_SIZE, cellPadding: CELL_PADDING } },
      { content: totalBoxesOverall.toString(), styles: { halign: 'center', fontStyle: 'normal', fillColor: COLOR_WHITE_RGB, textColor: COLOR_BLACK_RGB, fontSize: FONT_CAT3_SIZE, cellPadding: CELL_PADDING } },
      { content: '', styles: { fillColor: COLOR_WHITE_RGB } } // Empty cell for THICKNESS column
    ]
  ];

  autoTable(doc, {
    head: tableHead,
    body: tableBodyWithEmptyRows,
    foot: tableFooter,
    startY: yPos,
    theme: 'grid',
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X, top: headerHeight, bottom: footerHeight },
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
      minCellHeight: 60,
    },
    footStyles: {
      lineWidth: 0.5,
      lineColor: COLOR_BORDER_RGB,
      cellPadding: CELL_PADDING,
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 30 }, // SR
      1: { halign: 'left', cellWidth: 'auto' }, // DESCRIPTION
      2: { halign: 'center', cellWidth: 60 }, // Image
      3: { halign: 'right', cellWidth: 70 }, // WEIGHT/BOX
      4: { halign: 'right', cellWidth: 50 }, // BOXES
      5: { halign: 'center', cellWidth: 70 }, // THICKNESS
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
          const imageUrl = data.cell.raw as string;
          if (!imageUrl) return;
          const imgData = productImageMap.get(imageUrl);
          if (imgData) {
              const cell = data.cell;
              const imgSize = Math.min(cell.width - 4, cell.height - 4, 50);
              const imgX = cell.x + (cell.width - imgSize) / 2;
              const imgY = cell.y + (cell.height - imgSize) / 2;
              try {
                  doc.addImage(imgData.data, imgData.ext, imgX, imgY, imgSize, imgSize);
              } catch (e) {
                  console.error("Error adding image to PO PDF:", e);
              }
          }
      }
    },
    didParseCell: function (data) {
      if (data.section === 'foot') {
        if (data.cell.raw === '' || data.cell.raw === undefined || (typeof data.cell.raw === 'object' && data.cell.raw && 'content' in data.cell.raw && data.cell.raw.content === '')) {
          data.cell.styles.fillColor = COLOR_WHITE_RGB;
          data.cell.styles.lineWidth = 0.5;
          data.cell.styles.lineColor = COLOR_BORDER_RGB;
        }
      }
       if (data.section === 'body' && (data.cell.raw === ' ' || data.cell.raw === '')) {
         data.cell.styles.fillColor = COLOR_WHITE_RGB;
      }
    },
    didDrawPage: (data) => {
      addHeaderFooter();
    }
  });

  // @ts-ignore
  let finalY = doc.lastAutoTable.finalY;
  yPos = finalY + 10;

  const termsHeaderH = calculateNaturalCellHeight(doc, "Terms & Conditions:", CONTENT_WIDTH, 2);
  yPos = drawPdfCell(doc, "Terms & Conditions:", PAGE_MARGIN_X, yPos, CONTENT_WIDTH, 2, termsHeaderH, 'left');
  
  const poTermsText = po.termsAndConditions || "Ø Tiles should be stamped with MADE IN INDIA, & No any punch should be there on the back side of tiles.\nØ Dispatch Immediately.\nØ Quality check under supervision by seller and exporter.";
  const poTermsHeight = calculateNaturalCellHeight(doc, poTermsText.split('\n'), CONTENT_WIDTH, 3);
  yPos = drawPdfCell(doc, poTermsText.split('\n'), PAGE_MARGIN_X, yPos, CONTENT_WIDTH, 3, poTermsHeight, 'left');
  yPos += 15; 

  // Signature Block
  const signatureBlockHeight = 80;
  if (yPos + signatureBlockHeight > pageHeight - footerHeight) {
    doc.addPage();
    addHeaderFooter();
    yPos = headerHeight + 10;
  }
  
  const signatureY = Math.max(yPos, pageHeight - footerHeight - signatureBlockHeight);

  const signatureTableBody = [
      [{ content: `FOR, ${exporter.companyName.toUpperCase()}`, styles: { halign: 'center', fontStyle: 'bold', fontSize: FONT_CAT2_SIZE } }],
      [{ content: '', styles: { minCellHeight: 40 } }], // Cell for signature image
      [{ content: 'AUTHORISED SIGNATURE', styles: { halign: 'center', fontStyle: 'bold', fontSize: FONT_CAT2_SIZE } }]
  ];

  autoTable(doc, {
      startY: signatureY,
      body: signatureTableBody,
      theme: 'plain',
      tableWidth: 'wrap',
      margin: { left: PAGE_MARGIN_X + CONTENT_WIDTH / 2 },
      columnStyles: { 0: { cellWidth: CONTENT_WIDTH / 2 } },
      didDrawCell: (data) => {
          if (data.section === 'body' && data.row.index === 1) { // The empty cell
              if (signatureImage) {
                  const cell = data.cell;
                  const imgWidth = 80;
                  const imgHeight = 40;
                  const imgX = cell.x + (cell.width - imgWidth) / 2;
                  const imgY = cell.y + (cell.height - imgHeight) / 2;
                  doc.addImage(signatureImage, 'PNG', imgX, imgY, imgWidth, imgHeight);
              }
          }
      },
      didDrawPage: addHeaderFooter,
  });

  doc.save(`Purchase_Order_${po.poNumber.replace(/\//g, '_')}.pdf`);
}
