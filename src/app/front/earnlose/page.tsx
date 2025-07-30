'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function UserPage() {
  return (
    <main className="px-6 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
        {/* Earning Coins */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
          <h2 className="text-2xl font-bold text-green-600 mb-4 text-center">Earning Coins</h2>
          {/* Piano */}
          <div className="bg-blue-100 p-4 rounded-lg mb-4 flex items-center gap-4">
            <div className="text-4xl">🎹</div>
            <div>
              <p className="text-lg font-semibold">play piano like a pro</p>
              <p className="text-green-600 text-2xl font-bold">+$3.00 Coins</p>
            </div>
          </div>
          {/* Running */}
          <div className="bg-blue-100 p-4 rounded-lg flex items-center gap-4">
            <div className="text-4xl">🏃‍♂️</div>
            <div>
              <p className="text-lg font-semibold">run every 500m</p>
              <p className="text-green-600 text-2xl font-bold">+$0.50 Coins</p>
            </div>
          </div>
        </div>

        {/* Losing Coins */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-red-200">
          <h2 className="text-2xl font-bold text-red-600 mb-4 text-center">Losing Coins</h2>
          {/* Minor Error */}
          <div className="bg-red-100 p-4 rounded-lg mb-4 flex items-center gap-4">
            <div className="text-4xl">😟</div>
            <div>
              <p className="text-lg font-semibold">a minor error...</p>
              <p className="text-red-600 text-2xl font-bold">-$0.50 Coin</p>
            </div>
          </div>
          {/* Major Blunder */}
          <div className="bg-red-100 p-4 rounded-lg flex items-center gap-4">
            <div className="text-4xl">🍌</div>
            <div>
              <p className="text-lg font-semibold">a big mistake...</p>
              <p className="text-red-600 text-2xl font-bold">-$5.00 Coins</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}