// src/components/TableGrid.tsx - CORRECTED VERSION
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { orderService } from '../services/orderService';

const TABLE_GROUPS = {
  'A Tables': ['A1', 'A2', 'A3', 'A4'],
  'B Tables': ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'],
  'C Tables': ['C1', 'C2', 'C3', 'C4'],
  'D Tables': ['D1', 'D2', 'D3', 'D4', 'D5', 'D6']
};

interface TableGridProps {
  onTableSelect?: (tableNum: string, customerName?: string) => void;
}

export const TableGrid: React.FC<TableGridProps> = ({ onTableSelect }) => {
  const activeTables = useLiveQuery(() => orderService.getActiveTables(), []);
  
  // ONLY customer name input (no table number input)
  const [customerName, setCustomerName] = useState('');

  const handleGoToMenu = () => {
    const finalName = customerName.trim() || 'Walk-in';
    const walkInTableId = `Walk-in-${Date.now()}`;
    onTableSelect?.(walkInTableId, finalName);
    setCustomerName('');
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* CORRECTED: Flexible entry AT TOP, original colors restored */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Walk-in Order</h3>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Name (Optional)
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGoToMenu()}
              placeholder="Customer name (optional)"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg"
            />
          </div>
          <button
            onClick={handleGoToMenu}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-colors"
          >
            Go to Menu
          </button>
        </div>
      </div>

      {/* UNCHANGED: Rest of the component stays exactly the same */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Select Table</h2>
        <p className="text-gray-500 text-sm mb-6">Choose a table to start or continue order</p>
      </div>
      
      <div className="space-y-6">
        {Object.entries(TABLE_GROUPS).map(([groupName, tables]) => (
          <div key={groupName} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-700 mb-4 pb-2 border-b border-gray-200">
              {groupName}
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {tables.map((tableNum) => {
                const isOccupied = activeTables?.includes(tableNum);
                
                return (
                  <button
                    key={tableNum}
                    onClick={() => onTableSelect && onTableSelect(tableNum)}
                    className={`
                      h-24 rounded-xl shadow-md flex flex-col items-center justify-center
                      transition-all transform hover:scale-105 font-bold text-lg
                      ${isOccupied 
                        ? 'bg-red-500 text-white hover:bg-red-600' 
                        : 'bg-green-100 text-green-800 hover:bg-green-200 border-2 border-green-400'}
                    `}
                  >
                    <span className="text-2xl mb-1">{tableNum}</span>
                    <span className="text-xs uppercase tracking-wide opacity-75">
                      {isOccupied ? 'Occupied' : 'Empty'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};