// src/components/TableGrid.tsx
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { orderService } from '../services/orderService';

// FEATURE 2: Structured table pattern (A1-D6) inspired by HTML
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
  
  // FEATURE 6: Walk-in custom name state
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInName, setWalkInName] = useState('');

  const handleWalkInSubmit = () => {
    const finalName = walkInName.trim() || 'Walk-in';
    const tableId = `Walk-in-${Date.now()}`;
    onTableSelect?.(tableId, finalName);
    setWalkInName('');
    setShowWalkInModal(false);
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🍽️ Select Table</h2>
          <p className="text-gray-500 text-sm">Choose a table to start or continue order</p>
        </div>
        
        {/* FEATURE 6: Walk-in Button */}
        <button
          onClick={() => setShowWalkInModal(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all"
        >
          <span>🚶</span> Walk-in Order
        </button>
      </div>
      
      {/* FEATURE 2: Grouped Table Layout */}
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

      {/* FEATURE 6: Walk-in Custom Name Modal */}
      {showWalkInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Walk-in Customer</h3>
            <p className="text-gray-600 mb-6 text-sm">
              Enter customer name (optional). Leave empty for "Walk-in".
            </p>
            
            <input
              type="text"
              placeholder="Customer Name (optional)"
              value={walkInName}
              onChange={(e) => setWalkInName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleWalkInSubmit()}
              className="w-full p-4 border-2 border-gray-200 rounded-xl font-bold text-lg outline-none focus:border-orange-500 mb-6"
              autoFocus
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowWalkInModal(false);
                  setWalkInName('');
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleWalkInSubmit}
                className="flex-1 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};