
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { PerformaInvoice } from "@/types/performa-invoice";
import type { RowDataPacket, OkPacket } from 'mysql2';
import { format } from 'date-fns';

interface PerformaInvoiceRow extends RowDataPacket, Omit<PerformaInvoice, 'items'> {
    items_json: string;
}

// GET handler to fetch all non-deleted performa invoices
export async function GET() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query<PerformaInvoiceRow[]>(
        "SELECT * FROM performa_invoices WHERE isDeleted = FALSE ORDER BY createdAt DESC"
    );
    connection.release();

    const invoices: PerformaInvoice[] = rows.map(row => {
        const { items_json, ...invoiceData } = row;
        return {
            ...invoiceData,
            id: invoiceData.id.toString(),
            invoiceDate: new Date(invoiceData.invoiceDate),
            items: JSON.parse(items_json || '[]'),
        };
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error fetching performa invoices' }, { status: 500 });
  }
}

// POST handler to create a new performa invoice
export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const invoice: PerformaInvoice = await request.json();
    const { items, ...invoiceData } = invoice;
    
    await connection.beginTransaction();

    const formattedInvoiceDate = format(new Date(invoiceData.invoiceDate), 'yyyy-MM-dd HH:mm:ss');
    const items_json = JSON.stringify(items);

    const [result] = await connection.query<OkPacket>(
      'INSERT INTO performa_invoices SET ?',
      {
        ...invoiceData,
        invoiceDate: formattedInvoiceDate,
        items_json,
        id: undefined, // Let DB auto-increment
      }
    );

    await connection.commit();
    const newInvoiceId = result.insertId;

    return NextResponse.json({ ...invoice, id: newInvoiceId.toString() }, { status: 201 });

  } catch (error) {
    await connection.rollback();
    console.error(error);
    return NextResponse.json({ message: 'Error creating performa invoice' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// PUT handler to update a performa invoice
export async function PUT(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Invoice ID is required' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
        const invoice: PerformaInvoice = await request.json();
        const { items, ...invoiceData } = invoice;

        await connection.beginTransaction();

        const formattedInvoiceDate = format(new Date(invoiceData.invoiceDate), 'yyyy-MM-dd HH:mm:ss');
        const items_json = JSON.stringify(items);

        await connection.query<OkPacket>(
            'UPDATE performa_invoices SET ? WHERE id = ?',
            [
                {
                    ...invoiceData,
                    invoiceDate: formattedInvoiceDate,
                    items_json,
                    id: undefined, // Do not update the ID
                },
                id
            ]
        );
        
        await connection.commit();

        return NextResponse.json({ ...invoice, id }, { status: 200 });

    } catch (error) {
        await connection.rollback();
        console.error(error);
        return NextResponse.json({ message: 'Error updating performa invoice' }, { status: 500 });
    } finally {
        connection.release();
    }
}


// DELETE handler to soft-delete a performa invoice
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Invoice ID is required' }, { status: 400 });
    }

    try {
        const connection = await pool.getConnection();
        await connection.query('UPDATE performa_invoices SET isDeleted = TRUE WHERE id = ?', [id]);
        connection.release();
        return NextResponse.json({ message: 'Performa Invoice marked as deleted' }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error deleting performa invoice' }, { status: 500 });
    }
}
