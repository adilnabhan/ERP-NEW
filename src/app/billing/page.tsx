'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Download, TrendingUp, Calendar, IndianRupee } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function BillingPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [totals, setTotals] = useState({ today: 0, thisMonth: 0, total: 0 });

  useEffect(() => {
    fetchPayments();
  }, []);

  async function fetchPayments() {
    const { data } = await supabase.from('payments').select('*, patients(name)').order('payment_date', { ascending: false });
    if (data) {
      setPayments(data);
      calculateMetrics(data);
    }
  }

  function calculateMetrics(records: any[]) {
    let today = 0, thisMonth = 0, total = 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const todayStr = now.toLocaleDateString();

    const dailyMap: Record<string, number> = {};

    records.forEach(r => {
      const amt = Number(r.amount) || 0;
      const d = new Date(r.payment_date);
      
      total += amt;
      if (d.toLocaleDateString() === todayStr) today += amt;
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) thisMonth += amt;

      const dayKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyMap[dayKey] = (dailyMap[dayKey] || 0) + amt;
    });

    // Take last 7 days for chart
    const chartData = Object.entries(dailyMap).slice(0, 7).map(([k, v]) => ({ name: k, amount: v })).reverse();
    setDailyData(chartData);
    setTotals({ today, thisMonth, total });
  }

  function exportToExcel() {
    let csv = 'Payment ID,Date,Patient Name,Amount,Method,Type\n';
    payments.forEach(p => {
      const date = new Date(p.payment_date).toLocaleString();
      const patient = p.patients?.name || 'Unknown';
      csv += `${p.id},"${date}",${patient},${p.amount},${p.method || 'Cash'},${p.payment_type}\n`;
    });
    
    // Summary
    csv += `\nRevenue Summary\n`;
    csv += `Today,${totals.today}\n`;
    csv += `This Month,${totals.thisMonth}\n`;
    csv += `Overall Total,${totals.total}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Revenue_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 leading-tight">Billing & Revenue Ledger</h1>
        <button onClick={exportToExcel} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm text-sm font-medium">
          <Download className="w-4 h-4 mr-2" /> Download Excel Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
           <div className="p-4 bg-blue-50 text-blue-600 rounded-full"><Calendar className="w-6 h-6"/></div>
           <div><p className="text-sm font-medium text-gray-500">Today's Revenue</p><p className="text-2xl font-bold text-gray-900">₹{totals.today.toLocaleString()}</p></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
           <div className="p-4 bg-purple-50 text-purple-600 rounded-full"><TrendingUp className="w-6 h-6"/></div>
           <div><p className="text-sm font-medium text-gray-500">This Month's Revenue</p><p className="text-2xl font-bold text-gray-900">₹{totals.thisMonth.toLocaleString()}</p></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
           <div className="p-4 bg-green-50 text-green-600 rounded-full"><IndianRupee className="w-6 h-6"/></div>
           <div><p className="text-sm font-medium text-gray-500">Total All-Time</p><p className="text-2xl font-bold text-gray-900">₹{totals.total.toLocaleString()}</p></div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">Recent Transactions</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-100">
             <thead className="bg-white">
               <tr>
                 <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                 <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Patient</th>
                 <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                 <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Method</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-100 bg-white">
               {payments.map(p => (
                 <tr key={p.id} className="hover:bg-gray-50">
                   <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">{new Date(p.payment_date).toLocaleString()}</td>
                   <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{p.patients?.name || 'N/A'}</td>
                   <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-green-600">₹{p.amount.toLocaleString()}</td>
                   <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                     <span className={`px-2 py-1 text-xs rounded-md ${p.method === 'Online' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                       {p.method || 'Cash'}
                     </span>
                   </td>
                 </tr>
               ))}
               {payments.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400">No payments collected yet</td></tr>}
             </tbody>
          </table>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-96 flex flex-col">
          <h3 className="font-bold text-gray-800 mb-4">Daily Revenue (Last 7 Days)</h3>
          <div className="flex-1 min-h-0">
             {dailyData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7280'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7280'}} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="amount" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                  </BarChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-gray-400">Not enough data</div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
