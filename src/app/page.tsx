import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen main-bg font-sans">
      {/* Navigation/Header */}
      <nav className="bg-white shadow-sm py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
        <img src="/betterlogo.png?v=1" alt="Logo" className="w-40" />
          <div className="flex gap-3">
            <Link
              href="/login"
              className="btn-3 py-2 px-6 rounded-full font-semibold transition duration-300"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="btn-1 py-2 px-6 rounded-full font-semibold transition duration-300"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pr-bg text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Reward Kids for Chores, Spark Financial Smarts!
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            Turn chores into fun adventures with coins and rewards!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link
              href="/register"
              className="btn-1 py-4 px-8 rounded-full text-lg font-bold transition duration-300 inline-block"
            >
              🚀 Start Free Today
            </Link>
            <Link
              href="/login"
              className="btn-2 py-4 px-8 rounded-full text-lg font-bold transition duration-300 inline-block"
            >
              👋 Welcome Back
            </Link>
          </div>


        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-colour-1 mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1: Tasks & Rewards */}
            <div className="text-center p-6 bg-white border-4 border-colour-1 rounded-xl shadow-lg hover:shadow-xl transition duration-300">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-colour-1 mb-3">
                Fun Tasks & Rewards
              </h3>
              <p className="text-gray-600">
                Parents assign chores like cleaning or homework. Kids earn coins upon completion!
              </p>
            </div>
            {/* Feature 2: Virtual Coins */}
            <div className="text-center p-6 bg-white border-4 border-colour-2 rounded-xl shadow-lg hover:shadow-xl transition duration-300">
              <div className="text-5xl mb-4">🪙</div>
              <h3 className="text-xl font-semibold text-colour-2 mb-3">
                Virtual Coins
              </h3>
              <p className="text-gray-600">
                Kids collect coins in their account, learning to save and budget.
              </p>
            </div>
            {/* Feature 3: Shop with Coins */}
            <div className="text-center p-6 bg-white border-4 border-colour-3 rounded-xl shadow-lg hover:shadow-xl transition duration-300">
              <div className="text-5xl mb-4">🛒</div>
              <h3 className="text-xl font-semibold text-colour-3 mb-3">
                Shop with Coins
              </h3>
              <p className="text-gray-600">
                Redeem coins for toys or books from eBay and Amazon. Parents approve all purchases.
              </p>
            </div>
            {/* Feature 4: Parental Controls */}
            <div className="text-center p-6 bg-white border-4 border-colour-1 rounded-xl shadow-lg hover:shadow-xl transition duration-300">
              <div className="text-5xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold text-colour-1 mb-3">
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
      <section className="py-16 main-bg">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-colour-2 mb-12">
            Loved by Parents & Kids
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-colour-1 text-center hover:shadow-xl transition duration-300">
              <p className="text-gray-600 italic mb-4">
                “My kids love earning coins for chores! It’s made our home so much tidier.”
              </p>
              <p className="font-semibold text-colour-1">— Rano, Dad of Two</p>
              <div className="flex justify-center mt-2">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.39 2.465a1 1 0 00-.364 1.118l1.286 3.97c.3.921-.755 1.688-1.54 1.118l-3.39-2.465a1 1 0 00-1.175 0l-3.39 2.465c-.784.57-1.838-.197-1.54-1.118l1.286-3.97a1 1 0 00-.364-1.118L2.035 9.397c-.784-.57-.38-1.81.588-1.81h4.18a1 1 0 00.95-.69l1.286-3.97z" />
                  </svg>
                ))}
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-colour-1 text-center hover:shadow-xl transition duration-300">
              <p className="text-gray-600 italic mb-4">
                “The coin system taught my son to save for what he wants. Amazing!”
              </p>
              <p className="font-semibold text-colour-2">— Sarah, Mom</p>
              <div className="flex justify-center mt-2">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.39 2.465a1 1 0 00-.364 1.118l1.286 3.97c.3.921-.755 1.688-1.54 1.118l-3.39-2.465a1 1 0 00-1.175 0l-3.39 2.465c-.784.57-1.838-.197-1.54-1.118l1.286-3.97a1 1 0 00-.364-1.118L2.035 9.397c-.784-.57-.38-1.81.588-1.81h4.18a1 1 0 00.95-.69l1.286-3.97z" />
                  </svg>
                ))}
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-colour-1 text-center hover:shadow-xl transition duration-300">
              <p className="text-gray-600 italic mb-4">
                “Shopping with coins is so fun! I got a new toy with my chores.”
              </p>
              <p className="font-semibold text-colour-3">— Ailfrid, Age 11</p>
              <div className="flex justify-center mt-2">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.39 2.465a1 1 0 00-.364 1.118l1.286 3.97c.3.921-.755 1.688-1.54 1.118l-3.39-2.465a1 1 0 00-1.175 0l-3.39 2.465c-.784.57-1.838-.197-1.54-1.118l1.286-3.97a1 1 0 00-.364-1.118L2.035 9.397c-.784-.57-.38-1.81.588-1.81h4.18a1 1 0 00.95-.69l1.286-3.97z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Education/Inspiration Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-colour-3 mb-12">
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
                className="btn-2 py-3 px-6 rounded-full font-semibold transition duration-300 inline-block"
              >
                📚 Free Resources
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA Section */}
      <section className="background-colour-1 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Start Your Family's Adventure Today!
          </h2>
          <p className="text-xl mb-10">
            Sign up free and get 50 bonus coins to kickstart your kids' journey.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              href="/register"
              className="btn-2 py-4 px-8 rounded-full text-lg font-bold transition duration-300 inline-block"
            >
              🎉 Get Started Now
            </Link>
            <Link
              href="/login"
              className="btn-3 py-4 px-8 rounded-full text-lg font-bold transition duration-300 inline-block"
            >
              🔑 Already a Member?
            </Link>
          </div>
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