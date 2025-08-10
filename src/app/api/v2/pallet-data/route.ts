
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { Pallet } from "@/types/pallet";

// GET handler to fetch all non-deleted pallets
export async function GET() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query<any[]>("SELECT * FROM pallets WHERE isDeleted = FALSE ORDER BY createdAt DESC");
    connection.release();

    const pallets: Pallet[] = rows.map(row => ({
        ...row,
        id: row.id.toString()
    }));

    return NextResponse.json(pallets);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error fetching pallets' }, { status: 500 });
  }
}

// POST handler to create a new pallet supplier
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, gstNumber, contactPerson, contactNumber } = body;

    if (!companyName || !gstNumber || !contactPerson || !contactNumber) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    const connection = await pool.getConnection();
    const [result] = await connection.query<any>(
      'INSERT INTO pallets (companyName, gstNumber, contactPerson, contactNumber) VALUES (?, ?, ?, ?)',
      [companyName, gstNumber, contactPerson, contactNumber]
    );
    connection.release();

    const newPalletId = result.insertId.toString();

    const newPallet: Pallet = {
        id: newPalletId,
        companyName,
        gstNumber,
        contactPerson,
        contactNumber,
    };

    return NextResponse.json(newPallet, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error creating pallet supplier' }, { status: 500 });
  }
}

    