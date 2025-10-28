import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';

const UserManagementPage = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const data = await adminService.listUsers();
      setRows(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setRole = async (id: string, role: 'admin' | 'user' | 'manager') => {
    await adminService.updateUser(id, { role });
    load();
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Users</h2>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-700">{error}</div>}
      {!loading && !error && (
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Full Name</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">Locked</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.full_name}</td>
                <td className="px-3 py-2">{u.role}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-1 rounded text-xs ${u.is_locked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {u.is_locked ? 'Locked' : 'Active'}
                  </span>
                </td>
                <td className="px-3 py-2 space-x-2">
                  <button className="px-2 py-1 bg-gray-200 rounded" onClick={()=>setRole(u.id,'user')}>User</button>
                  <button className="px-2 py-1 bg-purple-200 rounded" onClick={()=>setRole(u.id,'manager')}>Manager</button>
                  <button className="px-2 py-1 bg-green-500 text-white rounded" onClick={()=>setRole(u.id,'admin')}>Admin</button>
                  <button
                    className={`px-2 py-1 rounded ${u.is_locked ? 'bg-green-200' : 'bg-red-200'}`}
                    onClick={async ()=>{ await adminService.updateUser(u.id, { is_locked: !u.is_locked }); load(); }}
                  >
                    {u.is_locked ? 'Unlock' : 'Lock'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UserManagementPage;
