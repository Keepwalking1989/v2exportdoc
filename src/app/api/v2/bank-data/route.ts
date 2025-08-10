
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { Bank } from "@/types/bank";

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
    const [result] = await connection.query<any>(
      'INSERT INTO banks (bankName, bankAddress, accountNumber, swiftCode, ifscCode) VALUES (?, ?, ?, ?, ?)',
      [bankName, bankAddress, accountNumber, swiftCode, ifscCode]
    );
    connection.release();

    const newBankId = result.insertId.toString();

    const newBank: Bank = {
        id: newBankId,
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
