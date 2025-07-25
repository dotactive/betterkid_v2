
'use client';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, username } = useAuth();
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated && username) {
      console.log('Fetching balance for user:', username);
      const fetchBalance = async () => {
        try {
          const response = await axios.get(`/api/user-balance?username=${encodeURIComponent(username)}`);
          console.log(`Fetched balance for ${username}:`, response.data);
          setBalance(response.data.balance || 0);
        } catch (err: any) {
          console.error('Failed to fetch balance:', err);
          setError(err.response?.data?.error || 'Failed to fetch balance');
        }
      };
      fetchBalance();
    }
  }, [isAuthenticated, username]);
  const handleLogout = () => {
    console.log('Logging out user:', username);
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (isAuthenticated === null) {
    return <div>Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    return null; // Redirect handled by useAuth
  }
 
  return (
    <>
      <header className="bg-blue-500 text-white px-6 py-4 flex flex-col md:flex-row justify-between items-center">
        <div className="text-center md:text-left">
          <h1 className="text-2xl font-bold">Parents Page</h1>
          <h2 className="text-xl mt-1">Welcome, <span className="text-yellow-300 font-semibold">{username}</span> 's parent!</h2>
        </div>
        <div className="flex items-center mt-4 md:mt-0 gap-4">
          <div className="flex items-center gap-2">

            <span className="text-lg">Coins: <span className="font-bold">$ {balance?.toFixed(2)}</span></span>
          </div>
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">Grown-Up Zone</button>
          <button onClick={handleLogout} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg">Blast Off (Log Out)</button>
        </div>
      </header>

      <nav className="bg-blue-100 text-blue-900 py-3 px-6 flex justify-center gap-6 font-medium">
        <Link href={`/${username}/back/profile`} className="hover:underline">Profile</Link>
        <Link  href={`/${username}/back/content-editor`} className="hover:underline">Content</Link>
        
        <Link href={`/${username}/back/award-editor`} className="hover:underline">Coins</Link>
        <Link href={`/${username}/back/events-editor`} className="hover:underline">Events</Link>
        <Link href={`/${username}/front/behaviors`} className="hover:underline">Back to Front</Link>
      </nav>
      <main className="px-6 py-8">
        {children}
      </main>
    </>
  );
}
