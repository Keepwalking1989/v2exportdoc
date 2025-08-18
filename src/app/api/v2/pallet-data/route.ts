
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { Pallet } from "@/types/pallet";
import { OkPacket } from 'mysql2';

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
    const [result] = await connection.query<OkPacket>(
      'INSERT INTO pallets (companyName, gstNumber, contactPerson, contactNumber) VALUES (?, ?, ?, ?)',
      [companyName, gstNumber, contactPerson, contactNumber]
    );
    connection.release();

    const newPalletId = result.insertId;

    const newPallet: Pallet = {
        id: newPalletId.toString(),
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

// PUT handler to update a pallet supplier
export async function PUT(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Pallet ID is required' }, { status: 400 });
    }
    
    try {
        const body: Pallet = await request.json();
        const { companyName, gstNumber, contactPerson, contactNumber } = body;

        const connection = await pool.getConnection();
        await connection.query(
            'UPDATE pallets SET companyName = ?, gstNumber = ?, contactPerson = ?, contactNumber = ? WHERE id = ?',
            [companyName, gstNumber, contactPerson, contactNumber, id]
        );
        connection.release();

        return NextResponse.json({ ...body, id }, { status: 200 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error updating pallet supplier' }, { status: 500 });
    }
}

// DELETE handler to soft-delete a pallet supplier
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Pallet ID is required' }, { status: 400 });
    }

    try {
        const connection = await pool.getConnection();
        await connection.query('UPDATE pallets SET isDeleted = TRUE WHERE id = ?', [id]);
        connection.release();
        return NextResponse.json({ message: 'Pallet supplier marked as deleted' }, { status: 200 });
    } catch (error) {
        console.error("Error deleting pallet supplier:", error);
        return NextResponse.json({ message: 'Error deleting pallet supplier' }, { status: 500 });
    }
}
