
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { Size } from "@/types/size";
import { OkPacket } from 'mysql2';

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
    const [result] = await connection.query<OkPacket>(
      'INSERT INTO sizes (size, sqmPerBox, boxWeight, purchasePrice, salesPrice, hsnCode, palletDetails) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [size, sqmPerBox, boxWeight, purchasePrice, salesPrice, hsnCode, palletDetails]
    );
    connection.release();

    const newSizeId = result.insertId;

    const newSize: Size = {
        id: newSizeId.toString(),
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

// PUT handler to update a size
export async function PUT(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Size ID is required' }, { status: 400 });
    }
    
    try {
        const body: Size = await request.json();
        const { size, sqmPerBox, boxWeight, purchasePrice, salesPrice, hsnCode, palletDetails } = body;

        const connection = await pool.getConnection();
        await connection.query(
            'UPDATE sizes SET size = ?, sqmPerBox = ?, boxWeight = ?, purchasePrice = ?, salesPrice = ?, hsnCode = ?, palletDetails = ? WHERE id = ?',
            [size, sqmPerBox, boxWeight, purchasePrice, salesPrice, hsnCode, palletDetails, id]
        );
        connection.release();

        return NextResponse.json({ ...body, id }, { status: 200 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error updating size' }, { status: 500 });
    }
}

// DELETE handler to soft-delete a size
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Size ID is required' }, { status: 400 });
    }

    try {
        const connection = await pool.getConnection();
        await connection.query('UPDATE sizes SET isDeleted = TRUE WHERE id = ?', [id]);
        connection.release();
        return NextResponse.json({ message: 'Size marked as deleted' }, { status: 200 });
    } catch (error) {
        console.error("Error deleting size:", error);
        return NextResponse.json({ message: 'Error deleting size' }, { status: 500 });
    }
}
