// src/components/OrderList.tsx
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Order } from '../db/db';
import { orderService } from '../services/orderService';
import { PaymentModal } from './PaymentModal';

interface OrderListProps {
  onSelectOrder: (tableNum: string) => void;
  onNewOrder: () => void; // NEW: Callback to navigate to Tables tab
}

export const OrderList: React.FC<OrderListProps> = ({ onSelectOrder, onNewOrder }) => {
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const activeOrders = useLiveQuery(async () => {
    return await db.orders.where('status').noneOf(['paid', 'cancelled']).reverse().sortBy('updatedAt');
  });

  // Get order items for each order
  const orderItemsMap = useLiveQuery(async () => {
    const orders = await db.orders.where('status').noneOf(['paid', 'cancelled']).toArray();
    const itemsMap: { [orderId: string]: any[] } = {};
    
    for (const order of orders) {
      const items = await db.orderItems.where({ orderId: order.id }).toArray();
      itemsMap[order.id] = items;
    }
    
    return itemsMap;
  }, []);

  const handleStatusUpdate = async (orderId: string, status: 'order' | 'served') => {
    await orderService.updateStatus(orderId, status);
    setOpenStatusMenuId(null);
  };

  const handleDeleteOrder = async (orderId: string) => {
    await orderService.deleteOrder(orderId);
    setDeleteConfirmId(null);
  };

  const renderTableHistory = (order: Order) => {
    const history = order.tableHistory || [order.tableNumber];
    
    if (history.length === 1) {
      return <span className="font-bold text-xl text-gray-800 group-hover:text-blue-600">{history[0]}</span>;
    }
    
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {history.map((table, idx) => (
          <React.Fragment key={idx}>
            <span className={`text-sm font-bold ${idx === history.length - 1 ? 'text-blue-600 text-lg' : 'text-gray-400'}`}>
              {table}
            </span>
            {idx < history.length - 1 && <span className="text-gray-300">→</span>}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderCustomerInfo = (order: Order) => {
    if (order.customerName) {
      return (
        <div>
          {renderTableHistory(order)}
          <div className="text-xs text-orange-600 font-bold mt-1">
            👤 {order.customerName}
          </div>
        </div>
      );
    }
    return renderTableHistory(order);
  };

  const renderOrderItems = (orderId: string) => {
    const items = orderItemsMap?.[orderId] || [];
    
    if (items.length === 0) {
      return <span className="text-gray-400 text-sm">No items</span>;
    }

    // Group items by name and sum quantities
    const grouped = items.reduce((acc: any, item: any) => {
      if (acc[item.itemName]) {
        acc[item.itemName] += item.quantity;
      } else {
        acc[item.itemName] = item.quantity;
      }
      return acc;
    }, {});

    return (
      <div className="space-y-1">
        {Object.entries(grouped).map(([name, qty]: [string, any]) => (
          <div key={name} className="text-sm text-gray-700">
            {name} × {qty}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pb-20">
      <div className="flex justify-between items-center mb-8">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Active Orders</h2>
           <p className="text-gray-500 text-sm">Manage Kitchen & Payments</p>
        </div>
        <button 
          onClick={onNewOrder}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-colors"
        >
          + New Order
        </button>
      </div>
      
      <div className="bg-white shadow rounded-xl overflow-visible border border-gray-200">
        <table className="min-w-full">
          <thead className="bg-gray-100 text-gray-600 text-sm uppercase font-bold tracking-wider">
            <tr>
              <th className="py-4 px-6 text-left">Table / Customer</th>
              <th className="py-4 px-6 text-left">Items</th>
              <th className="py-4 px-6 text-left">Bill Amount</th>
              <th className="py-4 px-6 text-left">Status</th>
              <th className="py-4 px-6 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activeOrders?.map((order) => {
              const canPay = order.status === 'served';
              
              return (
                <tr key={order.id} className="hover:bg-blue-50 transition-colors">
                  
                  <td onClick={() => onSelectOrder(order.tableNumber)} className="py-4 px-6 cursor-pointer group">
                    {renderCustomerInfo(order)}
                    <div className="text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </div>
                  </td>

                  <td className="py-4 px-6">
                    {renderOrderItems(order.id)}
                  </td>

                  <td className="py-4 px-6 font-bold text-gray-700">₹{order.totalAmount}</td>
                  
                  <td className="py-4 px-6 relative">
                     <button 
                       onClick={() => setOpenStatusMenuId(openStatusMenuId === order.id ? null : order.id)}
                       className={`px-4 py-2 rounded-lg text-xs font-extrabold border-2 transition-all flex items-center gap-2
                         ${order.status === 'served' 
                           ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' 
                           : 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200'}`}
                     >
                       {order.status === 'served' ? '✅ SERVED' : '🕒 PREPARING'}
                       <span className="text-xs opacity-50">▼</span>
                     </button>
                     {openStatusMenuId === order.id && (
                       <div className="absolute top-12 left-0 bg-white shadow-2xl rounded-xl border border-gray-200 z-50 w-40 overflow-hidden animate-fade-in">
                          <button 
                            onClick={() => handleStatusUpdate(order.id, 'order')} 
                            className="w-full text-left px-4 py-3 hover:bg-orange-50 text-xs font-bold text-orange-700 flex items-center gap-2 border-b border-gray-100"
                          >
                            🕒 PREPARING
                          </button>
                          <button 
                            onClick={() => handleStatusUpdate(order.id, 'served')} 
                            className="w-full text-left px-4 py-3 hover:bg-green-50 text-xs font-bold text-green-700 flex items-center gap-2"
                          >
                            ✅ SERVED
                          </button>
                       </div>
                     )}
                     {openStatusMenuId === order.id && (
                       <div className="fixed inset-0 z-40" onClick={() => setOpenStatusMenuId(null)}></div>
                     )}
                  </td>

                  <td className="py-4 px-6 text-center">
                    <div className="flex justify-center gap-4 items-center">
                      <button 
                        onClick={() => onSelectOrder(order.tableNumber)} 
                        className="text-gray-400 font-bold text-sm hover:text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      
                      <div className="relative group/pay">
                        <button 
                          onClick={() => canPay && setPaymentOrder(order)} 
                          disabled={!canPay}
                          className={`px-6 py-2 rounded-lg shadow text-sm font-bold uppercase tracking-wide transform transition 
                            ${canPay 
                              ? 'bg-green-600 text-white hover:bg-green-700 hover:scale-105 cursor-pointer' 
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                        >
                          Pay Bill
                        </button>
                        
                        {!canPay && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/pay:opacity-100 transition-opacity pointer-events-none z-50">
                            <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap">
                              Order must be served first
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setDeleteConfirmId(order.id)}
                        className="text-red-400 hover:text-red-600 font-bold text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
             {(!activeOrders || activeOrders.length === 0) && (
               <tr><td colSpan={5} className="text-center py-10 text-gray-400">No active orders.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {paymentOrder && (
        <PaymentModal 
          order={paymentOrder} 
          onClose={() => setPaymentOrder(null)} 
          onSuccess={() => setPaymentOrder(null)} 
        />
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 w-96 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              ⚠️
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Delete Order?</h3>
            <p className="text-gray-600 mb-6">
              This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteOrder(deleteConfirmId)}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};