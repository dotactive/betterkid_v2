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
      const response = await axios.get(`/api/users/${encodeURIComponent(userId)}`);
      setUsername(response.data.username);
    } catch (err: any) {
      console.error('Failed to fetch user info:', err);
    }
  };

  const fetchUserParentCode = async () => {
    if (!userId) return;
    try {
      const response = await axios.get(`/api/users/${encodeURIComponent(userId)}`);
      setUserParentCode(response.data.parentCode);
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
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-500 text-white ">
        {/* Top section with logo and controls */}
        <div className=" py-4 flex flex-col md:flex-row justify-between items-center max-w-4xl mx-auto">
          <div className="text-center md:text-left">
            <img src="/betterlogo.png?v=1" alt="Logo" className="w-40" />
          </div>
          
          {/* Control buttons */}
          <div className=" mt-4 md:mt-0 ">
            <div className="flex flex-col  md:flex-row mt-5 gap-3 items-center justify-end ">
            {!isBackSection && (
              <button
                onClick={handleEditModeToggle}
                className={`px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                  editMode 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'btn-1'
                }`}
              >
                {editMode ? 'Exit Edit Mode' : 'Edit Mode'}
              </button>
            )}
            <button 
              onClick={handleLogout} 
              className="btn-2 px-4 py-2 rounded-lg font-medium transition-colors  cursor-pointer"
            >
              Log Out
            </button>
            </div>

            <nav className=" text-white-900 py-0 px-0 mt-5">
          <div className="flex justify-center gap-6 font-medium">
            {isBackSection ? (
              <>
                <Link href="/back/profile" className="hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-blue-50">
                  Profile
                </Link>
                <Link href="/back/content-editor" className="hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-blue-50">
                  Content
                </Link>
                <Link href="/award-editor" className="hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-blue-50">
                  Coins
                </Link>
                <Link href="/back/events-editor" className="hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-blue-50">
                  Events
                </Link>
                <Link href="/behaviors" className="hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-blue-50">
                  Back to Front
                </Link>
              </>
            ) : (
              <>
                <Link href="/behaviors" className="hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-blue-50">
                  Behaviors
                </Link>
                <Link href="/earnlose" className="hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-blue-50">
                  Earn Super Coins
                </Link>
                <Link href="/spend" className="hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-blue-50">
                  Spend Super Coins
                </Link>
                <Link href="/logs" className="hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-blue-50">
                  Logs
                </Link>
                {editMode && (
                  <Link href="/award-editor" className="text-yellow-300  hover:text-blue-600 font-semibold transition-colors px-3 py-2 rounded-md hover:bg-blue-50">
                    Award Editor
                  </Link>
                )}
              </>
            )}
          </div>
        </nav>

          </div>
            {/* Navigation */}
        
        </div>



      
      </header>

              {/* Welcome and coins section */}
              <div className="px-6 py-4 border-t  ">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 bg-white rounded-lg  p-4 border-2 border-dashed border-colour-1">
            <div className="text-center md:text-left  ">
              <h2 className="text-2xl font-bold">
                Welcome, <span className="text-colour-2">{username || userId}</span>{isBackSection ? ' \'s parent!' : ' !'}
              </h2>
              <p className=" text-sm mt-1">
                {isBackSection ? 'Manage your child\'s progress' : 'Keep being awesome!'}
              </p>
            </div>
            <div className="background-colour-3 text-black px-6 py-3 rounded-lg shadow-md">
              <div className="text-center">
                <div className="text-sm font-medium">{isBackSection ? 'Coins' : 'Your Super Coins'}</div>
                <div className="text-2xl font-bold">${balance?.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      <main className=" flex-1">
        <div className="max-w-4xl mx-auto">
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
        {children}
        </div>
      </main>
            <footer className="bg-blue-500 text-white mt-5" >
            <div className="py-4 flex flex-col md:flex-row justify-between items-center max-w-4xl mx-auto mx-auto">
          <div className="text-center md:text-left">
          © 2025 BetterKid 
          </div>
          <div className="flex flex-col  md:flex-row  gap-3 items-center justify-end ">Contact</div>
          </div>
               
               </footer>
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
    </div>
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
