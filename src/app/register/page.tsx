'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [parentCode, setParentCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('Attempting registration with:', { username, email, parentCode });
      const response = await axios.post('/api/register', {
        username,
        email,
        password,
        parentCode,
      });
      console.log('Registration response:', response.data);
      
      setSuccess('Registration successful! You can now login.');
      setUsername('');
      setEmail('');
      setPassword('');
      setParentCode('');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error || 'Failed to register');
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
            <img src="/betterlogo.png?v=1" alt="Better Kid Logo" className="w-32 mx-auto" />
          </Link>
          <h1 className="text-3xl font-bold text-colour-2 mb-2">Join Better Kid!</h1>
          <p className="text-gray-600">Create your family account and start earning coins</p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-colour-1 p-8">
          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-colour-2 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-colour-2 focus:outline-none transition duration-300"
                placeholder="Choose a fun username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-colour-2 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-colour-2 focus:outline-none transition duration-300"
                placeholder="Enter your email address"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-colour-2 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-colour-2 focus:outline-none transition duration-300"
                placeholder="Create a secure password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-colour-2 mb-2">Parent Code</label>
              <input
                type="text"
                value={parentCode}
                onChange={(e) => setParentCode(e.target.value)}
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-colour-2 focus:outline-none transition duration-300"
                placeholder="Enter your parent code"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Ask your parent for the special code</p>
            </div>
            
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <p className="text-red-600 text-sm font-medium">🚫 {error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <p className="text-green-600 text-sm font-medium">🎉 {success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-2 w-full py-4 rounded-xl text-lg font-bold transition duration-300 disabled:opacity-50"
            >
              {loading ? '🔄 Creating Account...' : '✨ Create My Account'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="btn-3 py-2 px-4 rounded-full font-semibold transition duration-300 inline-block">
                Login here
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link href="/" className="text-colour-2 hover:text-colour-1 font-medium transition duration-300">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}