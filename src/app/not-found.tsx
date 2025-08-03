import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
          <p className="text-gray-600 mb-8">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Go Home
          </Link>
          
          <div className="text-sm text-gray-500">
            <Link href="/login" className="text-blue-500 hover:underline">
              Login
            </Link>
            {' or '}
            <Link href="/register" className="text-blue-500 hover:underline">
              Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}