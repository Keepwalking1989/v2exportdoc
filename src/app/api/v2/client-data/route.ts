
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { Client } from "@/types/client";

// GET handler to fetch all non-deleted clients
export async function GET() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query<any[]>("SELECT * FROM clients WHERE isDeleted = FALSE ORDER BY createdAt DESC");
    connection.release();

    // Convert numeric ID to string to match the Client type
    const clients: Client[] = rows.map(row => ({
        ...row,
        id: row.id.toString()
    }));

    return NextResponse.json(clients);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error fetching clients' }, { status: 500 });
  }
}

// POST handler to create a new client
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, person, contactNumber, address, city, country, pinCode } = body;

    // Basic validation
    if (!companyName || !person || !contactNumber || !address || !city || !country || !pinCode) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    const [result] = await connection.query<any>(
      'INSERT INTO clients (companyName, person, contactNumber, address, city, country, pinCode) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [companyName, person, contactNumber, address, city, country, pinCode]
    );
    connection.release();

    const newClientId = result.insertId.toString();

    const newClient: Client = {
        id: newClientId,
        companyName,
        person,
        contactNumber,
        address,
        city,
        country,
        pinCode,
    };

    return NextResponse.json(newClient, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error creating client' }, { status: 500 });
  }
}
