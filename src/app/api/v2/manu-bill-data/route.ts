
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { ManuBill, ManuBillItem } from "@/types/manu-bill";
import type { RowDataPacket, OkPacket } from 'mysql2';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

// Helper types for DB results
interface ManuBillRow extends RowDataPacket, Omit<ManuBill, 'items'> {
    items_json: string;
}
interface ManuBillItemRow extends RowDataPacket, ManuBillItem {}


// GET handler to fetch all non-deleted manufacturer bills
export async function GET() {
  try {
    const connection = await pool.getConnection();
    const [billRows] = await connection.query<ManuBillRow[]>(
        "SELECT * FROM manu_bills WHERE isDeleted = FALSE ORDER BY createdAt DESC"
    );

    const bills: ManuBill[] = billRows.map(row => {
        const items = JSON.parse(row.items_json || '[]') as ManuBillItem[];
        const { items_json, ...billData } = row;
        return {
            ...billData,
            id: billData.id.toString(),
            items: items
        };
    });

    connection.release();
    return NextResponse.json(bills);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error fetching manufacturer bills' }, { status: 500 });
  }
}

// POST handler to create a new bill
export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const bill: ManuBill = await request.json();
    const { items, ...billData } = bill;
    
    await connection.beginTransaction();

    const formattedInvoiceDate = format(new Date(billData.invoiceDate), 'yyyy-MM-dd HH:mm:ss');
    const formattedAckDate = billData.ackDate ? format(new Date(billData.ackDate), 'yyyy-MM-dd HH:mm:ss') : null;
    
    const items_json = JSON.stringify(items);

    const [result] = await connection.query<OkPacket>(
      'INSERT INTO manu_bills SET ?',
      {
        ...billData,
        invoiceDate: formattedInvoiceDate,
        ackDate: formattedAckDate,
        items_json,
        id: undefined, // remove id from insert data
      }
    );

    await connection.commit();
    connection.release();
    
    const newBillId = result.insertId;

    return NextResponse.json({ ...bill, id: newBillId.toString() }, { status: 201 });

  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error(error);
    return NextResponse.json({ message: 'Error creating manufacturer bill' }, { status: 500 });
  }
}

// PUT handler to update a bill
export async function PUT(request: Request) {
  const connection = await pool.getConnection();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Bill ID is required' }, { status: 400 });
    }

    const bill: ManuBill = await request.json();
    const { items, ...billData } = bill;
    
    await connection.beginTransaction();

    const formattedInvoiceDate = format(new Date(billData.invoiceDate), 'yyyy-MM-dd HH:mm:ss');
    const formattedAckDate = billData.ackDate ? format(new Date(billData.ackDate), 'yyyy-MM-dd HH:mm:ss') : null;
    const items_json = JSON.stringify(items);

    await connection.query<OkPacket>(
      'UPDATE manu_bills SET ? WHERE id = ?',
      [
        {
          ...billData,
          invoiceDate: formattedInvoiceDate,
          ackDate: formattedAckDate,
          items_json,
          id: undefined, // remove id from update data
        },
        id
      ]
    );

    await connection.commit();
    connection.release();
    
    return NextResponse.json({ ...bill, id: id }, { status: 200 });

  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error(error);
    return NextResponse.json({ message: 'Error updating manufacturer bill' }, { status: 500 });
  }
}


// DELETE handler to soft-delete a bill
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Bill ID is required' }, { status: 400 });
    }

    try {
        const connection = await pool.getConnection();
        await connection.query('UPDATE manu_bills SET isDeleted = TRUE WHERE id = ?', [id]);
        connection.release();
        return NextResponse.json({ message: 'Bill marked as deleted' }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error deleting manufacturer bill' }, { status: 500 });
    }
}
