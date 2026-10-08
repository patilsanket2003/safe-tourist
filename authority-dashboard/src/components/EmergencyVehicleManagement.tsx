import React, { useState, useEffect } from 'react';
import { Shield, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

const getAuthToken = () => typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

interface EmergencyVehicle {
  _id: string;
  vehicleId: string;
  type: string;
  isActive: boolean;
}

export default function EmergencyVehicleManagement() {
  const [vehicles, setVehicles] = useState<EmergencyVehicle[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [type, setType] = useState('police');
  const [loading, setLoading] = useState(false);

  const fetchVehicles = async () => {
    try {
      const response = await fetch(`${API_URL}/api/authority/emergency-vehicle`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      const data = await response.json();
      if (data.success) {
        setVehicles(data.vehicles);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/authority/emergency-vehicle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ vehicleId, type })
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Emergency vehicle added successfully');
        setVehicleId('');
        fetchVehicles();
      } else {
        toast.error(data.message || 'Failed to add vehicle');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Emergency Vehicles</h2>
        <p className="text-sm text-gray-500">Manage registered emergency vehicles (Police, Ambulance, Fire Brigade) that can login to the mobile app.</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium mb-4">Register New Vehicle</h3>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle ID</label>
            <input
              type="text"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              placeholder="e.g. police-12345"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border"
              required
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border"
            >
              <option value="police">Police</option>
              <option value="ambulance">Ambulance</option>
              <option value="firebrigade">Fire Brigade</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center disabled:opacity-50"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Vehicle
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {vehicles.map((v) => (
              <tr key={v._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{v.vehicleId}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{v.type}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${v.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {v.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-gray-500 text-sm">
                  No emergency vehicles registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
