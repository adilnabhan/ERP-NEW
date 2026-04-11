'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, X, Check, Search, Calendar, BedDouble, AlertTriangle, Phone, User, CreditCard, Trash2, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import RoomAvailabilityModal from '@/components/RoomAvailabilityModal';

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

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const [availabilityWarning, setAvailabilityWarning] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter state
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth());
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterDay, setFilterDay] = useState(''); // '' = all days in month, or 'YYYY-MM-DD'

  // Convert to patient state
  const [convertingBooking, setConvertingBooking] = useState<Booking | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [bRes, rRes, pRes, prcRes] = await Promise.all([
      supabase.from('bookings').select('*, rooms(id, room_number, ac_type, bed_type, status), packages(id, name, duration_days)').order('booking_date', { ascending: true }),
      supabase.from('rooms').select('*').order('room_number'),
      supabase.from('packages').select('*').order('id'),
      supabase.from('room_package_prices').select('*'),
    ]);
    if (bRes.data) setBookings(bRes.data as any);
    if (rRes.data) setRooms(rRes.data);
    if (pRes.data) setPackages(pRes.data);
    if (prcRes.data) setPrices(prcRes.data);
    setLoading(false);
  }

  function lookupPrice(roomId: string, pkgId: string): number | null {
    if (!roomId || !pkgId) return null;
    const room = rooms.find(r => r.id === roomId);
    const pkg = packages.find(p => String(p.id) === String(pkgId));
    if (!room || !pkg) return null;
    const priceRow = prices.find(p => p.room_number === room.room_number);
    if (!priceRow) return null;
    let priceCol = '';
    const pkgName = pkg.name.toLowerCase();
    if (pkgName.includes('sutika')) priceCol = 'sutika_care_price';
    else if (pkgName.includes('purna shakti')) priceCol = 'purna_shakti_price';
    else if (pkgName.includes('suvarna 21')) priceCol = 'suvarna_21_price';
    else if (pkgName.includes('sampurna raksha')) priceCol = 'sampurna_raksha_price';
    return priceCol && priceRow[priceCol] ? Number(priceRow[priceCol]) : null;
  }

  // Check if room is available on a given date
  const checkAvailability = useCallback(async (roomId: string, date: string) => {
    if (!roomId || !date) { setAvailabilityWarning(''); return; }
    
    const { data: bookingConflicts } = await supabase
      .from('bookings')
      .select('id, patient_name, booking_date, expected_discharge_date')
      .eq('room_id', roomId)
      .eq('status', 'Booked')
      .lte('booking_date', date)
      .gte('expected_discharge_date', date);

    const { data: leadConflicts } = await supabase
      .from('leads')
      .select('id, name')
      .eq('room_id', roomId)
      .eq('booking_date', date)
      .neq('status', 'Cancelled');

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
    const booking = bookings.find(b => b.id === id);
    const { error } = await supabase.from('bookings').update({ status: 'Cancelled' }).eq('id', id);
    if (!error) {
      // Auto-free room when booking is cancelled
      if (booking?.room_id) {
        // Only free the room if no other active booking or patient occupies it
        const { data: otherBookings } = await supabase.from('bookings').select('id').eq('room_id', booking.room_id).eq('status', 'Booked').neq('id', id);
        const { data: occupyingPatients } = await supabase.from('patients').select('id').eq('room_id', booking.room_id).eq('status', 'Admitted');
        if ((!otherBookings || otherBookings.length === 0) && (!occupyingPatients || occupyingPatients.length === 0)) {
          await supabase.from('rooms').update({ status: 'Available' }).eq('id', booking.room_id);
        }
      }
      fetchAll();
    }
    else alert('Error: ' + error.message);
  }

  async function deleteBooking(id: string) {
    if (!confirm('Permanently delete this booking?')) return;
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (!error) fetchAll();
    else alert('Error: ' + error.message);
  }

  // ---- CONVERT BOOKING TO PATIENT ----
  async function convertToPatient(booking: Booking) {
    if (!confirm(`Convert booking B-${booking.booking_id} ("${booking.patient_name}") to a patient and admit them?`)) return;

    // Create patient record
    const patientData: any = {
      name: booking.patient_name,
      contact: booking.patient_contact?.replace(/\D/g, '').slice(0, 15) || '',
      status: 'Admitted',
      room_id: booking.room_id || null,
      admission_date: booking.check_in_date || booking.booking_date || new Date().toISOString(),
      expected_discharge_date: booking.expected_discharge_date || null,
    };

    const { data: newPatient, error: patErr } = await supabase
      .from('patients')
      .insert([patientData])
      .select()
      .single();

    if (patErr) return alert('Error creating patient: ' + patErr.message);

    // Create billing record
    await supabase.from('billing').insert([{ 
      patient_id: newPatient.id, 
      total_paid: Number(booking.advance_payment) || 0 
    }]);

    // If advance payment exists, add it as a payment record
    if (booking.advance_payment && Number(booking.advance_payment) > 0) {
      await supabase.from('payments').insert([{
        patient_id: newPatient.id,
        amount: Number(booking.advance_payment),
        payment_type: 'Advance/Booking',
        method: 'Cash',
      }]);
    }

    // Mark room as Occupied
    if (booking.room_id) {
      await supabase.from('rooms').update({ status: 'Occupied' }).eq('id', booking.room_id);
    }

    // Add package as treatment if exists
    if (booking.room_id && booking.package_id) {
      const pBase = lookupPrice(booking.room_id, String(booking.package_id));
      const pkg = packages.find(p => p.id === booking.package_id);
      if (pBase !== null && pkg) {
        const { data: tCatData } = await supabase.from('treatment_catalog').select('*').eq('name', pkg.name);
        let catalogId = tCatData && tCatData.length > 0 ? tCatData[0].id : null;
        if (!catalogId) {
          const { data: newCat } = await supabase.from('treatment_catalog').insert([{ name: pkg.name, price: pBase }]).select().single();
          if (newCat) catalogId = newCat.id;
        }
        if (catalogId) {
          await supabase.from('patient_treatments').insert([{
            patient_id: newPatient.id,
            treatment_id: catalogId,
            total_cost: pBase,
          }]);
        }
      }
    }

    // Update booking status to Checked-In
    await supabase.from('bookings').update({ status: 'Checked-In' }).eq('id', booking.id);

    alert(`✅ Patient "${booking.patient_name}" admitted successfully! (P-${newPatient.patient_id})\n\nRoom: ${booking.rooms?.room_number || 'N/A'}\nPackage: ${booking.packages?.name || 'N/A'}\nDischarge: ${booking.expected_discharge_date || 'N/A'}`);
    fetchAll();
  }

  // ---- FILTERING LOGIC ----
  // Get first and last day of selected month
  const monthStart = new Date(filterYear, filterMonth, 1);
  const monthEnd = new Date(filterYear, filterMonth + 1, 0);
  const monthStartStr = monthStart.toISOString().split('T')[0];
  const monthEndStr = monthEnd.toISOString().split('T')[0];

  // Filter bookings by month (booking_date or expected_discharge_date overlaps with the month)
  const monthBookings = bookings.filter(b => {
    const bStart = b.booking_date;
    const bEnd = b.expected_discharge_date || b.booking_date;
    // Overlap check: booking range overlaps with month range
    return bStart <= monthEndStr && bEnd >= monthStartStr;
  });

  // Further filter by search query
  const searchFiltered = monthBookings.filter(b => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.patient_name?.toLowerCase().includes(q) ||
      b.patient_contact?.includes(q) ||
      b.reference_name?.toLowerCase().includes(q) ||
      String(b.booking_id).includes(q)
    );
  });

  // Further filter by specific day if selected
  const dayFiltered = filterDay ? searchFiltered.filter(b => {
    const bStart = b.booking_date;
    const bEnd = b.expected_discharge_date || b.booking_date;
    return bStart <= filterDay && bEnd >= filterDay;
  }) : searchFiltered;

  // Split into Active and Inactive
  const activeBookings = dayFiltered.filter(b => b.status === 'Booked' || b.status === 'Checked-In');
  const inactiveBookings = dayFiltered.filter(b => b.status === 'Cancelled' || b.status === 'Completed');

  // INACTIVE = rooms that have NO booking in the selected month/day
  const bookedRoomIds = new Set(dayFiltered.filter(b => b.status === 'Booked' || b.status === 'Checked-In').map(b => b.room_id));
  const freeRooms = rooms.filter(r => !bookedRoomIds.has(r.id));

  // Month navigation
  function prevMonth() {
    if (filterMonth === 0) { setFilterMonth(11); setFilterYear(filterYear - 1); }
    else setFilterMonth(filterMonth - 1);
    setFilterDay('');
  }
  function nextMonth() {
    if (filterMonth === 11) { setFilterMonth(0); setFilterYear(filterYear + 1); }
    else setFilterMonth(filterMonth + 1);
    setFilterDay('');
  }

  // Generate day options for the selected month
  const daysInMonth = new Date(filterYear, filterMonth + 1, 0).getDate();

  const roomOptions = rooms.map(r => (
    <option key={r.id} value={r.id}>
      {r.room_number} ({r.ac_type}, {r.bed_type}) {r.status === 'Occupied' ? '🔴' : '🟢'}
    </option>
  ));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">Bookings</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAvailabilityOpen(true)}
            className="flex items-center px-3 py-2 md:px-4 md:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Calendar className="w-4 h-4 mr-1 md:mr-2" /> Availability Search
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center px-3 py-2 md:px-4 md:py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4 mr-1 md:mr-2" /> New Booking
          </button>
        </div>
      </div>

      <RoomAvailabilityModal isOpen={isAvailabilityOpen} onClose={() => setIsAvailabilityOpen(false)} />

      {/* FILTER CONTROLS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors border border-gray-200">
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div className="text-sm font-bold text-gray-800 min-w-[140px] text-center">
              {MONTH_NAMES[filterMonth]} {filterYear}
            </div>
            <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors border border-gray-200">
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Day Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Day:</label>
            <select
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white outline-none focus:border-indigo-500"
              value={filterDay}
              onChange={e => setFilterDay(e.target.value)}
            >
              <option value="">All days</option>
              {Array.from({ length: daysInMonth }, (_, i) => {
                const d = new Date(filterYear, filterMonth, i + 1);
                const val = d.toISOString().split('T')[0];
                return (
                  <option key={val} value={val}>
                    {i + 1} {MONTH_NAMES[filterMonth].slice(0, 3)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Active/Inactive Tabs */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden ml-auto">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-1.5 text-sm font-semibold transition-colors ${activeTab === 'active' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Active ({activeBookings.length})
            </button>
            <button
              onClick={() => setActiveTab('inactive')}
              className={`px-4 py-1.5 text-sm font-semibold transition-colors ${activeTab === 'inactive' ? 'bg-gray-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Inactive / Free Rooms ({freeRooms.length})
            </button>
          </div>
        </div>

        {/* Search within filter */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by booking ID, patient name, or phone..."
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:border-gray-900 outline-none text-sm w-full max-w-md shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
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
          {/* ============ ACTIVE TAB ============ */}
          {activeTab === 'active' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-green-50 border-b border-green-200 flex items-center justify-between">
                <h3 className="font-bold text-gray-800 text-sm flex items-center">
                  <Check className="w-4 h-4 text-green-600 mr-2" />
                  Active Bookings — {MONTH_NAMES[filterMonth]} {filterYear}
                  {filterDay && <span className="ml-2 text-indigo-600">({new Date(filterDay + 'T00:00:00').toLocaleDateString('en-IN', {day:'numeric',month:'short'})})</span>}
                  <span className="ml-2 text-gray-500">({activeBookings.length})</span>
                </h3>
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
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
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
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${b.status === 'Booked' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-1">
                            {b.status === 'Booked' && (
                              <button
                                onClick={() => convertToPatient(b)}
                                className="text-green-700 hover:text-green-900 px-2 py-1 border border-green-200 rounded text-xs bg-green-50 flex items-center font-semibold"
                                title="Convert to Patient & Admit"
                              >
                                <UserPlus className="w-3 h-3 mr-1" /> Admit
                              </button>
                            )}
                            {b.status === 'Booked' && (
                              <button onClick={() => cancelBooking(b.id)} className="text-red-600 hover:text-red-900 px-2 py-1 border border-red-200 rounded text-xs bg-red-50 flex items-center">
                                <X className="w-3 h-3 mr-1" /> Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {activeBookings.length === 0 && (
                      <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400 text-sm">
                        No active bookings for {MONTH_NAMES[filterMonth]} {filterYear}{filterDay ? ` (${new Date(filterDay + 'T00:00:00').toLocaleDateString('en-IN', {day:'numeric',month:'short'})})` : ''}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============ INACTIVE TAB ============ */}
          {activeTab === 'inactive' && (
            <>
              {/* Free Rooms (no booking this month/day) */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-200">
                  <h3 className="font-bold text-gray-800 text-sm flex items-center">
                    <BedDouble className="w-4 h-4 text-emerald-600 mr-2" />
                    Free Rooms (No booking) — {MONTH_NAMES[filterMonth]} {filterYear}
                    {filterDay && <span className="ml-2 text-indigo-600">({new Date(filterDay + 'T00:00:00').toLocaleDateString('en-IN', {day:'numeric',month:'short'})})</span>}
                    <span className="ml-2 text-gray-500">({freeRooms.length})</span>
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Room Number</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">AC Type</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Bed Type</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Current Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {freeRooms.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">Room {r.room_number}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">{r.ac_type || 'Non-AC'}</span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-medium">{r.bed_type || 'Single'}</span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${r.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {r.status} {r.status === 'Available' ? '🟢' : '🔴'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {freeRooms.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">All rooms have bookings for this period</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cancelled/Completed Bookings */}
              {inactiveBookings.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="font-bold text-gray-600 text-sm">Cancelled / Completed ({inactiveBookings.length})</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <tbody className="divide-y divide-gray-100">
                        {inactiveBookings.map(b => (
                          <tr key={b.id} className="text-gray-400">
                            <td className="px-4 py-2 text-xs">B-{b.booking_id}</td>
                            <td className="px-4 py-2 text-sm">{b.patient_name}</td>
                            <td className="px-4 py-2 text-sm">{b.rooms?.room_number || '—'}</td>
                            <td className="px-4 py-2 text-xs">{b.packages?.name || '—'}</td>
                            <td className="px-4 py-2 text-xs">{b.booking_date}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-0.5 rounded text-xs ${b.status === 'Checked-In' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>{b.status}</span>
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
        </>
      )}
    </div>
  );
}
