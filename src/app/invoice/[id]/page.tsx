'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { Printer, ArrowLeft, Hospital } from 'lucide-react';

export const runtime = 'edge';

export default function InvoicePage() {
  const { id } = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState<any>(null);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (id) fetchInvoiceData();
  }, [id]);

  async function fetchInvoiceData() {
    const [pRes, tRes, payRes] = await Promise.all([
      supabase.from('patients').select('*, doctors(name), rooms(room_number), billing(*)').eq('id', id).single(),
      supabase.from('patient_treatments').select('*, treatment_catalog(name, price)').eq('patient_id', id),
      supabase.from('payments').select('*').eq('patient_id', id)
    ]);

    if (pRes.data) setPatient(pRes.data);
    if (tRes.data) setTreatments(tRes.data);
    if (payRes.data) setPayments(payRes.data);
  }

  if (!patient) return <div className="p-10 text-center">Loading Invoice Data...</div>;

  const totalBilled = treatments.reduce((acc, curr) => acc + (curr.total_cost || 0), 0);
  const totalPaid = patient.billing?.[0]?.total_paid || 0;
  const balance = totalBilled - totalPaid;

  return (
    <div className="bg-gray-50 min-h-screen py-8 print:py-0 print:bg-white">
      <div className="max-w-4xl mx-auto space-y-4 print:space-y-0">
        <div className="flex justify-between items-center print:hidden px-4">
          <button onClick={() => router.back()} className="flex items-center text-gray-600 hover:text-gray-900 bg-white px-4 py-2 rounded-md shadow-sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </button>
          <button onClick={() => window.print()} className="flex items-center bg-indigo-600 text-white hover:bg-indigo-700 px-5 py-2 rounded-md shadow-sm font-bold">
            <Printer className="w-4 h-4 mr-2" /> Print Invoice
          </button>
        </div>

        <div className="bg-white shadow-lg print:shadow-none p-10 print:p-0 rounded-xl border border-gray-100 print:border-none">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-gray-200 pb-8 mb-8">
            <div className="flex items-center">
              <img src="/Blish_shore_coloured.png" alt="Bliss Shore Logo" className="w-24 object-contain mr-4" />
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900">Bliss Shore Ayur Care</h1>
                <p className="text-gray-500">CW37+QG8, Kizhakkoth, Kerala 673572</p>
                <p className="text-gray-500">contact@blissshore.com | +91 9876543210</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold text-gray-300 uppercase tracking-widest">INVOICE</h2>
              <p className="text-gray-600 mt-2 font-medium">Invoice No: <span className="text-gray-900">INV-{patient.id.substring(0,8).toUpperCase()}</span></p>
              <p className="text-gray-600 font-medium">Date: <span className="text-gray-900">{new Date().toLocaleDateString()}</span></p>
            </div>
          </div>

          {/* Patient Details */}
          <div className="grid grid-cols-2 gap-8 mb-10">
            <div>
              <p className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-2">Billed To</p>
              <h3 className="text-xl font-bold text-gray-900">{patient.name}</h3>
              <p className="text-gray-600">Phone: {patient.contact}</p>
              <p className="text-gray-600">{patient.aadhar ? `Aadhar: ${patient.aadhar}` : ''}</p>
              <p className="text-gray-600">Blood Group: {patient.blood_group || 'N/A'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-2">Admission Details</p>
              <p className="text-gray-600"><span className="font-semibold text-gray-800">Doctor:</span> {patient.doctors?.name || 'Unassigned'}</p>
              <p className="text-gray-600"><span className="font-semibold text-gray-800">Room:</span> {patient.rooms?.room_number ? `Room ${patient.rooms.room_number}` : 'None'}</p>
              <p className="text-gray-600"><span className="font-semibold text-gray-800">Admitted:</span> {new Date(patient.admission_date).toLocaleDateString()}</p>
              {patient.status === 'Discharged' && (
                 <p className="text-gray-600"><span className="font-semibold text-gray-800">Discharged:</span> {new Date(patient.discharge_date).toLocaleDateString()}</p>
              )}
            </div>
          </div>

          {/* Treatments Table */}
          <div className="mb-10">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Treatment Charges</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-200">
                  <th className="py-3 px-4 font-bold text-gray-700">Description</th>
                  <th className="py-3 px-4 font-bold text-gray-700">Date Added</th>
                  <th className="py-3 px-4 text-right font-bold text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {treatments.map((t, i) => (
                  <tr key={t.id} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-800">{t.treatment_catalog?.name}</td>
                    <td className="py-3 px-4 text-gray-500">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right text-gray-800 font-semibold">₹{t.total_cost.toLocaleString()}</td>
                  </tr>
                ))}
                {treatments.length === 0 && (
                  <tr><td colSpan={3} className="py-4 text-center text-gray-500 italic">No treatments recorded.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Payment History & Totals */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Payment History</h3>
              {payments.length === 0 ? (
                <p className="text-gray-500 italic">No payments made yet.</p>
              ) : (
                <div className="space-y-2">
                  {payments.map(p => (
                    <div key={p.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                      <span className="text-gray-600">{new Date(p.payment_date).toLocaleDateString()}</span>
                      <span className="text-gray-500 text-xs bg-gray-200 px-2 py-0.5 rounded uppercase">{p.method || 'Cash'}</span>
                      <span className="font-bold text-green-700">₹{p.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
               <div className="flex justify-between items-center mb-3 text-gray-600">
                 <span>Subtotal (Treatments):</span>
                 <span className="font-semibold text-gray-900">₹{totalBilled.toLocaleString()}</span>
               </div>
               <div className="flex justify-between items-center mb-4 text-gray-600 border-b border-gray-200 pb-4">
                 <span>Total Payments Received:</span>
                 <span className="font-semibold text-green-600">-₹{totalPaid.toLocaleString()}</span>
               </div>
               <div className="flex justify-between items-center text-xl font-bold text-gray-900">
                 <span>Balance Due:</span>
                 <span className={balance > 0 ? 'text-red-600' : 'text-gray-900'}>₹{balance > 0 ? balance.toLocaleString() : 0}</span>
               </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
            <p className="font-bold text-gray-800 mb-1">Thank you for trusting Bliss Shore Ayur Care.</p>
            <p>This is a computer-generated invoice and does not require a physical signature.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
