// src/App.tsx
import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { MenuManager } from './components/MenuManager';
import { TableGrid } from './components/TableGrid';
import { OrderView } from './components/OrderView';
import { OrderList } from './components/OrderList';
import { SalesDashboard } from './components/SalesDashboard';
import { orderService } from './services/orderService';
import { googleDriveService } from './services/googleDriveService';
import { configService } from './services/configService';
import type { Order } from './db/db';

type View = 'tables' | 'active-list' | 'menu' | 'sales' | 'order';

function App() {
  const [currentView, setCurrentView] = useState<View>('tables');
  const [returnView, setReturnView] = useState<View>('tables'); 
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  
  // Cloud Sync State
  const [isGapiReady, setIsGapiReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Init...");
  
  const appConfig = configService.getConfig();

  // Initialize Google Drive
  useEffect(() => {
    googleDriveService.initClient().then(() => {
      setIsGapiReady(true);
      const auth = (window as any).gapi?.auth2?.getAuthInstance();
      setSyncStatus(auth?.isSignedIn.get() ? "Ready" : "Not Linked");
    });
    window.addEventListener('online', handleNetworkRecovery);
    return () => window.removeEventListener('online', handleNetworkRecovery);
  }, []);

  const handleNetworkRecovery = () => {
    if (localStorage.getItem('POS_NEEDS_BACKUP') === 'true') triggerSmartSync();
  };

  const triggerSmartSync = async () => {
    if (!navigator.onLine) { setSyncStatus("Offline"); return; }
    setIsSyncing(true); setSyncStatus("Syncing...");
    const result = await googleDriveService.syncDataToDrive();
    if (result.success) {
      setSyncStatus(`Saved ${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`);
      localStorage.removeItem('POS_NEEDS_BACKUP');
    } else {
      setSyncStatus("Failed");
    }
    setIsSyncing(false);
  };

  const handleGoogleLogin = async () => {
    await googleDriveService.signIn();
    triggerSmartSync();
  };

  // FEATURE 5 & 6: Updated table click handler with customer name support
  const handleTableClick = async (tableNum: string, customerName?: string, source?: View) => {
    try {
      let order = await orderService.getOrderByTable(tableNum);
      if (!order) {
        // Create order with optional customer name
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

  return (
    <Layout>
      {/* HEADER */}
      <div className="flex justify-between items-center px-4 py-3 bg-white border-b shadow-sm mb-4">
        
        <div className="flex flex-col">
          <div className="text-sm font-extrabold text-gray-800">{appConfig.restaurantName}</div>
          <div className="text-[10px] text-gray-500 font-bold tracking-wide">{appConfig.restaurantAddress}</div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
             <div className={`w-2 h-2 rounded-full ${navigator.onLine ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
             <span className="text-xs font-bold text-gray-600">
               {isSyncing ? '☁️ Syncing...' : syncStatus}
             </span>
          </div>
          
          {isGapiReady && !(window as any).gapi?.auth2?.getAuthInstance()?.isSignedIn?.get() && (
             <button 
               onClick={handleGoogleLogin} 
               className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all"
             >
               Connect Backup
             </button>
          )}
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
        {/* FEATURE 5: TableGrid receives proper callback with source tracking */}
        {currentView === 'tables' && (
          <TableGrid onTableSelect={(t, name) => handleTableClick(t, name, 'tables')} />
        )}
        
        {currentView === 'active-list' && (
          <OrderList onSelectOrder={(t) => handleTableClick(t, undefined, 'active-list')} />
        )}
        
        {currentView === 'menu' && <MenuManager />}
        {currentView === 'sales' && <SalesDashboard />}
        
        {currentView === 'order' && activeOrder && (
          <OrderView order={activeOrder} onBack={handleCloseOrder} />
        )}
      </div>
    </Layout>
  )
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