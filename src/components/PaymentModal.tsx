// src/components/PaymentModal.tsx
import React, { useState, useEffect } from 'react';
import type { Order } from '../db/db';
import { orderService } from '../services/orderService';

interface PaymentModalProps {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ order, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'cash' | 'online' | 'mixed'>('cash');
  const [cash, setCash] = useState<string>('');
  const [online, setOnline] = useState<string>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode === 'cash') { 
      setCash(order.totalAmount.toString()); 
      setOnline('0'); 
    }
    else if (mode === 'online') { 
      setOnline(order.totalAmount.toString()); 
      setCash('0'); 
    }
    else { 
      setCash(''); 
      setOnline(order.totalAmount.toString()); 
    }
  }, [mode, order.totalAmount]);

  const handleCashChange = (val: string) => {
    setCash(val);
    if (mode === 'mixed') {
      const c = parseFloat(val) || 0;
      const remaining = Math.max(0, order.totalAmount - c);
      setOnline(remaining.toString());
    }
  };

  const handleOnlineChange = (val: string) => {
    setOnline(val);
    if (mode === 'mixed') {
      const o = parseFloat(val) || 0;
      const remaining = Math.max(0, order.totalAmount - o);
      setCash(remaining.toString());
    }
  };

  const handlePayment = async () => {
    const cashVal = parseFloat(cash) || 0;
    const onlineVal = parseFloat(online) || 0;
    const totalPaid = cashVal + onlineVal;

    if (totalPaid < order.totalAmount - 0.5) {
      setError(`⚠️ Payment too low! Missing ₹${order.totalAmount - totalPaid}`);
      return;
    }
    
    try {
      await orderService.processPayment(order.id, cashVal, onlineVal);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-gray-900 p-6 flex justify-between items-center text-white">
          <div>
            <h2 className="text-xl font-bold">Settle Bill</h2>
            <p className="text-gray-400 text-sm">Table {order.tableNumber}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 uppercase font-bold">Total Amount</div>
            <div className="text-3xl font-bold text-green-400">₹{order.totalAmount}</div>
          </div>
        </div>
        
        <div className="flex p-2 bg-gray-100 gap-2">
          {['cash', 'online', 'mixed'].map((m) => (
            <button 
              key={m} 
              onClick={() => setMode(m as any)} 
              className={`flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all ${
                mode === m 
                  ? 'bg-white text-blue-600 shadow-md transform scale-[1.02]' 
                  : 'text-gray-500 hover:bg-gray-200'
              }`}
            >
              {m === 'mixed' ? 'Mix' : m}
            </button>
          ))}
        </div>
        
        <div className="p-8 space-y-6 flex-1 overflow-y-auto">
          <div className="flex gap-4">
            <div className={`flex-1 transition-opacity ${mode === 'online' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Cash</label>
              <div className="relative">
                <span className="absolute left-4 top-4 text-gray-400 font-bold">₹</span>
                <input 
                  type="number" 
                  value={cash} 
                  onChange={e => handleCashChange(e.target.value)} 
                  className="w-full pl-8 p-4 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-xl outline-none focus:border-green-500 focus:bg-white transition-colors" 
                  placeholder="0" 
                />
              </div>
            </div>
            
            <div className={`flex-1 transition-opacity ${mode === 'cash' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Online</label>
              <div className="relative">
                <span className="absolute left-4 top-4 text-gray-400 font-bold">₹</span>
                <input 
                  type="number" 
                  value={online} 
                  onChange={e => handleOnlineChange(e.target.value)} 
                  className="w-full pl-8 p-4 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-xl outline-none focus:border-blue-500 focus:bg-white transition-colors" 
                  placeholder="0" 
                />
              </div>
            </div>
          </div>
          
          {(mode === 'cash' || mode === 'mixed') && (
            <div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center">
              <span className="text-sm font-bold text-gray-500">Change to Return:</span>
              <span className={`text-2xl font-bold ${
                (parseFloat(cash) + parseFloat(online) - order.totalAmount) >= 0 
                  ? 'text-green-600' 
                  : 'text-red-500'
              }`}>
                ₹{Math.max(0, (parseFloat(cash) || 0) + (parseFloat(online) || 0) - order.totalAmount)}
              </span>
            </div>
          )}
          
          {error && (
            <div className="text-red-500 font-bold text-center bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t bg-gray-50 flex gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 py-4 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100"
          >
            Cancel
          </button>
          <button 
            onClick={handlePayment} 
            className="flex-[2] py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 active:scale-95 transition-transform"
          >
            ✓ CONFIRM PAYMENT
          </button>
        </div>
      </div>
    </div>
  );
};