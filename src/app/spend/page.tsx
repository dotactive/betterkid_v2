'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function UserPage() {
const { isAuthenticated, userId } = useAuth();
  const [money, setMoney] = useState(0);
  const [minutes, setMinutes] = useState(0);

  const handleIncrease = () => {
    setMoney((prev) => prev + 1);
    setMinutes((prev) => prev + 5); // Increase minutes proportionally
  };

  const handleDecrease = () => {
    setMoney((prev) => Math.max(0, prev - 1));
    setMinutes((prev) => Math.max(0, prev - 5)); // Decrease minutes proportionally
  };

  return (
    <main className="px-6 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Spend Coins</h1>
      <div className="grid grid-cols-3 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        <div className="bg-gradient-to-br  from-green-50 to-white rounded-2xl shadow-lg p-8 flex flex-col items-center gap-4 border border-green-200">
          <img
            alt="borrow iphone for 5 mins"
           
            src="/thumb/Gemini_Generated_Image_8axrnr8axrnr8axr.png"
            className="rounded-xl shadow mb-2 border border-gray-200"
          />
          <p className="text-lg text-center font-medium mb-2">
            {/* Add coins to borrow Daddy's iPhone!<br /> */}
            <span className="text-gray-600">Each coin adds <span className="font-semibold text-green-700">5 minutes</span> of iPhone time.</span>
          </p>
          <div className="flex items-center justify-center gap-6 w-full">
            <button
              onClick={handleDecrease}
              className="bg-red-500 text-white w-10 h-10 rounded-full text-2xl flex items-center justify-center shadow hover:bg-red-600 transition"
              aria-label="Decrease"
            >
              -
            </button>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-green-700">{minutes} min</span>
              <span className="text-lg font-semibold text-red-600 mt-1">${money.toFixed(2)}</span>
            </div>
            <button
              onClick={handleIncrease}
              className="bg-green-500 text-white w-10 h-10 rounded-full text-2xl flex items-center justify-center shadow hover:bg-green-600 transition"
              aria-label="Increase"
            >
              +
            </button>
          </div>
        </div>
        <div className="bg-gradient-to-br  from-green-50 to-white rounded-2xl shadow-lg p-8 flex flex-col items-center gap-4 border border-green-200">
                      <img
            alt="borrow iphone for 5 mins"
           
            src="https://kmartau.mo.cloudinary.net/c8ef5898-71aa-45bf-b29a-331e1ee4b1c2.jpg"
            className="rounded-xl shadow mb-2 border border-gray-200"
          />
          <p className="text-lg text-center font-medium mb-2">LEGO Creator Wild Animals: Surprising Spider 31159</p>
                      <div className="flex flex-col items-center">

              <span className="text-lg font-semibold text-red-600 mt-1">$15.00</span>
            </div>
        </div>
                <div className="bg-gradient-to-br  from-green-50 to-white rounded-2xl shadow-lg p-8 flex flex-col items-center gap-4 border border-green-200">
                      <img
            alt="borrow iphone for 5 mins"
           
            src="https://kmartau.mo.cloudinary.net/27adb0fd-53bb-4dd1-93a2-f2c8465f98d5.jpg"
            className="rounded-xl shadow mb-2 border border-gray-200"
          />
          <p className="text-lg text-center font-medium mb-2">LEGO Harry Potter Knight Bus Adventure 76446</p>
                      <div className="flex flex-col items-center">

              <span className="text-lg font-semibold text-red-600 mt-1">$69.00</span>
            </div>
        </div>
                        <div className="bg-gradient-to-br  from-green-50 to-white rounded-2xl shadow-lg p-8 flex flex-col items-center gap-4 border border-green-200">
                      <img
            alt="borrow iphone for 5 mins"
           
            src="https://kmartau.mo.cloudinary.net/350ebcb0-cee8-4fbb-9033-3c3e3d9ac4ae.jpg"
            className="rounded-xl shadow mb-2 border border-gray-200"
          />
          <p className="text-lg text-center font-medium mb-2">6 Piece Paint Your Own Embossed Flower Pot</p>
                      <div className="flex flex-col items-center">

              <span className="text-lg font-semibold text-red-600 mt-1">$6.00</span>
            </div>
        </div>
                        <div className="bg-gradient-to-br  from-green-50 to-white rounded-2xl shadow-lg p-8 flex flex-col items-center gap-4 border border-green-200">
                      <img
            alt="borrow iphone for 5 mins"
           
            src="https://kmartau.mo.cloudinary.net/1437715d-34f5-4d72-a74d-f252cbbaf39a.jpg"
            className="rounded-xl shadow mb-2 border border-gray-200"
          />
          <p className="text-lg text-center font-medium mb-2">Flipslide Game - Flip, Slide, Match</p>
                      <div className="flex flex-col items-center">

              <span className="text-lg font-semibold text-red-600 mt-1">$25.00</span>
            </div>
        </div>
                        <div className="bg-gradient-to-br  from-green-50 to-white rounded-2xl shadow-lg p-8 flex flex-col items-center gap-4 border border-green-200">
                      <img
            alt="borrow iphone for 5 mins"
           
            src="https://kmartau.mo.cloudinary.net/68529b0c-aa6f-4fbd-997c-9dad19b2e830.jpg"
            className="rounded-xl shadow mb-2 border border-gray-200"
          />
          <p className="text-lg text-center font-medium mb-2">1000 Piece Arrow Imagination Series Puzzle</p>
                      <div className="flex flex-col items-center">

              <span className="text-lg font-semibold text-red-600 mt-1">$9.00</span>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-red-200 col-span-3">
          <p className="text-lg font-semibold text-red-600">
            No more iPad if coins are below -$5.00
          </p>
        </div>
      </div>
    </main>
  );
}