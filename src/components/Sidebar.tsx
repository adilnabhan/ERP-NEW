'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Home, Users, Bed, CreditCard, Stethoscope, Briefcase, Pill, PhoneCall, LogOut, FileText, Menu, X, Library } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Leads (Enquiries)', href: '/leads', icon: PhoneCall },
  { name: 'Patients', href: '/patients', icon: Users },
  { name: 'Discharged Record', href: '/discharged', icon: FileText },
  { name: 'Treatments', href: '/treatments', icon: Pill },
  { name: 'Packages', href: '/packages', icon: Library },
  { name: 'Rooms', href: '/rooms', icon: Bed },
  { name: 'Billing', href: '/billing', icon: CreditCard },
  { name: 'Doctors', href: '/doctors', icon: Stethoscope },
  { name: 'Employees', href: '/employees', icon: Briefcase },
];

export function Sidebar() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navContent = (
    <>
      <div className="flex items-center flex-shrink-0 px-6 mb-6">
        <span className="text-xl font-bold tracking-tight text-gray-900">Clinic ERP</span>
      </div>
      <div className="flex-1 mt-2 overflow-y-auto">
        <nav className="px-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <Icon className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400" aria-hidden="true" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="px-4 mt-auto pb-4">
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
        >
          <LogOut className="mr-3 flex-shrink-0 h-5 w-5 text-red-500" aria-hidden="true" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button — fixed top-left */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          {/* Slide-out sidebar */}
          <div className="relative flex flex-col w-72 bg-white shadow-xl pt-5 z-10 animate-slide-in">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
            {navContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r min-h-screen pt-5 pb-4">
        {navContent}
      </div>
    </>
  );
}
