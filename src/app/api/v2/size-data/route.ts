
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { Size } from "@/types/size";

// GET handler to fetch all non-deleted sizes
export async function GET() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query<any[]>("SELECT * FROM sizes WHERE isDeleted = FALSE ORDER BY createdAt DESC");
    connection.release();

    const sizes: Size[] = rows.map(row => ({
        ...row,
        id: row.id.toString()
    }));

    return NextResponse.json(sizes);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error fetching sizes' }, { status: 500 });
  }
}

// POST handler to create a new size
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { size, sqmPerBox, boxWeight, purchasePrice, salesPrice, hsnCode, palletDetails } = body;

    if (!size || !sqmPerBox || !boxWeight || !purchasePrice || !salesPrice || !hsnCode || !palletDetails) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    const connection = await pool.getConnection();
    const [result] = await connection.query<any>(
      'INSERT INTO sizes (size, sqmPerBox, boxWeight, purchasePrice, salesPrice, hsnCode, palletDetails) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [size, sqmPerBox, boxWeight, purchasePrice, salesPrice, hsnCode, palletDetails]
    );
    connection.release();

    const newSizeId = result.insertId.toString();

    const newSize: Size = {
        id: newSizeId,
        size,
        sqmPerBox,
        boxWeight,
        purchasePrice,
        salesPrice,
        hsnCode,
        palletDetails
    };

    return NextResponse.json(newSize, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error creating size' }, { status: 500 });
  }
}
