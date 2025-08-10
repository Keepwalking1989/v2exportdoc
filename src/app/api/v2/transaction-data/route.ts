
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { Transaction } from "@/types/transaction";
import type { RowDataPacket, OkPacket } from 'mysql2';
import { format } from 'date-fns';

interface TransactionRow extends RowDataPacket, Omit<Transaction, 'relatedInvoices'> {
    relatedInvoices_json: string | null;
}

// GET handler to fetch all non-deleted transactions
export async function GET() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query<TransactionRow[]>(
        "SELECT * FROM transactions WHERE isDeleted = FALSE ORDER BY date DESC"
    );
    connection.release();

    const transactions: Transaction[] = rows.map(row => {
        const { relatedInvoices_json, ...transactionData } = row;
        return {
            ...transactionData,
            id: transactionData.id.toString(),
            date: new Date(transactionData.date),
            relatedInvoices: JSON.parse(relatedInvoices_json || '[]'),
        };
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error fetching transactions' }, { status: 500 });
  }
}

// POST handler to create a new transaction
export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const transaction: Transaction = await request.json();
    const { relatedInvoices, ...transactionData } = transaction;
    
    await connection.beginTransaction();

    const formattedDate = format(new Date(transactionData.date), 'yyyy-MM-dd HH:mm:ss');
    const relatedInvoices_json = JSON.stringify(relatedInvoices || []);

    const [result] = await connection.query<OkPacket>(
      'INSERT INTO transactions SET ?',
      {
        ...transactionData,
        date: formattedDate,
        relatedInvoices_json,
        id: undefined, // Let DB auto-increment
      }
    );

    await connection.commit();
    const newTransactionId = result.insertId;

    return NextResponse.json({ ...transaction, id: newTransactionId.toString() }, { status: 201 });

  } catch (error) {
    await connection.rollback();
    console.error(error);
    return NextResponse.json({ message: 'Error creating transaction' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// PUT handler to update a transaction
export async function PUT(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Transaction ID is required' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
        const transaction: Transaction = await request.json();
        const { relatedInvoices, ...transactionData } = transaction;

        await connection.beginTransaction();

        const formattedDate = format(new Date(transactionData.date), 'yyyy-MM-dd HH:mm:ss');
        const relatedInvoices_json = JSON.stringify(relatedInvoices || []);

        await connection.query<OkPacket>(
            'UPDATE transactions SET ? WHERE id = ?',
            [
                {
                    ...transactionData,
                    date: formattedDate,
                    relatedInvoices_json,
                    id: undefined, // Do not update the ID
                },
                id
            ]
        );
        
        await connection.commit();

        return NextResponse.json({ ...transaction, id }, { status: 200 });

    } catch (error) {
        await connection.rollback();
        console.error(error);
        return NextResponse.json({ message: 'Error updating transaction' }, { status: 500 });
    } finally {
        connection.release();
    }
}

// DELETE handler to soft-delete a transaction
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Transaction ID is required' }, { status: 400 });
    }

    try {
        const connection = await pool.getConnection();
        await connection.query('UPDATE transactions SET isDeleted = TRUE WHERE id = ?', [id]);
        connection.release();
        return NextResponse.json({ message: 'Transaction marked as deleted' }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error deleting transaction' }, { status: 500 });
    }
}
