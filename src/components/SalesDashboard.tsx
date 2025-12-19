// src/components/SalesDashboard.tsx - FIXED VERSION
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { orderService } from '../services/orderService';

export const SalesDashboard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editCash, setEditCash] = useState<string>('');
  const [editOnline, setEditOnline] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'online' | 'mixed'>('all');

  const salesData = useLiveQuery(async () => {
    const orders = await db.orders.where('status').equals('paid').toArray();

    let filteredOrders = orders.filter(o => {
      if (!o.paidAt) return false;
      const orderDate = new Date(o.paidAt).toISOString().split('T')[0];
      return orderDate === selectedDate;
    });

    if (paymentFilter === 'cash') {
      filteredOrders = filteredOrders.filter(o => o.paymentCash > 0 && o.paymentOnline === 0);
    } else if (paymentFilter === 'online') {
      filteredOrders = filteredOrders.filter(o => o.paymentOnline > 0 && o.paymentCash === 0);
    } else if (paymentFilter === 'mixed') {
      filteredOrders = filteredOrders.filter(o => o.paymentCash > 0 && o.paymentOnline > 0);
    }

    filteredOrders.sort((a, b) => {
      const dateA = a.paidAt ? new Date(a.paidAt).getTime() : 0;
      const dateB = b.paidAt ? new Date(b.paidAt).getTime() : 0;
      return dateB - dateA;
    });

    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalCash = filteredOrders.reduce((sum, o) => sum + o.paymentCash, 0);
    const totalOnline = filteredOrders.reduce((sum, o) => sum + o.paymentOnline, 0);

    return { orders: filteredOrders, totalRevenue, totalCash, totalOnline };
  }, [selectedDate, paymentFilter]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
    const timeStr = date.toLocaleTimeString('en-IN', {
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
    return `${dateStr}, ${timeStr}`;
  };

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

  const handleEditClick = (order: any) => {
    setEditingOrderId(order.id);
    setEditCash(order.paymentCash.toString());
    setEditOnline(order.paymentOnline.toString());
  };

  const handleSaveEdit = async () => {
    if (!editingOrderId) return;

    const cash = parseFloat(editCash) || 0;
    const online = parseFloat(editOnline) || 0;
    const newTotal = cash + online;

    await db.orders.update(editingOrderId, {
      paymentCash: cash,
      paymentOnline: online,
      totalAmount: newTotal,
      updatedAt: new Date().toISOString()
    });

    setEditingOrderId(null);
    setEditCash('');
    setEditOnline('');
  };

  const handleCancelEdit = () => {
    setEditingOrderId(null);
    setEditCash('');
    setEditOnline('');
  };

  const handleDeleteOrder = async () => {
    if (!deleteConfirmId) return;
    await orderService.deleteOrder(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  if (!salesData) return <div>Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">📈 Sales Insights</h2>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
            <span className="text-sm font-bold text-gray-500">Filter Date:</span>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="font-bold text-gray-800 outline-none cursor-pointer"
            />
          </div>
          
          <div className="flex bg-gray-100 p-1.5 rounded-xl border border-gray-200">
            {['all', 'cash', 'online', 'mixed'].map((filter) => (
              <button 
                key={filter} 
                onClick={() => setPaymentFilter(filter as any)} 
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-200 ${paymentFilter === filter ? 'bg-white text-gray-800 shadow-md transform scale-105' : 'text-gray-500 hover:bg-gray-200'}`}
              >
                {filter}
              </button>
            ))}
          </div>
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
        <div className="overflow-y-auto max-h-[500px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-xs uppercase text-gray-400 border-b sticky top-0">
              <tr>
                <th className="px-6 py-3">Date & Time</th>
                <th className="px-6 py-3">Table History</th>
                <th className="px-6 py-3 text-center">Payment Details</th>
                <th className="px-6 py-3 text-right font-bold">Total</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {salesData.orders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-600">
                    {formatDateTime(order.paidAt!)}
                  </td>
                  <td className="px-6 py-3">
                    {renderTableHistory(order)}
                    {order.customerName && (
                      <div className="text-xs text-orange-600 font-bold mt-1">
                        👤 {order.customerName}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {editingOrderId === order.id ? (
                      <div className="flex gap-2 justify-center">
                        <div>
                          <label className="text-xs text-gray-500 block">Cash</label>
                          <input
                            type="number"
                            value={editCash}
                            onChange={(e) => setEditCash(e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm font-bold"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block">Online</label>
                          <input
                            type="number"
                            value={editOnline}
                            onChange={(e) => setEditOnline(e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm font-bold"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        {order.paymentCash > 0 && order.paymentOnline > 0 ? (
                          <div className="text-xs">
                            <span className="text-green-600 font-bold">Cash: ₹{order.paymentCash}</span>
                            <br />
                            <span className="text-blue-600 font-bold">Online: ₹{order.paymentOnline}</span>
                          </div>
                        ) : order.paymentCash > 0 ? (
                          <span className="text-green-600 font-bold">Cash Only</span>
                        ) : (
                          <span className="text-blue-600 font-bold">Online Only</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right font-bold text-gray-900">
                    ₹{editingOrderId === order.id 
                      ? (parseFloat(editCash) || 0) + (parseFloat(editOnline) || 0)
                      : order.totalAmount
                    }
                  </td>
                  <td className="px-6 py-3">
                    {editingOrderId === order.id ? (
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-bold"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded text-xs font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEditClick(order)}
                          className="text-blue-600 hover:text-blue-800 font-bold text-xs underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(order.id)}
                          className="text-red-600 hover:text-red-800 font-bold text-xs underline"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {salesData.orders.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">No sales on this date.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 w-96 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              ⚠️
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Delete Transaction?</h3>
            <p className="text-gray-600 mb-6">
              This will permanently remove this order from sales records.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOrder}
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