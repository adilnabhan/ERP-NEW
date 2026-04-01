import Link from 'next/link';
import { Home, Users, Bed, CreditCard, Stethoscope, Briefcase, Pill, PhoneCall, LogOut, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Leads (Enquiries)', href: '/leads', icon: PhoneCall },
  { name: 'Patients', href: '/patients', icon: Users },
  { name: 'Discharged Record', href: '/discharged', icon: FileText },
  { name: 'Treatments', href: '/treatments', icon: Pill },
  { name: 'Rooms', href: '/rooms', icon: Bed },
  { name: 'Billing', href: '/billing', icon: CreditCard },
  { name: 'Doctors', href: '/doctors', icon: Stethoscope },
  { name: 'Employees', href: '/employees', icon: Briefcase },
];

export function Sidebar() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="hidden md:flex flex-col w-64 bg-white border-r min-h-screen pt-5 pb-4">
      <div className="flex items-center flex-shrink-0 px-6 mb-6">
        <span className="text-xl font-bold tracking-tight text-gray-900">Clinic ERP</span>
      </div>
      <div className="flex-1 mt-5 overflow-y-auto">
        <nav className="px-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <Icon className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400" aria-hidden="true" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="px-4 mt-auto">
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
        >
          <LogOut className="mr-3 flex-shrink-0 h-5 w-5 text-red-500" aria-hidden="true" />
          Logout
        </button>
      </div>
    </div>
  );
}
