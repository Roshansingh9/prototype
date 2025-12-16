// src/components/OrderView.tsx
import React from 'react';
import type { Order } from '../db/db';

interface OrderViewProps {
  order: Order;
  onBack: () => void;
}

export const OrderView: React.FC<OrderViewProps> = ({ order, onBack }) => {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
        <button 
          onClick={onBack}
          className="text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg font-medium"
        >
          ← Back to Tables
        </button>
        <div className="text-xl font-bold">
          Table {order.tableNumber} <span className="text-sm font-normal text-gray-500">#{order.id.slice(0,8)}</span>
        </div>
        <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold uppercase">
          {order.status}
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="flex-1 p-8 text-center text-gray-500">
        <div className="text-6xl mb-4">🛒</div>
        <h3 className="text-xl font-medium">Order Created Successfully</h3>
        <p>In the next step, we will add menu items here.</p>
      </div>
    </div>
  );
};