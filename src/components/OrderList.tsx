// src/components/OrderList.tsx
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Order } from '../db/db';
import { orderService } from '../services/orderService';
import { PaymentModal } from './PaymentModal';

interface OrderListProps {
  onSelectOrder: (tableNum: string) => void;
}

export const OrderList: React.FC<OrderListProps> = ({ onSelectOrder }) => {
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);

  const activeOrders = useLiveQuery(async () => {
    return await db.orders.where('status').noneOf(['paid', 'cancelled']).reverse().sortBy('updatedAt');
  });

  const handleStatusUpdate = async (orderId: string, status: 'order' | 'served') => {
    await orderService.updateStatus(orderId, status);
    setOpenStatusMenuId(null);
  };

  // FEATURE 4: Render table history breadcrumb
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

  // FEATURE 6: Display customer name for walk-ins
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

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pb-20">
      <div className="flex justify-between items-center mb-8">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Active Orders</h2>
           <p className="text-gray-500 text-sm">Manage Kitchen & Payments</p>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-xl overflow-visible border border-gray-200">
        <table className="min-w-full">
          <thead className="bg-gray-100 text-gray-600 text-sm uppercase font-bold tracking-wider">
            <tr>
              <th className="py-4 px-6 text-left">Table / Customer</th>
              <th className="py-4 px-6 text-left">Bill Total</th>
              <th className="py-4 px-6 text-left">Kitchen Status</th>
              <th className="py-4 px-6 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activeOrders?.map((order) => {
              // FEATURE 3: Check if payment is allowed
              const canPay = order.status === 'served';
              
              return (
                <tr key={order.id} className="hover:bg-blue-50 transition-colors">
                  
                  <td onClick={() => onSelectOrder(order.tableNumber)} className="py-4 px-6 cursor-pointer group">
                    {renderCustomerInfo(order)}
                    <div className="text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </div>
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
                      
                      {/* FEATURE 3: Payment Button with Validation */}
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
                        
                        {/* FEATURE 3: Tooltip for disabled state */}
                        {!canPay && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/pay:opacity-100 transition-opacity pointer-events-none z-50">
                            <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap">
                              Order must be served first
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
             {(!activeOrders || activeOrders.length === 0) && (
               <tr><td colSpan={4} className="text-center py-10 text-gray-400">No active orders.</td></tr>
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
    </div>
  );
};