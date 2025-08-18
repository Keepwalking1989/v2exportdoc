
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { Supplier } from "@/types/supplier";
import { OkPacket } from 'mysql2';

// GET handler to fetch all non-deleted suppliers
export async function GET() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query<any[]>("SELECT * FROM suppliers WHERE isDeleted = FALSE ORDER BY createdAt DESC");
    connection.release();

    const suppliers: Supplier[] = rows.map(row => ({
        ...row,
        id: row.id.toString()
    }));

    return NextResponse.json(suppliers);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error fetching suppliers' }, { status: 500 });
  }
}

// POST handler to create a new supplier
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, gstNumber, contactPerson, contactNumber } = body;

    if (!companyName || !gstNumber || !contactPerson || !contactNumber) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    const connection = await pool.getConnection();
    const [result] = await connection.query<OkPacket>(
      'INSERT INTO suppliers (companyName, gstNumber, contactPerson, contactNumber) VALUES (?, ?, ?, ?)',
      [companyName, gstNumber, contactPerson, contactNumber]
    );
    connection.release();

    const newSupplierId = result.insertId;

    const newSupplier: Supplier = {
        id: newSupplierId.toString(),
        companyName,
        gstNumber,
        contactPerson,
        contactNumber,
    };

    return NextResponse.json(newSupplier, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error creating supplier' }, { status: 500 });
  }
}

// PUT handler to update a supplier
export async function PUT(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Supplier ID is required' }, { status: 400 });
    }
    
    try {
        const body: Supplier = await request.json();
        const { companyName, gstNumber, contactPerson, contactNumber } = body;

        const connection = await pool.getConnection();
        await connection.query(
            'UPDATE suppliers SET companyName = ?, gstNumber = ?, contactPerson = ?, contactNumber = ? WHERE id = ?',
            [companyName, gstNumber, contactPerson, contactNumber, id]
        );
        connection.release();

        return NextResponse.json({ ...body, id }, { status: 200 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error updating supplier' }, { status: 500 });
    }
}

// DELETE handler to soft-delete a supplier
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Supplier ID is required' }, { status: 400 });
    }

    try {
        const connection = await pool.getConnection();
        await connection.query('UPDATE suppliers SET isDeleted = TRUE WHERE id = ?', [id]);
        connection.release();
        return NextResponse.json({ message: 'Supplier marked as deleted' }, { status: 200 });
    } catch (error) {
        console.error("Error deleting supplier:", error);
        return NextResponse.json({ message: 'Error deleting supplier' }, { status: 500 });
    }
}
