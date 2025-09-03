'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  userId: string;
  username: string;
  email: string;
  password: string;
  parentCode: string;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [parentCode, setParentCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
    }
  }, [isAuthenticated]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get<User[]>('/api/users');
      setUsers(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/users', {
        username,
        email,
        password,
        parentCode,
      });
      setUsername('');
      setEmail('');
      setPassword('');
      setParentCode('');
      setError('');
      fetchUsers();
    } catch (err) {
      setError('Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post('/api/betteradmin', {
        password: adminPassword,
      });
      if (response.data.success) {
        setIsAuthenticated(true);
        setError('');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid password');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!userId) {
      console.error('Cannot delete user: userId is missing');
      setError('UserId is required');
      return;
    }
    try {
      console.log('Sending DELETE request for user:', userId);
      await axios.delete(`/api/users/${userId}`);
      setUsers(users.filter((user) => user.userId !== userId));
      setError('');
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-4 max-w-md">
        <h1 className="text-2xl font-bold mb-4">Admin Access</h1>
        <form onSubmit={handleAdminLogin} className="mb-4">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Admin Password</label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full p-2 border rounded"
              required
              placeholder="Enter admin password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
          >
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>
        {error && <p className="text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin - Manage Users</h1>
      <form onSubmit={handleCreateUser} className="mb-8">
        <div className="mb-4">
          <label className="block text-sm font-medium">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 p-2 border w-full"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 p-2 border w-full"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 p-2 border w-full"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium">Parent Code</label>
          <input
            type="text"
            value={parentCode}
            onChange={(e) => setParentCode(e.target.value)}
            className="mt-1 p-2 border w-full"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          {loading ? 'Creating...' : 'Create User'}
        </button>
      </form>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <h2 className="text-xl font-semibold mb-2">Users</h2>
      {loading ? (
        <p>Loading...</p>
      ) : users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">User ID</th>
              <th className="border p-2">Username</th>
              <th className="border p-2">Email</th>
              <th className="border p-2">Password</th>
              <th className="border p-2">Parent Code</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.userId}>
                <td className="border p-2">{user.userId}</td>
                <td className="border p-2">{user.username}</td>
                <td className="border p-2">{user.email}</td>
                <td className="border p-2">{user.password}</td>
                <td className="border p-2">{user.parentCode}</td>
                <td className="border p-2">
                  <button
                    onClick={() => handleDeleteUser(user.userId)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
