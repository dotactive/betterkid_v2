'use client';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { useEditMode } from '@/hooks/useEditMode';
import { usePendingMoney } from '@/hooks/usePendingMoney';

interface TodoItem {
  todoId: string;
  userId: string;
  text: string;
  completed: 'false' | 'pending' | 'true';
  money: number;
  repeat: 'daily' | 'weekly' | 'monthly' | 'once';
  createdAt: string;
}

export default function TodoListPage() {
  const { isAuthenticated, userId } = useAuth();
  const { editMode } = useEditMode();
  const { addToPending, removeFromPending } = usePendingMoney();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [error, setError] = useState('');
  const [newTodo, setNewTodo] = useState({
    text: '',
    money: 0,
    repeat: 'once' as 'daily' | 'weekly' | 'monthly' | 'once'
  });
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTodo, setEditingTodo] = useState({
    text: '',
    money: 0,
    repeat: 'once' as 'daily' | 'weekly' | 'monthly' | 'once'
  });
  const [resetStatus, setResetStatus] = useState('');
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [penaltyAmount, setPenaltyAmount] = useState(0);
  const [resetTime, setResetTime] = useState('00:00');
  const [uncompletedCount, setUncompletedCount] = useState(0);
  const [completeAwardEnabled, setCompleteAwardEnabled] = useState(false);
  const [uncompleteFineEnabled, setUncompleteFineEnabled] = useState(false);
  const [completeAward, setCompleteAward] = useState(0);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const correctResetTimeRef = useRef<string>('00:00');

  useEffect(() => {
    if (isAuthenticated && userId) {
      fetchTodos();
      fetchUserSettings();
      checkAndPerformAutoReset();
    }
    // Initialize countdown timer immediately
    updateCountdown();
  }, [isAuthenticated, userId]);

  useEffect(() => {
    // Check for auto-reset every minute when the page is active
    const resetInterval = setInterval(() => {
      if (isAuthenticated && userId) {
        checkAndPerformAutoReset();
      }
    }, 60000); // Check every minute

    // Update countdown every second
    const countdownInterval = setInterval(() => {
      updateCountdown();
    }, 1000);

    return () => {
      clearInterval(resetInterval);
      clearInterval(countdownInterval);
    };
  }, [isAuthenticated, userId]);

  // Update countdown when resetTime changes or initially when component mounts
  useEffect(() => {
    updateCountdown();
  }, [resetTime]);

  const fetchTodos = async () => {
    if (!userId) return;
    try {
      const response = await axios.get(`/api/todos?userId=${encodeURIComponent(userId)}`);
      const todoList = response.data || [];
      setTodos(todoList);
      
      // Count uncompleted daily todos
      const uncompletedDaily = todoList.filter(
        (todo: TodoItem) => todo.repeat === 'daily' && todo.completed === 'false'
      ).length;
      setUncompletedCount(uncompletedDaily);
    } catch (err: any) {
      console.error('Failed to fetch todos:', err);
      setError(err.response?.data?.error || 'Failed to fetch todos');
    }
  };

  const fetchUserSettings = async () => {
    if (!userId) return;
    console.log('fetchUserSettings called for userId:', userId);
    try {
      const response = await axios.get(`/api/users/${encodeURIComponent(userId)}/settings`);
      const settings = response.data;
      console.log('settings response:', settings);
      
      // Update all settings from database
      const newResetTime = settings.resetTime || '00:00';
      console.log('newResetTime calculated:', newResetTime, 'from settings.resetTime:', settings.resetTime);
      
      // Store the correct resetTime in ref to prevent it from being lost
      if (settings.resetTime) {
        correctResetTimeRef.current = settings.resetTime;
        setResetTime(newResetTime);
      } else {
        console.log('No resetTime in settings, keeping existing values');
      }
      setPenaltyAmount(settings.uncompleteFine !== undefined ? settings.uncompleteFine : 0);
      setCompleteAward(settings.completeAward !== undefined ? settings.completeAward : 0);
      setCompleteAwardEnabled(settings.completeAwardEnabled || false);
      setUncompleteFineEnabled(settings.uncompleteFineEnabled || false);
      console.log('resetTime from database: ' + newResetTime);
      console.log('current resetTime state (old): ' + resetTime);
      setSettingsLoaded(true);
      // Trigger countdown update with the correct reset time
      const timeToUse = settings.resetTime || resetTime || '00:00';
      console.log('Calling updateCountdown with:', timeToUse);
      updateCountdown(timeToUse);
    } catch (err: any) {
      console.error('Failed to fetch user settings:', err);
      setSettingsLoaded(true); // Still mark as loaded even if failed
      // Don't set error state here since this is not critical
    }
  };

  const handleResetTimeChange = async (newResetTime: string) => {
    correctResetTimeRef.current = newResetTime;
    setResetTime(newResetTime);
    
    // Update countdown immediately with new reset time
    updateCountdown(newResetTime);
    
    // Update in database
    if (userId) {
      try {
        await axios.put(`/api/users/${encodeURIComponent(userId)}/settings`, {
          resetTime: newResetTime
        });
      } catch (err: any) {
        console.error('Failed to update reset time:', err);
        setError('Failed to save reset time');
      }
    }
  };

  const handlePenaltyAmountChange = async (newPenaltyAmount: number) => {
    setPenaltyAmount(newPenaltyAmount);
    
    // Update in database
    if (userId) {
      try {
        await axios.put(`/api/users/${encodeURIComponent(userId)}/settings`, {
          uncompleteFine: newPenaltyAmount
        });
      } catch (err: any) {
        console.error('Failed to update penalty amount:', err);
        setError('Failed to save penalty amount');
      }
    }
  };

  const checkAndPerformAutoReset = async () => {
    try {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday
      const dayOfMonth = now.getDate();
      
      // Check if it's between 21:10 and 21:15 (to handle slight timing variations)
      const isResetTime = hour === 21 && minute >= 10 && minute < 15;
      
      if (!isResetTime) return;

      // Get the last reset dates from localStorage to avoid multiple resets
      const lastDailyReset = localStorage.getItem('lastDailyReset');
      const lastWeeklyReset = localStorage.getItem('lastWeeklyReset');
      const lastMonthlyReset = localStorage.getItem('lastMonthlyReset');
      
      const today = now.toDateString();
      
      // Daily reset - every day at 21:10
      if (lastDailyReset !== today) {
        console.log('Performing automatic daily approval and reset...');
        await performAutoApprovalAndReset('daily');
        localStorage.setItem('lastDailyReset', today);
      }
      
      // Weekly reset - every Monday at 21:10
      if (dayOfWeek === 1 && lastWeeklyReset !== today) {
        console.log('Performing automatic weekly approval and reset...');
        await performAutoApprovalAndReset('weekly');
        localStorage.setItem('lastWeeklyReset', today);
      }
      
      // Monthly reset - every 1st of the month at 21:10
      if (dayOfMonth === 1 && lastMonthlyReset !== today) {
        console.log('Performing automatic monthly approval and reset...');
        await performAutoApprovalAndReset('monthly');
        localStorage.setItem('lastMonthlyReset', today);
      }
    } catch (error) {
      console.error('Error in automatic reset check:', error);
    }
  };

  const performAutoApprovalAndReset = async (resetType: 'daily' | 'weekly' | 'monthly') => {
    try {
      // Step 1: Check for penalty on daily todos (before approval/reset)
      if (resetType === 'daily') {
        console.log(`💰 Checking for penalty on uncompleted daily todos...`);
        const penaltyResponse = await axios.post('/api/todos/apply-penalty', { 
          userId,
          penaltyAmount: penaltyAmount 
        });
        console.log(`✅ Penalty check completed:`, penaltyResponse.data.message);
      }
      
      // Step 2: Auto-approve all pending todos of this type
      console.log(`🔄 Auto-approving pending ${resetType} todos...`);
      const approvalResponse = await axios.post('/api/todos/auto-approve', { resetType });
      console.log(`✅ Auto-approval completed:`, approvalResponse.data.message);
      
      // Step 3: Reset all todos of this type back to 'false'
      console.log(`🔄 Resetting ${resetType} todos to incomplete...`);
      const resetResponse = await axios.post('/api/todos/reset', { resetType });
      console.log(`✅ Reset completed:`, resetResponse.data.message);
      
      fetchTodos(); // Refresh the todo list
    } catch (error) {
      console.error(`❌ Failed to perform automatic ${resetType} approval and reset:`, error);
    }
  };

  const updateCountdown = (timeToUse?: string) => {
    const now = new Date();
    
    // Always prefer the ref value if it's been set, then timeToUse, then state
    let currentResetTime = timeToUse;
    if (!currentResetTime) {
      currentResetTime = correctResetTimeRef.current !== '00:00' ? correctResetTimeRef.current : resetTime;
    }
    
    console.log('updateCountdown using time: ' + currentResetTime + 
      (timeToUse ? ' (provided)' : 
       correctResetTimeRef.current !== '00:00' ? ' (from ref: ' + correctResetTimeRef.current + ')' : 
       ' (from state)'));
    
    // Parse reset time (e.g., "21:10" -> hour: 21, minute: 10)
    const [hour, minute] = currentResetTime.split(':').map(Number);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
    
    let nextResetTime: Date;
    
    // If current time is before reset time today, next reset is today
    if (now < today) {
      nextResetTime = today;
    } else {
      // Otherwise, next reset is tomorrow at the same time
      nextResetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hour, minute, 0);
    }
    
    const timeUntilReset = nextResetTime.getTime() - now.getTime();
    
    if (timeUntilReset > 0) {
      const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
      const minutes = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeUntilReset % (1000 * 60)) / 1000);
      
      setCountdown({ hours, minutes, seconds });
    } else {
      setCountdown({ hours: 0, minutes: 0, seconds: 0 });
    }
  };

  const handleAddTodo = async () => {
    if (!userId || !newTodo.text.trim()) {
      setError('Todo text is required');
      return;
    }
    
    try {
      await axios.post('/api/todos', {
        userId,
        text: newTodo.text.trim(),
        money: newTodo.money,
        repeat: newTodo.repeat,
        completed: 'false'
      });
      setNewTodo({ text: '', money: 0, repeat: 'once' });
      fetchTodos();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add todo');
    }
  };

  const handleToggleComplete = async (todoId: string, currentStatus: 'false' | 'pending' | 'true') => {
    if (!userId) return;
    
    // Find the todo to get its money value
    const todo = todos.find(t => t.todoId === todoId);
    if (!todo) return;
    
    // Determine next status based on current status and edit mode
    let nextStatus: 'false' | 'pending' | 'true';
    
    if (editMode) {
      // In edit mode, cycle through all states: false -> pending -> true -> false
      switch (currentStatus) {
        case 'false':
          nextStatus = 'pending';
          break;
        case 'pending':
          nextStatus = 'true';
          break;
        case 'true':
          nextStatus = 'false';
          break;
      }
    } else {
      // In normal mode, allow toggling between false <-> pending
      if (currentStatus === 'false') {
        nextStatus = 'pending';
      } else if (currentStatus === 'pending') {
        nextStatus = 'false';
      } else {
        // Don't allow changing from 'true' in normal mode (only parents can do that)
        return;
      }
    }
    
    try {
      await axios.put(`/api/todos/${todoId}`, {
        userId,
        completed: nextStatus
      });
      
      // Update pending money in real-time
      if (currentStatus === 'false' && nextStatus === 'pending' && todo.money > 0) {
        // Todo is being marked as pending, add to pending money
        addToPending(todo.money);
      } else if (currentStatus === 'pending' && nextStatus === 'false' && todo.money > 0) {
        // Todo is being unchecked from pending, remove from pending
        removeFromPending(todo.money);
      }
      
      fetchTodos();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update todo');
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    if (!userId || !confirm('Are you sure you want to delete this todo?')) {
      return;
    }
    
    try {
      await axios.delete(`/api/todos/${todoId}`, {
        headers: { 'x-userid': userId }
      });
      fetchTodos();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete todo');
    }
  };

  const handleEditTodo = (todo: TodoItem) => {
    setEditingTodoId(todo.todoId);
    setEditingTodo({
      text: todo.text,
      money: todo.money,
      repeat: todo.repeat
    });
  };

  const handleSaveTodo = async (todoId: string) => {
    if (!userId || !editingTodo.text.trim()) {
      setError('Todo text is required');
      return;
    }
    
    try {
      await axios.put(`/api/todos/${todoId}`, {
        userId,
        text: editingTodo.text.trim(),
        money: editingTodo.money,
        repeat: editingTodo.repeat
      });
      setEditingTodoId(null);
      setEditingTodo({ text: '', money: 0, repeat: 'once' });
      fetchTodos();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update todo');
    }
  };

  const handleCancelEdit = () => {
    setEditingTodoId(null);
    setEditingTodo({ text: '', money: 0, repeat: 'once' });
  };

  const handleResetTodos = async (resetType: 'daily' | 'weekly' | 'monthly') => {
    if (!confirm(`Are you sure you want to reset all completed ${resetType} todos? This will mark them as incomplete again.`)) {
      return;
    }
    
    try {
      setResetStatus(`Resetting ${resetType} todos...`);
      const response = await axios.post('/api/todos/reset', { resetType });
      setResetStatus(`✅ ${response.data.message}`);
      fetchTodos(); // Refresh the list
      setTimeout(() => setResetStatus(''), 5000);
    } catch (err: any) {
      setResetStatus(`❌ Failed to reset ${resetType} todos: ${err.response?.data?.error || err.message}`);
      setTimeout(() => setResetStatus(''), 5000);
    }
  };

  const getRepeatColor = (repeat: string) => {
    switch (repeat) {
      case 'daily': return 'bg-green-100 text-green-800';
      case 'weekly': return 'bg-blue-100 text-blue-800';
      case 'monthly': return 'bg-purple-100 text-purple-800';
      case 'once': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
          
        {error && <p className="text-red-600 mb-4 p-3 bg-red-50 rounded">{error}</p>}
        {resetStatus && <p className="mb-4 p-3 bg-blue-50 rounded text-blue-800">{resetStatus}</p>}
        
        {/* Countdown Timer */}
        <div className={`p-4 rounded-lg mb-6 border ${
          uncompletedCount > 0 
            ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200' 
            : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className={`text-lg font-semibold mb-1 ${
                uncompletedCount > 0 ? 'text-red-800' : 'text-blue-800'
              }`}>
                🕘 Next Reset
              </h3>
              {editMode ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Reset time:</span>
                    <input
                      type="time"
                      value={resetTime}
                      onChange={(e) => handleResetTimeChange(e.target.value)}
                      className="px-2 py-1 border rounded text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Penalty amount: $</span>
                    <input
                      type="number"
                      value={penaltyAmount}
                      onChange={(e) => handlePenaltyAmountChange(Number(e.target.value))}
                      step="0.1"
                      min="0"
                      className="px-2 py-1 border rounded text-sm w-20"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <p className={`text-sm ${
                    uncompletedCount > 0 ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    Daily todos reset at {resetTime}
                  </p>
                  {/* Show earn message if completeAwardEnabled is true */}
                  {completeAwardEnabled && (
                    <p className="text-sm text-green-600 font-medium mt-1">
                      💰 You will earn ${completeAward} for each completed task after {resetTime}
                    </p>
                  )}
                  {/* Show lose message if uncompleteFineEnabled is true and there are uncompleted tasks */}
                  {uncompleteFineEnabled && uncompletedCount > 0 && (
                    <p className="text-sm text-red-600 font-medium mt-1">
                      ⚠️ You have {uncompletedCount} uncompleted task{uncompletedCount !== 1 ? 's' : ''}, you will lose ${penaltyAmount} after {resetTime}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-2xl font-mono font-bold text-blue-800">
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm border">
                {countdown.hours.toString().padStart(2, '0')}
                <div className="text-xs text-blue-600 font-normal">HRS</div>
              </div>
              <div className="text-blue-400">:</div>
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm border">
                {countdown.minutes.toString().padStart(2, '0')}
                <div className="text-xs text-blue-600 font-normal">MIN</div>
              </div>
              <div className="text-blue-400">:</div>
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm border">
                {countdown.seconds.toString().padStart(2, '0')}
                <div className="text-xs text-blue-600 font-normal">SEC</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Reset Controls - Only in Edit Mode */}
        {editMode && (
          <div className="bg-orange-50 p-4 rounded-lg mb-6">
            <h2 className="text-lg font-semibold text-orange-800 mb-3">Reset Completed Todos</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleResetTodos('daily')}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                🔄 Reset Daily Todos
              </button>
              <button
                onClick={() => handleResetTodos('weekly')}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                🔄 Reset Weekly Todos
              </button>
              <button
                onClick={() => handleResetTodos('monthly')}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                🔄 Reset Monthly Todos
              </button>
            </div>
            <p className="text-sm text-orange-700 mt-2">
              ℹ️ This will mark all completed todos of the selected type as incomplete again. 
              Normally this happens automatically: daily (every 21:10), weekly (Monday 21:10), monthly (1st 21:10).
            </p>
            <div className="mt-3 pt-3 border-t border-orange-200">
              <div className="flex flex-wrap gap-3 mb-3">
                <button
                  onClick={() => {
                    console.log('Testing automatic reset check...');
                    checkAndPerformAutoReset();
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  🧪 Test Auto-Reset Check
                </button>
                <button
                  onClick={async () => {
                    console.log('Testing auto-approval and reset...');
                    await performAutoApprovalAndReset('daily');
                  }}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  🚀 Test Auto-Approve & Reset
                </button>
                <button
                  onClick={async () => {
                    console.log('Testing penalty system...');
                    const response = await axios.post('/api/todos/apply-penalty', { 
                      userId,
                      penaltyAmount: penaltyAmount 
                    });
                    console.log('Penalty result:', response.data);
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  💸 Test Penalty
                </button>
              </div>
              <p className="text-xs text-orange-600">
                Click to test automatic logic (check console for logs)
              </p>
            </div>
          </div>
        )}

        {/* Add New Todo - Only in Edit Mode */}
        {editMode && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Add New Todo</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                value={newTodo.text}
                onChange={(e) => setNewTodo({ ...newTodo, text: e.target.value })}
                placeholder="What do you need to do?"
                className="col-span-2 p-3 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
              />
              <div className="flex items-center gap-2">
                <span className="text-yellow-500 text-xl">🪙</span>
                <input
                  type="number"
                  value={newTodo.money}
                  onChange={(e) => setNewTodo({ ...newTodo, money: Number(e.target.value) })}
                  placeholder="Coins"
                  min="0"
                  className="flex-1 p-3 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={newTodo.repeat}
                onChange={(e) => setNewTodo({ ...newTodo, repeat: e.target.value as 'daily' | 'weekly' | 'monthly' | 'once' })}
                className="p-3 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="once">Once</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <button
              onClick={handleAddTodo}
              className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-medium transition-colors"
            >
              ➕ Add Todo
            </button>
          </div>
        )}

        {/* Todo List */}
        <div className="space-y-3">
          {todos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📋</div>
              <p>No todos yet! {editMode ? 'Add one above to get started.' : 'Ask a parent to add some todos for you.'}</p>
            </div>
          ) : (
            todos.map((todo) => (
              <div key={todo.todoId} className={`border rounded-lg p-4 transition-all ${
                todo.completed === 'true' ? 'bg-green-50 border-green-200' :
                todo.completed === 'pending' ? 'bg-yellow-50 border-yellow-200' :
                'bg-white border-gray-200'
              }`}>
                {editMode && editingTodoId === todo.todoId ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      type="text"
                      value={editingTodo.text}
                      onChange={(e) => setEditingTodo({ ...editingTodo, text: e.target.value })}
                      className="col-span-2 p-2 border rounded text-gray-900 focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleSaveTodo(todo.todoId)}
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500">🪙</span>
                      <input
                        type="number"
                        value={editingTodo.money}
                        onChange={(e) => setEditingTodo({ ...editingTodo, money: Number(e.target.value) })}
                        min="0"
                        className="flex-1 p-2 border rounded text-gray-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <select
                      value={editingTodo.repeat}
                      onChange={(e) => setEditingTodo({ ...editingTodo, repeat: e.target.value as 'daily' | 'weekly' | 'monthly' | 'once' })}
                      className="p-2 border rounded text-gray-900 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="once">Once</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                    <div className="col-span-full flex gap-2 justify-end">
                      <button
                        onClick={() => handleSaveTodo(todo.todoId)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => handleToggleComplete(todo.todoId, todo.completed)}
                        disabled={!editMode && todo.completed === 'true'}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                          todo.completed === 'true' ? 'bg-green-500 border-green-500 text-white' :
                          todo.completed === 'pending' ? 'bg-yellow-500 border-yellow-500 text-white' :
                          'border-gray-300 hover:border-green-400'
                        } ${!editMode && todo.completed === 'true' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                        title={
                          todo.completed === 'false' ? 'Click to mark as pending' :
                          todo.completed === 'pending' ? (editMode ? 'Click to approve' : 'Click to untick') :
                          editMode ? 'Click to reset' : 'Completed'
                        }
                      >
                        {todo.completed === 'true' && '✓'}
                        {todo.completed === 'pending' && '⏳'}
                      </button>
                      <div className="flex-1">
                        <p className={`text-lg ${
                          todo.completed === 'true' ? 'line-through text-gray-500' :
                          todo.completed === 'pending' ? 'text-yellow-700 font-medium' :
                          'text-gray-900'
                        }`}>
                          {todo.text}
                          {todo.completed === 'pending' && <span className="ml-2 text-xs text-yellow-600">(Pending Approval)</span>}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500">🪙</span>
                            <span className="text-sm font-medium text-gray-700">{todo.money} coins</span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRepeatColor(todo.repeat)}`}>
                            {todo.repeat}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            todo.completed === 'true' ? 'bg-green-100 text-green-800' :
                            todo.completed === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {todo.completed === 'true' ? '✅ Approved' :
                             todo.completed === 'pending' ? '⏳ Pending' :
                             '📝 Todo'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {editMode && (
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEditTodo(todo)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTodo(todo.todoId)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}