// src/db/db.ts
import Dexie, { type Table } from 'dexie';

export interface Category {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  isActive: boolean;
  availableDays?: string[];
  isAvailableNow?: boolean;
}

export interface Order {
  id: string;
  tableNumber: string;
  customerName?: string; // NEW: For walk-in custom names
  tableHistory?: string[]; // NEW: Track table movements ["A1", "B2", "C3"]
  status: 'order' | 'served' | 'paid' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  totalAmount: number;
  paymentCash: number;
  paymentOnline: number;
  exportedToExcel: boolean;
}

export interface OrderItem {
  id?: number;
  orderId: string;
  itemName: string;
  categoryName: string;
  quantity: number;
  rate: number;
  total: number;
  originalTable?: string;
}

export class RestaurantDB extends Dexie {
  categories!: Table<Category>;
  products!: Table<Product>;
  orders!: Table<Order>;
  orderItems!: Table<OrderItem>;

  constructor() {
    super('RestaurantPOS_DB');
    
    // UPDATE TO VERSION 6 to add new fields
    this.version(6).stores({
      categories: 'id, name, isActive', 
      products: 'id, categoryId, name, isActive, isAvailableNow',
      orders: 'id, tableNumber, status, createdAt, paidAt, exportedToExcel',
      orderItems: '++id, orderId'
    });
  }
}

export const db = new RestaurantDB();