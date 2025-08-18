
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { Transporter } from "@/types/transporter";
import { OkPacket } from 'mysql2';

export const dynamic = 'force-dynamic';

// GET handler to fetch all non-deleted transporters
export async function GET() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query<any[]>("SELECT * FROM transporters WHERE isDeleted = FALSE ORDER BY createdAt DESC");
    connection.release();

    const transporters: Transporter[] = rows.map(row => ({
        ...row,
        id: row.id.toString()
    }));

    return NextResponse.json(transporters);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error fetching transporters' }, { status: 500 });
  }
}

// POST handler to create a new transporter
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, gstNumber, contactPerson, contactNumber } = body;

    if (!companyName || !gstNumber || !contactPerson || !contactNumber) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    const connection = await pool.getConnection();
    const [result] = await connection.query<OkPacket>(
      'INSERT INTO transporters (companyName, gstNumber, contactPerson, contactNumber) VALUES (?, ?, ?, ?)',
      [companyName, gstNumber, contactPerson, contactNumber]
    );
    connection.release();

    const newTransporterId = result.insertId;

    const newTransporter: Transporter = {
        id: newTransporterId.toString(),
        companyName,
        gstNumber,
        contactPerson,
        contactNumber,
    };

    return NextResponse.json(newTransporter, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error creating transporter' }, { status: 500 });
  }
}

// PUT handler to update a transporter
export async function PUT(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Transporter ID is required' }, { status: 400 });
    }
    
    try {
        const body: Transporter = await request.json();
        const { companyName, gstNumber, contactPerson, contactNumber } = body;

        const connection = await pool.getConnection();
        await connection.query(
            'UPDATE transporters SET companyName = ?, gstNumber = ?, contactPerson = ?, contactNumber = ? WHERE id = ?',
            [companyName, gstNumber, contactPerson, contactNumber, id]
        );
        connection.release();

        return NextResponse.json({ ...body, id }, { status: 200 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error updating transporter' }, { status: 500 });
    }
}

// DELETE handler to soft-delete a transporter
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Transporter ID is required' }, { status: 400 });
    }

    try {
        const connection = await pool.getConnection();
        await connection.query('UPDATE transporters SET isDeleted = TRUE WHERE id = ?', [id]);
        connection.release();
        return NextResponse.json({ message: 'Transporter marked as deleted' }, { status: 200 });
    } catch (error) {
        console.error("Error deleting transporter:", error);
        return NextResponse.json({ message: 'Error deleting transporter' }, { status: 500 });
    }
}
