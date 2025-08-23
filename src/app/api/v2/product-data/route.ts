
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { Product } from "@/types/product";
import type { RowDataPacket, OkPacket } from 'mysql2';

export const dynamic = 'force-dynamic';

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
    const { sizeId, salesPrice, boxWeight, productsToCreate } = body;

    if (!sizeId || !productsToCreate || !Array.isArray(productsToCreate) || productsToCreate.length === 0) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    
    const values = productsToCreate.map((product: { designName: string, imageUrl?: string }) => 
      [sizeId, product.designName, salesPrice, boxWeight, product.imageUrl || null]
    );
    
    const [result] = await connection.query<OkPacket>(
      'INSERT INTO products (sizeId, designName, salesPrice, boxWeight, imageUrl) VALUES ?',
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
        const { sizeId, designName, salesPrice, boxWeight, imageUrl } = body;

        const connection = await pool.getConnection();
        await connection.query(
            'UPDATE products SET sizeId = ?, designName = ?, salesPrice = ?, boxWeight = ?, imageUrl = ? WHERE id = ?',
            [sizeId, designName, salesPrice, boxWeight, imageUrl || null, id]
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
