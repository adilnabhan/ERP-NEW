'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, X, Check, Search, Calendar, BedDouble, AlertTriangle, Phone, User, CreditCard, Trash2 } from 'lucide-react';

interface Booking {
  id: string;
  booking_id: number;
  patient_name: string;
  patient_contact: string;
  reference_name: string;
  reference_phone: string;
  room_id: string;
  package_id: number;
  booking_date: string;
  check_in_date: string;
  expected_discharge_date: string;
  advance_payment: number;
  status: string;
  notes: string;
  created_at: string;
  rooms?: { id: string; room_number: string; ac_type: string; bed_type: string; status: string } | null;
  packages?: { id: number; name: string; duration_days: number } | null;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<any>({});
  const [availabilityWarning, setAvailabilityWarning] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [bRes, rRes, pRes] = await Promise.all([
      supabase.from('bookings').select('*, rooms(id, room_number, ac_type, bed_type, status), packages(id, name, duration_days)').order('booking_date', { ascending: true }),
      supabase.from('rooms').select('*').order('room_number'),
      supabase.from('packages').select('*').order('id'),
    ]);
    if (bRes.data) setBookings(bRes.data as any);
    if (rRes.data) setRooms(rRes.data);
    if (pRes.data) setPackages(pRes.data);
    setLoading(false);
  }

  // Check if room is available on a given date
  const checkAvailability = useCallback(async (roomId: string, date: string) => {
    if (!roomId || !date) { setAvailabilityWarning(''); return; }
    
    // Check bookings table
    const { data: bookingConflicts } = await supabase
      .from('bookings')
      .select('id, patient_name, booking_date, expected_discharge_date')
      .eq('room_id', roomId)
      .eq('status', 'Booked')
      .lte('booking_date', date)
      .gte('expected_discharge_date', date);

    // Check leads table  
    const { data: leadConflicts } = await supabase
      .from('leads')
      .select('id, name')
      .eq('room_id', roomId)
      .eq('booking_date', date)
      .neq('status', 'Cancelled');

    // Check if room is currently occupied by a patient
    const { data: patientConflicts } = await supabase
      .from('patients')
      .select('id, name')
      .eq('room_id', roomId)
      .eq('status', 'Admitted');

    const warnings: string[] = [];
    if (bookingConflicts && bookingConflicts.length > 0) {
      warnings.push(`Room already booked by "${bookingConflicts[0].patient_name}" for this date range`);
    }
    if (leadConflicts && leadConflicts.length > 0) {
      warnings.push(`Lead "${leadConflicts[0].name}" has this room booked for same date`);
    }
    if (patientConflicts && patientConflicts.length > 0) {
      warnings.push(`Room currently occupied by patient "${patientConflicts[0].name}"`);
    }
    
    setAvailabilityWarning(warnings.join('. '));
  }, []);

  function handleFieldChange(field: string, value: string) {
    const updated = { ...form, [field]: value };
    
    // Auto-calculate discharge date when package + booking date are set
    if (field === 'package_id' || field === 'booking_date') {
      const pkgId = field === 'package_id' ? value : form.package_id;
      const bookDate = field === 'booking_date' ? value : form.booking_date;
      const pkg = packages.find((p: any) => String(p.id) === String(pkgId));
      if (pkg && pkg.duration_days && bookDate) {
        const d = new Date(bookDate);
        d.setDate(d.getDate() + pkg.duration_days);
        updated.expected_discharge_date = d.toISOString().split('T')[0];
        updated.check_in_date = bookDate;
      }
    }

    setForm(updated);

    // Check availability when room or date changes
    if (field === 'room_id' || field === 'booking_date') {
      const roomId = field === 'room_id' ? value : form.room_id;
      const date = field === 'booking_date' ? value : form.booking_date;
      checkAvailability(roomId, date);
    }
  }

  async function saveBooking() {
    if (!form.patient_name) return alert('Patient name is required');
    if (!form.room_id) return alert('Please select a room');
    if (!form.booking_date) return alert('Please select a booking date');
    if (!form.package_id) return alert('Please select a package');

    if (availabilityWarning) {
      const proceed = confirm(`⚠️ ${availabilityWarning}\n\nDo you still want to book?`);
      if (!proceed) return;
    }

    const insertData = {
      patient_name: form.patient_name,
      patient_contact: form.patient_contact || null,
      reference_name: form.reference_name || null,
      reference_phone: form.reference_phone || null,
      room_id: form.room_id,
      package_id: Number(form.package_id),
      booking_date: form.booking_date,
      check_in_date: form.check_in_date || form.booking_date,
      expected_discharge_date: form.expected_discharge_date || null,
      advance_payment: Number(form.advance_payment) || 0,
      notes: form.notes || null,
      status: 'Booked',
    };

    const { error } = await supabase.from('bookings').insert([insertData]);
    if (!error) {
      setIsAdding(false);
      setForm({});
      setAvailabilityWarning('');
      fetchAll();
    } else {
      alert('Error: ' + error.message);
    }
  }

  async function cancelBooking(id: string) {
    if (!confirm('Cancel this booking?')) return;
    const { error } = await supabase.from('bookings').update({ status: 'Cancelled' }).eq('id', id);
    if (!error) fetchAll();
    else alert('Error: ' + error.message);
  }

  async function deleteBooking(id: string) {
    if (!confirm('Permanently delete this booking?')) return;
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (!error) fetchAll();
    else alert('Error: ' + error.message);
  }

  const filteredBookings = bookings.filter(b => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.patient_name?.toLowerCase().includes(q) ||
      b.patient_contact?.includes(q) ||
      b.reference_name?.toLowerCase().includes(q) ||
      String(b.booking_id).includes(q)
    );
  });

  const activeBookings = filteredBookings.filter(b => b.status === 'Booked');
  const pastBookings = filteredBookings.filter(b => b.status !== 'Booked');

  const roomOptions = rooms.map(r => (
    <option key={r.id} value={r.id}>
      {r.room_number} ({r.ac_type}, {r.bed_type}) {r.status === 'Occupied' ? '🔴' : '🟢'}
    </option>
  ));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">Bookings</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center px-3 py-2 md:px-4 md:py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4 mr-1 md:mr-2" /> New Booking
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by booking ID, patient name, or phone..."
          className="pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:border-gray-900 outline-none text-sm w-full max-w-md shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* ADD BOOKING FORM */}
      {isAdding && (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-indigo-600" /> New Booking
            </h2>
            <button onClick={() => { setIsAdding(false); setForm({}); setAvailabilityWarning(''); }} className="text-gray-400 hover:text-red-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                <User className="w-3 h-3 inline mr-1" /> Patient Name *
              </label>
              <input
                placeholder="Patient Name"
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-indigo-500 text-sm"
                value={form.patient_name || ''}
                onChange={(e) => setForm((prev: any) => ({ ...prev, patient_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                <Phone className="w-3 h-3 inline mr-1" /> Patient Phone
              </label>
              <input
                placeholder="Phone (optional)"
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-indigo-500 text-sm"
                value={form.patient_contact || ''}
                onChange={(e) => setForm((prev: any) => ({ ...prev, patient_contact: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                <Calendar className="w-3 h-3 inline mr-1" /> Booking Date *
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-indigo-500 text-sm"
                value={form.booking_date || ''}
                onChange={(e) => handleFieldChange('booking_date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                <BedDouble className="w-3 h-3 inline mr-1" /> Room *
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-indigo-500 text-sm bg-white"
                value={form.room_id || ''}
                onChange={(e) => handleFieldChange('room_id', e.target.value)}
              >
                <option value="">-- Select Room --</option>
                {roomOptions}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Package *</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-indigo-500 text-sm bg-white"
                value={form.package_id || ''}
                onChange={(e) => handleFieldChange('package_id', e.target.value)}
              >
                <option value="">-- Select Package --</option>
                {packages.map(p => <option key={p.id} value={p.id}>{p.name} ({p.duration_days}d)</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                <CreditCard className="w-3 h-3 inline mr-1" /> Advance Payment
              </label>
              <input
                type="number"
                placeholder="₹0"
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-indigo-500 text-sm"
                value={form.advance_payment || ''}
                onChange={(e) => setForm((prev: any) => ({ ...prev, advance_payment: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Reference Name</label>
              <input
                placeholder="Referred by (optional)"
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-indigo-500 text-sm"
                value={form.reference_name || ''}
                onChange={(e) => setForm((prev: any) => ({ ...prev, reference_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Reference Phone</label>
              <input
                placeholder="Ref phone (optional)"
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-indigo-500 text-sm"
                value={form.reference_phone || ''}
                onChange={(e) => setForm((prev: any) => ({ ...prev, reference_phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notes</label>
              <input
                placeholder="Any notes..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-indigo-500 text-sm"
                value={form.notes || ''}
                onChange={(e) => setForm((prev: any) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          {/* Expected Discharge Date Display */}
          {form.expected_discharge_date && (
            <div className="mt-3 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-700">
                Check-in: {new Date(form.booking_date + 'T00:00:00').toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})}
              </span>
              <span className="text-gray-400">→</span>
              <span className="text-sm font-semibold text-orange-700">
                Discharge: {new Date(form.expected_discharge_date + 'T00:00:00').toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})}
              </span>
            </div>
          )}

          {/* Availability Warning */}
          {availabilityWarning && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 font-medium">{availabilityWarning}</div>
            </div>
          )}

          <div className="flex space-x-3 mt-4">
            <button onClick={saveBooking} className="px-5 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium flex items-center text-sm">
              <Check className="w-4 h-4 mr-1" /> Confirm Booking
            </button>
            <button onClick={() => { setIsAdding(false); setForm({}); setAvailabilityWarning(''); }} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading bookings...</div>
      ) : (
        <>
          {/* Active Bookings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-green-50 border-b border-green-200 flex items-center">
              <Check className="w-4 h-4 text-green-600 mr-2" />
              <h3 className="font-bold text-gray-800 text-sm">Active Bookings ({activeBookings.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Booking ID</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Room</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Package</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Check-in</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Discharge</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Advance</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Reference</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeBookings.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">B-{b.booking_id}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{b.patient_name}</div>
                        {b.patient_contact && <div className="text-xs text-gray-500">{b.patient_contact}</div>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {b.rooms ? (
                          <span className="text-sm font-medium text-gray-800">Room {b.rooms.room_number}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {b.packages ? (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">{b.packages.name}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {b.booking_date ? new Date(b.booking_date + 'T00:00:00').toLocaleDateString('en-IN', {day:'numeric',month:'short'}) : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-orange-700">
                        {b.expected_discharge_date ? new Date(b.expected_discharge_date + 'T00:00:00').toLocaleDateString('en-IN', {day:'numeric',month:'short'}) : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-800">
                        ₹{Number(b.advance_payment || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {b.reference_name || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => cancelBooking(b.id)} className="text-red-600 hover:text-red-900 px-2 py-1 border border-red-200 rounded text-xs bg-red-50 flex items-center">
                            <X className="w-3 h-3 mr-1" /> Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeBookings.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">No active bookings</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Past/Cancelled Bookings */}
          {pastBookings.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="font-bold text-gray-600 text-sm">Past / Cancelled ({pastBookings.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <tbody className="divide-y divide-gray-100">
                    {pastBookings.map(b => (
                      <tr key={b.id} className="text-gray-400">
                        <td className="px-4 py-2 text-xs">B-{b.booking_id}</td>
                        <td className="px-4 py-2 text-sm">{b.patient_name}</td>
                        <td className="px-4 py-2 text-sm">{b.rooms?.room_number || '—'}</td>
                        <td className="px-4 py-2 text-xs">{b.packages?.name || '—'}</td>
                        <td className="px-4 py-2 text-xs">{b.booking_date}</td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">{b.status}</span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => deleteBooking(b.id)} className="text-red-400 hover:text-red-600 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
