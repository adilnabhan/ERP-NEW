'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Stethoscope, Users, BedDouble, ChevronDown, ChevronUp, Calendar, Snowflake, Hash, Plus, Check, X, Edit2, Trash2 } from 'lucide-react';

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

  // CRUD State
  const [isAdding, setIsAdding] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocSpec, setNewDocSpec] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSpec, setEditSpec] = useState('');

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

  async function addDoctor() {
    if (!newDocName.trim()) return alert('Name is required');
    const { error } = await supabase.from('doctors').insert([{ name: newDocName, specialization: newDocSpec, status: 'Available' }]);
    if (error) alert(error.message);
    else {
      setNewDocName('');
      setNewDocSpec('');
      setIsAdding(false);
      fetchDoctors();
    }
  }

  function startEdit(doc: Doctor, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(doc.id);
    setEditName(doc.name);
    setEditSpec(doc.specialization);
  }

  async function saveEdit(e: React.MouseEvent) {
    e.stopPropagation();
    if (!editingId) return;
    const { error } = await supabase.from('doctors').update({ name: editName, specialization: editSpec }).eq('id', editingId);
    if (error) alert(error.message);
    else {
      setEditingId(null);
      fetchDoctors();
    }
  }

  async function deleteDoctor(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this doctor?')) return;
    const { error } = await supabase.from('doctors').delete().eq('id', id);
    if (error) alert(error.message);
    else fetchDoctors();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Doctors Directory</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4 mr-2" /> New Doctor
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold mb-4">Add New Doctor</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Doctor Name *</label>
              <input className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500" value={newDocName} onChange={e => setNewDocName(e.target.value)} placeholder="e.g. Dr. Jane Smith" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Specialization</label>
              <input className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500" value={newDocSpec} onChange={e => setNewDocSpec(e.target.value)} placeholder="e.g. Cardiology" />
            </div>
          </div>
          <div className="flex space-x-3 mt-4">
            <button onClick={addDoctor} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"><Check className="inline w-4 h-4 mr-1"/>Save</button>
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 border rounded-md hover:bg-gray-50 text-sm font-medium">Cancel</button>
          </div>
        </div>
      )}

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
                <button
                  onClick={() => toggleDoctor(doc.id)}
                  className="w-full text-left p-5 flex items-start sm:items-center justify-between hover:bg-gray-50/50 rounded-t-xl transition-colors group"
                >
                  <div className="flex items-center flex-1 pr-4">
                    <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                      <Stethoscope className="h-7 w-7" />
                    </div>
                    <div className="flex-1">
                      {editingId === doc.id ? (
                        <div className="space-y-2 w-full pr-4" onClick={e => e.stopPropagation()}>
                          <input className="w-full text-lg font-bold text-gray-900 border-b border-gray-300 outline-none pb-1 bg-transparent focus:border-indigo-500" value={editName} onChange={e => setEditName(e.target.value)} autoFocus/>
                          <input className="w-full text-sm text-gray-600 border-b border-gray-300 outline-none pb-1 bg-transparent focus:border-indigo-500" value={editSpec} onChange={e => setEditSpec(e.target.value)}/>
                          <div className="flex gap-2 pt-1">
                            <button onClick={saveEdit} className="p-1 rounded bg-green-100 text-green-700 hover:bg-green-200"><Check className="w-4 h-4"/></button>
                            <button onClick={() => setEditingId(null)} className="p-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"><X className="w-4 h-4"/></button>
                          </div>
                        </div>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {editingId !== doc.id && (
                       <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={e => startEdit(doc, e)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4"/></button>
                         <button onClick={e => deleteDoctor(doc.id, e)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                       </div>
                    )}
                    <div className="text-gray-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
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
