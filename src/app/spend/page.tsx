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
    <main className="">

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
           
            src="/thumb/Gemini_Generated_Image_cgonz7cgonz7cgon.png"
            className="rounded-xl shadow mb-2 border border-gray-200"
          />
          <p className="text-lg text-center font-medium mb-2">

            <span className="text-gray-600">Each coin adds <span className="font-semibold text-green-700">5 minutes</span> of Ipad time.</span>
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
           
            src="/thumb/Gemini_Generated_Image_4yopjs4yopjs4yop.png"
            className="rounded-xl shadow mb-2 border border-gray-200"
          />
          <p className="text-lg text-center font-medium mb-2">

            <span className="text-gray-600">Each coin adds <span className="font-semibold text-green-700">5 minutes</span> of gaming time.</span>
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
           
            src="/thumb/Gemini_Generated_Image_nvo5wnnvo5wnnvo5.png"
            className="rounded-xl shadow mb-2 border border-gray-200"
          />
          <p className="text-lg text-center font-medium mb-2">

            <span className="text-gray-600">Each coin adds <span className="font-semibold text-green-700">5 minutes</span> of TV time.</span>
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




        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-red-200 col-span-3">
          <p className="text-lg font-semibold text-red-600">
            No more iPad if coins are below -$5.00
          </p>
        </div>
      </div>
    </main>
  );
}