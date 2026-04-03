'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Stethoscope, Users, BedDouble, ChevronDown, ChevronUp, Calendar, Snowflake, Hash } from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  status: string;
  patientCount?: number;
}

interface PatientDetail {
  id: string;
  name: string;
  admission_date: string;
  status: string;
  rooms: {
    room_number: string;
    ac_type: string;
    bed_type: string;
  } | null;
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null);
  const [doctorPatients, setDoctorPatients] = useState<Record<string, PatientDetail[]>>({});
  const [loadingPatients, setLoadingPatients] = useState<string | null>(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  async function fetchDoctors() {
    setLoading(true);
    // Fast query: only fetch doctors with patient counts, NOT full patient data
    const { data } = await supabase.from('doctors').select('*').order('name');

    if (data) {
      // Get patient counts per doctor in one query
      const { data: patientCounts } = await supabase
        .from('patients')
        .select('doctor_id')
        .eq('status', 'Admitted');

      const countMap: Record<string, number> = {};
      patientCounts?.forEach(p => {
        if (p.doctor_id) countMap[p.doctor_id] = (countMap[p.doctor_id] || 0) + 1;
      });

      const processedDoctors = data.map(doc => ({
        ...doc,
        patientCount: countMap[doc.id] || 0
      }));
      setDoctors(processedDoctors);
    }
    setLoading(false);
  }

  // Lazy load patients only when doctor card is expanded
  const fetchDoctorPatients = useCallback(async (doctorId: string) => {
    if (doctorPatients[doctorId]) return; // Already loaded

    setLoadingPatients(doctorId);
    const { data } = await supabase
      .from('patients')
      .select(`
        id, name, admission_date, status,
        rooms ( room_number, ac_type, bed_type )
      `)
      .eq('doctor_id', doctorId)
      .eq('status', 'Admitted')
      .order('admission_date', { ascending: false });

    if (data) {
      setDoctorPatients(prev => ({ ...prev, [doctorId]: data as unknown as PatientDetail[] }));
    }
    setLoadingPatients(null);
  }, [doctorPatients]);

  function toggleDoctor(doctorId: string) {
    if (expandedDoctor === doctorId) {
      setExpandedDoctor(null);
    } else {
      setExpandedDoctor(doctorId);
      fetchDoctorPatients(doctorId);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Doctors Directory</h1>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading doctors...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {doctors.map((doc) => {
            const isExpanded = expandedDoctor === doc.id;
            const patients = doctorPatients[doc.id] || [];
            const isLoadingThis = loadingPatients === doc.id;

            return (
              <div key={doc.id} className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col hover:shadow-md transition-all duration-200">
                {/* Doctor Header - Clickable */}
                <button
                  onClick={() => toggleDoctor(doc.id)}
                  className="w-full text-left p-5 flex items-center justify-between hover:bg-gray-50/50 rounded-t-xl transition-colors"
                >
                  <div className="flex items-center">
                    <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                      <Stethoscope className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{doc.name}</h3>
                      <p className="text-sm text-gray-500">{doc.specialization}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 inline-flex text-[10px] leading-5 font-semibold rounded-full 
                          ${doc.status === 'Available' ? 'bg-green-100 text-green-800' : 
                            doc.status === 'Busy' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}`}>
                          {doc.status}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center">
                          <Users className="w-3 h-3 mr-1" /> {doc.patientCount} patient{doc.patientCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {/* Patient Details - Shown only when expanded */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-5 pt-4">
                    <div className="flex items-center text-sm font-medium text-gray-700 mb-3">
                      <Users className="w-4 h-4 mr-2 text-gray-400" />
                      Assigned Patients ({doc.patientCount})
                    </div>

                    {isLoadingThis ? (
                      <div className="text-center py-4 text-gray-400 text-sm">Loading patients...</div>
                    ) : patients.length > 0 ? (
                      <div className="space-y-3">
                        {patients.map((patient) => (
                          <div key={patient.id} className="bg-gray-50 rounded-lg p-3 text-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-semibold text-gray-900">{patient.name}</div>
                              <div className="text-[10px] text-gray-400 font-mono flex items-center">
                                <Hash className="w-3 h-3 mr-0.5" />
                                {patient.id.slice(0, 8)}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                              {patient.rooms ? (
                                <div className="flex items-center">
                                  <BedDouble className="w-3 h-3 mr-1 text-gray-400" />
                                  Room {patient.rooms.room_number}
                                </div>
                              ) : (
                                <div className="text-yellow-600">No Room Assigned</div>
                              )}
                              <div className="text-right flex items-center justify-end">
                                <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                                {new Date(patient.admission_date).toLocaleDateString()}
                              </div>
                              {patient.rooms && (
                                <div className="col-span-2 flex gap-2 mt-1">
                                  <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px] flex items-center">
                                    <Snowflake className="w-2.5 h-2.5 mr-0.5" />
                                    {patient.rooms.ac_type || 'Non-AC'}
                                  </span>
                                  <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded text-[10px] flex items-center">
                                    <BedDouble className="w-2.5 h-2.5 mr-0.5" />
                                    {patient.rooms.bed_type || 'Single'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 text-center py-4 bg-gray-50 rounded-lg border border-gray-100 border-dashed">
                        No active patients assigned
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {doctors.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500">
              No doctors found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
