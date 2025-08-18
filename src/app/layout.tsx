'use client';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { useAuth } from '@/hooks/useAuth';
import { EditModeProvider, useEditMode } from '@/hooks/useEditMode';
import { PendingMoneyProvider, usePendingMoney } from '@/hooks/usePendingMoney';
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

interface BehaviorType {
  behaviorId: string;
  behaviorName: string;
}

function BreadcrumbComponent({ pathname }: { pathname: string | null }) {
  const [behaviorName, setBehaviorName] = useState<string>('');
  const { userId } = useAuth();

  useEffect(() => {
    // Check if we're on a behavior detail page
    const behaviorMatch = pathname?.match(/^\/behaviors\/([^\/]+)$/);
    if (behaviorMatch && userId) {
      const behaviorId = behaviorMatch[1];
      fetchBehaviorName(behaviorId);
    }
  }, [pathname, userId]);

  const fetchBehaviorName = async (behaviorId: string) => {
    try {
      const response = await axios.get(`/api/behaviors?userId=${encodeURIComponent(userId!)}`);
      const behaviors = response.data;
      const behavior = behaviors.find((b: BehaviorType) => b.behaviorId === behaviorId);
      if (behavior) {
        setBehaviorName(behavior.behaviorName);
      }
    } catch (err) {
      console.error('Failed to fetch behavior name:', err);
    }
  };

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2 text-gray-600">
        <li>
          <Link href="/behaviors" className="hover:text-blue-600">
            Home
          </Link>
        </li>
        
        {pathname === '/behaviors' && (
          <>
            <li className="text-gray-400">/</li>
            <li className="text-gray-800 font-medium">Behaviors</li>
          </>
        )}
        
        {pathname?.startsWith('/behaviors/') && pathname !== '/behaviors' && (
          <>
            <li className="text-gray-400">/</li>
            <li>
              <Link href="/behaviors" className="hover:text-blue-600">
                Behaviors
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-800 font-medium">
              {behaviorName || 'Loading...'}
            </li>
          </>
        )}
        
        {pathname === '/activities' && (
          <>
            <li className="text-gray-400">/</li>
            <li className="text-gray-800 font-medium">Activities</li>
          </>
        )}
        
        {pathname === '/spend' && (
          <>
            <li className="text-gray-400">/</li>
            <li className="text-gray-800 font-medium">Spend Coins</li>
          </>
        )}
        
        {pathname === '/logs' && (
          <>
            <li className="text-gray-400">/</li>
            <li className="text-gray-800 font-medium">Logs</li>
          </>
        )}
        
        {pathname === '/todolist' && (
          <>
            <li className="text-gray-400">/</li>
            <li className="text-gray-800 font-medium">Todo List</li>
          </>
        )}
        
        {pathname === '/award-editor' && (
          <>
            <li className="text-gray-400">/</li>
            <li className="text-gray-800 font-medium">Award Editor</li>
          </>
        )}
        
        {pathname === '/edit-coins' && (
          <>

            <li className="text-gray-400">/</li>
            <li className="text-gray-800 font-medium">Edit Coins</li>
          </>
        )}
        
        {pathname === '/approve-pending' && (
          <>

            <li className="text-gray-400">/</li>
            <li className="text-gray-800 font-medium">Approve Pending</li>
          </>
        )}
      </ol>
    </nav>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, userId } = useAuth();
  const { editMode, setEditMode } = useEditMode();
  const { pendingAmount } = usePendingMoney();
  const router = useRouter();
  const pathname = usePathname();
  const [balance, setBalance] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showParentCodeModal, setShowParentCodeModal] = useState(false);
  const [parentCodeInput, setParentCodeInput] = useState('');
  const [userParentCode, setUserParentCode] = useState('');


  
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
  
            <button 
              onClick={handleLogout} 
              className="btn-2 px-4 py-2 rounded-lg font-medium transition-colors  cursor-pointer"
            >
              Log Out
            </button>
            </div>

            <nav className=" text-white-900 py-0 px-0 mt-5">
          <div className="flex justify-center gap-6 font-medium">

                <Link href="/behaviors" className="hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-blue-50">
                  Behaviors
                </Link>
                <Link href="/activities" className="hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-blue-50">
                  Activities
                </Link>
                <Link href="/todolist" className="hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-blue-50">
                  Todo List
                </Link>
                <Link href="/spend" className="hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-blue-50">
                  Spend Coins
                </Link>
                <Link href="/logs" className="hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-blue-50">
                  Logs
                </Link>


    
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
                Welcome, <span className="text-colour-2">{username || userId}</span>{editMode ? ' \'s parent!' : ' !'}
              </h2>
              <div className="text-sm mt-1">
                {editMode ? (
                  <p>Manage your child's progress</p>
                ) : (
                  <BreadcrumbComponent pathname={pathname} />
                
                )}
              </div>
            </div>
      <div className="flex flex-col md:flex-row gap-2">
            {editMode ? (
              <Link href="/approve-pending" className="block group">
                <div className="background-colour-2 text-black px-6 py-3 rounded-lg shadow-md text-white hover:opacity-80 transition-opacity cursor-pointer">
                  <div className="text-center">
                    <div className="text-sm font-medium">Pending Money</div>
                    <div className="text-2xl font-bold">${pendingAmount.toFixed(2)}</div>
                    <div className="text-xs opacity-75 mt-1">Click to manage</div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="background-colour-2 text-black px-6 py-3 rounded-lg shadow-md text-white">
                <div className="text-center">
                  <div className="text-sm font-medium">Pending Rewards</div>
                  <div className="text-2xl font-bold">${pendingAmount.toFixed(2)}</div>
                </div>
              </div>
            )}

            {editMode ? (
              <Link href="/edit-coins" className="block group">
                <div className="background-colour-3 text-black px-6 py-3 rounded-lg shadow-md text-white hover:opacity-80 transition-opacity cursor-pointer">
                  <div className="text-center">
                    <div className="text-sm font-medium">Current Balance</div>
                    <div className="text-2xl font-bold">${balance?.toFixed(2)}</div>
                    <div className="text-xs opacity-75 mt-1">Click to edit</div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="background-colour-3 text-black px-6 py-3 rounded-lg shadow-md text-white">
                <div className="text-center">
                  <div className="text-sm font-medium">Your Super Coins</div>
                  <div className="text-2xl font-bold">${balance?.toFixed(2)}</div>
                </div>
              </div>
            )}

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
          <PendingMoneyProvider>
            <LayoutContent>{children}</LayoutContent>
          </PendingMoneyProvider>
        </EditModeProvider>
      </body>
    </html>
  );
}
