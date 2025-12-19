// src/services/orderService.ts
import { db, type Order } from '../db/db';

export const orderService = {
  getActiveTables: async () => {
    const activeOrders = await db.orders.where('status').noneOf(['paid', 'cancelled']).toArray();
    return activeOrders.map(o => o.tableNumber);
  },
  
  getOrderByTable: async (tableNumber: string) => {
    return await db.orders.where({ tableNumber }).filter(o => o.status !== 'paid' && o.status !== 'cancelled').first();
  },
  
  getOrderById: async (id: string) => {
    return await db.orders.get(id);
  },
  
  // UPDATED: Support custom customer name
  createOrder: async (tableNumber: string, customerName?: string): Promise<Order> => {
    const existing = await db.orders.where({ tableNumber }).filter(o => o.status !== 'paid' && o.status !== 'cancelled').first();
    if (existing) return existing;
    
    const newOrder: Order = { 
      id: crypto.randomUUID(), 
      tableNumber, 
      customerName: customerName || (tableNumber.toLowerCase().includes('walk') ? 'Walk-in' : undefined),
      tableHistory: [tableNumber], // Initialize history
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
  
  deleteOrder: async (orderId: string) => {
    await db.transaction('rw', db.orders, db.orderItems, async () => {
      await db.orderItems.where({ orderId }).delete();
      await db.orders.delete(orderId);
    });
  },

  // FIXED: Track table history correctly - source → destination
  updateTableNumber: async (currentOrderId: string, newTableNumber: string) => {
    const currentOrder = await db.orders.get(currentOrderId);
    if (!currentOrder) throw new Error("Current order not found");

    const targetOrder = await db.orders.where({ tableNumber: newTableNumber })
      .filter(o => o.status !== 'paid' && o.status !== 'cancelled' && o.id !== currentOrderId)
      .first();

    if (targetOrder) {
      // MERGE SCENARIO: currentOrder moves INTO targetOrder
      // Result: targetOrder absorbs currentOrder's items
      await db.transaction('rw', db.orders, db.orderItems, async () => {
        const currentItems = await db.orderItems.where({ orderId: currentOrderId }).toArray();
        
        // Tag items with their original table
        for (const item of currentItems) {
          await db.orderItems.update(item.id!, { 
            orderId: targetOrder.id,
            originalTable: item.originalTable || currentOrder.tableNumber
          });
        }

        // Build history: target's history + current's history (in order)
        const targetHistory = targetOrder.tableHistory || [targetOrder.tableNumber];
        const currentHistory = currentOrder.tableHistory || [currentOrder.tableNumber];
        
        // Merge histories maintaining chronological order
        const mergedHistory = [...targetHistory];
        for (const table of currentHistory) {
          if (!mergedHistory.includes(table)) {
            mergedHistory.push(table);
          }
        }
        
        // Add final destination if not already present
        if (!mergedHistory.includes(newTableNumber)) {
          mergedHistory.push(newTableNumber);
        }

        const allItems = await db.orderItems.where({ orderId: targetOrder.id }).toArray();
        const grandTotal = allItems.reduce((sum, i) => sum + i.total, 0);
        
        await db.orders.update(targetOrder.id, { 
          totalAmount: grandTotal,
          tableHistory: mergedHistory,
          updatedAt: new Date().toISOString() 
        });

        await db.orders.delete(currentOrderId);
      });
      return { merged: true, newOrderId: targetOrder.id };
    } else {
      // SIMPLE MOVE: Just update table number and append to history
      const currentHistory = currentOrder.tableHistory || [currentOrder.tableNumber];
      const newHistory = [...currentHistory];
      
      // Only append if new table is different and not already at the end
      if (newTableNumber !== currentHistory[currentHistory.length - 1]) {
        newHistory.push(newTableNumber);
      }
      
      await db.orders.update(currentOrderId, { 
        tableNumber: newTableNumber,
        tableHistory: newHistory,
        updatedAt: new Date().toISOString() 
      });
      return { merged: false, newOrderId: currentOrderId };
    }
  },

  addItem: async (orderId: string, itemName: string, categoryName: string, price: number) => {
    await db.transaction('rw', db.orders, db.orderItems, async () => {
      const existingItem = await db.orderItems.where({ orderId, itemName }).first();
      if (existingItem && !existingItem.originalTable) {
        await db.orderItems.update(existingItem.id!, { 
          quantity: existingItem.quantity + 1, 
          total: (existingItem.quantity + 1) * existingItem.rate 
        });
      } else {
        await db.orderItems.add({ 
          orderId, 
          itemName, 
          categoryName, 
          quantity: 1, 
          rate: price, 
          total: price 
        });
      }
      const allItems = await db.orderItems.where({ orderId }).toArray();
      const grandTotal = allItems.reduce((sum, i) => sum + i.total, 0);
      await db.orders.update(orderId, { 
        totalAmount: grandTotal, 
        updatedAt: new Date().toISOString() 
      });
    });
  },

  removeItem: async (orderId: string, itemId: number) => {
    await db.transaction('rw', db.orders, db.orderItems, async () => {
      await db.orderItems.delete(itemId);
      const allItems = await db.orderItems.where({ orderId }).toArray();
      const grandTotal = allItems.reduce((sum, i) => sum + i.total, 0);
      await db.orders.update(orderId, { 
        totalAmount: grandTotal, 
        updatedAt: new Date().toISOString() 
      });
    });
  },
  
  updateLineItem: async (orderId: string, itemId: number, newQty: number, newRate: number) => {
    await db.transaction('rw', db.orders, db.orderItems, async () => {
      await db.orderItems.update(itemId, { 
        quantity: newQty, 
        rate: newRate, 
        total: newQty * newRate 
      });
      const allItems = await db.orderItems.where({ orderId }).toArray();
      const grandTotal = allItems.reduce((sum, i) => sum + i.total, 0);
      await db.orders.update(orderId, { 
        totalAmount: grandTotal, 
        updatedAt: new Date().toISOString() 
      });
    });
  },
  
  getOrderItems: async (orderId: string) => { 
    return await db.orderItems.where({ orderId }).toArray(); 
  },
  
  updateStatus: async (orderId: string, status: 'order' | 'served') => { 
    await db.orders.update(orderId, { 
      status, 
      updatedAt: new Date().toISOString() 
    }); 
  },
  
  processPayment: async (orderId: string, cash: number, online: number) => {
    const order = await db.orders.get(orderId);
    if (!order) throw new Error("Order not found");
    
    // VALIDATION: Must be served first
    if (order.status !== 'served') {
      throw new Error("Order must be served before payment");
    }
    
    await db.orders.update(orderId, { 
      status: 'paid', 
      paymentCash: cash, 
      paymentOnline: online, 
      paidAt: new Date().toISOString(), 
      updatedAt: new Date().toISOString() 
    });
  }
};