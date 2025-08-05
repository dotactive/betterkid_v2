'use client';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { useAuth } from '@/hooks/useAuth';
import { EditModeProvider, useEditMode } from '@/hooks/useEditMode';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import axios from 'axios';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

interface User {
  userId: string;
  username: string;
  email: string;
  parentCode: string;
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, userId } = useAuth();
  const { editMode, setEditMode } = useEditMode();
  const router = useRouter();
  const pathname = usePathname();
  const [balance, setBalance] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showParentCodeModal, setShowParentCodeModal] = useState(false);
  const [parentCodeInput, setParentCodeInput] = useState('');
  const [userParentCode, setUserParentCode] = useState('');

  // Determine if we're in the back section
  const isBackSection = pathname?.startsWith('/back');
  
  // Don't show navigation for login/register pages
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/';

  useEffect(() => {
    if (isAuthenticated && userId) {
      console.log('Fetching balance for user:', userId);
      fetchBalance();
      fetchUserInfo();
      fetchUserParentCode();
    }
  }, [isAuthenticated, userId]);

  const fetchBalance = async () => {
    if (!userId) return;
    try {
      const response = await axios.get(`/api/user-balance?userId=${encodeURIComponent(userId)}`);
      console.log(`Fetched balance for ${userId}:`, response.data);
      setBalance(response.data.balance || 0);
    } catch (err: any) {
      console.error('Failed to fetch balance:', err);
      setError(err.response?.data?.error || 'Failed to fetch balance');
    }
  };
  
  const fetchUserInfo = async () => {
    if (!userId) return;
    try {
      const response = await axios.get('/api/users');
      const users = response.data;
      const currentUser = users.find((user: User) => user.userId === userId);
      if (currentUser) {
        setUsername(currentUser.username);
      }
    } catch (err: any) {
      console.error('Failed to fetch user info:', err);
    }
  };

  const fetchUserParentCode = async () => {
    if (!userId) return;
    try {
      const response = await axios.get('/api/users');
      const users = response.data;
      const currentUser = users.find((user: User) => user.userId === userId);
      if (currentUser) {
        setUserParentCode(currentUser.parentCode);
      }
    } catch (err: any) {
      console.error('Failed to fetch user parent code:', err);
    }
  };

  const handleEditModeToggle = () => {
    if (editMode) {
      setEditMode(false);
    } else {
      setShowParentCodeModal(true);
    }
  };

  const handleParentCodeSubmit = () => {
    if (parentCodeInput === userParentCode) {
      setEditMode(true);
      setShowParentCodeModal(false);
      setParentCodeInput('');
      setError('');
    } else {
      setError('Invalid parent code');
    }
  };
  
  const handleLogout = () => {
    console.log('Logging out user:', userId);
    localStorage.removeItem('userId');
    router.push('/');
  };

  if (isAuthPage) {
    return children;
  }

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
          <h1 className="text-2xl font-bold">{isBackSection ? 'Parents Page' : 'To be a better kid!'}</h1>
          <h2 className="text-xl mt-1">Welcome, <span className="text-yellow-300 font-semibold">{username || userId}</span>{isBackSection ? ' \'s parent!' : '!'}</h2>
        </div>
        <div className="flex items-center mt-4 md:mt-0 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">{isBackSection ? 'Coins:' : 'Your Super Coins:'} <span className="font-bold">$ {balance?.toFixed(2)}</span></span>
          </div>
          {!isBackSection && (
            <button
              onClick={handleEditModeToggle}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                editMode 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {editMode ? 'Exit Edit Mode' : 'Edit Mode'}
            </button>
          )}
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">Grown-Up Zone</button>
          <button onClick={handleLogout} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg">Blast Off (Log Out)</button>
        </div>
      </header>

      <nav className="bg-blue-100 text-blue-900 py-3 px-6 flex justify-center gap-6 font-medium">
        {isBackSection ? (
          <>
            <Link href="/back/profile" className="hover:underline">Profile</Link>
            <Link href="/back/content-editor" className="hover:underline">Content</Link>
            <Link href="/award-editor" className="hover:underline">Coins</Link>
            <Link href="/back/events-editor" className="hover:underline">Events</Link>
            <Link href="/behaviors" className="hover:underline">Back to Front</Link>
          </>
        ) : (
          <>
            <Link href="/behaviors" className="hover:underline">Behaviors</Link>
            <Link href="/earnlose" className="hover:underline">Earn Super Coins</Link>
            <Link href="/spend" className="hover:underline">Spend Super Coins</Link>
            <Link href="/logs" className="hover:underline">Logs</Link>
            {editMode && (
              <Link href="/award-editor" className="hover:underline text-green-600 font-semibold">Award Editor</Link>
            )}
          </>
        )}
      </nav>
      <main className="px-6 py-8">
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
        {children}
      </main>

      {/* Parent Code Modal */}
      {showParentCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4">Enter Parent Code</h3>
            <input
              type="password"
              value={parentCodeInput}
              onChange={(e) => setParentCodeInput(e.target.value)}
              placeholder="Parent code"
              className="w-full p-2 border rounded mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleParentCodeSubmit()}
            />
            <div className="flex gap-3">
              <button
                onClick={handleParentCodeSubmit}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setShowParentCodeModal(false);
                  setParentCodeInput('');
                  setError('');
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <EditModeProvider>
          <LayoutContent>{children}</LayoutContent>
        </EditModeProvider>
      </body>
    </html>
  );
}
