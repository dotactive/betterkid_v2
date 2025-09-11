'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/login', { email, password });
      if (response.data.success) {
        // Store userId in local storage
        localStorage.setItem('userId', response.data.userId);
        // Dispatch custom event to notify useAuth hook of the change
        window.dispatchEvent(new Event('auth-changed'));
        router.push('/todolist'); // Redirect to user page using static route
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen main-bg flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <img src="/betterlogo.png?v=1" alt="Better Kid Logo" className="w-40 mx-auto" />
          </Link>
          <h1 className="text-3xl font-bold text-colour-1 mb-2">Welcome Back!</h1>

        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-colour-1 p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-colour-1 mb-2 hidden ">Email/Username</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 border-2 border-colour-3 rounded-xl focus:border-colour-3 focus:outline-none transition duration-300"
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-colour-1 mb-2 hidden ">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 border-2 border-colour-3 rounded-xl focus:border-colour-3 focus:outline-none transition duration-300"
                placeholder="Enter your password"
                required
              />
            </div>
            
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <p className="text-red-600 text-sm font-medium">🚫 {error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-1 w-full py-4 rounded-xl text-lg font-bold transition duration-300 disabled:opacity-50"
            >
              {loading ? ' Logging in...' : '🚀 Login'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link href="/register" className="btn-2 py-2 px-4 rounded-full font-semibold transition duration-300 inline-block">
                Register here
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link href="/" className="text-colour-3 hover:text-colour-1 font-medium transition duration-300">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}