
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { Bank } from "@/types/bank";
import { OkPacket } from 'mysql2';

// GET handler to fetch all non-deleted banks
export async function GET() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query<any[]>("SELECT * FROM banks WHERE isDeleted = FALSE ORDER BY createdAt DESC");
    connection.release();

    const banks: Bank[] = rows.map(row => ({
        ...row,
        id: row.id.toString()
    }));

    return NextResponse.json(banks);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error fetching banks' }, { status: 500 });
  }
}

// POST handler to create a new bank
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bankName, bankAddress, accountNumber, swiftCode, ifscCode } = body;

    if (!bankName || !bankAddress || !accountNumber || !swiftCode || !ifscCode) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    const connection = await pool.getConnection();
    const [result] = await connection.query<OkPacket>(
      'INSERT INTO banks (bankName, bankAddress, accountNumber, swiftCode, ifscCode) VALUES (?, ?, ?, ?, ?)',
      [bankName, bankAddress, accountNumber, swiftCode, ifscCode]
    );
    connection.release();

    const newBankId = result.insertId;

    const newBank: Bank = {
        id: newBankId.toString(),
        bankName,
        bankAddress,
        accountNumber,
        swiftCode,
        ifscCode
    };

    return NextResponse.json(newBank, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error creating bank' }, { status: 500 });
  }
}

// PUT handler to update a bank
export async function PUT(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Bank ID is required' }, { status: 400 });
    }
    
    try {
        const body: Bank = await request.json();
        const { bankName, bankAddress, accountNumber, swiftCode, ifscCode } = body;

        const connection = await pool.getConnection();
        await connection.query(
            'UPDATE banks SET bankName = ?, bankAddress = ?, accountNumber = ?, swiftCode = ?, ifscCode = ? WHERE id = ?',
            [bankName, bankAddress, accountNumber, swiftCode, ifscCode, id]
        );
        connection.release();

        return NextResponse.json({ ...body, id }, { status: 200 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error updating bank' }, { status: 500 });
    }
}

// DELETE handler to soft-delete a bank
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Bank ID is required' }, { status: 400 });
    }

    try {
        const connection = await pool.getConnection();
        await connection.query('UPDATE banks SET isDeleted = TRUE WHERE id = ?', [id]);
        connection.release();
        return NextResponse.json({ message: 'Bank marked as deleted' }, { status: 200 });
    } catch (error) {
        console.error("Error deleting bank:", error);
        return NextResponse.json({ message: 'Error deleting bank' }, { status: 500 });
    }
}
