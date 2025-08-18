
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { PurchaseOrder } from "@/types/purchase-order";
import type { RowDataPacket, OkPacket } from 'mysql2';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

interface PurchaseOrderRow extends RowDataPacket, Omit<PurchaseOrder, 'items'> {
    items_json: string;
}

// GET handler to fetch all non-deleted purchase orders
export async function GET() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query<PurchaseOrderRow[]>(
        "SELECT * FROM purchase_orders WHERE isDeleted = FALSE ORDER BY createdAt DESC"
    );
    connection.release();

    const orders: PurchaseOrder[] = rows.map(row => {
        const { items_json, ...orderData } = row;
        return {
            ...orderData,
            id: orderData.id.toString(),
            poDate: new Date(orderData.poDate),
            items: JSON.parse(items_json || '[]'),
            termsAndConditions: orderData.termsAndConditions || '',
        };
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error fetching purchase orders' }, { status: 500 });
  }
}

// POST handler to create a new purchase order
export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const order: PurchaseOrder = await request.json();
    const { items, ...orderData } = order;
    
    await connection.beginTransaction();

    const formattedPoDate = format(new Date(orderData.poDate), 'yyyy-MM-dd HH:mm:ss');
    const items_json = JSON.stringify(items);
    const termsAndConditions = order.termsAndConditions || '';

    const [result] = await connection.query<OkPacket>(
      'INSERT INTO purchase_orders SET ?',
      {
        ...orderData,
        poDate: formattedPoDate,
        items_json,
        termsAndConditions,
        id: undefined, // Let DB auto-increment
      }
    );

    await connection.commit();
    const newOrderId = result.insertId;

    return NextResponse.json({ ...order, id: newOrderId.toString() }, { status: 201 });

  } catch (error) {
    await connection.rollback();
    console.error(error);
    return NextResponse.json({ message: 'Error creating purchase order' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// PUT handler to update a purchase order
export async function PUT(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Purchase Order ID is required' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
        const order: PurchaseOrder = await request.json();
        const { items, ...orderData } = order;

        await connection.beginTransaction();

        const formattedPoDate = format(new Date(orderData.poDate), 'yyyy-MM-dd HH:mm:ss');
        const items_json = JSON.stringify(items);
        const termsAndConditions = order.termsAndConditions || '';

        await connection.query<OkPacket>(
            'UPDATE purchase_orders SET ? WHERE id = ?',
            [
                {
                    ...orderData,
                    poDate: formattedPoDate,
                    items_json,
                    termsAndConditions,
                    id: undefined, // Do not update the ID
                },
                id
            ]
        );
        
        await connection.commit();

        return NextResponse.json({ ...order, id }, { status: 200 });

    } catch (error) {
        await connection.rollback();
        console.error(error);
        return NextResponse.json({ message: 'Error updating purchase order' }, { status: 500 });
    } finally {
        connection.release();
    }
}


// DELETE handler to soft-delete a purchase order
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Purchase Order ID is required' }, { status: 400 });
    }

    try {
        const connection = await pool.getConnection();
        await connection.query('UPDATE purchase_orders SET isDeleted = TRUE WHERE id = ?', [id]);
        connection.release();
        return NextResponse.json({ message: 'Purchase Order marked as deleted' }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error deleting purchase order' }, { status: 500 });
    }
}
