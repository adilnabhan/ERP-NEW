'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Bed, Activity, TrendingUp, Calendar, Download } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState({ patients: 0, rooms: 0, doctors: 0, admissions: 0 });
  const [revenue, setRevenue] = useState({ today: 0, month: 0, total: 0 });
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const [pRes, rRes, dRes, aRes] = await Promise.all([
      supabase.from('patients').select('id', { count: 'exact' }),
      supabase.from('rooms').select('id', { count: 'exact' }).eq('status', 'Available'),
      supabase.from('doctors').select('id', { count: 'exact' }).eq('status', 'Available'),
      supabase.from('patients').select('id', { count: 'exact' }).gte('admission_date', todayStr),
    ]);

    setStats({
      patients: pRes.count || 0,
      rooms: rRes.count || 0,
      doctors: dRes.count || 0,
      admissions: aRes.count || 0,
    });

    const { data: payments } = await supabase.from('payments').select('*');
    if (payments) {
      setAllPayments(payments);
      calculateRevenue(payments);
    }
  }

  function calculateRevenue(payments: any[]) {
    let t = 0, m = 0, total = 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const todayDate = now.toLocaleDateString();

    const map: Record<string, number> = {};

    payments.forEach(p => {
      const amt = Number(p.amount) || 0;
      const d = new Date(p.payment_date);
      total += amt;
      if (d.toLocaleDateString() === todayDate) t += amt;
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) m += amt;

      const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      map[dateKey] = (map[dateKey] || 0) + amt;
    });

    setRevenue({ today: t, month: m, total });
    
    const chartData = Object.entries(map).slice(0, 7).map(([k, v]) => ({ name: k, Amount: v })).reverse();
    setDailyData(chartData);
  }

  function exportRevenueExcel() {
    let csv = 'Payment ID,Date,Amount,Method,Type\n';
    allPayments.forEach(p => {
      csv += `${p.id},"${new Date(p.payment_date).toLocaleString()}",${p.amount},${p.method || 'Cash'},${p.payment_type}\n`;
    });
    
    csv += `\n--- Automated Revenue Summary ---\n`;
    csv += `Today's Date,${new Date().toLocaleDateString()}\n`;
    csv += `Today's Revenue,${revenue.today}\n`;
    csv += `This Month's Revenue,${revenue.month}\n`;
    csv += `Total All Time,${revenue.total}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Live_Revenue_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard & Revenue Overview</h1>
        <div className="flex gap-3">
           <button onClick={exportRevenueExcel} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm text-sm font-medium">
             <Download className="w-4 h-4 mr-2" /> Export Revenue Excel
           </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full"><Users className="h-6 w-6" /></div>
          <div><p className="text-sm font-medium text-gray-500">Total Patients</p><p className="text-2xl font-bold text-gray-900">{stats.patients}</p></div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-full"><Bed className="h-6 w-6" /></div>
          <div><p className="text-sm font-medium text-gray-500">Available Rooms</p><p className="text-2xl font-bold text-gray-900">{stats.rooms}</p></div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full"><Calendar className="h-6 w-6" /></div>
          <div><p className="text-sm font-medium text-gray-500">Today's Revenue</p><p className="text-2xl font-bold text-gray-900">₹{revenue.today.toLocaleString()}</p></div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-full"><TrendingUp className="h-6 w-6" /></div>
          <div><p className="text-sm font-medium text-gray-500">Monthly Revenue</p><p className="text-2xl font-bold text-gray-900">₹{revenue.month.toLocaleString()}</p></div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm w-full">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Activity className="w-5 h-5 mr-2 text-blue-500"/> Revenue Trend (Graphical View)</h2>
        <div className="h-80 w-full">
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7280'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7280'}} tickFormatter={(v) => `₹${v}`} />
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Area type="monotone" dataKey="Amount" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorAmt)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">Loading graphical data...</div>
          )}
        </div>
      </div>
    </div>
  );
}
