import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-blue-50 font-sans">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-500 to-green-400 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Reward Kids for Chores, Spark Financial Smarts!
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            Parents set fun tasks, kids earn coins, and shop for toys with eBay or Amazon. Safe, educational, and exciting!
          </p>
          <Link
            href="/register"
            className="bg-yellow-400 text-blue-900 font-semibold py-3 px-6 rounded-full hover:bg-yellow-300 transition duration-300"
          >
            Sign Up Free
          </Link>
          <div className="mt-10">
            <img
              src="https://via.placeholder.com/600x400?text=Happy+Kids+Doing+Chores"
              alt="Kids doing chores"
              className="mx-auto rounded-lg shadow-lg max-w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-blue-900 mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1: Tasks & Rewards */}
            <div className="text-center p-6 bg-blue-100 rounded-lg shadow-md">
              <img
                src="https://via.placeholder.com/64?text=📋"
                alt="Tasks Icon"
                className="mx-auto mb-4"
              />
              <h3 className="text-xl font-semibold text-blue-900 mb-2">
                Fun Tasks & Rewards
              </h3>
              <p className="text-gray-600">
                Parents assign chores like cleaning or homework. Kids earn coins upon completion!
              </p>
            </div>
            {/* Feature 2: Virtual Coins */}
            <div className="text-center p-6 bg-yellow-100 rounded-lg shadow-md">
              <img
                src="https://via.placeholder.com/64?text=🪙"
                alt="Coins Icon"
                className="mx-auto mb-4"
              />
              <h3 className="text-xl font-semibold text-blue-900 mb-2">
                Virtual Coins
              </h3>
              <p className="text-gray-600">
                Kids collect coins in their account, learning to save and budget.
              </p>
            </div>
            {/* Feature 3: Shop with Coins */}
            <div className="text-center p-6 bg-green-100 rounded-lg shadow-md">
              <img
                src="https://via.placeholder.com/64?text=🛒"
                alt="Shopping Icon"
                className="mx-auto mb-4"
              />
              <h3 className="text-xl font-semibold text-blue-900 mb-2">
                Shop with Coins
              </h3>
              <p className="text-gray-600">
                Redeem coins for toys or books from eBay and Amazon. Parents approve all purchases.
              </p>
            </div>
            {/* Feature 4: Parental Controls */}
            <div className="text-center p-6 bg-blue-100 rounded-lg shadow-md">
              <img
                src="https://via.placeholder.com/64?text=🔒"
                alt="Lock Icon"
                className="mx-auto mb-4"
              />
              <h3 className="text-xl font-semibold text-blue-900 mb-2">
                Parental Controls
              </h3>
              <p className="text-gray-600">
                Set spending limits and monitor activity for a safe, educational experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-blue-900 mb-12">
            Loved by Parents & Kids
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <p className="text-gray-600 italic mb-4">
                “My kids love earning coins for chores! It’s made our home so much tidier.”
              </p>
              <p className="font-semibold text-blue-900">— Sarah, Mom of Two</p>
              <div className="flex justify-center mt-2">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.39 2.465a1 1 0 00-.364 1.118l1.286 3.97c.3.921-.755 1.688-1.54 1.118l-3.39-2.465a1 1 0 00-1.175 0l-3.39 2.465c-.784.57-1.838-.197-1.54-1.118l1.286-3.97a1 1 0 00-.364-1.118L2.035 9.397c-.784-.57-.38-1.81.588-1.81h4.18a1 1 0 00.95-.69l1.286-3.97z" />
                  </svg>
                ))}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <p className="text-gray-600 italic mb-4">
                “The coin system taught my son to save for what he wants. Amazing!”
              </p>
              <p className="font-semibold text-blue-900">— James, Dad</p>
              <div className="flex justify-center mt-2">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.39 2.465a1 1 0 00-.364 1.118l1.286 3.97c.3.921-.755 1.688-1.54 1.118l-3.39-2.465a1 1 0 00-1.175 0l-3.39 2.465c-.784.57-1.838-.197-1.54-1.118l1.286-3.97a1 1 0 00-.364-1.118L2.035 9.397c-.784-.57-.38-1.81.588-1.81h4.18a1 1 0 00.95-.69l1.286-3.97z" />
                  </svg>
                ))}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <p className="text-gray-600 italic mb-4">
                “Shopping with coins is so fun! I got a new toy with my chores.”
              </p>
              <p className="font-semibold text-blue-900">— Emma, Age 8</p>
              <div className="flex justify-center mt-2">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.39 2.465a1 1 0 00-.364 1.118l1.286 3.97c.3.921-.755 1.688-1.54 1.118l-3.39-2.465a1 1 0 00-1.175 0l-3.39 2.465c-.784.57-1.838-.197-1.54-1.118l1.286-3.97a1 1 0 00-.364-1.118L2.035 9.397c-.784-.57-.38-1.81.588-1.81h4.18a1 1 0 00.95-.69l1.286-3.97z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
          <p className="text-center text-gray-600 mt-8">
            Join over 10,000 families making chores fun and educational!
          </p>
        </div>
      </section>

      {/* Education/Inspiration Section */}
      <section className="py-16 bg-blue-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-blue-900 mb-12">
            Inspire Your Kids to Learn & Grow
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            <div className="md:w-1/2">
              <iframe
                className="w-full h-64 rounded-lg"
                src="https://www.youtube.com/embed/placeholder" // Replace with your video
                title="How It Works Video"
                allowFullScreen
              ></iframe>
            </div>
            <div className="md:w-1/2 text-left">
              <p className="text-gray-600 mb-4">
                Watch how our app turns chores into a fun game! Kids learn responsibility and money skills while shopping for toys they love.
              </p>
              <Link
                href="/resources"
                className="text-blue-600 font-semibold hover:underline"
              >
                Download Free Chore Ideas & Financial Tips
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA Section */}
      <section className="bg-green-400 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Start Your Family’s Adventure Today!
          </h2>
          <p className="text-lg mb-8">
            Sign up free and get 50 bonus coins to kickstart your kids’ journey.
          </p>
          <Link
            href="/register"
            className="bg-yellow-400 text-blue-900 font-semibold py-3 px-6 rounded-full hover:bg-yellow-300 transition duration-300"
          >
            Get Started Now
          </Link>
          <div className="mt-8 text-sm">
            <p>Follow us: 
              <a href="#" className="text-white underline mx-2">Facebook</a>
              <a href="#" className="text-white underline mx-2">Instagram</a>
            </p>
            <p className="mt-2">
              <Link href="/privacy" className="text-white underline">Privacy Policy</Link> | 
              <Link href="/terms" className="text-white underline">Terms of Use</Link>
            </p>
            <p className="mt-2">
              Disclosure: We earn a commission from eBay and Amazon links at no extra cost to you.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}