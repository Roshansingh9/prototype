// src/App.tsx
import { useState } from 'react';
import { Layout } from './components/Layout';
import { MenuManager } from './components/MenuManager';
import { TableGrid } from './components/TableGrid';
import { OrderView } from './components/OrderView';
import { OrderList } from './components/OrderList';
import { SalesDashboard } from './components/SalesDashboard';
import { orderService } from './services/orderService';
import { backupService } from './services/backupService';
import { configService } from './services/configService';
import type { Order } from './db/db';

type View = 'tables' | 'active-list' | 'menu' | 'sales' | 'order';

function App() {
  const [currentView, setCurrentView] = useState<View>('tables');
  const [returnView, setReturnView] = useState<View>('tables'); 
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  
  const appConfig = configService.getConfig();

  const handleTableClick = async (tableNum: string, customerName?: string, source?: View) => {
    try {
      let order = await orderService.getOrderByTable(tableNum);
      if (!order) {
        order = await orderService.createOrder(tableNum, customerName);
      }
      if (order) { 
        setActiveOrder(order); 
        setReturnView(source || currentView); 
        setCurrentView('order'); 
      }
    } catch (error) { 
      console.error(error); 
    }
  };

  const handleCloseOrder = async () => {
    if (activeOrder) {
      const freshOrder = await orderService.getOrderById(activeOrder.id);
      if (freshOrder && freshOrder.totalAmount <= 0) {
        await orderService.deleteOrder(freshOrder.id);
      }
    }
    setActiveOrder(null);
    setCurrentView(returnView);
  };

  // NEW: Local Backup Handlers
  const handleExportData = async () => {
    const success = await backupService.exportToExcel();
    if (success) {
      alert('✅ Backup downloaded successfully!');
    } else {
      alert('❌ Failed to create backup');
    }
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!confirm('⚠️ This will replace all current data. Continue?')) {
        e.target.value = ''; // Reset input
        return;
      }
      
      const success = await backupService.importFromExcel(file);
      if (success) {
        alert('✅ Data restored successfully!');
        window.location.reload();
      } else {
        alert('❌ Failed to restore data. Please check the file format.');
      }
      e.target.value = ''; // Reset input
    }
  };

  return (
    <Layout>
      {/* HEADER */}
      <div className="flex justify-between items-center px-4 py-3 bg-white border-b shadow-sm mb-4">
        
        <div className="flex flex-col">
          <div className="text-sm font-extrabold text-gray-800">{appConfig.restaurantName}</div>
          <div className="text-[10px] text-gray-500 font-bold tracking-wide">{appConfig.restaurantAddress}</div>
        </div>

        {/* NEW: Local Backup Buttons */}
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2"
            title="Download backup file"
          >
            📥 Backup
          </button>
          
          <label 
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all cursor-pointer flex items-center gap-2"
            title="Restore from backup file"
          >
            📤 Restore
            <input 
              type="file" 
              accept=".xlsx"
              onChange={handleImportData}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      {currentView !== 'order' && (
        <div className="flex w-full gap-4 mb-6 px-1">
          <NavButton active={currentView === 'tables'} onClick={() => setCurrentView('tables')}>
            🍽️ Tables
          </NavButton>
          <NavButton active={currentView === 'active-list'} onClick={() => setCurrentView('active-list')}>
            📝 Orders
          </NavButton>
          <NavButton active={currentView === 'menu'} onClick={() => setCurrentView('menu')}>
            📂 Menu
          </NavButton>
          <NavButton active={currentView === 'sales'} onClick={() => setCurrentView('sales')}>
            📈 Sales
          </NavButton>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="animate-fade-in w-full relative h-full flex-1">
        {currentView === 'tables' && (
          <TableGrid onTableSelect={(t, name) => handleTableClick(t, name, 'tables')} />
        )}
        
        {currentView === 'active-list' && (
          <OrderList 
            onSelectOrder={(t) => handleTableClick(t, undefined, 'active-list')}
            onNewOrder={() => setCurrentView('tables')}
          />
        )}
        
        {currentView === 'menu' && <MenuManager />}
        {currentView === 'sales' && <SalesDashboard />}
        
        {currentView === 'order' && activeOrder && (
          <OrderView order={activeOrder} onBack={handleCloseOrder} />
        )}
      </div>
    </Layout>
  );
}

const NavButton = ({ active, onClick, children }: any) => (
  <button 
    onClick={onClick} 
    className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all shadow-sm active:scale-95 duration-200 border
      ${active 
        ? 'bg-gray-900 text-white border-gray-900 shadow-md' 
        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
      }`}
  >
    {children}
  </button>
);

export default App;