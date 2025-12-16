// src/App.tsx
import { useState } from 'react';
import { Layout } from './components/Layout';
import { CategoryManager } from './components/CategoryManager';
import { TableGrid } from './components/TableGrid';
import { OrderView } from './components/OrderView'; // Import new component
import { orderService } from './services/orderService';
import type { Order } from './db/db';

type View = 'tables' | 'menu' | 'order';

function App() {
  const [currentView, setCurrentView] = useState<View>('tables');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  // 1. Handle clicking a table
  const handleTableSelection = async (tableNum: string) => {
    try {
      // Check if there is already an active order
      let order = await orderService.getOrderByTable(tableNum);
      
      if (!order) {
        // If not, create one
        order = await orderService.createOrder(tableNum);
      }
      
      setActiveOrder(order);
      setCurrentView('order');
    } catch (error) {
      console.error(error);
      alert("Error opening table");
    }
  };

  return (
    <Layout>
      {/* Navigation Tabs (Only show if NOT in order mode) */}
      {currentView !== 'order' && (
        <div className="flex gap-4 mb-6 border-b pb-4">
          <button
            onClick={() => setCurrentView('tables')}
            className={`px-6 py-2 rounded-full font-bold transition-colors ${
              currentView === 'tables' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            🍽️ Tables
          </button>
          <button
            onClick={() => setCurrentView('menu')}
            className={`px-6 py-2 rounded-full font-bold transition-colors ${
              currentView === 'menu' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            📂 Menu Setup
          </button>
        </div>
      )}

      {/* View Switcher */}
      <div className="animate-fade-in">
        {currentView === 'tables' && (
          // We modify TableGrid to pass the click handler
          // Note: We need to update TableGrid to support "onClick" cleanly
          // For now, we reuse the logic inside TableGrid or pass a prop
          // Let's assume TableGrid emits the ID via a wrapper or direct prop in next iteration
          // Actually, let's update TableGrid usage to use the prop we added:
          <TableGrid onTableSelect={handleTableSelection} /> 
        )}
        
        {currentView === 'menu' && <CategoryManager />}
        
        {currentView === 'order' && activeOrder && (
          <OrderView 
            order={activeOrder} 
            onBack={() => {
              setActiveOrder(null);
              setCurrentView('tables');
            }} 
          />
        )}
      </div>
    </Layout>
  )
}

export default App