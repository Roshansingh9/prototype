// src/components/MenuManager.tsx
import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product } from '../db/db';
import { categoryService } from '../services/categoryService';
import { productService } from '../services/productService';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MenuManager: React.FC = () => {
  const categories = useLiveQuery(() => db.categories.toArray(), []);
  const allProducts = useLiveQuery(() => db.products.toArray(), []);

  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'out'>('all');
  
  // Modals
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  
  // FEATURE 1: Delete Category Modal
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  // Form State
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState<Product | null>(null);

  useEffect(() => {
    if (!selectedCatId && categories && categories.length > 0) setSelectedCatId(categories[0].id);
  }, [categories]);

  let displayedProducts = allProducts;
  if (!globalSearch) {
    displayedProducts = displayedProducts?.filter(p => p.categoryId === selectedCatId);
  } else {
    displayedProducts = displayedProducts?.filter(p => p.name.toLowerCase().includes(globalSearch.toLowerCase()));
  }
  if (stockFilter === 'in') displayedProducts = displayedProducts?.filter(p => p.isAvailableNow !== false);
  if (stockFilter === 'out') displayedProducts = displayedProducts?.filter(p => p.isAvailableNow === false);

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await categoryService.addCategory(newCatName);
    setNewCatName('');
    setShowCatModal(false);
  };

  // FEATURE 1: Delete Category Handler
  const handleDeleteCategory = async () => {
    if (!deleteCatId) return;
    
    // Check if category has products
    const productsInCategory = allProducts?.filter(p => p.categoryId === deleteCatId);
    if (productsInCategory && productsInCategory.length > 0) {
      setDeleteError(`Cannot delete category with ${productsInCategory.length} items. Delete items first.`);
      return;
    }
    
    // Safe to delete
    await db.categories.delete(deleteCatId);
    setDeleteCatId(null);
    setDeleteError('');
    
    // Reset selection if deleted category was selected
    if (selectedCatId === deleteCatId && categories && categories.length > 1) {
      const remaining = categories.filter(c => c.id !== deleteCatId);
      setSelectedCatId(remaining[0]?.id || '');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodPrice || !selectedCatId) return;
    try {
      if (isEditing) {
        await db.products.update(isEditing.id, { 
          name: prodName, 
          price: parseFloat(prodPrice), 
          availableDays: selectedDays 
        });
        setIsEditing(null);
      } else {
        await db.products.add({ 
          id: crypto.randomUUID(), 
          categoryId: selectedCatId, 
          name: prodName, 
          price: parseFloat(prodPrice), 
          isActive: true, 
          availableDays: selectedDays, 
          isAvailableNow: true 
        });
      }
      setProdName(''); 
      setProdPrice(''); 
      setSelectedDays([]);
    } catch (err) { 
      alert("Error saving"); 
    }
  };

  const handleEditClick = (p: Product) => { 
    setIsEditing(p); 
    setProdName(p.name); 
    setProdPrice(p.price.toString()); 
    setSelectedDays(p.availableDays || []); 
    setSelectedCatId(p.categoryId); 
    setGlobalSearch(''); 
  };
  
  const handleDeleteProduct = async (id: string) => { 
    if (confirm("Delete this item?")) await productService.deleteProduct(id); 
  };
  
  const toggleAvailability = async (p: Product) => { 
    await db.products.update(p.id, { 
      isAvailableNow: !(p.isAvailableNow !== false) 
    }); 
  };
  
  const toggleDay = (day: string) => { 
    if (selectedDays.includes(day)) setSelectedDays(selectedDays.filter(d => d !== day)); 
    else setSelectedDays([...selectedDays, day]); 
  };

  const getAvailabilityDisplay = (product: Product) => {
    if (!product.availableDays || product.availableDays.length === 0) {
      return 'All days';
    }
    return product.availableDays.join(', ');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100 font-sans relative">
      
      {/* TOP BAR */}
      <div className="p-4 border-b bg-white flex items-center justify-between gap-6 z-20 shadow-sm">
        <div className="relative flex-1 max-w-lg">
          <span className="absolute left-3 top-3 text-gray-400">🔍</span>
          <input 
            className="w-full bg-gray-50 border-2 border-gray-200 pl-10 pr-4 py-2.5 rounded-xl font-bold text-gray-700 outline-none focus:border-blue-500 focus:bg-white transition-all" 
            placeholder="Search for items..." 
            value={globalSearch} 
            onChange={e => setGlobalSearch(e.target.value)} 
          />
        </div>
        <div className="flex bg-gray-100 p-1.5 rounded-xl border border-gray-200">
           {['all', 'in', 'out'].map((filter) => (
             <button 
               key={filter} 
               onClick={() => setStockFilter(filter as any)} 
               className={`px-5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-200 ${stockFilter === filter ? 'bg-white text-gray-800 shadow-md transform scale-105' : 'text-gray-500 hover:bg-gray-200'}`}
             >
               {filter === 'all' ? 'All' : filter === 'in' ? 'In Stock' : 'Out Stock'}
             </button>
           ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <div className="w-64 bg-gray-50 border-r flex flex-col">
          <div className="p-4">
            <button 
              onClick={() => setShowCatModal(true)} 
              className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-black transition-all text-sm flex items-center justify-center gap-2"
            >
              <span>+</span> New Category
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
            {categories?.map(cat => (
              <div 
                key={cat.id} 
                className={`group relative ${selectedCatId === cat.id && !globalSearch ? 'bg-white shadow-md rounded-xl' : ''}`}
              >
                <button 
                  onClick={() => { setSelectedCatId(cat.id); setGlobalSearch(''); }} 
                  className={`w-full text-left px-4 py-3.5 text-sm font-bold rounded-xl transition-all duration-200 flex justify-between items-center ${selectedCatId === cat.id && !globalSearch ? 'text-blue-700 border border-blue-100' : 'text-gray-500 hover:bg-white hover:shadow-sm'}`}
                >
                  <span>{cat.name}</span>
                </button>
                
                {/* FEATURE 1: Delete Icon (Shows on hover) */}
                <button
                  onClick={() => setDeleteCatId(cat.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1"
                  title="Delete Category"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col bg-white">
          {!globalSearch && selectedCatId && (
            <div className="p-5 bg-gradient-to-b from-blue-50 to-white border-b animate-fade-in">
               <form onSubmit={handleSaveProduct} className="flex flex-col gap-4">
                 <div className="flex gap-4 items-end">
                   <div className="flex-1">
                     <label className="text-[10px] uppercase font-extrabold text-blue-400 mb-1 block tracking-wider">Item Name</label>
                     <input 
                       className="w-full p-3 border border-blue-100 rounded-xl font-bold text-gray-700 outline-none focus:border-blue-500 bg-white" 
                       value={prodName} 
                       onChange={e => setProdName(e.target.value)} 
                       placeholder="Item Name" 
                     />
                   </div>
                   <div className="w-32">
                     <label className="text-[10px] uppercase font-extrabold text-blue-400 mb-1 block tracking-wider">Price</label>
                     <input 
                       className="w-full p-3 border border-blue-100 rounded-xl font-bold text-gray-700 outline-none focus:border-blue-500 bg-white" 
                       type="number" 
                       value={prodPrice} 
                       onChange={e => setProdPrice(e.target.value)} 
                       placeholder="0" 
                     />
                   </div>
                   <button className={`px-8 py-3 rounded-xl font-bold text-white shadow-md ${isEditing ? 'bg-orange-500' : 'bg-blue-600'}`}>
                     {isEditing ? 'Update' : 'Add'}
                   </button>
                   {isEditing && (
                     <button 
                       type="button" 
                       onClick={() => setIsEditing(null)} 
                       className="text-gray-400 text-xs underline"
                     >
                       Cancel
                     </button>
                   )}
                 </div>
                 <div className="flex gap-2 items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Availability:</span>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                      {DAYS.map(day => (
                        <button 
                          type="button" 
                          key={day} 
                          onClick={() => toggleDay(day)} 
                          className={`text-[10px] px-2.5 py-1 rounded-md font-bold transition-all ${selectedDays.includes(day) ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                 </div>
               </form>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50">
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
              {displayedProducts?.map(p => {
                const inStock = p.isAvailableNow !== false;
                return (
                  <div 
                    key={p.id} 
                    className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${!inStock && 'bg-gray-50'}`}
                  >
                    <div>
                      <div className={`font-bold text-lg ${inStock ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                        {p.name}
                      </div>
                      <div className="text-sm font-bold text-green-600 mt-1">₹{p.price}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {getAvailabilityDisplay(p)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                       <button 
                         onClick={() => toggleAvailability(p)} 
                         className={`text-[10px] px-3 py-1.5 rounded-full font-bold border transition-all ${inStock ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'}`}
                       >
                         {inStock ? '● IN STOCK' : '○ OUT OF STOCK'}
                       </button>
                       <div className="flex gap-2">
                         <button 
                           onClick={() => handleEditClick(p)} 
                           className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"
                         >
                           Edit
                         </button>
                         <button 
                           onClick={() => handleDeleteProduct(p.id)} 
                           className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"
                         >
                           Del
                         </button>
                       </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* NEW CATEGORY MODAL */}
      {showCatModal && (
        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl transform transition-all scale-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Category</h2>
            <form onSubmit={handleSaveCategory}>
              <input 
                autoFocus 
                className="w-full p-4 border-2 border-gray-200 rounded-xl font-bold text-lg outline-none focus:border-blue-500 mb-6" 
                placeholder="Category Name" 
                value={newCatName} 
                onChange={e => setNewCatName(e.target.value)} 
              />
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowCatModal(false)} 
                  className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FEATURE 1: DELETE CATEGORY CONFIRMATION MODAL */}
      {deleteCatId && (
        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 w-96 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              ⚠️
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Delete Category?</h3>
            <p className="text-gray-600 mb-6">
              {categories?.find(c => c.id === deleteCatId)?.name}
            </p>
            
            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4 text-sm">
                {deleteError}
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteCatId(null);
                  setDeleteError('');
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCategory}
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