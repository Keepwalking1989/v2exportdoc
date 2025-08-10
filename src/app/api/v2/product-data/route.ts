
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { Product } from "@/types/product";
import type { RowDataPacket } from 'mysql2';

// GET handler to fetch all non-deleted products
export async function GET() {
  try {
    const connection = await pool.getConnection();
    // Join with sizes to get size info
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
    
    // Prepare data for bulk insert
    const values = designNames.map((name: string) => [sizeId, name, salesPrice, boxWeight]);
    
    const [result] = await connection.query<any>(
      'INSERT INTO products (sizeId, designName, salesPrice, boxWeight) VALUES ?',
      [values]
    );

    connection.release();
    
    // We can't easily return all new products without another query, 
    // so let's just return a success message with the number of products created.
    return NextResponse.json({ message: `${result.affectedRows} products created successfully.` }, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error creating products' }, { status: 500 });
  }
}
