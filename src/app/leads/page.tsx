'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, X, Check, Phone, Calendar, BedDouble, AlertTriangle } from 'lucide-react';

interface Room {
  id: string;
  room_number: string;
  type: string;
  status: string;
  ac_type: string;
  bed_type: string;
}

interface Lead {
  id: string;
  name: string;
  contact: string;
  enquiry_details: string;
  expected_payment: number;
  status: string;
  created_at: string;
  booking_date: string | null;
  room_id: string | null;
  rooms?: Room | null;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newLead, setNewLead] = useState<Partial<Lead>>({
    name: '', contact: '', enquiry_details: '', expected_payment: 0,
    booking_date: '', room_id: ''
  });
  const [availabilityWarning, setAvailabilityWarning] = useState('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setLoading(true);
    const [leadsRes, roomsRes] = await Promise.all([
      supabase.from('leads').select('*, rooms(id, room_number, type, ac_type, bed_type)').order('created_at', { ascending: false }),
      supabase.from('rooms').select('*').order('room_number')
    ]);
    if (leadsRes.data) setLeads(leadsRes.data);
    if (roomsRes.data) setRooms(roomsRes.data);
    setLoading(false);
  }

  // Check if a room is already booked for a particular date
  async function checkRoomAvailability(roomId: string, date: string) {
    if (!roomId || !date) {
      setAvailabilityWarning('');
      return;
    }
    setCheckingAvailability(true);

    // Check leads table for same room + date
    const { data: leadBookings } = await supabase
      .from('leads')
      .select('id, name')
      .eq('room_id', roomId)
      .eq('booking_date', date)
      .in('status', ['Pending', 'Converted']);

    // Check patients table for same room on that date (admitted patients)
    const { data: patientBookings } = await supabase
      .from('patients')
      .select('id, name')
      .eq('room_id', roomId)
      .eq('status', 'Admitted');

    const room = rooms.find(r => r.id === roomId);
    let warnings: string[] = [];

    if (leadBookings && leadBookings.length > 0) {
      warnings.push(`⚠️ Already booked by lead "${leadBookings[0].name}" on this date`);
    }
    if (patientBookings && patientBookings.length > 0) {
      warnings.push(`⚠️ Room occupied by patient "${patientBookings[0].name}"`);
    }
    if (room && room.status === 'Occupied') {
      if (warnings.length === 0) warnings.push('⚠️ Room is currently occupied');
    }

    setAvailabilityWarning(warnings.join(' | '));
    setCheckingAvailability(false);
  }

  function handleRoomOrDateChange(field: 'room_id' | 'booking_date', value: string) {
    const updated = { ...newLead, [field]: value };
    setNewLead(updated);
    const roomId = field === 'room_id' ? value : (newLead.room_id || '');
    const date = field === 'booking_date' ? value : (newLead.booking_date || '');
    checkRoomAvailability(roomId, date);
  }

  async function saveLead() {
    if (!newLead.name || !newLead.contact) return alert('Name and contact are required');

    const insertData: any = {
      name: newLead.name,
      contact: newLead.contact,
      enquiry_details: newLead.enquiry_details,
      expected_payment: newLead.expected_payment
    };
    if (newLead.booking_date) insertData.booking_date = newLead.booking_date;
    if (newLead.room_id) insertData.room_id = newLead.room_id;

    const { error } = await supabase.from('leads').insert([insertData]);
    if (!error) {
      setIsAdding(false);
      setNewLead({ name: '', contact: '', enquiry_details: '', expected_payment: 0, booking_date: '', room_id: '' });
      setAvailabilityWarning('');
      fetchAllData();
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
          // Create patient with room assignment from lead
          const patientData: any = {
            name: lead.name,
            contact: lead.contact,
            status: 'Admitted'
          };
          if (lead.room_id) patientData.room_id = lead.room_id;
          if (lead.booking_date) patientData.admission_date = lead.booking_date;

          const { data: newPatient } = await supabase.from('patients').insert([patientData]).select().single();

          // Mark room as occupied if assigned
          if (lead.room_id) {
            await supabase.from('rooms').update({ status: 'Occupied' }).eq('id', lead.room_id);
          }

          // Create billing record for the new patient
          if (newPatient) {
            await supabase.from('billing').insert([{ patient_id: newPatient.id }]);
          }

          alert('Lead converted! Patient created with room & date from booking.');
        }
      }
      fetchAllData();
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Leads & Enquiries</h1>
        <div className="text-center py-12 text-gray-500">Loading data...</div>
      </div>
    );
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Full Name *</label>
              <input
                placeholder="Full Name"
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-gray-900"
                value={newLead.name || ''}
                onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Contact Number *</label>
              <input
                placeholder="Contact Number"
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-gray-900"
                value={newLead.contact || ''}
                onChange={(e) => setNewLead({ ...newLead, contact: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Expected Payment</label>
              <input
                type="number"
                placeholder="Expected Payment"
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-gray-900"
                value={newLead.expected_payment || ''}
                onChange={(e) => setNewLead({ ...newLead, expected_payment: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Enquiry Details</label>
              <input
                placeholder="e.g., specific treatment"
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-gray-900"
                value={newLead.enquiry_details || ''}
                onChange={(e) => setNewLead({ ...newLead, enquiry_details: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                <Calendar className="w-3 h-3 inline mr-1" /> Booking Date
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-gray-900"
                value={newLead.booking_date || ''}
                onChange={(e) => handleRoomOrDateChange('booking_date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                <BedDouble className="w-3 h-3 inline mr-1" /> Book Room
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-gray-900 bg-white"
                value={newLead.room_id || ''}
                onChange={(e) => handleRoomOrDateChange('room_id', e.target.value)}
              >
                <option value="">-- Select Room --</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    Room {r.room_number} • {r.ac_type || 'Non-AC'} • {r.bed_type || 'Single'} • {r.type}
                    {r.status === 'Occupied' ? ' (Occupied)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Availability Warning */}
          {availabilityWarning && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 font-medium">{availabilityWarning}</div>
            </div>
          )}
          {checkingAvailability && (
            <div className="mt-2 text-xs text-gray-400">Checking availability...</div>
          )}

          <div className="flex space-x-3 mt-4">
            <button onClick={saveLead} className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800">
              Save
            </button>
            <button onClick={() => { setIsAdding(false); setAvailabilityWarning(''); }} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {lead.booking_date ? (
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                      {new Date(lead.booking_date + 'T00:00:00').toLocaleDateString()}
                    </div>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {lead.rooms ? (
                    <div>
                      <div className="font-medium text-gray-900 flex items-center">
                        <BedDouble className="w-3 h-3 mr-1 text-gray-400" />
                        Room {lead.rooms.room_number}
                      </div>
                      <div className="flex gap-1 mt-1">
                        <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px] font-medium">
                          {lead.rooms.ac_type || 'Non-AC'}
                        </span>
                        <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded text-[10px] font-medium">
                          {lead.rooms.bed_type || 'Single'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
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
