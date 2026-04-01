'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Check, X, Pill } from 'lucide-react';

interface Treatment {
  id: string;
  name: string;
  price: number;
}

export default function TreatmentsPage() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTreatment, setNewTreatment] = useState<Partial<Treatment>>({ name: '', price: 0 });

  useEffect(() => {
    fetchTreatments();
  }, []);

  async function fetchTreatments() {
    const { data } = await supabase.from('treatment_catalog').select('*').order('name');
    if (data) setTreatments(data);
  }

  async function saveTreatment() {
    if (!newTreatment.name || !newTreatment.price) return alert('Name and Price are required');
    
    const { error } = await supabase.from('treatment_catalog').insert([newTreatment]);
    if (!error) {
      setIsAdding(false);
      setNewTreatment({ name: '', price: 0 });
      fetchTreatments();
    } else {
      alert('Error: ' + error.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Treatment Catalog</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Treatment
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
          <h2 className="text-lg font-medium mb-4 text-gray-800">New Treatment details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Pill className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  placeholder="e.g. Ayurvedic Face Massage"
                  className="pl-10 border border-gray-300 rounded-md w-full px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  value={newTreatment.name || ''}
                  onChange={(e) => setNewTreatment({ ...newTreatment, name: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
              <input
                type="number"
                placeholder="Amount"
                className="border border-gray-300 rounded-md w-full px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                value={newTreatment.price || ''}
                onChange={(e) => setNewTreatment({ ...newTreatment, price: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex space-x-3 mt-5">
            <button onClick={saveTreatment} className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 shadow-sm flex items-center">
              <Check className="w-4 h-4 mr-2" /> Save Procedure
            </button>
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 border border-gray-300 bg-white font-medium text-gray-700 rounded-md hover:bg-gray-50 flex items-center">
              <X className="w-4 h-4 mr-2" /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {treatments.map((t) => (
          <div key={t.id} className="bg-white border text-center border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Pill className="w-6 h-6 text-indigo-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{t.name}</h3>
            <p className="text-2xl font-extrabold text-indigo-600 mt-2 hover:text-indigo-700 cursor-default">₹{t.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
