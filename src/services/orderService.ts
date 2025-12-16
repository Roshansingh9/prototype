// src/services/orderService.ts
import { db, type Order } from '../db/db';

export const orderService = {
  // ... (keep getActiveTables as is) ...
  getActiveTables: async () => {
    const activeOrders = await db.orders
      .where('status')
      .noneOf(['paid', 'cancelled'])
      .toArray();
    return activeOrders.map(o => o.tableNumber);
  },

  // 1. Create a fresh order
  createOrder: async (tableNumber: string) => {
    // Double check: Is table really free?
    const existing = await db.orders
      .where({ tableNumber, status: 'order' })
      .first();
      
    if (existing) throw new Error(`Table ${tableNumber} is already occupied!`);

    const newOrder: Order = {
      id: crypto.randomUUID(),
      tableNumber,
      status: 'order',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalAmount: 0,
      paymentCash: 0,
      paymentOnline: 0,
      exportedToExcel: false
    };

    await db.orders.add(newOrder);
    return newOrder;
  },

  // 2. Get active order for a table
  getOrderByTable: async (tableNumber: string) => {
    return await db.orders
      .where({ tableNumber })
      .filter(o => o.status !== 'paid' && o.status !== 'cancelled')
      .first();
  }
};