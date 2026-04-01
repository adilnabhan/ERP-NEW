'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Download, User, Calendar, FileText } from 'lucide-react';

export default function DischargedPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [searchPhone, setSearchPhone] = useState('');

  useEffect(() => {
    fetchDischargedData();
  }, []);

  async function fetchDischargedData() {
    const { data } = await supabase
      .from('patients')
      .select('*, doctors(name), rooms(room_number), billing(*)')
      .eq('status', 'Discharged')
      .order('discharge_date', { ascending: false });
      
    if (data) setPatients(data);
  }

  const filteredPatients = patients.filter(p => p.contact?.includes(searchPhone) || p.name?.toLowerCase().includes(searchPhone.toLowerCase()));

  function downloadCSV() {
    let csv = 'Name,Contact,Aadhar,Admitted Date,Discharge Date,Total Paid\n';
    patients.forEach(p => {
      const totalPaid = p.billing?.[0]?.total_paid || 0;
      csv += `${p.name},${p.contact},${p.aadhar || ''},${new Date(p.admission_date).toLocaleDateString()},${new Date(p.discharge_date).toLocaleDateString()},${totalPaid}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'discharged_patients_export.csv';
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 leading-tight flex items-center">
           <FileText className="w-6 h-6 mr-2 text-indigo-600"/> Discharged Archive
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by Phone/Name" 
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:ring-gray-900 focus:border-gray-900 outline-none text-sm w-64 shadow-sm"
              value={searchPhone}
              onChange={e => setSearchPhone(e.target.value)}
            />
          </div>
          <button onClick={downloadCSV} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm text-sm font-medium">
            <Download className="w-4 h-4 mr-2" /> Export Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Patient Name</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contact Details</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Admitted On</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Discharged On</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Total Billed Amt</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredPatients.map((patient) => (
              <tr key={patient.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-bold text-gray-900">{patient.name}</div>
                      <div className="text-xs text-gray-500">Age: {patient.age || 'N/A'} • {patient.blood_group || 'No BG'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{patient.contact}</div>
                  <div className="text-xs text-gray-500">{patient.aadhar ? `Aadhar: ${patient.aadhar}` : ''}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center"><Calendar className="w-3 h-3 mr-1"/> {new Date(patient.admission_date).toLocaleDateString()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center text-red-600 font-medium"><FileText className="w-3 h-3 mr-1"/> {new Date(patient.discharge_date).toLocaleDateString()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-sm font-bold text-gray-700 mb-1">₹{patient.billing?.[0]?.total_paid || 0} Paid</div>
                  <span className="px-2 inline-flex text-[10px] leading-5 font-bold uppercase tracking-wider rounded-md bg-gray-200 text-gray-600">
                    Discharged
                  </span>
                </td>
              </tr>
            ))}
            {filteredPatients.length === 0 && (
               <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500 italic">No discharged patients found.</td>
               </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
