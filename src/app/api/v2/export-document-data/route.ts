
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { ExportDocument } from '@/types/export-document';
import type { RowDataPacket, OkPacket } from 'mysql2';
import { format } from 'date-fns';

interface ExportDocumentRow extends RowDataPacket, Omit<ExportDocument, 'containerItems' | 'manufacturerDetails'> {
    containerItems_json: string | null;
    manufacturerDetails_json: string | null;
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
            exportInvoiceDate: new Date(row.exportInvoiceDate),
            exchangeDate: row.exchangeDate ? new Date(row.exchangeDate) : new Date(), // Provide default for safety
            // Ensure nested dates are parsed safely
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
            const { containerItems_json, manufacturerDetails_json, ...docData } = row;
            return {
                ...docData,
                id: docData.id.toString(),
                purchaseOrderId: docData.purchaseOrderId?.toString(),
                containerItems: JSON.parse(containerItems_json || '[]'),
                manufacturerDetails: JSON.parse(manufacturerDetails_json || '[]'),
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
        const { containerItems, manufacturerDetails, ...docData } = doc;
        
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
            }
        );
        
        await connection.commit();
        const newDocId = result.insertId;

        const savedDoc: ExportDocument = {
            ...doc, 
            id: newDocId.toString(),
            purchaseOrderId: doc.purchaseOrderId?.toString(),
        };

        return NextResponse.json(savedDoc, { status: 201 });

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
        const { containerItems, manufacturerDetails, ...docData } = doc;
        
        await connection.beginTransaction();

        const formattedExportInvoiceDate = format(new Date(docData.exportInvoiceDate), 'yyyy-MM-dd HH:mm:ss');
        const formattedExchangeDate = format(new Date(docData.exchangeDate), 'yyyy-MM-dd HH:mm:ss');
        const ewayBillDate = docData.ewayBillDate ? format(new Date(docData.ewayBillDate), 'yyyy-MM-dd HH:mm:ss') : null;
        const shippingBillDate = docData.shippingBillDate ? format(new Date(docData.shippingBillDate), 'yyyy-MM-dd HH:mm:ss') : null;
        const blDate = docData.blDate ? format(new Date(docData.blDate), 'yyyy-MM-dd HH:mm:ss') : null;

        await connection.query<OkPacket>(
            'UPDATE export_documents SET ? WHERE id = ?',
            [
                {
                    ...docData,
                    id: undefined, // Do not update ID
                    exportInvoiceDate: formattedExportInvoiceDate,
                    exchangeDate: formattedExchangeDate,
                    ewayBillDate,
                    shippingBillDate,
                    blDate,
                    containerItems_json: JSON.stringify(containerItems || []),
                    manufacturerDetails_json: JSON.stringify(manufacturerDetails || []),
                },
                id
            ]
        );
        
        await connection.commit();
        
        const updatedDoc: ExportDocument = { 
            ...doc, 
            id,
            purchaseOrderId: doc.purchaseOrderId?.toString(),
        };

        return NextResponse.json(updatedDoc, { status: 200 });

    } catch (error) {
        await connection.rollback();
        console.error("Error updating export document:", error);
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
