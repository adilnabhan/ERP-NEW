'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit2, Trash2, X, Check, Phone, Calendar, User, Briefcase, Save } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  role: string;
  contact: string;
  joining_date: string;
  created_at: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: '', role: '', contact: '', joining_date: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Employee>>({});
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    const { data } = await supabase.from('employees').select('*').order('name');
    if (data) setEmployees(data);
  }

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmp.name || !newEmp.role) return alert('Name and Role are required.');
    const { error } = await supabase.from('employees').insert([newEmp]);
    if (!error) {
      setIsAdding(false);
      setNewEmp({ name: '', role: '', contact: '', joining_date: '' });
      fetchEmployees();
    } else {
      alert('Error: ' + error.message);
    }
  }

  async function handleDeleteEmployee(id: string) {
    if (!confirm('Delete this employee record?')) return;
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (!error) {
      if (selectedEmployee?.id === id) setSelectedEmployee(null);
      fetchEmployees();
    } else {
      alert('Error: ' + error.message);
    }
  }

  function startEdit(emp: Employee) {
    setEditingId(emp.id);
    setEditForm({ name: emp.name, role: emp.role, contact: emp.contact, joining_date: emp.joining_date });
  }

  async function saveEdit() {
    if (!editingId) return;
    const { error } = await supabase.from('employees').update({
      name: editForm.name,
      role: editForm.role,
      contact: editForm.contact,
      joining_date: editForm.joining_date
    }).eq('id', editingId);

    if (!error) {
      setEditingId(null);
      setEditForm({});
      fetchEmployees();
      if (selectedEmployee?.id === editingId) {
        setSelectedEmployee({ ...selectedEmployee, ...editForm } as Employee);
      }
    } else {
      alert('Error: ' + error.message);
    }
  }

  // Stats by role
  const roleCounts: Record<string, number> = {};
  employees.forEach(e => {
    roleCounts[e.role] = (roleCounts[e.role] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Employees Directory</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Employee
        </button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-2 flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Total: <span className="font-bold text-gray-900">{employees.length}</span></span>
        </div>
        {Object.entries(roleCounts).map(([role, count]) => (
          <div key={role} className="bg-gray-50 rounded-lg border border-gray-200 px-4 py-2">
            <span className="text-sm text-gray-600">{role}: <span className="font-bold text-gray-900">{count}</span></span>
          </div>
        ))}
      </div>

      {/* Add Employee Form */}
      {isAdding && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Add New Employee</h2>
            <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleAddEmployee} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Full Name *</label>
              <input required value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-gray-900 text-sm" placeholder="Employee name" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Role *</label>
              <select value={newEmp.role} onChange={e => setNewEmp({...newEmp, role: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-gray-900 text-sm bg-white">
                <option value="">-- Select Role --</option>
                <option value="Admin">Admin</option>
                <option value="Receptionist">Receptionist</option>
                <option value="Nurse">Nurse</option>
                <option value="Technician">Technician</option>
                <option value="Housekeeping">Housekeeping</option>
                <option value="Pharmacist">Pharmacist</option>
                <option value="Accountant">Accountant</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Contact</label>
              <input value={newEmp.contact} onChange={e => setNewEmp({...newEmp, contact: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-gray-900 text-sm" placeholder="Phone number" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Joining Date</label>
              <input type="date" value={newEmp.joining_date} onChange={e => setNewEmp({...newEmp, joining_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-gray-900 text-sm" />
            </div>
            <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 text-sm flex items-center"><Check className="w-4 h-4 mr-1" /> Save</button>
            </div>
          </form>
        </div>
      )}

      {/* Employee Detail View */}
      {selectedEmployee && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                <User className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedEmployee.name}</h2>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">{selectedEmployee.role}</span>
              </div>
            </div>
            <button onClick={() => setSelectedEmployee(null)} className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-sm text-gray-600">
              Back
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <div className="text-xs text-gray-500 font-medium uppercase mb-1">Contact</div>
              <div className="text-sm font-semibold text-gray-900 flex items-center"><Phone className="w-3 h-3 mr-1 text-gray-400" />{selectedEmployee.contact || 'N/A'}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <div className="text-xs text-gray-500 font-medium uppercase mb-1">Role</div>
              <div className="text-sm font-semibold text-gray-900 flex items-center"><Briefcase className="w-3 h-3 mr-1 text-gray-400" />{selectedEmployee.role}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <div className="text-xs text-gray-500 font-medium uppercase mb-1">Joined</div>
              <div className="text-sm font-semibold text-gray-900 flex items-center"><Calendar className="w-3 h-3 mr-1 text-gray-400" />{selectedEmployee.joining_date ? new Date(selectedEmployee.joining_date).toLocaleDateString() : 'N/A'}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <div className="text-xs text-gray-500 font-medium uppercase mb-1">Employee ID</div>
              <div className="text-sm font-mono text-gray-900">{selectedEmployee.id.slice(0, 8)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Employees Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { if (editingId !== emp.id) setSelectedEmployee(emp); }}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {editingId === emp.id ? (
                    <input className="border border-gray-300 rounded px-2 py-1 text-sm w-40" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} onClick={e => e.stopPropagation()} />
                  ) : (
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      {emp.name}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {editingId === emp.id ? (
                    <select className="border border-gray-300 rounded px-2 py-1 text-sm bg-white" value={editForm.role || ''} onChange={e => setEditForm({...editForm, role: e.target.value})} onClick={e => e.stopPropagation()}>
                      <option value="Admin">Admin</option>
                      <option value="Receptionist">Receptionist</option>
                      <option value="Nurse">Nurse</option>
                      <option value="Technician">Technician</option>
                      <option value="Housekeeping">Housekeeping</option>
                      <option value="Pharmacist">Pharmacist</option>
                      <option value="Accountant">Accountant</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-700">{emp.role}</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {editingId === emp.id ? (
                    <input className="border border-gray-300 rounded px-2 py-1 text-sm w-32" value={editForm.contact || ''} onChange={e => setEditForm({...editForm, contact: e.target.value})} onClick={e => e.stopPropagation()} />
                  ) : (
                    <div className="flex items-center"><Phone className="w-3 h-3 mr-1 text-gray-400" />{emp.contact}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {editingId === emp.id ? (
                    <input type="date" className="border border-gray-300 rounded px-2 py-1 text-sm" value={editForm.joining_date || ''} onChange={e => setEditForm({...editForm, joining_date: e.target.value})} onClick={e => e.stopPropagation()} />
                  ) : (
                    <div className="flex items-center"><Calendar className="w-3 h-3 mr-1 text-gray-400" />{emp.joining_date ? new Date(emp.joining_date).toLocaleDateString() : 'N/A'}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-end gap-2">
                    {editingId === emp.id ? (
                      <>
                        <button onClick={saveEdit} className="text-green-600 hover:text-green-900 p-1 border border-green-200 rounded bg-green-50" title="Save">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditingId(null); setEditForm({}); }} className="text-gray-600 hover:text-gray-900 p-1 border border-gray-200 rounded bg-gray-50" title="Cancel">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(emp)} className="text-blue-600 hover:text-blue-900 p-1 border border-blue-200 rounded bg-blue-50 transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteEmployee(emp.id)} className="text-red-600 hover:text-red-900 p-1 border border-red-200 rounded bg-red-50 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No employees found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
