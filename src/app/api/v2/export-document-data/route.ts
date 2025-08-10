
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { ExportDocument } from '@/types/export-document';
import type { RowDataPacket, OkPacket } from 'mysql2';

interface ExportDocumentRow extends RowDataPacket, Omit<ExportDocument, 'containerItems' | 'manufacturerDetails'> {
    containerItems_json: string | null;
    manufacturerDetails_json: string | null;
}

// GET handler to fetch all non-deleted export documents
export async function GET() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query<ExportDocumentRow[]>(
        "SELECT * FROM export_documents WHERE isDeleted = FALSE ORDER BY createdAt DESC"
    );

    const documents: ExportDocument[] = rows.map(row => {
        const { containerItems_json, manufacturerDetails_json, ...docData } = row;
        return {
            ...docData,
            id: docData.id.toString(),
            containerItems: JSON.parse(containerItems_json || '[]'),
            manufacturerDetails: JSON.parse(manufacturerDetails_json || '[]'),
            exportInvoiceDate: new Date(docData.exportInvoiceDate),
            exchangeDate: new Date(docData.exchangeDate),
            // Ensure dates within nested objects are also parsed if necessary
        };
    });

    connection.release();
    return NextResponse.json(documents);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error fetching export documents' }, { status: 500 });
  }
}

// Note: POST, PUT, DELETE handlers would be needed for full CRUD functionality.
// They would follow a similar pattern to the other -data routes, handling JSON serialization.
