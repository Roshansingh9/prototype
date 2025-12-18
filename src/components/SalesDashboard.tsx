// src/components/SalesDashboard.tsx
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

export const SalesDashboard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const salesData = useLiveQuery(async () => {
    const orders = await db.orders.where('status').equals('paid').toArray();

    const filteredOrders = orders.filter(o => {
      if (!o.paidAt) return false;
      const orderDate = new Date(o.paidAt).toISOString().split('T')[0];
      return orderDate === selectedDate;
    });

    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalCash = filteredOrders.reduce((sum, o) => sum + o.paymentCash, 0);
    const totalOnline = filteredOrders.reduce((sum, o) => sum + o.paymentOnline, 0);

    return { orders: filteredOrders, totalRevenue, totalCash, totalOnline };
  }, [selectedDate]);

  // Render table history same as Orders tab
  const renderTableHistory = (order: any) => {
    const history = order.tableHistory || [order.tableNumber];
    
    if (history.length === 1) {
      return <span className="font-medium">{history[0]}</span>;
    }
    
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {history.map((table: string, idx: number) => (
          <React.Fragment key={idx}>
            <span className={`text-sm ${idx === history.length - 1 ? 'font-bold text-blue-600' : 'text-gray-400'}`}>
              {table}
            </span>
            {idx < history.length - 1 && <span className="text-gray-300">→</span>}
          </React.Fragment>
        ))}
      </div>
    );
  };

  if (!salesData) return <div>Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">📈 Sales Insights</h2>
        
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
          <span className="text-sm font-bold text-gray-500">Filter Date:</span>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="font-bold text-gray-800 outline-none cursor-pointer"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-gray-500 font-bold uppercase text-xs mb-2">Total Revenue</div>
          <div className="text-4xl font-extrabold text-gray-900">₹{salesData.totalRevenue}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 bg-green-50">
          <div className="text-green-700 font-bold uppercase text-xs mb-2">Cash</div>
          <div className="text-3xl font-bold text-green-800">₹{salesData.totalCash}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 bg-blue-50">
          <div className="text-blue-700 font-bold uppercase text-xs mb-2">Online</div>
          <div className="text-3xl font-bold text-blue-800">₹{salesData.totalOnline}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-gray-50 font-bold text-gray-700">
          Transactions for {selectedDate}
        </div>
        <div className="overflow-y-auto max-h-[400px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-xs uppercase text-gray-400 border-b">
              <tr>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Table History</th>
                <th className="px-6 py-3 text-right">Method</th>
                <th className="px-6 py-3 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {salesData.orders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-500">
                    {new Date(order.paidAt!).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </td>
                  <td className="px-6 py-3">
                    {renderTableHistory(order)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {order.paymentCash > 0 && order.paymentOnline > 0 ? (
                      <span className="text-purple-600">Mixed</span>
                    ) : order.paymentCash > 0 ? (
                      <span className="text-green-600">Cash</span>
                    ) : (
                      <span className="text-blue-600">Online</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right font-bold text-gray-900">₹{order.totalAmount}</td>
                </tr>
              ))}
              {salesData.orders.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">No sales on this date.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};