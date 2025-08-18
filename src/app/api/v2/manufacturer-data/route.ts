
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { Manufacturer } from "@/types/manufacturer";
import { format } from 'date-fns';
import { OkPacket } from 'mysql2';

export const dynamic = 'force-dynamic';

// GET handler to fetch all non-deleted manufacturers
export async function GET() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query<any[]>("SELECT * FROM manufacturers WHERE isDeleted = FALSE ORDER BY createdAt DESC");
    connection.release();

    const manufacturers: Manufacturer[] = rows.map(row => ({
        ...row,
        id: row.id.toString(),
        stuffingPermissionDate: new Date(row.stuffingPermissionDate),
    }));

    return NextResponse.json(manufacturers);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error fetching manufacturers' }, { status: 500 });
  }
}

// POST handler to create a new manufacturer
export async function POST(request: Request) {
  try {
    const body: Manufacturer = await request.json();
    const { companyName, contactPerson, address, gstNumber, stuffingPermissionNumber, stuffingPermissionDate, pinCode } = body;

    if (!companyName || !contactPerson || !address || !gstNumber || !stuffingPermissionNumber || !stuffingPermissionDate || !pinCode) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    const formattedDate = format(new Date(stuffingPermissionDate), 'yyyy-MM-dd');

    const connection = await pool.getConnection();
    const [result] = await connection.query<OkPacket>(
      'INSERT INTO manufacturers (companyName, contactPerson, address, gstNumber, stuffingPermissionNumber, stuffingPermissionDate, pinCode) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [companyName, contactPerson, address, gstNumber, stuffingPermissionNumber, formattedDate, pinCode]
    );
    connection.release();

    const newManufacturerId = result.insertId;

    const newManufacturer: Manufacturer = {
        ...body,
        id: newManufacturerId.toString(),
        stuffingPermissionDate: new Date(stuffingPermissionDate),
    };

    return NextResponse.json(newManufacturer, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error creating manufacturer' }, { status: 500 });
  }
}

// PUT handler to update a manufacturer
export async function PUT(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Manufacturer ID is required' }, { status: 400 });
    }
    
    try {
        const body: Manufacturer = await request.json();
        const { companyName, contactPerson, address, gstNumber, stuffingPermissionNumber, stuffingPermissionDate, pinCode } = body;

        const formattedDate = format(new Date(stuffingPermissionDate), 'yyyy-MM-dd');

        const connection = await pool.getConnection();
        await connection.query(
            'UPDATE manufacturers SET companyName = ?, contactPerson = ?, address = ?, gstNumber = ?, stuffingPermissionNumber = ?, stuffingPermissionDate = ?, pinCode = ? WHERE id = ?',
            [companyName, contactPerson, address, gstNumber, stuffingPermissionNumber, formattedDate, pinCode, id]
        );
        connection.release();

        return NextResponse.json({ ...body, id }, { status: 200 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error updating manufacturer' }, { status: 500 });
    }
}

// DELETE handler to soft-delete a manufacturer
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Manufacturer ID is required' }, { status: 400 });
    }

    try {
        const connection = await pool.getConnection();
        await connection.query('UPDATE manufacturers SET isDeleted = TRUE WHERE id = ?', [id]);
        connection.release();
        return NextResponse.json({ message: 'Manufacturer marked as deleted' }, { status: 200 });
    } catch (error) {
        console.error("Error deleting manufacturer:", error);
        return NextResponse.json({ message: 'Error deleting manufacturer' }, { status: 500 });
    }
}
