
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { Product } from "@/types/product";
import type { RowDataPacket, OkPacket } from 'mysql2';

// GET handler to fetch all non-deleted products
export async function GET() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query<RowDataPacket[]>(`
      SELECT p.*, s.size as sizeName 
      FROM products p 
      JOIN sizes s ON p.sizeId = s.id 
      WHERE p.isDeleted = FALSE 
      ORDER BY p.createdAt DESC
    `);
    connection.release();

    const products: (Product & { sizeName: string })[] = rows.map(row => ({
      ...row,
      id: row.id.toString(),
      sizeId: row.sizeId.toString(),
    })) as (Product & { sizeName: string })[];

    return NextResponse.json(products);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error fetching products' }, { status: 500 });
  }
}

// POST handler to create new products
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sizeId, designName, salesPrice, boxWeight } = body;

    if (!sizeId || !designName || salesPrice === undefined || boxWeight === undefined) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const designNames = designName.split(',').map((name: string) => name.trim()).filter((name: string) => name);
    if (designNames.length === 0) {
        return NextResponse.json({ message: 'No valid design names provided' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    
    const values = designNames.map((name: string) => [sizeId, name, salesPrice, boxWeight]);
    
    const [result] = await connection.query<OkPacket>(
      'INSERT INTO products (sizeId, designName, salesPrice, boxWeight) VALUES ?',
      [values]
    );

    connection.release();
    
    return NextResponse.json({ message: `${result.affectedRows} products created successfully.` }, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error creating products' }, { status: 500 });
  }
}

// PUT handler to update a product
export async function PUT(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Product ID is required' }, { status: 400 });
    }
    
    try {
        const body: Product = await request.json();
        const { sizeId, designName, salesPrice, boxWeight } = body;

        const connection = await pool.getConnection();
        await connection.query(
            'UPDATE products SET sizeId = ?, designName = ?, salesPrice = ?, boxWeight = ? WHERE id = ?',
            [sizeId, designName, salesPrice, boxWeight, id]
        );
        connection.release();

        return NextResponse.json({ ...body, id }, { status: 200 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error updating product' }, { status: 500 });
    }
}

// DELETE handler to soft-delete a product
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Product ID is required' }, { status: 400 });
    }

    try {
        const connection = await pool.getConnection();
        await connection.query('UPDATE products SET isDeleted = TRUE WHERE id = ?', [id]);
        connection.release();
        return NextResponse.json({ message: 'Product marked as deleted' }, { status: 200 });
    } catch (error) {
        console.error("Error deleting product:", error);
        return NextResponse.json({ message: 'Error deleting product' }, { status: 500 });
    }
}
