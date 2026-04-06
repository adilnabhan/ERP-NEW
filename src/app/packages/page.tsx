'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Library, Clock, BedDouble } from 'lucide-react';

export default function PackagesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [pkgRes, prcRes] = await Promise.all([
      supabase.from('packages').select('*').order('duration_days', { ascending: true }),
      supabase.from('room_package_prices').select('*').order('room_number', { ascending: true })
    ]);
    
    if (pkgRes.data) setPackages(pkgRes.data);
    if (prcRes.data) setPrices(prcRes.data);
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Treatment Packages</h1>
          <p className="text-sm text-gray-500 mt-1">Configured packages and their dynamic room pricing matrix</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
      ) : (
        <>
          {/* Top Row: Packages Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {packages.map((pkg) => (
              <div key={pkg.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center space-x-4 hover:shadow-md transition">
                <div className="bg-indigo-50 p-3 rounded-full">
                  <Clock className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{pkg.name}</h3>
                  <p className="text-sm text-indigo-600 font-medium">{pkg.duration_days} Days Duration</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Table: Dynamic Room Pricing Matrix */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gray-50 flex items-center">
              <BedDouble className="w-5 h-5 text-gray-500 mr-2" />
              <h2 className="text-lg font-bold text-gray-800">Dynamic Room Pricing Matrix</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Room No</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Room Name</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider border-l border-gray-200">Sutika Care</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Purna Shakti</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Suvarna 21</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Sampurna Raksha</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 hover:bg-gray-50/50">
                  {prices.map((row) => (
                    <tr key={row.id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{row.room_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{row.room_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-indigo-700 border-l border-gray-100 bg-gray-50/30">₹{row.sutika_care_price?.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-700 bg-gray-50/30">₹{row.purna_shakti_price?.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-orange-700 bg-gray-50/30">₹{row.suvarna_21_price?.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-purple-700 bg-gray-50/30">₹{row.sampurna_raksha_price?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
