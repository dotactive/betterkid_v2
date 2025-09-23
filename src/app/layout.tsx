'use client';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { useAuth } from '@/hooks/useAuth';
import { EditModeProvider, useEditMode } from '@/hooks/useEditMode';
import { PendingMoneyProvider, usePendingMoney } from '@/hooks/usePendingMoney';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { 
  faSignOut, 
  faCog,
  faBars

} from '@fortawesome/free-solid-svg-icons';

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
        {pathname === '/todolist' && (
          <>
            <li className="text-gray-400">/</li>
            <li className="text-gray-800 font-medium">Todo List</li>
          </>
        )}
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [showContactBubble, setShowContactBubble] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const contactRef = useRef<HTMLDivElement>(null);


  
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

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isMobileMenuOpen]);

  // Close contact bubble when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contactRef.current && !contactRef.current.contains(event.target as Node)) {
        setShowContactBubble(false);
        setCopySuccess(false);
      }
    };

    if (showContactBubble) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showContactBubble]);

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

  const copyEmailToClipboard = async () => {
    const email = 'treble_l@hotmail.com';
    try {
      await navigator.clipboard.writeText(email);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy email:', err);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = email;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
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
    <div className={`min-h-screen flex flex-col  ${
      editMode 
        ? 'bg-gray-200' 
        : 'main-bg'
    }`}>
      <header className={`text-white ${
                  editMode 
                    ? 'bg-gray-800' 
                    : 'pr-bg'
                }`}
                >
        {/* Top section with logo and controls */}
        <div className="py-4 max-w-4xl mx-auto">
          {/* Mobile header */}
          <div className="flex md:hidden justify-between items-center px-4">
            <div>
              <img src="/betterlogo.png?v=1" alt="Logo" className="w-40" />
            </div>
            <div className="text-right">
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editMode}
                      onChange={handleEditModeToggle}
                      className="sr-only peer"
                    />
                    <div className="relative w-20 h-8 background-colour-1 rounded-full peer-focus:outline-none peer-checked:bg-gray-600 peer-checked:after:translate-x-12 after:content-[''] after:absolute after:top-[3.5px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all">
                      <span className={`absolute inset-0 py-2 px-4 uppercase items-center justify-center text-xs font-medium text-white pointer-events-none ${editMode ? 'text-left' : 'text-right'}`}>
                        {editMode ? 'Exit' : 'Edit'}
                      </span>
                    </div>
                  </label>
                  <div className="mt-2 flex gap-2">
                  {editMode && (
                  <Link href="/settings" className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors z-50 relative">
                    <FontAwesomeIcon icon={faCog} />
                  </Link>
                )}
                  <button 
                  onClick={handleLogout} 
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors z-50 relative"
                >
                  <FontAwesomeIcon icon={faSignOut} />
                </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors z-50 relative"
              aria-label="Toggle menu"
            >
              <FontAwesomeIcon icon={faBars} />
            </button>
            </div>
            </div>
          </div>

          {/* Desktop layout */}
          <div className="hidden md:flex flex-row justify-between items-center">
            <div className="text-left">
              <img src="/betterlogo.png?v=1" alt="Logo" className="w-40" />
            </div>
            
            <div className="mt-0">
              <div className="flex flex-row mt-5 gap-3 items-center justify-end">
                <button
                  onClick={handleEditModeToggle}
                  className="px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer btn-1"
                >
                  {editMode ? 'Exit Edit Mode' : 'Edit Mode'}
                </button>
                {editMode && (
                  <Link href="/settings" className="btn-3 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer">
                    Settings
                  </Link>
                )}
                <button 
                  onClick={handleLogout} 
                  className="btn-2 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Log Out
                </button>
              </div>

              {/* Desktop navigation */}
              <nav className="text-white-900 py-0 px-0 mt-5">
                <div className="flex justify-center gap-6 font-medium">
                <Link href="/todolist" className="btn-pr transition-colors px-3 py-2 rounded-md">
                    Todo List
                  </Link>
                  <Link href="/behaviors" className="btn-pr transition-colors px-3 py-2 rounded-md">
                    Behaviors
                  </Link>
                  <Link href="/activities" className="btn-pr transition-colors px-3 py-2 rounded-md">
                    Activities
                  </Link>

                  <Link href="/spend" className="btn-pr transition-colors px-3 py-2 rounded-md">
                    Spend Coins
                  </Link>
                  <Link href="/logs" className="btn-pr transition-colors px-3 py-2 rounded-md">
                    Logs
                  </Link>
                </div>
              </nav>
            </div>
          </div>
        </div>



      
      </header>

      {/* Mobile sliding menu overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Mobile sliding menu */}
      <div
        ref={mobileMenuRef}
        className={`md:hidden fixed top-0 right-0 h-full w-[90%] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Menu header with close button */}
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800">Menu</h2>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation links only */}
          <div className="flex-1 overflow-y-auto">
            <nav className="p-6">
              <div className="space-y-1">
                <Link 
                  href="/behaviors" 
                  className="block w-full text-left p-4 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium text-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Behaviors
                </Link>
                <Link 
                  href="/activities" 
                  className="block w-full text-left p-4 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium text-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Activities
                </Link>
                <Link 
                  href="/todolist" 
                  className="block w-full text-left p-4 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium text-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Todo List
                </Link>
                <Link 
                  href="/spend" 
                  className="block w-full text-left p-4 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium text-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Spend Coins
                </Link>
                <Link 
                  href="/logs" 
                  className="block w-full text-left p-4 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium text-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Logs
                </Link>
              </div>
            </nav>
          </div>

          {/* Simple footer with essential controls */}
          <div className="p-6 border-t bg-gray-50">
            <div className="space-y-2">
              <button
                onClick={() => {
                  handleEditModeToggle();
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left p-3 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                {editMode ? 'Exit Edit Mode' : 'Edit Mode'}
              </button>
              
              {editMode && (
                <Link 
                  href="/settings" 
                  className="block w-full text-left p-3 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Settings
                </Link>
              )}
              
              <button 
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>

              {/* Welcome and coins section */}
              <div className="px-6 py-4 border-t  ">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 bg-white rounded-lg  p-4 border-2 border-dashed border-colour-1">
            <div className="text-left  ">
             

              {editMode ? (
                 <h2 className="text-2xl font-bold">Edit Mode</h2>
                ) : (
                  
                  <h2 className="text-2xl font-bold"> Welcome, <span className="text-colour-2">{username}</span></h2>
                )}

              
              
              <div className="text-sm mt-1">
              <BreadcrumbComponent pathname={pathname} />
              </div>
            </div>
      <div className="flex flex-row gap-2">

              <Link href="/approve-pending" className="block group">
                <div className="background-colour-2 text-black px-6 py-3 rounded-lg shadow-md text-white hover:opacity-80 transition-opacity cursor-pointer">
                  <div className="text-center">
                    <div className="text-sm font-medium">Pending Money</div>
                    <div className="text-2xl font-bold">${pendingAmount.toFixed(2)}</div>
            
                  </div>
                </div>
              </Link>

            {editMode ? (
              <Link href="/edit-coins" className="block group">
                <div className="background-colour-3 text-black px-6 py-3 rounded-lg shadow-md text-white hover:opacity-80 transition-opacity cursor-pointer">
                  <div className="text-center">
                    <div className="text-sm font-medium">Current Balance</div>
                    <div className="text-2xl font-bold">${balance?.toFixed(2)}</div>

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
      <main className="px-6 py-4 flex-1">
        <div className="max-w-4xl mx-auto">
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
        {children}
        </div>
      </main>
            <footer  className={`text-white  mt-5 ${
                  editMode 
                    ? 'bg-gray-800' 
                    : 'pr-bg'
                }`}>
            <div className="py-4 flex flex-col md:flex-row justify-between items-center max-w-4xl mx-auto mx-auto">
          <div className="text-center md:text-left">
          © 2025 BetterKid 
          </div>
          <div className="flex flex-col md:flex-row gap-3 items-center justify-end relative" ref={contactRef}>
            <button
              onClick={() => setShowContactBubble(!showContactBubble)}
              className="hover:text-gray-300 transition-colors cursor-pointer"
            >
              Contact
            </button>
            
            {/* Contact Email Bubble */}
            {showContactBubble && (
              <div className="absolute bottom-full mb-2 right-0 bg-white text-gray-800 rounded-lg shadow-lg py-2 px-4 z-50 min-w-[280px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">treble_l@hotmail.com</span>
                  <button
                    onClick={copyEmailToClipboard}
                    className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 transition-colors"
                    title="Copy email address"
                  >
                    {copySuccess ? (
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
                {copySuccess && (
                  <div className="text-sm text-green-600 mt-1">Email copied!</div>
                )}
                {/* Arrow pointing down */}
                <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-white"></div>
              </div>
            )}
          </div>
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
      <head>
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
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
