
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { Transporter } from "@/types/transporter";

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
    const [result] = await connection.query<any>(
      'INSERT INTO transporters (companyName, gstNumber, contactPerson, contactNumber) VALUES (?, ?, ?, ?)',
      [companyName, gstNumber, contactPerson, contactNumber]
    );
    connection.release();

    const newTransporterId = result.insertId.toString();

    const newTransporter: Transporter = {
        id: newTransporterId,
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
