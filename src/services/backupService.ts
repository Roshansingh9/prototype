// src/services/backupService.ts
import * as XLSX from 'xlsx';
import { db } from '../db/db';

export const backupService = {
  // Export all data to Excel
  exportToExcel: async () => {
    try {
      const workbook = XLSX.utils.book_new();

      // Export Categories
      const categories = await db.categories.toArray();
      const catSheet = XLSX.utils.json_to_sheet(categories);
      XLSX.utils.book_append_sheet(workbook, catSheet, "Categories");

      // Export Products
      const products = await db.products.toArray();
      const prodSheet = XLSX.utils.json_to_sheet(products);
      XLSX.utils.book_append_sheet(workbook, prodSheet, "Products");

      // Export Orders
      const orders = await db.orders.toArray();
      const ordersSheet = XLSX.utils.json_to_sheet(orders);
      XLSX.utils.book_append_sheet(workbook, ordersSheet, "Orders");

      // Export Order Items
      const orderItems = await db.orderItems.toArray();
      const itemsSheet = XLSX.utils.json_to_sheet(orderItems);
      XLSX.utils.book_append_sheet(workbook, itemsSheet, "OrderItems");

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `POS_Backup_${timestamp}.xlsx`;

      // Download file
      XLSX.writeFile(workbook, filename);
      
      return true;
    } catch (error) {
      console.error("Export error:", error);
      return false;
    }
  },

  // Import data from Excel
  importFromExcel: async (file: File): Promise<boolean> => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      // Clear existing data
      await db.transaction('rw', [db.categories, db.products, db.orders, db.orderItems], async () => {
        await db.categories.clear();
        await db.products.clear();
        await db.orders.clear();
        await db.orderItems.clear();

        // Import Categories
        if (workbook.SheetNames.includes('Categories')) {
          const catSheet = workbook.Sheets['Categories'];
          const categories = XLSX.utils.sheet_to_json(catSheet);
          await db.categories.bulkAdd(categories as any);
        }

        // Import Products
        if (workbook.SheetNames.includes('Products')) {
          const prodSheet = workbook.Sheets['Products'];
          const products = XLSX.utils.sheet_to_json(prodSheet);
          await db.products.bulkAdd(products as any);
        }

        // Import Orders
        if (workbook.SheetNames.includes('Orders')) {
          const ordersSheet = workbook.Sheets['Orders'];
          const orders = XLSX.utils.sheet_to_json(ordersSheet);
          await db.orders.bulkAdd(orders as any);
        }

        // Import Order Items
        if (workbook.SheetNames.includes('OrderItems')) {
          const itemsSheet = workbook.Sheets['OrderItems'];
          const orderItems = XLSX.utils.sheet_to_json(itemsSheet);
          await db.orderItems.bulkAdd(orderItems as any);
        }
      });

      return true;
    } catch (error) {
      console.error("Import error:", error);
      return false;
    }
  }
};