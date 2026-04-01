import { supabase } from '@/lib/supabase';
import { Users, Bed, Stethoscope, Activity } from 'lucide-react';

async function getDashboardData() {
  const [patientsCount, roomsAvailable, doctorsActive, todayAdmissions] = await Promise.all([
    supabase.from('patients').select('id', { count: 'exact', head: true }),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('status', 'Available'),
    supabase.from('doctors').select('id', { count: 'exact', head: true }).eq('status', 'Available'),
    supabase.from('patients').select('id', { count: 'exact', head: true }).gte('admission_date', new Date().toISOString().split('T')[0]),
  ]);

  return {
    patients: patientsCount.count || 0,
    roomsAvailable: roomsAvailable.count || 0,
    doctorsActive: doctorsActive.count || 0,
    todayAdmissions: todayAdmissions.count || 0,
  };
}

export default async function Dashboard() {
  const data = await getDashboardData();

  const stats = [
    { name: 'Total Patients', value: data.patients, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Available Rooms', value: data.roomsAvailable, icon: Bed, color: 'text-green-600', bg: 'bg-green-50' },
    { name: 'Available Doctors', value: data.doctorsActive, icon: Stethoscope, color: 'text-purple-600', bg: 'bg-purple-50' },
    { name: 'Admissions Today', value: data.todayAdmissions, icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard Overview</h1>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.name} className="relative overflow-hidden rounded-xl bg-white p-6 shadow-sm border border-gray-100 flex items-center space-x-4 hover:shadow-md transition-shadow">
              <div className={`p-4 rounded-full ${item.bg}`}>
                <Icon className={`h-8 w-8 ${item.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 truncate">{item.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions / Recent Activity could go here */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center min-h-[300px] text-gray-400">
          <Activity className="h-10 w-10 mb-4 opacity-20" />
          <p>Recent Activity Chart (Placeholder)</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center min-h-[300px] text-gray-400">
          <Users className="h-10 w-10 mb-4 opacity-20" />
          <p>Patient Demographics (Placeholder)</p>
        </div>
      </div>
    </div>
  );
}
