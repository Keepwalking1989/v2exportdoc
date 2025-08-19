
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { TransBill, TransBillItem } from "@/types/trans-bill";
import type { RowDataPacket, OkPacket } from 'mysql2';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

// Helper types for DB results
interface TransBillRow extends RowDataPacket, Omit<TransBill, 'items'> {
    items_json: string;
}

// GET handler to fetch all non-deleted transporter bills
export async function GET() {
  try {
    const connection = await pool.getConnection();
    const [billRows] = await connection.query<TransBillRow[]>(
        "SELECT * FROM trans_bills WHERE isDeleted = FALSE ORDER BY createdAt DESC"
    );

    const bills: TransBill[] = billRows.map(row => {
        const items = JSON.parse(row.items_json || '[]') as TransBillItem[];
        const { items_json, ...billData } = row;
        return {
            ...billData,
            id: billData.id.toString(),
            items: items,
            exportDocumentId: String(billData.exportDocumentId),
            transporterId: String(billData.transporterId),
            invoiceDate: new Date(billData.invoiceDate),
        };
    });

    connection.release();
    return NextResponse.json(bills);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error fetching transporter bills' }, { status: 500 });
  }
}

// POST handler to create a new bill
export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const bill: TransBill = await request.json();
    const { items, ...billData } = bill;
    
    await connection.beginTransaction();

    const formattedInvoiceDate = format(new Date(billData.invoiceDate), 'yyyy-MM-dd HH:mm:ss');
    const items_json = JSON.stringify(items);

    const [result] = await connection.query<OkPacket>(
      'INSERT INTO trans_bills SET ?',
      {
        ...billData,
        invoiceDate: formattedInvoiceDate,
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
    return NextResponse.json({ message: 'Error creating transporter bill' }, { status: 500 });
  }
}

// PUT handler to update a bill
export async function PUT(request: Request) {
  const connection = await pool.getConnection();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        connection.release();
        return NextResponse.json({ message: 'Bill ID is required' }, { status: 400 });
    }

    const bill: TransBill = await request.json();
    
    await connection.beginTransaction();

    // Create a clean object with only the fields that exist in the database table
    const updateData = {
        exportDocumentId: bill.exportDocumentId,
        transporterId: bill.transporterId,
        invoiceNumber: bill.invoiceNumber,
        invoiceDate: format(new Date(bill.invoiceDate), 'yyyy-MM-dd HH:mm:ss'),
        shippingLine: bill.shippingLine,
        portOfLoading: bill.portOfLoading,
        portOfDischarge: bill.portOfDischarge,
        items_json: JSON.stringify(bill.items || []),
        remarks: bill.remarks,
        subTotal: bill.subTotal,
        cgstRate: bill.cgstRate,
        cgstAmount: bill.cgstAmount,
        sgstRate: bill.sgstRate,
        sgstAmount: bill.sgstAmount,
        totalTax: bill.totalTax,
        totalAfterTax: bill.totalAfterTax,
        roundOff: bill.roundOff,
        totalPayable: bill.totalPayable,
        billDocumentUri: bill.billDocumentUri,
        lrDocumentUri: bill.lrDocumentUri,
    };

    await connection.query<OkPacket>(
      'UPDATE trans_bills SET ? WHERE id = ?',
      [updateData, id]
    );

    await connection.commit();
    connection.release();
    
    // Return the original complete bill object from the request, as the frontend expects it
    return NextResponse.json({ ...bill, id: id }, { status: 200 });

  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error(error);
    return NextResponse.json({ message: 'Error updating transporter bill' }, { status: 500 });
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
        await connection.query('UPDATE trans_bills SET isDeleted = TRUE WHERE id = ?', [id]);
        connection.release();
        return NextResponse.json({ message: 'Bill marked as deleted' }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error deleting transporter bill' }, { status: 500 });
    }
}
