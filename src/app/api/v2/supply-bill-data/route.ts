
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { SupplyBill, SupplyBillItem } from "@/types/supply-bill";
import type { RowDataPacket, OkPacket } from 'mysql2';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

// Helper types for DB results
interface SupplyBillRow extends RowDataPacket, Omit<SupplyBill, 'items'> {
    items_json: string;
}

// GET handler to fetch all non-deleted supply bills
export async function GET() {
  try {
    const connection = await pool.getConnection();
    const [billRows] = await connection.query<SupplyBillRow[]>(
        "SELECT * FROM supply_bills WHERE isDeleted = FALSE ORDER BY createdAt DESC"
    );

    const bills: SupplyBill[] = billRows.map(row => {
        const items = JSON.parse(row.items_json || '[]') as SupplyBillItem[];
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
    return NextResponse.json({ message: 'Error fetching supply bills' }, { status: 500 });
  }
}

// POST handler to create a new bill
export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const bill: SupplyBill = await request.json();
    const { items, ...billData } = bill;
    
    await connection.beginTransaction();

    const formattedInvoiceDate = format(new Date(billData.invoiceDate), 'yyyy-MM-dd HH:mm:ss');
    const formattedAckDate = billData.ackDate ? format(new Date(billData.ackDate), 'yyyy-MM-dd HH:mm:ss') : null;
    
    const items_json = JSON.stringify(items);

    const [result] = await connection.query<OkPacket>(
      'INSERT INTO supply_bills SET ?',
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
    return NextResponse.json({ message: 'Error creating supply bill' }, { status: 500 });
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

    const bill: SupplyBill = await request.json();
    const { items, ...billData } = bill;
    
    await connection.beginTransaction();

    const formattedInvoiceDate = format(new Date(billData.invoiceDate), 'yyyy-MM-dd HH:mm:ss');
    const formattedAckDate = billData.ackDate ? format(new Date(billData.ackDate), 'yyyy-MM-dd HH:mm:ss') : null;
    const items_json = JSON.stringify(items);

    await connection.query<OkPacket>(
      'UPDATE supply_bills SET ? WHERE id = ?',
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
    return NextResponse.json({ message: 'Error updating supply bill' }, { status: 500 });
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
        await connection.query('UPDATE supply_bills SET isDeleted = TRUE WHERE id = ?', [id]);
        connection.release();
        return NextResponse.json({ message: 'Bill marked as deleted' }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error deleting supply bill' }, { status: 500 });
    }
}
