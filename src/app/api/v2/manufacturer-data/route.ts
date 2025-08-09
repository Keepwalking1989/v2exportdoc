
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { Manufacturer } from "@/types/manufacturer";
import { format } from 'date-fns';

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
    const body = await request.json();
    const { companyName, contactPerson, address, gstNumber, stuffingPermissionNumber, stuffingPermissionDate, pinCode } = body;

    if (!companyName || !contactPerson || !address || !gstNumber || !stuffingPermissionNumber || !stuffingPermissionDate || !pinCode) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    // Format date for MySQL (YYYY-MM-DD)
    const formattedDate = format(new Date(stuffingPermissionDate), 'yyyy-MM-dd');

    const connection = await pool.getConnection();
    const [result] = await connection.query<any>(
      'INSERT INTO manufacturers (companyName, contactPerson, address, gstNumber, stuffingPermissionNumber, stuffingPermissionDate, pinCode) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [companyName, contactPerson, address, gstNumber, stuffingPermissionNumber, formattedDate, pinCode]
    );
    connection.release();

    const newManufacturerId = result.insertId.toString();

    const newManufacturer: Manufacturer = {
        id: newManufacturerId,
        companyName,
        contactPerson,
        address,
        gstNumber,
        stuffingPermissionNumber,
        stuffingPermissionDate: new Date(stuffingPermissionDate),
        pinCode,
    };

    return NextResponse.json(newManufacturer, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error creating manufacturer' }, { status: 500 });
  }
}
