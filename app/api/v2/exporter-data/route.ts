
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { Company } from "@/types/company";
import { OkPacket } from 'mysql2';

// GET handler to fetch all non-deleted companies
export async function GET() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query<any[]>("SELECT * FROM companies WHERE isDeleted = FALSE ORDER BY createdAt DESC");
    connection.release();

    const exporters: Company[] = rows.map(row => ({
        ...row,
        id: row.id.toString()
    }));

    return NextResponse.json(exporters);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error fetching exporters' }, { status: 500 });
  }
}

// POST handler to create a new company
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, contactPerson, address, phoneNumber, iecNumber, gstNumber } = body;

    if (!companyName || !contactPerson || !address || !phoneNumber || !iecNumber || !gstNumber) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    const connection = await pool.getConnection();
    const [result] = await connection.query<OkPacket>(
      'INSERT INTO companies (companyName, contactPerson, address, phoneNumber, iecNumber, gstNumber) VALUES (?, ?, ?, ?, ?, ?)',
      [companyName, contactPerson, address, phoneNumber, iecNumber, gstNumber]
    );
    connection.release();

    const newCompanyId = result.insertId;

    const newCompany: Company = {
        id: newCompanyId.toString(),
        companyName,
        contactPerson,
        address,
        phoneNumber,
        iecNumber,
        gstNumber,
    };

    return NextResponse.json(newCompany, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error creating exporter' }, { status: 500 });
  }
}

// PUT handler to update a company
export async function PUT(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Company ID is required' }, { status: 400 });
    }
    
    try {
        const body: Company = await request.json();
        const { companyName, contactPerson, address, phoneNumber, iecNumber, gstNumber } = body;

        const connection = await pool.getConnection();
        await connection.query(
            'UPDATE companies SET companyName = ?, contactPerson = ?, address = ?, phoneNumber = ?, iecNumber = ?, gstNumber = ? WHERE id = ?',
            [companyName, contactPerson, address, phoneNumber, iecNumber, gstNumber, id]
        );
        connection.release();

        return NextResponse.json({ ...body, id }, { status: 200 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error updating exporter' }, { status: 500 });
    }
}

// DELETE handler to soft-delete a company
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Company ID is required' }, { status: 400 });
    }

    try {
        const connection = await pool.getConnection();
        await connection.query('UPDATE companies SET isDeleted = TRUE WHERE id = ?', [id]);
        connection.release();
        return NextResponse.json({ message: 'Exporter marked as deleted' }, { status: 200 });
    } catch (error) {
        console.error("Error deleting exporter:", error);
        return NextResponse.json({ message: 'Error deleting exporter' }, { status: 500 });
    }
}
