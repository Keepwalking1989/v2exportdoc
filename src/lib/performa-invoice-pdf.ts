
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
const PAGE_MARGIN_TOP = 6; // pt
const PAGE_MARGIN_SIDES = 12; // pt

// --- Font Sizes (Mimicking Image - these are the base sizes) ---
const FONT_SIZE_MAIN_TITLE = 12; // pt
const FONT_SIZE_SECTION_LABEL = 8; // pt
const FONT_SIZE_CONTENT_PRIMARY = 8; // pt
const FONT_SIZE_TABLE_BODY = 7.5; // pt
const FONT_SIZE_TABLE_HEAD = 7.5; //pt
const FONT_SIZE_FOOTER_PRIMARY = 7; // pt
const FONT_SIZE_FOOTER_SECONDARY = 6.5; // pt

// --- Line Heights and Spacing (NOW SUPER TIGHT based on user feedback) ---
const HEADER_LINE_COMPRESSION_FACTOR = 0.85; // Applied to text rendering height and yPos advancement

// For Footer section - slightly less aggressive than header, but still tight
const FOOTER_LINE_HEIGHT_PACKED = FONT_SIZE_FOOTER_SECONDARY + 0.1;
const FOOTER_LINE_HEIGHT_SINGLE = FONT_SIZE_FOOTER_PRIMARY + 0.1;
const FOOTER_MINIMAL_INTERNAL_SPACING = 0.0;

// Explicit Spacing (User wants these to be 0 for the header)
const MINIMAL_INTERNAL_SPACING = 0.0; // General minimal spacing if needed, but header uses 0.
const SPACE_AFTER_MAIN_TITLE = 0.0;
const SPACE_AFTER_SECTION_LABEL = 0.0; // For spacing after a label *before* its content within the same block.
const SPACE_AFTER_BLOCK_HEADER = 0.0; // Space after an entire block (like exporter details) before a line.
const SPACE_AFTER_HORIZONTAL_LINE = 0.0; // Space after a horizontal line before the next block.
const SPACE_BEFORE_TABLE_CONTENT = 0.0; // Space after last header block (IEC Code) before table.
const SPACE_AFTER_TABLE = 0.0;
const SPACE_BETWEEN_FOOTER_BLOCKS = 0.0;
const SPACE_BEFORE_SIGNATURE = 0.0;

// For table
const tableCellPadding = 0.2;

export function generatePerformaInvoicePdf(
  invoice: PerformaInvoice,
  exporter: Company,
  client: Client,
  allSizes: Size[],
  allProducts: Product[],
  selectedBank?: Bank
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let yPos = PAGE_MARGIN_TOP;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentMaxWidthLeft = pageWidth / 2 - PAGE_MARGIN_SIDES - 2; // -2 for a small gutter
  const contentMaxWidthRight = pageWidth / 2 - PAGE_MARGIN_SIDES - 2;

  const addText = (
    text: string | string[],
    x: number,
    currentY: number,
    options: {
      fontSize?: number;
      fontWeight?: 'normal' | 'bold';
      fontStyle?: 'normal' | 'italic';
      lineHeightFactor?: number;
      yAdvanceFactor?: number;
      spacingAfter?: number;
      align?: 'left' | 'center' | 'right';
      color?: [number, number, number];
      maxWidth?: number;
    } = {}
  ): number => {
    const fontSize = options.fontSize || FONT_SIZE_CONTENT_PRIMARY;
    const align = options.align || 'left';
    const maxWidth = options.maxWidth;
    const fontWeight = options.fontWeight || 'normal';
    const fontStyle = options.fontStyle || 'normal';
    // Use HEADER_LINE_COMPRESSION_FACTOR for header by default, or passed option, or 1.0 for footer/other
    const LHF = options.lineHeightFactor !== undefined ? options.lineHeightFactor : (currentY < 300 ? HEADER_LINE_COMPRESSION_FACTOR : 1.0) ; // Heuristic: if yPos is in header region
    const YAF = options.yAdvanceFactor !== undefined ? options.yAdvanceFactor : (currentY < 300 ? HEADER_LINE_COMPRESSION_FACTOR : 1.0);


    let combinedStyle = 'normal';
    if (fontWeight === 'bold' && fontStyle === 'italic') combinedStyle = 'bolditalic';
    else if (fontWeight === 'bold') combinedStyle = 'bold';
    else if (fontStyle === 'italic') combinedStyle = 'italic';

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', combinedStyle);

    if (options.color) {
      doc.setTextColor(options.color[0], options.color[1], options.color[2]);
    } else {
      doc.setTextColor(0, 0, 0);
    }

    let newY = currentY;
    const textToProcess = Array.isArray(text) ? text : [text || ""];
    const yLineAdvance = fontSize * YAF;

    textToProcess.forEach(lineContent => {
      let lines = [lineContent];
      if (maxWidth && lineContent) {
        lines = doc.splitTextToSize(lineContent, maxWidth);
      }
      lines.forEach(line => {
        let actualX = x;
        if (align === 'center') actualX = pageWidth / 2;
        doc.text(line, actualX, newY, { align: align, lineHeightFactor: LHF });
        newY += yLineAdvance;
      });
    });
    return newY + (options.spacingAfter || 0);
  };

  // --- 1. "PROFORMA INVOICE" Title ---
  yPos = addText('PROFORMA INVOICE', pageWidth / 2, yPos, {
    fontSize: FONT_SIZE_MAIN_TITLE, fontWeight: 'bold', align: 'center',
    spacingAfter: SPACE_AFTER_MAIN_TITLE,
  });

  const leftColumnX = PAGE_MARGIN_SIDES;
  const rightColumnX = pageWidth / 2 + 2; // Small gutter
  let exporterY = yPos;
  let invoiceDetailsY = yPos;

  // --- EXPORTER ---
  exporterY = addText('EXPORTER:', leftColumnX, exporterY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', spacingAfter: SPACE_AFTER_SECTION_LABEL });
  exporterY = addText(exporter.companyName, leftColumnX, exporterY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, fontWeight: 'bold', spacingAfter: 0, maxWidth: contentMaxWidthLeft });
  exporterY = addText(exporter.address, leftColumnX, exporterY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, spacingAfter: 0, maxWidth: contentMaxWidthLeft });
  // Tel and IEC were removed as they are not in the image's exporter block for this dense layout

  // --- INVOICE DETAILS (Right of Exporter) ---
  const invoiceDetailsLabelX = rightColumnX;
  const invoiceDetailsValueX = rightColumnX + doc.getTextWidth("Invoice Date And Number:") + 5; // Align values

  invoiceDetailsY = addText('Invoice Date And Number:', invoiceDetailsLabelX, invoiceDetailsY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', spacingAfter: SPACE_AFTER_SECTION_LABEL });
  invoiceDetailsY = addText(`${invoice.invoiceNumber} / ${format(new Date(invoice.invoiceDate), 'dd-MM-yyyy')}`, invoiceDetailsValueX, invoiceDetailsY - (FONT_SIZE_SECTION_LABEL * HEADER_LINE_COMPRESSION_FACTOR), { fontSize: FONT_SIZE_CONTENT_PRIMARY, spacingAfter: 0 }); // Align value with label

  invoiceDetailsY = addText('IEC. Code:', invoiceDetailsLabelX, invoiceDetailsY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', spacingAfter: SPACE_AFTER_SECTION_LABEL });
  invoiceDetailsY = addText(exporter.iecNumber, invoiceDetailsValueX, invoiceDetailsY - (FONT_SIZE_SECTION_LABEL * HEADER_LINE_COMPRESSION_FACTOR) , { fontSize: FONT_SIZE_CONTENT_PRIMARY, spacingAfter: 0 }); // Align value


  yPos = Math.max(exporterY, invoiceDetailsY);
  yPos += SPACE_AFTER_BLOCK_HEADER;
  doc.setLineWidth(0.2);
  doc.line(PAGE_MARGIN_SIDES, yPos, pageWidth - PAGE_MARGIN_SIDES, yPos);
  yPos += SPACE_AFTER_HORIZONTAL_LINE;

  let consigneeY = yPos;
  let notifyPartyY = yPos;

  // --- CONSIGNEE ---
  consigneeY = addText('CONSIGNEE / BUYER:', leftColumnX, consigneeY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', spacingAfter: SPACE_AFTER_SECTION_LABEL });
  consigneeY = addText(client.companyName, leftColumnX, consigneeY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, fontWeight: 'bold', spacingAfter: 0, maxWidth: contentMaxWidthLeft });
  const consigneeAddress = `${client.address}\n${client.city}, ${client.country} - ${client.pinCode}`;
  consigneeY = addText(consigneeAddress, leftColumnX, consigneeY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, spacingAfter: 0, maxWidth: contentMaxWidthLeft });

  // --- NOTIFY PARTY (Right of Consignee) ---
  notifyPartyY = addText('NOTIFY PARTY:', rightColumnX, notifyPartyY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', spacingAfter: SPACE_AFTER_SECTION_LABEL });
  if (invoice.notifyPartyLine1 || invoice.notifyPartyLine2) {
    if (invoice.notifyPartyLine1) {
      notifyPartyY = addText(invoice.notifyPartyLine1, rightColumnX, notifyPartyY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, spacingAfter: invoice.notifyPartyLine2 ? 0 : 0, maxWidth: contentMaxWidthRight });
    }
    if (invoice.notifyPartyLine2) {
      notifyPartyY = addText(invoice.notifyPartyLine2, rightColumnX, notifyPartyY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, spacingAfter: 0, maxWidth: contentMaxWidthRight });
    }
  } else { // If no notify party, add some empty lines to balance height if needed
      const currentHeightDiff = consigneeY - notifyPartyY;
      const singleLineHeight = FONT_SIZE_CONTENT_PRIMARY * HEADER_LINE_COMPRESSION_FACTOR;
      if (currentHeightDiff > singleLineHeight) {
         notifyPartyY += singleLineHeight * Math.floor(currentHeightDiff / singleLineHeight); // Add equivalent empty space
      }
  }


  yPos = Math.max(consigneeY, notifyPartyY);
  yPos += SPACE_AFTER_BLOCK_HEADER;
  doc.line(PAGE_MARGIN_SIDES, yPos, pageWidth - PAGE_MARGIN_SIDES, yPos);
  yPos += SPACE_AFTER_HORIZONTAL_LINE;

  // --- SHIPMENT DETAILS (Multiple columns/rows) ---
  const shipmentDetails = [
    { label: "Port of Loading:", value: "MUNDRA" }, // Example, replace with actual data if available
    { label: "Port of Discharge:", value: invoice.finalDestination },
    { label: "Container Size:", value: `${invoice.totalContainer} x ${invoice.containerSize}` },
    { label: "Terms and Conditions of Delivery And Payment:", value: invoice.termsAndConditions, fullWidth: true },
    { label: "Currency:", value: invoice.currencyType },
    { label: "Total Gross Weight:", value: invoice.totalGrossWeight },
  ];

  let shipmentY = yPos;
  const shipmentLabelX = PAGE_MARGIN_SIDES;
  const shipmentValueXMid = pageWidth / 2 + 2;

  // Port of Loading & Port of Discharge
  let tempY1 = addText(shipmentDetails[0].label, shipmentLabelX, shipmentY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', spacingAfter: 0 });
  addText(shipmentDetails[0].value, shipmentLabelX + doc.getTextWidth(shipmentDetails[0].label) + 3, shipmentY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, spacingAfter: 0 });

  let tempY2 = addText(shipmentDetails[1].label, shipmentValueXMid, shipmentY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', spacingAfter: 0 });
  addText(shipmentDetails[1].value, shipmentValueXMid + doc.getTextWidth(shipmentDetails[1].label) + 3, shipmentY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, spacingAfter: 0, maxWidth: contentMaxWidthRight });
  shipmentY = Math.max(tempY1, tempY2);

  // Container Size & Currency
  tempY1 = addText(shipmentDetails[2].label, shipmentLabelX, shipmentY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', spacingAfter: 0 });
  addText(shipmentDetails[2].value, shipmentLabelX + doc.getTextWidth(shipmentDetails[2].label) + 3, shipmentY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, spacingAfter: 0 });

  tempY2 = addText(shipmentDetails[4].label, shipmentValueXMid, shipmentY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', spacingAfter: 0 });
  addText(shipmentDetails[4].value, shipmentValueXMid + doc.getTextWidth(shipmentDetails[4].label) + 3, shipmentY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, spacingAfter: 0 });
  shipmentY = Math.max(tempY1, tempY2);

  // Total Gross Wt & (empty for balance or other field)
  tempY1 = addText(shipmentDetails[5].label, shipmentLabelX, shipmentY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', spacingAfter: 0 });
  addText(shipmentDetails[5].value, shipmentLabelX + doc.getTextWidth(shipmentDetails[5].label) + 3, shipmentY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, spacingAfter: 0 });
  shipmentY = tempY1; // Only one item on this line on left

  // Terms and Conditions (Full Width)
  shipmentY = addText(shipmentDetails[3].label, shipmentLabelX, shipmentY, { fontSize: FONT_SIZE_SECTION_LABEL, fontWeight: 'bold', spacingAfter: 0 });
  shipmentY = addText(shipmentDetails[3].value, shipmentLabelX, shipmentY, { fontSize: FONT_SIZE_CONTENT_PRIMARY, spacingAfter: 0, maxWidth: pageWidth - (2 * PAGE_MARGIN_SIDES) });

  yPos = shipmentY + SPACE_BEFORE_TABLE_CONTENT;


  // --- Product Table ---
  const tableColumnStyles = {
    0: { cellWidth: 25, halign: 'center' }, // S. No.
    1: { cellWidth: 100, halign: 'left' }, // Goods Description
    2: { cellWidth: 45, halign: 'center' }, // HSN Code
    3: { cellWidth: 35, halign: 'right' },  // Qty Boxes (added for image match)
    4: { cellWidth: 40, halign: 'right' },  // Total SQMT
    5: { cellWidth: 45, halign: 'right' },  // Rate
    6: { cellWidth: 55, halign: 'right' },  // Amount
  };
  const tableTotalWidth = Object.values(tableColumnStyles).reduce((sum, col) => sum + col.cellWidth, 0);


  const tableHeader = [['S. No.', 'Goods Description', 'HSN Code', 'Qty Boxes', 'Total SQMT', `Rate/${invoice.currencyType}`, `Amount/${invoice.currencyType}`]];
  let tableBody = invoice.items.map((item, index) => {
    const product = allProducts.find(p => p.id === item.productId);
    const size = allSizes.find(s => s.id === item.sizeId);
    return [
      index + 1,
      `${product?.designName || 'N/A'} (${size?.size || 'N/A'})`,
      size?.hsnCode || 'N/A',
      item.boxes.toString(),
      item.quantitySqmt?.toFixed(2) || '0.00',
      item.ratePerSqmt.toFixed(2),
      item.amount?.toFixed(2) || '0.00',
    ];
  });

  const numberOfItems = invoice.items.length;
  const emptyRowsToAdd = Math.max(0, 5 - numberOfItems); // Add fewer empty rows
  for (let i = 0; i < emptyRowsToAdd; i++) {
    tableBody.push(['', '', '', '', '', '', '']);
  }
  let tableFinalY = yPos;

  autoTable(doc, {
    head: tableHeader,
    body: tableBody,
    startY: yPos,
    theme: 'grid',
    tableWidth: tableTotalWidth, // Explicitly set width
    margin: { left: PAGE_MARGIN_SIDES }, // Ensure table starts at margin
    headStyles: {
      fillColor: [217, 234, 247], textColor: [0,0,0], fontStyle: 'bold',
      fontSize: FONT_SIZE_TABLE_HEAD, cellPadding: tableCellPadding,
      minCellHeight: FONT_SIZE_TABLE_HEAD + 0.1, // Tight
      lineWidth: 0.1, lineColor: [120, 120, 120]
    },
    bodyStyles: {
      fontSize: FONT_SIZE_TABLE_BODY, cellPadding: tableCellPadding,
      minCellHeight: FONT_SIZE_TABLE_BODY + 0.1, // Tight
      lineWidth: 0.1, lineColor: [150, 150, 150]
    },
    columnStyles: tableColumnStyles,
    footStyles: {
      fillColor: [217, 234, 247], textColor: [0,0,0], fontStyle: 'bold',
      fontSize: FONT_SIZE_TABLE_HEAD, cellPadding: tableCellPadding,
      minCellHeight: FONT_SIZE_TABLE_HEAD + 0.1, // Tight
      lineWidth: 0.1, lineColor: [120,120,120],
    },
    showFoot: 'lastPage',
    foot: [
        [{ content: 'SUB TOTAL', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } }, { content: (invoice.subTotal || 0).toFixed(2), styles: { halign: 'right', fontStyle: 'bold'} }],
        [{ content: 'FREIGHT CHARGES', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } }, { content: (invoice.freight || 0).toFixed(2), styles: { halign: 'right', fontStyle: 'bold' } }],
        [{ content: 'OTHER CHARGES', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } }, { content: '0.00', styles: { halign: 'right', fontStyle: 'bold' } }], // Assuming no other charges as per image
        [{ content: 'GRAND TOTAL', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } }, { content: (invoice.grandTotal || 0).toFixed(2), styles: { halign: 'right', fontStyle: 'bold' } }],
    ],
    didDrawPage: (data) => {
        tableFinalY = data.cursor?.y ?? tableFinalY;
    }
  });
  yPos = tableFinalY + SPACE_AFTER_TABLE;

  // --- Total SQM and Amount in Words (Side-by-side with blue backgrounds) ---
  const totalSqmValue = invoice.items.reduce((sum, item) => sum + (item.quantitySqmt || 0), 0).toFixed(2);
  const amountInWordsStr = amountToWords(invoice.grandTotal || 0, invoice.currencyType);

  const totalSQMLabel = "Total SQM";
  const totalSQMBlockWidth = doc.getTextWidth(totalSQMLabel) + doc.getTextWidth(totalSqmValue) + 10; // Approx width
  const amountWordsLabel = "TOTAL INVOICE AMOUNT IN WORDS:";

  // Draw Total SQM block
  doc.setFillColor(217, 234, 247); // Blue background
  doc.rect(PAGE_MARGIN_SIDES, yPos, totalSQMBlockWidth, (FONT_SIZE_FOOTER_PRIMARY + 0.2) + 1 , 'F'); // +1 for a bit of padding
  addText(totalSQMLabel, PAGE_MARGIN_SIDES + 2, yPos + (FONT_SIZE_FOOTER_PRIMARY * 0.8), { // Adjusted y for perceived centering
    fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold', color: [0,0,0], lineHeightFactor: 1.0, yAdvanceFactor:1.0, spacingAfter:0
  });
  addText(totalSqmValue, PAGE_MARGIN_SIDES + 2 + doc.getTextWidth(totalSQMLabel) + 3, yPos + (FONT_SIZE_FOOTER_PRIMARY*0.8), { // Adjusted y for perceived centering
    fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold', color: [0,0,0], lineHeightFactor: 1.0, yAdvanceFactor:1.0, spacingAfter:0
  });

  // Draw Amount in Words block
  const amountWordsBlockX = PAGE_MARGIN_SIDES + totalSQMBlockWidth + 5; // Start after SQM block + small gap
  const amountWordsBlockWidth = pageWidth - amountWordsBlockX - PAGE_MARGIN_SIDES;
  doc.setFillColor(217, 234, 247); // Blue background
  doc.rect(amountWordsBlockX, yPos, amountWordsBlockWidth, (FONT_SIZE_FOOTER_PRIMARY + 0.2) + 1, 'F');
  addText(amountWordsLabel, amountWordsBlockX + 2, yPos + (FONT_SIZE_FOOTER_PRIMARY*0.8), { // Adjusted y
    fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold', color: [0,0,0], lineHeightFactor: 1.0, yAdvanceFactor:1.0, spacingAfter:0
  });

  yPos += (FONT_SIZE_FOOTER_PRIMARY + 0.2) + 1 + SPACE_BETWEEN_FOOTER_BLOCKS + 1; // Advance yPos after the blue boxes

  // Amount in words value below its blue box
  yPos = addText(amountInWordsStr, amountWordsBlockX, yPos, { // Use amountWordsBlockX to align under its label box
    fontSize: FONT_SIZE_FOOTER_SECONDARY, fontWeight: 'bold', lineHeightFactor: 1.0, yAdvanceFactor:1.0,
    spacingAfter: SPACE_BETWEEN_FOOTER_BLOCKS,
    maxWidth: amountWordsBlockWidth // Constrain to its block width
  });


  // --- Note ---
  if (invoice.note) {
    let noteY = yPos; // Separate Y for note if it's long
    noteY = addText('Note:', PAGE_MARGIN_SIDES, noteY, { fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold', lineHeightFactor: 1.0, yAdvanceFactor:1.0, spacingAfter: 0 });
    const noteLines = invoice.note.split('\n');
    noteLines.forEach(line => {
      let isBold = false;
      const keywords = ['TRANSSHIPMENT', 'PARTIAL SHIPMENT', 'SHIPMENT', 'QUANTITY AND VALUE', 'NOT ACCEPTED', 'ANY TRANSACTION'];
      if (keywords.some(kw => line.toUpperCase().startsWith(kw))) {
        isBold = true;
      }
      noteY = addText(line, PAGE_MARGIN_SIDES, noteY, {
        fontSize: FONT_SIZE_FOOTER_SECONDARY, fontWeight: isBold ? 'bold' : 'normal',
        lineHeightFactor: 1.0, yAdvanceFactor:1.0, spacingAfter: 0,
        maxWidth: pageWidth - (2 * PAGE_MARGIN_SIDES)
      });
    });
    yPos = noteY + SPACE_BETWEEN_FOOTER_BLOCKS;
  }

  // --- Beneficiary Bank Details ---
  if (selectedBank) {
    yPos = addText('BENEFICIARY DETAILS:', PAGE_MARGIN_SIDES, yPos, { fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold', lineHeightFactor: 1.0, yAdvanceFactor:1.0, spacingAfter: 0 });
    yPos = addText(`BENEFICIARY NAME: ${selectedBank.bankName.toUpperCase()}`, PAGE_MARGIN_SIDES, yPos, { fontSize: FONT_SIZE_FOOTER_SECONDARY, lineHeightFactor: 1.0, yAdvanceFactor:1.0, spacingAfter: 0, maxWidth: contentMaxWidthLeft });
    yPos = addText(`BENEFICIARY BANK ADDRESS: ${selectedBank.bankAddress.toUpperCase()}`, PAGE_MARGIN_SIDES, yPos, {
        fontSize: FONT_SIZE_FOOTER_SECONDARY, lineHeightFactor: 1.0, yAdvanceFactor:1.0, spacingAfter: 0,
        maxWidth: pageWidth - (2 * PAGE_MARGIN_SIDES)
    });
    yPos = addText(`BENEFICIARY A/C NO: ${selectedBank.accountNumber}, SWIFT CODE: ${selectedBank.swiftCode.toUpperCase()}, IFSC CODE: ${selectedBank.ifscCode.toUpperCase()}`, PAGE_MARGIN_SIDES, yPos, { fontSize: FONT_SIZE_FOOTER_SECONDARY, lineHeightFactor: 1.0, yAdvanceFactor:1.0, spacingAfter: 0, maxWidth: pageWidth - (2*PAGE_MARGIN_SIDES) });
    yPos += SPACE_BETWEEN_FOOTER_BLOCKS;
  }

  // --- Declaration --- (As per image)
  yPos = addText('DECLARATION:', PAGE_MARGIN_SIDES, yPos, { fontSize: FONT_SIZE_FOOTER_PRIMARY, fontWeight: 'bold', lineHeightFactor: 1.0, yAdvanceFactor:1.0, spacingAfter: 0 });
  yPos = addText('CERTIFIED THAT THE PARTICULARS GIVEN ABOVE ARE TRUE AND CORRECT.', PAGE_MARGIN_SIDES, yPos, { fontSize: FONT_SIZE_FOOTER_SECONDARY, fontWeight:'bold', lineHeightFactor: 1.0, yAdvanceFactor:1.0, spacingAfter: SPACE_BETWEEN_FOOTER_BLOCKS, maxWidth: pageWidth - (2*PAGE_MARGIN_SIDES) });


  // --- Signature ---
  const signatureText = `FOR, ${exporter.companyName.toUpperCase()}`;
  const signatureX = pageWidth - PAGE_MARGIN_SIDES - (70 * (72/25.4));
  const signatureLineWidth = 60 * (72/25.4);

  const requiredSpaceForSignature = (FOOTER_LINE_HEIGHT_SINGLE * 2) + SPACE_BEFORE_SIGNATURE + 5 + PAGE_MARGIN_TOP;
  if (yPos + requiredSpaceForSignature > doc.internal.pageSize.getHeight()) {
      doc.addPage();
      yPos = PAGE_MARGIN_TOP;
  }

  yPos += SPACE_BEFORE_SIGNATURE + 3; // Minimal space before signature line

  const signatureTextY = yPos + (FONT_SIZE_FOOTER_SECONDARY + 0.2) + 2; // Position text above the line
  const signatureLineY = signatureTextY + (FONT_SIZE_FOOTER_SECONDARY * 0.85) + 1; // Line below text

  addText(signatureText, signatureX + signatureLineWidth / 2, signatureTextY, {
    fontWeight: 'bold', align: 'center', fontSize: FONT_SIZE_FOOTER_SECONDARY,
    lineHeightFactor: 1.0, yAdvanceFactor:1.0, spacingAfter: 0
  });

  doc.setLineWidth(0.3);
  doc.line(signatureX, signatureLineY, signatureX + signatureLineWidth, signatureLineY);

  addText('AUTHORISED SIGNATURE', signatureX + signatureLineWidth / 2, signatureLineY + 2 + (FONT_SIZE_FOOTER_SECONDARY*0.85), { // Adjusted y for text below line
    align: 'center', fontSize: FONT_SIZE_FOOTER_SECONDARY, fontWeight: 'bold',
    lineHeightFactor: 1.0, yAdvanceFactor:1.0, spacingAfter: 0
  });

  doc.save(`Performa_Invoice_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
}
