
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { ExportDocument } from '@/types/export-document';
import type { RowDataPacket, OkPacket } from 'mysql2';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

interface ExportDocumentRow extends RowDataPacket, Omit<ExportDocument, 'containerItems' | 'manufacturerDetails' | 'qcPhotos' | 'samplePhotos'> {
    containerItems_json: string | null;
    manufacturerDetails_json: string | null;
    // NOTE FOR DEVELOPER: The `qcPhotos_json` and `samplePhotos_json` columns should be MEDIUMTEXT to handle many image URLs.
    // Example SQL: ALTER TABLE export_documents MODIFY qcPhotos_json MEDIUMTEXT;
    // Example SQL: ALTER TABLE export_documents MODIFY samplePhotos_json MEDIUMTEXT;
    qcPhotos_json: string | null;
    samplePhotos_json: string | null;
}

// GET handler to fetch all non-deleted export documents, or a single one by ID
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    const connection = await pool.getConnection();

    if (id) {
        // Fetch a single document
        const [rows] = await connection.query<ExportDocumentRow[]>(
            "SELECT * FROM export_documents WHERE id = ? AND isDeleted = FALSE",
            [id]
        );
        connection.release();
        if (rows.length === 0) {
            return NextResponse.json({ message: 'Document not found' }, { status: 404 });
        }
        const row = rows[0];
        const document: ExportDocument = {
            ...row,
            id: row.id.toString(),
            purchaseOrderId: row.purchaseOrderId?.toString(),
            containerItems: JSON.parse(row.containerItems_json || '[]'),
            manufacturerDetails: JSON.parse(row.manufacturerDetails_json || '[]'),
            qcPhotos: JSON.parse(row.qcPhotos_json || '[]'),
            samplePhotos: JSON.parse(row.samplePhotos_json || '[]'),
            exportInvoiceDate: new Date(row.exportInvoiceDate),
            exchangeDate: new Date(row.exchangeDate),
            // Ensure nested dates are parsed
            ewayBillDate: row.ewayBillDate ? new Date(row.ewayBillDate) : undefined,
            shippingBillDate: row.shippingBillDate ? new Date(row.shippingBillDate) : undefined,
            blDate: row.blDate ? new Date(row.blDate) : undefined,
        };
        return NextResponse.json(document);
    } else {
        // Fetch all documents
        const [rows] = await connection.query<ExportDocumentRow[]>(
            "SELECT * FROM export_documents WHERE isDeleted = FALSE ORDER BY createdAt DESC"
        );
        connection.release();
        const documents: ExportDocument[] = rows.map(row => {
            const { containerItems_json, manufacturerDetails_json, qcPhotos_json, samplePhotos_json, ...docData } = row;
            return {
                ...docData,
                id: docData.id.toString(),
                purchaseOrderId: docData.purchaseOrderId?.toString(),
                containerItems: JSON.parse(containerItems_json || '[]'),
                manufacturerDetails: JSON.parse(manufacturerDetails_json || '[]'),
                qcPhotos: JSON.parse(qcPhotos_json || '[]'),
                samplePhotos: JSON.parse(samplePhotos_json || '[]'),
                exportInvoiceDate: new Date(docData.exportInvoiceDate),
                exchangeDate: new Date(docData.exchangeDate),
                ewayBillDate: docData.ewayBillDate ? new Date(docData.ewayBillDate) : undefined,
                shippingBillDate: docData.shippingBillDate ? new Date(docData.shippingBillDate) : undefined,
                blDate: docData.blDate ? new Date(docData.blDate) : undefined,
            };
        });
        return NextResponse.json(documents);
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error fetching export documents' }, { status: 500 });
  }
}

// POST handler to create a new export document
export async function POST(request: Request) {
    const connection = await pool.getConnection();
    try {
        const doc: ExportDocument = await request.json();
        const { containerItems, manufacturerDetails, qcPhotos, samplePhotos, ...docData } = doc;
        
        await connection.beginTransaction();

        const formattedExportInvoiceDate = format(new Date(docData.exportInvoiceDate), 'yyyy-MM-dd HH:mm:ss');
        const formattedExchangeDate = format(new Date(docData.exchangeDate), 'yyyy-MM-dd HH:mm:ss');
        
        // Handle optional dates
        const ewayBillDate = docData.ewayBillDate ? format(new Date(docData.ewayBillDate), 'yyyy-MM-dd HH:mm:ss') : null;
        const shippingBillDate = docData.shippingBillDate ? format(new Date(docData.shippingBillDate), 'yyyy-MM-dd HH:mm:ss') : null;
        const blDate = docData.blDate ? format(new Date(docData.blDate), 'yyyy-MM-dd HH:mm:ss') : null;

        const [result] = await connection.query<OkPacket>(
            'INSERT INTO export_documents SET ?',
            {
                ...docData,
                id: undefined, // Let DB handle it
                exportInvoiceDate: formattedExportInvoiceDate,
                exchangeDate: formattedExchangeDate,
                ewayBillDate,
                shippingBillDate,
                blDate,
                containerItems_json: JSON.stringify(containerItems || []),
                manufacturerDetails_json: JSON.stringify(manufacturerDetails || []),
                qcPhotos_json: JSON.stringify(qcPhotos || []),
                samplePhotos_json: JSON.stringify(samplePhotos || []),
            }
        );
        
        await connection.commit();
        const newDocId = result.insertId;

        return NextResponse.json({ ...doc, id: newDocId.toString() }, { status: 201 });

    } catch (error) {
        await connection.rollback();
        console.error("Error creating export document:", error);
        return NextResponse.json({ message: 'Error creating export document' }, { status: 500 });
    } finally {
        connection.release();
    }
}

// PUT handler to update an export document
export async function PUT(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Document ID is required' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
        const doc: ExportDocument = await request.json();
        
        await connection.beginTransaction();

        // Create a clean object with only the fields that exist in the database table
        const updateData = {
            exporterId: doc.exporterId,
            purchaseOrderId: doc.purchaseOrderId,
            exportInvoiceNumber: doc.exportInvoiceNumber,
            exportInvoiceDate: format(new Date(doc.exportInvoiceDate), 'yyyy-MM-dd HH:mm:ss'),
            manufacturerDetails_json: JSON.stringify(doc.manufacturerDetails || []),
            countryOfFinalDestination: doc.countryOfFinalDestination,
            vesselFlightNo: doc.vesselFlightNo,
            portOfLoading: doc.portOfLoading,
            portOfDischarge: doc.portOfDischarge,
            finalDestination: doc.finalDestination,
            termsOfDeliveryAndPayment: doc.termsOfDeliveryAndPayment,
            conversationRate: doc.conversationRate,
            exchangeNotification: doc.exchangeNotification,
            exchangeDate: doc.exchangeDate ? format(new Date(doc.exchangeDate), 'yyyy-MM-dd HH:mm:ss') : new Date(),
            transporterId: doc.transporterId,
            freight: doc.freight,
            gst: doc.gst,
            discount: doc.discount,
            containerItems_json: JSON.stringify(doc.containerItems || []),
            ewayBillNumber: doc.ewayBillNumber,
            ewayBillDate: doc.ewayBillDate ? format(new Date(doc.ewayBillDate), 'yyyy-MM-dd HH:mm:ss') : null,
            ewayBillDocument: doc.ewayBillDocument,
            shippingBillNumber: doc.shippingBillNumber,
            shippingBillDate: doc.shippingBillDate ? format(new Date(doc.shippingBillDate), 'yyyy-MM-dd HH:mm:ss') : null,
            shippingBillDocument: doc.shippingBillDocument,
            blNumber: doc.blNumber,
            blDate: doc.blDate ? format(new Date(doc.blDate), 'yyyy-MM-dd HH:mm:ss') : null,
            blDocument: doc.blDocument,
            brcDocument: doc.brcDocument,
            qcPhotos_json: JSON.stringify(doc.qcPhotos || []),
            samplePhotos_json: JSON.stringify(doc.samplePhotos || []),
        };

        await connection.query<OkPacket>(
            'UPDATE export_documents SET ? WHERE id = ?',
            [updateData, id]
        );
        
        await connection.commit();

        return NextResponse.json({ ...doc, id }, { status: 200 });

    } catch (error: any) {
        await connection.rollback();
        console.error("Error updating export document:", error);
        // More specific error for large payload
        if (error.code === 'ER_DATA_TOO_LONG') {
             return NextResponse.json({ message: 'The list of photos is too large to save. The database column may need to be changed to MEDIUMTEXT.' }, { status: 500 });
        }
        return NextResponse.json({ message: 'Error updating export document' }, { status: 500 });
    } finally {
        connection.release();
    }
}

// DELETE handler to soft-delete an export document
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Document ID is required' }, { status: 400 });
    }

    try {
        const connection = await pool.getConnection();
        await connection.query('UPDATE export_documents SET isDeleted = TRUE WHERE id = ?', [id]);
        connection.release();
        return NextResponse.json({ message: 'Document marked as deleted' }, { status: 200 });
    } catch (error) {
        console.error("Error deleting export document:", error);
        return NextResponse.json({ message: 'Error deleting export document' }, { status: 500 });
    }
}
