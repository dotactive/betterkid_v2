'use client';
import { useState } from 'react';

interface Entertainment {
  userId: string;
  partitionKey: string;
  sortKey: string;
  entertainmentId: string;
  name: string;
  image: string;
  minutesPerCoin: number;
  costPerCoin: number;
  visible: boolean;
  description: string;
}

interface EntertainmentBoxProps {
  entertainment: Entertainment;
  onPurchase?: (entertainmentId: string, coins: number, totalMinutes: number, totalCost: number) => void;
  editMode?: boolean;
  onUpdate?: (entertainmentId: string, updates: Partial<Entertainment>) => void;
}

export default function EntertainmentBox({ entertainment, onPurchase, editMode, onUpdate }: EntertainmentBoxProps) {
  const [coins, setCoins] = useState(0);
  const [editedMinutes, setEditedMinutes] = useState(entertainment.minutesPerCoin);
  const [editedVisible, setEditedVisible] = useState(entertainment.visible);
  
  if (!entertainment.visible && !editMode) {
    return null;
  }

  const totalMinutes = coins * entertainment.minutesPerCoin;
  const totalCost = coins * entertainment.costPerCoin;
  const entertainmentId = entertainment.entertainmentId;

  const handleIncrease = () => {
    setCoins(prev => prev + 1);
  };

  const handleDecrease = () => {
    setCoins(prev => Math.max(0, prev - 1));
  };

  const handlePurchase = () => {
    if (coins > 0 && onPurchase) {
      onPurchase(entertainmentId, coins, totalMinutes, totalCost);
      setCoins(0);
    }
  };

  const handleMinutesChange = (newMinutes: number) => {
    setEditedMinutes(newMinutes);
    if (onUpdate) {
      onUpdate(entertainmentId, {
        minutesPerCoin: newMinutes
      });
    }
  };

  const handleVisibilityChange = (newVisible: boolean) => {
    setEditedVisible(newVisible);
    if (onUpdate) {
      onUpdate(entertainmentId, {
        visible: newVisible
      });
    }
  };

  return (
    <div className={`bg-gradient-to-br from-green-50 to-white rounded-2xl shadow-lg p-8 flex flex-col items-center gap-4 border ${
      editMode ? 'border-blue-300' : 'border-green-200'
    } ${!entertainment.visible && editMode ? 'opacity-60' : ''}`}>
      <img
        alt={entertainment.name}
        src={entertainment.image}
        className="rounded-xl shadow mb-2 border border-gray-200"
      />
      
      <h3 className="text-lg font-bold text-center">{entertainment.name}</h3>
      
      {editMode ? (
        <div className="w-full space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Minutes per Coin</label>
            <input
              type="number"
              value={editedMinutes}
              onChange={(e) => handleMinutesChange(parseInt(e.target.value) || 0)}
              min="1"
              className="w-full p-2 border rounded text-center"
            />
          </div>
          
    
          
          <div className="flex items-center justify-center gap-2">
            <input
              type="checkbox"
              id={`visible-${entertainmentId}`}
              checked={editedVisible}
              onChange={(e) => handleVisibilityChange(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor={`visible-${entertainmentId}`} className="text-sm font-medium">
              Visible
            </label>
          </div>
        </div>
      ) : (
        <>
          <p className="text-lg text-center font-medium mb-2">
            <span className="text-gray-600">
              Each coin adds <span className="font-semibold text-green-700">{entertainment.minutesPerCoin} minutes</span> of {entertainment.name.toLowerCase()}.
            </span>
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
              <span className="text-xl font-bold text-green-700">{totalMinutes} min</span>
              <span className="text-lg font-semibold text-red-600 mt-1">${totalCost.toFixed(2)}</span>
              <span className="text-sm text-gray-500">{coins} coins</span>
            </div>
            
            <button
              onClick={handleIncrease}
              className="bg-green-500 text-white w-10 h-10 rounded-full text-2xl flex items-center justify-center shadow hover:bg-green-600 transition"
              aria-label="Increase"
            >
              +
            </button>
          </div>

          {coins > 0 && (
            <button
              onClick={handlePurchase}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-600 transition mt-2"
            >
              Purchase {totalMinutes} min for {coins} coins
            </button>
          )}
        </>
      )}
    </div>
  );
}