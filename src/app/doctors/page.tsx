'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Stethoscope } from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  status: string;
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    fetchDoctors();
  }, []);

  async function fetchDoctors() {
    const { data, error } = await supabase.from('doctors').select('*').order('name');
    if (data) setDoctors(data);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Doctors Directory</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {doctors.map((doc) => (
          <div key={doc.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow">
            <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <Stethoscope className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">{doc.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{doc.specialization}</p>
            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
              ${doc.status === 'Available' ? 'bg-green-100 text-green-800' : 
                doc.status === 'Busy' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}`}>
              {doc.status}
            </span>
          </div>
        ))}
        {doctors.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500">
            No doctors found.
          </div>
        )}
      </div>
    </div>
  );
}
