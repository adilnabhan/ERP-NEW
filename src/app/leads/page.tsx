'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, X, Check, Phone } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  contact: string;
  enquiry_details: string;
  expected_payment: number;
  status: string;
  created_at: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newLead, setNewLead] = useState<Partial<Lead>>({ name: '', contact: '', enquiry_details: '', expected_payment: 0 });

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (data) setLeads(data);
  }

  async function saveLead() {
    if (!newLead.name || !newLead.contact) return alert('Name and contact are required');
    
    const { error } = await supabase.from('leads').insert([newLead]);
    if (!error) {
      setIsAdding(false);
      setNewLead({ name: '', contact: '', enquiry_details: '', expected_payment: 0 });
      fetchLeads();
    } else {
      alert('Error: ' + error.message);
    }
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from('leads').update({ status }).eq('id', id);
    if (!error) {
      if (status === 'Converted') {
        const lead = leads.find(l => l.id === id);
        if (lead) {
          await supabase.from('patients').insert([{
            name: lead.name,
            contact: lead.contact,
            status: 'Admitted'
          }]);
          alert('Patient converted and added to Patients list successfully!');
        }
      }
      fetchLeads();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Leads & Enquiries</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" /> New Enquiry
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
          <h2 className="text-lg font-medium mb-4">Add Enquiry</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="Full Name"
              className="border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-gray-900"
              value={newLead.name || ''}
              onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
            />
            <input
              placeholder="Contact Number"
              className="border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-gray-900"
              value={newLead.contact || ''}
              onChange={(e) => setNewLead({ ...newLead, contact: e.target.value })}
            />
            <input
              type="number"
              placeholder="Expected Payment"
              className="border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-gray-900"
              value={newLead.expected_payment || ''}
              onChange={(e) => setNewLead({ ...newLead, expected_payment: Number(e.target.value) })}
            />
            <input
              placeholder="Enquiry Details (e.g., specific treatment)"
              className="border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-gray-900"
              value={newLead.enquiry_details || ''}
              onChange={(e) => setNewLead({ ...newLead, enquiry_details: e.target.value })}
            />
          </div>
          <div className="flex space-x-3 mt-4">
            <button onClick={saveLead} className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800">
              Save
            </button>
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Pay</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {lead.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center text-indigo-600"><Phone className="w-3 h-3 mr-1"/> {lead.contact}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                  {lead.enquiry_details}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">
                  ₹{lead.expected_payment}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${lead.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : lead.status === 'Converted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {lead.status === 'Pending' && (
                    <div className="flex justify-end space-x-2">
                       <button onClick={() => updateStatus(lead.id, 'Converted')} className="text-green-600 hover:text-green-900 px-2 py-1 border border-green-200 rounded text-xs bg-green-50 flex items-center">
                        <Check className="w-3 h-3 mr-1" /> Convert
                       </button>
                       <button onClick={() => updateStatus(lead.id, 'Cancelled')} className="text-red-600 hover:text-red-900 px-2 py-1 border border-red-200 rounded text-xs bg-red-50 flex items-center">
                        <X className="w-3 h-3 mr-1" /> Cancel
                       </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
