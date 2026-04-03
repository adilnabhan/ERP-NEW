'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, X, Check, Phone, Calendar, BedDouble, AlertTriangle, Edit2, Trash2 } from 'lucide-react';

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

const emptyForm = { name: '', contact: '', enquiry_details: '', expected_payment: 0, booking_date: '', room_id: '' };

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newLead, setNewLead] = useState<Partial<Lead>>(emptyForm);
  const [availabilityWarning, setAvailabilityWarning] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [editWarning, setEditWarning] = useState('');

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

  // Check if same room + same date already booked in leads (simple check)
  const checkBooking = useCallback(async (roomId: string, date: string, excludeId?: string) => {
    if (!roomId || !date) return '';
    let query = supabase
      .from('leads')
      .select('id, name')
      .eq('room_id', roomId)
      .eq('booking_date', date);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data } = await query;
    if (data && data.length > 0) {
      return `This room is already booked for this date by "${data[0].name}"`;
    }
    return '';
  }, []);

  // --- ADD handlers ---
  async function handleAddFieldChange(field: 'room_id' | 'booking_date', value: string) {
    const updated = { ...newLead, [field]: value };
    setNewLead(updated);
    const roomId = field === 'room_id' ? value : (newLead.room_id || '');
    const date = field === 'booking_date' ? value : (newLead.booking_date || '');
    const warning = await checkBooking(roomId, date);
    setAvailabilityWarning(warning);
  }

  async function saveLead() {
    if (!newLead.name || !newLead.contact) return alert('Name and contact are required');

    // Block save if already booked
    if (availabilityWarning) return alert(availabilityWarning);

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
      setNewLead({ ...emptyForm });
      setAvailabilityWarning('');
      fetchAllData();
    } else {
      alert('Error: ' + error.message);
    }
  }

  // --- EDIT handlers ---
  function startEdit(lead: Lead) {
    setEditingId(lead.id);
    setEditForm({
      name: lead.name,
      contact: lead.contact,
      enquiry_details: lead.enquiry_details,
      expected_payment: lead.expected_payment,
      booking_date: lead.booking_date || '',
      room_id: lead.room_id || '',
    });
    setEditWarning('');
  }

  async function handleEditFieldChange(field: 'room_id' | 'booking_date', value: string) {
    const updated = { ...editForm, [field]: value };
    setEditForm(updated);
    const roomId = field === 'room_id' ? value : (editForm.room_id || '');
    const date = field === 'booking_date' ? value : (editForm.booking_date || '');
    const warning = await checkBooking(roomId, date, editingId || undefined);
    setEditWarning(warning);
  }

  async function saveEdit() {
    if (!editingId) return;
    if (!editForm.name || !editForm.contact) return alert('Name and contact are required');
    if (editWarning) return alert(editWarning);

    const updateData: any = {
      name: editForm.name,
      contact: editForm.contact,
      enquiry_details: editForm.enquiry_details,
      expected_payment: editForm.expected_payment,
    };
    if (editForm.booking_date) updateData.booking_date = editForm.booking_date;
    else updateData.booking_date = null;
    if (editForm.room_id) updateData.room_id = editForm.room_id;
    else updateData.room_id = null;

    const { error } = await supabase.from('leads').update(updateData).eq('id', editingId);
    if (!error) {
      setEditingId(null);
      setEditForm({});
      setEditWarning('');
      fetchAllData();
    } else {
      alert('Error: ' + error.message);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
    setEditWarning('');
  }

  // --- DELETE handler ---
  async function deleteLead(id: string) {
    if (!confirm('Are you sure you want to delete this enquiry?')) return;
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (!error) fetchAllData();
    else alert('Error: ' + error.message);
  }

  // --- STATUS handler ---
  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from('leads').update({ status }).eq('id', id);
    if (!error) {
      if (status === 'Converted') {
        const lead = leads.find(l => l.id === id);
        if (lead) {
          const patientData: any = {
            name: lead.name,
            contact: lead.contact,
            status: 'Admitted'
          };
          if (lead.room_id) patientData.room_id = lead.room_id;
          if (lead.booking_date) patientData.admission_date = lead.booking_date;

          const { data: newPatient } = await supabase.from('patients').insert([patientData]).select().single();

          if (lead.room_id) {
            await supabase.from('rooms').update({ status: 'Occupied' }).eq('id', lead.room_id);
          }

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

  // Room select dropdown (no occupied label)
  const roomOptions = rooms.map(r => (
    <option key={r.id} value={r.id}>
      Room {r.room_number} • {r.ac_type || 'Non-AC'} • {r.bed_type || 'Single'}
    </option>
  ));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">Leads & Enquiries</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center px-3 py-2 md:px-4 md:py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors text-sm"
        >
          <Plus className="w-4 h-4 mr-1 md:mr-2" /> New Enquiry
        </button>
      </div>

      {/* ADD FORM */}
      {isAdding && (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
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
                onChange={(e) => handleAddFieldChange('booking_date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                <BedDouble className="w-3 h-3 inline mr-1" /> Book Room
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-gray-900 bg-white"
                value={newLead.room_id || ''}
                onChange={(e) => handleAddFieldChange('room_id', e.target.value)}
              >
                <option value="">-- Select Room --</option>
                {roomOptions}
              </select>
            </div>
          </div>

          {/* Already booked warning */}
          {availabilityWarning && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 font-medium">{availabilityWarning}</div>
            </div>
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

      {/* DESKTOP TABLE — hidden on mobile */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
              editingId === lead.id ? (
                // EDIT ROW
                <tr key={lead.id} className="bg-blue-50/30">
                  <td className="px-6 py-3">
                    <input className="w-full border rounded px-2 py-1 text-sm" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                  </td>
                  <td className="px-6 py-3">
                    <input className="w-full border rounded px-2 py-1 text-sm" value={editForm.contact || ''} onChange={e => setEditForm({...editForm, contact: e.target.value})} />
                  </td>
                  <td className="px-6 py-3">
                    <input className="w-full border rounded px-2 py-1 text-sm" value={editForm.enquiry_details || ''} onChange={e => setEditForm({...editForm, enquiry_details: e.target.value})} />
                  </td>
                  <td className="px-6 py-3">
                    <input type="date" className="border rounded px-2 py-1 text-sm" value={editForm.booking_date || ''} onChange={e => handleEditFieldChange('booking_date', e.target.value)} />
                  </td>
                  <td className="px-6 py-3">
                    <select className="border rounded px-2 py-1 text-sm bg-white" value={editForm.room_id || ''} onChange={e => handleEditFieldChange('room_id', e.target.value)}>
                      <option value="">-- None --</option>
                      {roomOptions}
                    </select>
                    {editWarning && <div className="text-xs text-red-600 mt-1">{editWarning}</div>}
                  </td>
                  <td className="px-6 py-3">
                    <input type="number" className="w-20 border rounded px-2 py-1 text-sm" value={editForm.expected_payment || ''} onChange={e => setEditForm({...editForm, expected_payment: Number(e.target.value)})} />
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">—</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={saveEdit} className="text-green-600 hover:text-green-900 p-1 border border-green-200 rounded bg-green-50" title="Save"><Check className="w-4 h-4"/></button>
                      <button onClick={cancelEdit} className="text-gray-600 hover:text-gray-900 p-1 border border-gray-200 rounded bg-gray-50" title="Cancel"><X className="w-4 h-4"/></button>
                    </div>
                  </td>
                </tr>
              ) : (
                // DISPLAY ROW
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lead.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center text-indigo-600"><Phone className="w-3 h-3 mr-1"/> {lead.contact}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{lead.enquiry_details}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lead.booking_date ? (
                      <div className="flex items-center"><Calendar className="w-3 h-3 mr-1 text-gray-400" />{new Date(lead.booking_date + 'T00:00:00').toLocaleDateString()}</div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {lead.rooms ? (
                      <div>
                        <div className="font-medium text-gray-900 flex items-center"><BedDouble className="w-3 h-3 mr-1 text-gray-400" /> Room {lead.rooms.room_number}</div>
                        <div className="flex gap-1 mt-1">
                          <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px] font-medium">{lead.rooms.ac_type || 'Non-AC'}</span>
                          <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded text-[10px] font-medium">{lead.rooms.bed_type || 'Single'}</span>
                        </div>
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">₹{lead.expected_payment}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${lead.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : lead.status === 'Converted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-1">
                      <button onClick={() => startEdit(lead)} className="text-blue-600 hover:text-blue-900 p-1 border border-blue-200 rounded bg-blue-50" title="Edit">
                        <Edit2 className="w-3.5 h-3.5"/>
                      </button>
                      <button onClick={() => deleteLead(lead.id)} className="text-red-600 hover:text-red-900 p-1 border border-red-200 rounded bg-red-50" title="Delete">
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                      {lead.status === 'Pending' && (
                        <>
                          <button onClick={() => updateStatus(lead.id, 'Converted')} className="text-green-600 hover:text-green-900 px-2 py-1 border border-green-200 rounded text-xs bg-green-50 flex items-center">
                            <Check className="w-3 h-3 mr-1" /> Convert
                          </button>
                          <button onClick={() => updateStatus(lead.id, 'Cancelled')} className="text-red-600 hover:text-red-900 px-2 py-1 border border-red-200 rounded text-xs bg-red-50 flex items-center">
                            <X className="w-3 h-3 mr-1" /> Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No enquiries found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS — visible only on mobile */}
      <div className="md:hidden space-y-3">
        {leads.map((lead) => (
          editingId === lead.id ? (
            // MOBILE EDIT CARD
            <div key={lead.id} className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Name</label>
                  <input className="w-full border rounded-md px-3 py-2 text-sm mt-1" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Contact</label>
                  <input className="w-full border rounded-md px-3 py-2 text-sm mt-1" value={editForm.contact || ''} onChange={e => setEditForm({...editForm, contact: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Details</label>
                  <input className="w-full border rounded-md px-3 py-2 text-sm mt-1" value={editForm.enquiry_details || ''} onChange={e => setEditForm({...editForm, enquiry_details: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Booking Date</label>
                  <input type="date" className="w-full border rounded-md px-3 py-2 text-sm mt-1" value={editForm.booking_date || ''} onChange={e => handleEditFieldChange('booking_date', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Room</label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm mt-1 bg-white" value={editForm.room_id || ''} onChange={e => handleEditFieldChange('room_id', e.target.value)}>
                    <option value="">-- None --</option>
                    {roomOptions}
                  </select>
                  {editWarning && <div className="text-xs text-red-600 mt-1">{editWarning}</div>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Expected Payment</label>
                  <input type="number" className="w-full border rounded-md px-3 py-2 text-sm mt-1" value={editForm.expected_payment || ''} onChange={e => setEditForm({...editForm, expected_payment: Number(e.target.value)})} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={saveEdit} className="flex-1 py-2 bg-green-600 text-white rounded-md text-sm font-medium">Save</button>
                <button onClick={cancelEdit} className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium">Cancel</button>
              </div>
            </div>
          ) : (
            // MOBILE DISPLAY CARD
            <div key={lead.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-gray-900">{lead.name}</div>
                  <div className="flex items-center text-sm text-indigo-600 mt-0.5"><Phone className="w-3 h-3 mr-1"/> {lead.contact}</div>
                </div>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${lead.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : lead.status === 'Converted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {lead.status}
                </span>
              </div>
              {lead.enquiry_details && <p className="text-sm text-gray-500 mb-2">{lead.enquiry_details}</p>}
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <span className="text-gray-400 text-xs">Date</span>
                  <div className="text-gray-700 flex items-center">
                    {lead.booking_date ? (<><Calendar className="w-3 h-3 mr-1 text-gray-400" />{new Date(lead.booking_date + 'T00:00:00').toLocaleDateString()}</>) : '—'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Room</span>
                  <div className="text-gray-700">
                    {lead.rooms ? <>Room {lead.rooms.room_number}</> : '—'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Expected Pay</span>
                  <div className="font-semibold text-gray-700">₹{lead.expected_payment}</div>
                </div>
                {lead.rooms && (
                  <div>
                    <span className="text-gray-400 text-xs">Type</span>
                    <div className="flex gap-1 mt-0.5">
                      <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px] font-medium">{lead.rooms.ac_type || 'Non-AC'}</span>
                      <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded text-[10px] font-medium">{lead.rooms.bed_type || 'Single'}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 border-t border-gray-100 pt-3">
                <button onClick={() => startEdit(lead)} className="flex items-center text-xs text-blue-600 border border-blue-200 rounded px-2 py-1 bg-blue-50">
                  <Edit2 className="w-3 h-3 mr-1"/> Edit
                </button>
                <button onClick={() => deleteLead(lead.id)} className="flex items-center text-xs text-red-600 border border-red-200 rounded px-2 py-1 bg-red-50">
                  <Trash2 className="w-3 h-3 mr-1"/> Delete
                </button>
                {lead.status === 'Pending' && (
                  <>
                    <button onClick={() => updateStatus(lead.id, 'Converted')} className="flex items-center text-xs text-green-600 border border-green-200 rounded px-2 py-1 bg-green-50">
                      <Check className="w-3 h-3 mr-1"/> Convert
                    </button>
                    <button onClick={() => updateStatus(lead.id, 'Cancelled')} className="flex items-center text-xs text-red-600 border border-red-200 rounded px-2 py-1 bg-red-50">
                      <X className="w-3 h-3 mr-1"/> Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        ))}
        {leads.length === 0 && (
          <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-gray-200">No enquiries found.</div>
        )}
      </div>
    </div>
  );
}
