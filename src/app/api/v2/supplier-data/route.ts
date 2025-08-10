
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { Supplier } from "@/types/supplier";

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
    const [result] = await connection.query<any>(
      'INSERT INTO suppliers (companyName, gstNumber, contactPerson, contactNumber) VALUES (?, ?, ?, ?)',
      [companyName, gstNumber, contactPerson, contactNumber]
    );
    connection.release();

    const newSupplierId = result.insertId.toString();

    const newSupplier: Supplier = {
        id: newSupplierId,
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
