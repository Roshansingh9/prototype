
import Dexie, { type Table } from 'dexie';
// 1. Interfaces (Type Definitions)
export interface Category {
  id: string; // UUID
  name: string;
  isActive: boolean;
  createdAt: string; // ISO Date String
  updatedAt: string;
  restored?: boolean;
}

export interface Order {
  id: string; // UUID
  tableNumber: string; // Tables can be "1", "7", or "7B"
  status: 'order' | 'served' | 'paid' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  paidAt?: string; // Only exists if paid
  totalAmount: number;
  paymentCash: number;
  paymentOnline: number;
  exportedToExcel: boolean;
}

export interface OrderItem {
  id?: number; // Auto-increment fine for sub-items
  orderId: string;
  itemName: string;
  categoryName: string;
  quantity: number;
  rate: number;
  total: number;
}

// 2. Database Class
export class RestaurantDB extends Dexie {
  categories!: Table<Category>;
  orders!: Table<Order>;
  orderItems!: Table<OrderItem>;

  constructor() {
    super('RestaurantPOS_DB');
    
    this.version(1).stores({
      // Primary Key is first argument
      // We index fields we need to search/filter by
      categories: 'id, name, isActive', 
      orders: 'id, tableNumber, status, createdAt, paidAt, exportedToExcel',
      orderItems: '++id, orderId' // ++id means auto-increment
    });
  }
}

// 3. Export a single instance
export const db = new RestaurantDB();