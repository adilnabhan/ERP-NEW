'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Calendar, Search } from 'lucide-react';

interface RoomAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RoomAvailabilityModal({ isOpen, onClose }: RoomAvailabilityModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [packages, setPackages] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (packages.length === 0) fetchPackages();
      fetchAvailability();
    }
  }, [isOpen, selectedDate, selectedPackageId]);

  async function fetchPackages() {
    const { data } = await supabase.from('packages').select('id, name, duration_days').order('id');
    if (data) setPackages(data);
  }

  async function fetchAvailability() {
    setLoading(true);
    // Fetch all rooms
    const { data: roomsData } = await supabase.from('rooms').select('*').order('room_number');
    
    // Fetch active patients
    const { data: patientsData } = await supabase
      .from('patients')
      .select('id, name, room_id, status, admission_date, discharge_date')
      .eq('status', 'Admitted');

    // Fetch leads with bookings
    const { data: leadsData } = await supabase
      .from('leads')
      .select('id, name, room_id, status, booking_date')
      .eq('status', 'Pending')
      .not('booking_date', 'is', null);

    // Fetch bookings
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('id, patient_name, room_id, status, booking_date, expected_discharge_date')
      .in('status', ['Booked', 'Checked-In']);

    if (roomsData) {
      setRooms(roomsData);

      const targetDate = new Date(selectedDate);
      targetDate.setHours(0, 0, 0, 0);

      let durationDays = 1;
      if (selectedPackageId) {
         const pkg = packages.find(p => String(p.id) === selectedPackageId);
         if (pkg && pkg.duration_days) {
            durationDays = pkg.duration_days;
         }
      }

      const targetDateEnd = new Date(targetDate);
      targetDateEnd.setDate(targetDateEnd.getDate() + (durationDays - 1));
      targetDateEnd.setHours(23, 59, 59, 999);

      const roomStatusList = roomsData.map(room => {
        let status = 'Available';
        let occupant = '';
        let type = '';

        // Check if a patient is occupying
        const occupyingPatient = (patientsData || []).find(p => p.room_id === room.id);
        if (occupyingPatient) {
          const admDate = new Date(occupyingPatient.admission_date);
          admDate.setHours(0,0,0,0);
          
          let isOccupiedByPatient = false;
          
          if (occupyingPatient.discharge_date) {
            const discDate = new Date(occupyingPatient.discharge_date);
            discDate.setHours(23,59,59,999);
            if (admDate <= targetDateEnd && discDate >= targetDate) {
               isOccupiedByPatient = true;
            }
          } else {
            // currently admitted and no discharge date, we assume it's occupied today and onwards 
            // until discharged or based on expected duration. 
            // We'll just mark it occupied if target date is >= admission date and they are still admitted.
            if (admDate <= targetDateEnd) {
              isOccupiedByPatient = true;
            }
          }

          if (isOccupiedByPatient) {
            status = 'Occupied';
            occupant = occupyingPatient.name;
            type = 'patient';
          }
        }

        // Check Bookings Table overlaps
        if (status === 'Available') {
          const overlappingBooking = (bookingsData || []).find(b => {
             if (b.room_id !== room.id) return false;
             const bStart = new Date(b.booking_date);
             bStart.setHours(0,0,0,0);
             const bEnd = new Date(b.expected_discharge_date || b.booking_date);
             bEnd.setHours(23,59,59,999);
             return bStart <= targetDateEnd && bEnd >= targetDate;
          });
          if (overlappingBooking) {
            status = overlappingBooking.status === 'Checked-In' ? 'Occupied' : 'Booked';
            type = 'booking';
          }
        }

        // Check if Booked by a lead
        if (status === 'Available') {
          const bookingLead = (leadsData || []).find(l => {
              if (l.room_id !== room.id) return false;
              const lStart = new Date(l.booking_date);
              lStart.setHours(0,0,0,0);
              const lEnd = new Date(l.booking_date);
              lEnd.setHours(23, 59, 59, 999);
              return lStart <= targetDateEnd && lEnd >= targetDate;
          });
          if (bookingLead) {
            status = 'Booked';
            type = 'lead';
          }
        }

        return {
          room,
          status,
          occupant: '', // Blank text due to user privacy request
          type
        };
      });

      setAvailability(roomStatusList);
    }
    
    setLoading(false);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Calendar className="w-6 h-6 mr-2 text-indigo-600" />
              Room Availability 
            </h2>
            <p className="text-sm text-gray-500 mt-1">Check room availability for a specific date</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:bg-gray-100 hover:text-gray-600 p-2 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar area */}
        <div className="p-6 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center w-full md:w-auto">
             <label className="mr-3 font-semibold text-gray-700 whitespace-nowrap">Check-in:</label>
             <input
               type="date"
               className="flex-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all shadow-sm text-sm"
               value={selectedDate}
               onChange={(e) => setSelectedDate(e.target.value)}
             />
          </div>
          <div className="flex items-center w-full md:w-auto">
             <label className="mr-3 font-semibold text-gray-700 whitespace-nowrap">Package:</label>
             <select
               className="flex-1 w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all shadow-sm bg-white text-sm"
               value={selectedPackageId}
               onChange={(e) => setSelectedPackageId(e.target.value)}
             >
               <option value="">-- Single Day --</option>
               {packages.map(p => (
                 <option key={p.id} value={p.id}>{p.name} ({p.duration_days}d)</option>
               ))}
             </select>
          </div>
          <button 
             onClick={fetchAvailability}
             className="w-full md:w-auto px-5 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-sm transition-colors flex items-center justify-center text-sm"
          >
            <Search className="w-4 h-4 mr-2" /> Check Status
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30">
          {loading ? (
            <div className="flex justify-center items-center py-12">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
               <span className="ml-3 text-gray-600 font-medium">Checking rooms...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {availability.map((item) => (
                <div 
                  key={item.room.id} 
                  className={`relative p-5 rounded-xl border ${
                    item.status === 'Available' 
                      ? 'bg-white border-green-200 shadow-sm' 
                      : item.status === 'Occupied'
                        ? 'bg-red-50 border-red-200 shadow-inner'
                        : 'bg-yellow-50 border-yellow-200 shadow-inner'
                  } transition-all duration-200 hover:shadow-md`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">Room {item.room.room_number}</h3>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{item.room.type}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{item.room.ac_type}</span>
                      </div>
                    </div>
                    {item.status === 'Available' ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 font-bold text-xs rounded-full shadow-sm">AVAILABLE</span>
                    ) : item.status === 'Occupied' ? (
                      <span className="px-3 py-1 bg-red-100 text-red-700 font-bold text-xs rounded-full shadow-sm">OCCUPIED</span>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 font-bold text-xs rounded-full shadow-sm">BOOKED</span>
                    )}
                  </div>

                  <div className="border-t border-black/5 pt-3 mt-2 min-h-[40px] flex items-center">
                    {item.status === 'Available' ? (
                      <p className="text-sm font-medium text-green-600">Ready for booking</p>
                    ) : (
                      <p className={`text-sm font-semibold truncate ${item.status === 'Occupied' ? 'text-red-600' : 'text-yellow-600'}`}>
                        {item.status === 'Occupied' ? 'Already Occupied' : 'Reserved Booking'}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
