// src/components/OrderView.tsx - EXACT MATCH TO HTML UX
import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Order, type Product } from '../db/db';
import { orderService } from '../services/orderService';
import { PaymentModal } from './PaymentModal';

interface OrderViewProps {
  order: Order;
  onBack: () => void;
}

const ALL_TABLES = [
  'A1', 'A2', 'A3', 'A4',
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
  'C1', 'C2', 'C3', 'C4',
  'D1', 'D2', 'D3', 'D4', 'D5', 'D6'
];

const DAYS_MAP = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const OrderView: React.FC<OrderViewProps> = ({ order, onBack }) => {
  const orderItems = useLiveQuery(() => orderService.getOrderItems(order.id), [order.id]);
  const categories = useLiveQuery(() => db.categories.toArray(), []);
  const allProducts = useLiveQuery(() => db.products.toArray(), []);
  const activeTables = useLiveQuery(() => orderService.getActiveTables(), []) || [];

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [itemQuantities, setItemQuantities] = useState<{ [key: string]: number }>({});
  
  const [isChangingTable, setIsChangingTable] = useState(false);
  const [tableName, setTableName] = useState(order.tableNumber);
  const [showPayModal, setShowPayModal] = useState(false);
  const [pendingMergeTable, setPendingMergeTable] = useState<string | null>(null);

  const orderTotal = orderItems?.reduce((sum, item) => sum + item.total, 0) || 0;
  const itemCount = orderItems?.length || 0;

  const activeCategories = categories?.filter(c => c.isActive) || [];

  useEffect(() => {
    if (activeCategories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(activeCategories[0].id);
    }
  }, [activeCategories, selectedCategoryId]);

  useEffect(() => {
    const qtyMap: { [key: string]: number } = {};
    orderItems?.forEach(item => {
      qtyMap[item.itemName] = (qtyMap[item.itemName] || 0) + item.quantity;
    });
    setItemQuantities(qtyMap);
  }, [orderItems]);

  const checkAvailability = (p: Product) => {
    if (p.isAvailableNow === false) return { allowed: false, reason: 'Out of Stock' };
    if (p.availableDays && p.availableDays.length > 0) {
      const todayName = DAYS_MAP[new Date().getDay()];
      if (!p.availableDays.includes(todayName)) return { allowed: false, reason: `Only ${p.availableDays.join(', ')}` };
    }
    return { allowed: true, reason: '' };
  };

  const handleAddItem = async (product: Product) => {
    const status = checkAvailability(product);
    if (!status.allowed) {
      alert(`⚠️ ${status.reason}`);
      return;
    }
    await orderService.addItem(order.id, product.name, 'Menu', product.price);
  };

  const handleIncreaseItem = async (itemName: string) => {
    const product = allProducts?.find(p => p.name === itemName);
    if (product) {
      await orderService.addItem(order.id, itemName, 'Menu', product.price);
    }
  };

  const handleDecreaseItem = async (itemName: string) => {
    const item = orderItems?.find(i => i.itemName === itemName);
    if (item) {
      await orderService.removeItem(order.id, item.id!, item.total);
    }
  };

  const initiateTableChange = (val: string) => {
    if (activeTables.includes(val) && val !== order.tableNumber) {
      setPendingMergeTable(val);
    } else {
      orderService.updateTableNumber(order.id, val);
      setTableName(val);
      setIsChangingTable(false);
    }
  };

  const confirmMerge = async () => {
    if (pendingMergeTable) {
      await orderService.updateTableNumber(order.id, pendingMergeTable);
      setPendingMergeTable(null);
      onBack();
    }
  };

  const handlePlaceOrder = () => {
    if (itemCount === 0 || orderTotal <= 0) {
      alert("⚠️ Add at least one item to place order");
      return;
    }
    onBack();
  };

  const filteredProducts = allProducts?.filter(p => 
    p.categoryId === selectedCategoryId && p.isActive
  ) || [];

  if (!categories || !allProducts) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-gray-400">Loading menu...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="menu-container max-w-4xl mx-auto bg-white shadow-xl min-h-screen">
        
        {/* HEADER - Matching HTML */}
        <header className="sticky top-0 bg-indigo-700 text-white p-4 border-b z-10 shadow-lg flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold">The Classy Menu</h1>
            <p className="text-indigo-200 text-sm italic">Table: {tableName}</p>
          </div>
          <div className="flex gap-2">
            {!isChangingTable ? (
              <button 
                onClick={() => setIsChangingTable(true)}
                className="bg-indigo-500 hover:bg-indigo-600 px-3 py-1 rounded text-sm font-bold"
              >
                Change Table
              </button>
            ) : (
              <button 
                onClick={() => setIsChangingTable(false)}
                className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm font-bold"
              >
                Cancel
              </button>
            )}
            <button 
              onClick={onBack}
              className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm font-bold"
            >
              ← Back
            </button>
          </div>
        </header>

        {/* TABLE CHANGE DROPDOWN - Matching HTML */}
        {isChangingTable && (
          <div className="bg-yellow-50 border-b border-yellow-200 p-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">Select New Table:</label>
            <select 
              className="w-full p-2 border border-gray-300 rounded-lg font-bold"
              value={tableName}
              onChange={(e) => initiateTableChange(e.target.value)}
            >
              {ALL_TABLES.map(table => (
                <option key={table} value={table}>
                  Table {table} {activeTables.includes(table) && table !== order.tableNumber ? '(Occupied)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <main className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
          
          {/* LEFT SECTION - Menu Items (2/3 width) */}
          <section className="md:col-span-2">
            
            {/* CATEGORY FILTER DROPDOWN - Matching HTML */}
            <div className="bg-white p-4 mb-4 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-xl font-bold text-gray-800 mb-3">Filter Menu</h3>
              <select 
                className="w-full p-3 border-2 border-gray-300 rounded-lg font-bold text-gray-700 bg-white focus:border-indigo-500 focus:outline-none"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
              >
                {activeCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* MENU ITEMS LIST - Matching HTML */}
            <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">Menu Items</h2>
            <div className="space-y-4">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-10 text-gray-400">No items available</div>
              ) : (
                filteredProducts.map(product => {
                  const status = checkAvailability(product);
                  const qty = itemQuantities[product.name] || 0;

                  return (
                    <div 
                      key={product.id}
                      className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-lg text-gray-800">{product.name}</h4>
                          <p className="text-green-600 font-bold text-xl">Rs. {product.price}</p>
                        </div>
                        <div className="text-right">
                          {!status.allowed ? (
                            <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold">
                              {status.reason}
                            </span>
                          ) : qty === 0 ? (
                            <button
                              onClick={() => handleAddItem(product)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-md"
                            >
                              Add to Order
                            </button>
                          ) : (
                            <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-lg border-2 border-indigo-300">
                              <button
                                onClick={() => handleDecreaseItem(product.name)}
                                className="w-8 h-8 bg-white rounded-full font-bold text-indigo-600 hover:bg-indigo-100 transition shadow-sm"
                              >
                                −
                              </button>
                              <span className="font-bold text-lg text-indigo-700 min-w-[2rem] text-center">
                                {qty}
                              </span>
                              <button
                                onClick={() => handleIncreaseItem(product.name)}
                                className="w-8 h-8 bg-white rounded-full font-bold text-indigo-600 hover:bg-indigo-100 transition shadow-sm"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* RIGHT SIDEBAR - Cart (1/3 width) - Matching HTML */}
          <aside className="md:col-span-1 sticky top-20 h-fit bg-white p-4 rounded-xl shadow-lg border">
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Your Current Tab & Cart</h2>

            {/* EXISTING TAB ITEMS WITH +/- CONTROLS */}
            <div className="mb-4 space-y-3 max-h-96 overflow-y-auto">
              {itemCount === 0 ? (
                <p className="text-sm text-gray-400">Cart is empty.</p>
              ) : (
                orderItems?.map(item => (
                  <div key={item.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-bold text-gray-800">{item.itemName}</div>
                        <div className="text-sm text-gray-500">Rs. {item.rate} × {item.quantity}</div>
                      </div>
                      <div className="font-bold text-indigo-600">Rs. {item.total}</div>
                    </div>
                    {/* +/- CONTROLS IN CART */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDecreaseItem(item.itemName)}
                          className="w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold text-sm flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="font-bold text-gray-700 min-w-[1.5rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleIncreaseItem(item.itemName)}
                          className="w-7 h-7 bg-green-500 hover:bg-green-600 text-white rounded-full font-bold text-sm flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => orderService.removeItem(order.id, item.id!, item.total)}
                        className="text-red-500 hover:text-red-700 text-xs font-bold underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <hr className="my-4 border-dashed" />

            {/* CART TOTAL - Matching HTML */}
            <div className="pt-4 border-t-2">
              <div className="flex justify-between items-center text-xl font-extrabold mb-4">
                <span>Cart Total:</span>
                <span className="text-indigo-600">Rs. {orderTotal}</span>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={itemCount === 0}
                className={`w-full py-3 font-bold rounded-lg transition duration-150 ${
                  itemCount > 0
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                }`}
              >
                {itemCount > 0 ? 'Place Order' : 'Cart is Empty'}
              </button>

              <button
                onClick={() => { if(orderTotal > 0 && itemCount > 0) setShowPayModal(true); }}
                disabled={orderTotal <= 0 || itemCount === 0}
                className={`w-full mt-3 py-3 font-bold rounded-lg transition duration-150 ${
                  orderTotal > 0 && itemCount > 0
                    ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Pay Bill
              </button>

              <p className="text-xs text-gray-500 mt-2 text-center">
                Items will be saved to your table's tab.
              </p>
            </div>
          </aside>

        </main>
      </div>

      {/* Footer - Matching HTML */}
      <footer className="text-center py-3 text-xs bg-gray-200 text-gray-600">
        Restaurant POS System
      </footer>

      {showPayModal && (
        <PaymentModal 
          order={order} 
          onClose={() => setShowPayModal(false)} 
          onSuccess={() => { setShowPayModal(false); onBack(); }} 
        />
      )}

      {pendingMergeTable && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-96 text-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🔗</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Merge Tables?</h3>
            <p className="text-gray-500 mb-6">
              Table <b>{pendingMergeTable}</b> is already occupied.<br/>
              Do you want to merge this bill into it?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setPendingMergeTable(null)} 
                className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button 
                onClick={confirmMerge} 
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg transition"
              >
                Yes, Merge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};