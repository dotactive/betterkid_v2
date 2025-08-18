'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { useEditMode } from '@/hooks/useEditMode';
import { usePendingMoney } from '@/hooks/usePendingMoney';

interface TodoItem {
  todoId: string;
  userId: string;
  text: string;
  completed: boolean;
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

  useEffect(() => {
    if (isAuthenticated && userId) {
      fetchTodos();
    }
  }, [isAuthenticated, userId]);

  const fetchTodos = async () => {
    if (!userId) return;
    try {
      const response = await axios.get(`/api/todos?userId=${encodeURIComponent(userId)}`);
      setTodos(response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch todos:', err);
      setError(err.response?.data?.error || 'Failed to fetch todos');
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
        completed: false
      });
      setNewTodo({ text: '', money: 0, repeat: 'once' });
      fetchTodos();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add todo');
    }
  };

  const handleToggleComplete = async (todoId: string, completed: boolean) => {
    if (!userId) return;
    
    // Find the todo to get its money value
    const todo = todos.find(t => t.todoId === todoId);
    if (!todo) return;
    
    try {
      await axios.put(`/api/todos/${todoId}`, {
        userId,
        completed: !completed
      });
      
      // Update pending money in real-time
      if (!completed && todo.money > 0) {
        // Todo is being completed, add to pending
        addToPending(todo.money);
      } else if (completed && todo.money > 0) {
        // Todo is being uncompleted, remove from pending
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
              Normally this happens automatically: daily (every 0:00), weekly (Monday 0:00), monthly (1st 0:00).
            </p>
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
              <div key={todo.todoId} className={`border rounded-lg p-4 transition-all ${todo.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
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
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                          todo.completed 
                            ? 'bg-green-500 border-green-500 text-white' 
                            : 'border-gray-300 hover:border-green-400'
                        }`}
                      >
                        {todo.completed && '✓'}
                      </button>
                      <div className="flex-1">
                        <p className={`text-lg ${todo.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {todo.text}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500">🪙</span>
                            <span className="text-sm font-medium text-gray-700">{todo.money} coins</span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRepeatColor(todo.repeat)}`}>
                            {todo.repeat}
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