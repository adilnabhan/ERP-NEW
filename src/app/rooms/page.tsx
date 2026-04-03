'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Edit2, X, Check, Snowflake, BedDouble } from 'lucide-react';

interface Room {
  id: string;
  room_number: string;
  type: string;
  status: string;
  ac_type: string;
  bed_type: string;
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newRoom, setNewRoom] = useState({ room_number: '', type: 'General', ac_type: 'Non-AC', bed_type: 'Single' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Room>>({});

  useEffect(() => {
    fetchRooms();
  }, []);

  async function fetchRooms() {
    setLoading(true);
    const { data } = await supabase.from('rooms').select('*').order('room_number');
    if (data) setRooms(data);
    setLoading(false);
  }

  async function handleAddRoom(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from('rooms').insert([{ ...newRoom, status: 'Available' }]);
    if (!error) {
      setIsAdding(false);
      setNewRoom({ room_number: '', type: 'General', ac_type: 'Non-AC', bed_type: 'Single' });
      fetchRooms();
    } else {
      alert('Error adding room: ' + error.message);
    }
  }

  async function handleDeleteRoom(id: string) {
    if (confirm('Are you sure you want to delete this room?')) {
      const { error } = await supabase.from('rooms').delete().eq('id', id);
      if (!error) fetchRooms();
      else alert('Error deleting room: ' + error.message);
    }
  }

  function startEdit(room: Room) {
    setEditingId(room.id);
    setEditForm({ type: room.type, ac_type: room.ac_type, bed_type: room.bed_type, room_number: room.room_number });
  }

  async function saveEdit() {
    if (!editingId) return;
    const { error } = await supabase.from('rooms').update({
      room_number: editForm.room_number,
      type: editForm.type,
      ac_type: editForm.ac_type,
      bed_type: editForm.bed_type
    }).eq('id', editingId);

    if (!error) {
      setEditingId(null);
      setEditForm({});
      fetchRooms();
    } else {
      alert('Error: ' + error.message);
    }
  }

  // Stats
  const acCount = rooms.filter(r => r.ac_type === 'AC').length;
  const nonAcCount = rooms.filter(r => r.ac_type === 'Non-AC').length;
  const singleCount = rooms.filter(r => r.bed_type === 'Single').length;
  const doubleCount = rooms.filter(r => r.bed_type === 'Double').length;
  const availableCount = rooms.filter(r => r.status === 'Available').length;
  const occupiedCount = rooms.filter(r => r.status === 'Occupied').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Rooms Management</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Room
        </button>
      </div>

      {/* Room Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">{rooms.length}</div>
          <div className="text-xs text-gray-500 font-medium">Total Rooms</div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-3 text-center">
          <div className="text-2xl font-bold text-green-700">{availableCount}</div>
          <div className="text-xs text-green-600 font-medium">Available</div>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-3 text-center">
          <div className="text-2xl font-bold text-red-700">{occupiedCount}</div>
          <div className="text-xs text-red-600 font-medium">Occupied</div>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-3 text-center">
          <div className="text-2xl font-bold text-blue-700">{acCount}</div>
          <div className="text-xs text-blue-600 font-medium">AC Rooms</div>
        </div>
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 text-center">
          <div className="text-2xl font-bold text-gray-700">{nonAcCount}</div>
          <div className="text-xs text-gray-500 font-medium">Non-AC</div>
        </div>
        <div className="bg-purple-50 rounded-lg border border-purple-200 p-3 text-center">
          <div className="text-2xl font-bold text-purple-700">{singleCount}S / {doubleCount}D</div>
          <div className="text-xs text-purple-600 font-medium">Single / Double</div>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
          <h2 className="text-lg font-medium mb-4 text-gray-900">Add New Room</h2>
          <form onSubmit={handleAddRoom} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Room Number</label>
              <input
                required
                type="text"
                value={newRoom.room_number}
                onChange={(e) => setNewRoom({ ...newRoom, room_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="e.g., 501"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Type</label>
              <select
                value={newRoom.type}
                onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              >
                <option value="General">General</option>
                <option value="Private">Private</option>
                <option value="ICU">ICU</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">AC / Non-AC</label>
              <select
                value={newRoom.ac_type}
                onChange={(e) => setNewRoom({ ...newRoom, ac_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              >
                <option value="AC">AC</option>
                <option value="Non-AC">Non-AC</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Bed Type</label>
              <select
                value={newRoom.bed_type}
                onChange={(e) => setNewRoom({ ...newRoom, bed_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              >
                <option value="Single">Single</option>
                <option value="Double">Double</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors">Save</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AC / Non-AC</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bed Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rooms.map((room) => (
              <tr key={room.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {editingId === room.id ? (
                    <input className="border border-gray-300 rounded px-2 py-1 w-20 text-sm" value={editForm.room_number || ''} onChange={e => setEditForm({...editForm, room_number: e.target.value})} />
                  ) : room.room_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {editingId === room.id ? (
                    <select className="border border-gray-300 rounded px-2 py-1 text-sm bg-white" value={editForm.type || ''} onChange={e => setEditForm({...editForm, type: e.target.value})}>
                      <option value="General">General</option>
                      <option value="Private">Private</option>
                      <option value="ICU">ICU</option>
                      <option value="VIP">VIP</option>
                    </select>
                  ) : room.type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {editingId === room.id ? (
                    <select className="border border-gray-300 rounded px-2 py-1 text-sm bg-white" value={editForm.ac_type || ''} onChange={e => setEditForm({...editForm, ac_type: e.target.value})}>
                      <option value="AC">AC</option>
                      <option value="Non-AC">Non-AC</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full items-center gap-1 ${room.ac_type === 'AC' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                      {room.ac_type === 'AC' && <Snowflake className="w-3 h-3" />}
                      {room.ac_type || 'Non-AC'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {editingId === room.id ? (
                    <select className="border border-gray-300 rounded px-2 py-1 text-sm bg-white" value={editForm.bed_type || ''} onChange={e => setEditForm({...editForm, bed_type: e.target.value})}>
                      <option value="Single">Single</option>
                      <option value="Double">Double</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full items-center gap-1 ${room.bed_type === 'Double' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'}`}>
                      <BedDouble className="w-3 h-3" />
                      {room.bed_type || 'Single'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${room.status === 'Available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {room.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    {editingId === room.id ? (
                      <>
                        <button onClick={saveEdit} className="text-green-600 hover:text-green-900 p-1 border border-green-200 rounded bg-green-50" title="Save">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditingId(null); setEditForm({}); }} className="text-gray-600 hover:text-gray-900 p-1 border border-gray-200 rounded bg-gray-50" title="Cancel">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(room)} className="text-blue-600 hover:text-blue-900 p-1 border border-blue-200 rounded bg-blue-50 transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteRoom(room.id)} className="text-red-600 hover:text-red-900 p-1 border border-red-200 rounded bg-red-50 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rooms.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No rooms found. Add a room to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
