'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import ImagePicker from '@/components/ImagePicker';
import { useAuth } from '@/hooks/useAuth';

export default function ContentEditorPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', image: '', amount: 0, type: 'earn' });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { isAuthenticated, username } = useAuth();
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    if (isAuthenticated && username) {
      fetchEvents();
    }
  }, [isAuthenticated, username]);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`/api/events?username=${encodeURIComponent(username ?? '')}`);
      setEvents(response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch events:', err);
      setError(err.response?.data?.error || 'Failed to fetch events');
    }
  };

  const handleEventSubmit = async () => {
    try {
      const payload = { ...newEvent, username };
      if (editingEventId) {
        await axios.put(`/api/events/${editingEventId}`, payload);
        setEditingEventId(null);
      } else {
        await axios.post('/api/events', payload);
      }
      setNewEvent({ title: '', description: '', image: '', amount: 0, type: 'earn' });
      fetchEvents();
    } catch (err: any) {
      console.error('Failed to save event:', err);
      setError(err.response?.data?.error || 'Failed to save event');
    }
  };

  const handleEditEvent = (event: any) => {
    setNewEvent({
      title: event.title,
      description: event.description,
      image: event.image,
      amount: event.amount,
      type: event.type,
    });
    setEditingEventId(event.eventId);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await axios.delete(`/api/events/${eventId}`);
      fetchEvents();
    } catch (err: any) {
      console.error('Failed to delete event:', err);
      setError(err.response?.data?.error || 'Failed to delete event');
    }
  };

  if (isAuthenticated === null) return <div>Loading authentication...</div>;
  if (!isAuthenticated) return null;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Content Editor for {username}</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ marginTop: '30px' }}>
        <h2>{editingEventId ? 'Edit Event' : 'Add Event'}</h2>
        <input
          type="text"
          placeholder="Title"
          value={newEvent.title}
          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
          style={{ margin: '5px' }}
        />
        <input
          type="text"
          placeholder="Description"
          value={newEvent.description}
          onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
          style={{ margin: '5px' }}
        />
        <ImagePicker
          folder="thumb"
          selectedImage={newEvent.image}
          onSelect={(img) => setNewEvent({ ...newEvent, image: img ?? '' })}
        />
        <input
          type="number"
          placeholder="Amount"
          value={newEvent.amount}
          onChange={(e) => setNewEvent({ ...newEvent, amount: parseFloat(e.target.value) || 0 })}
          style={{ margin: '5px' }}
        />
        <select
          value={newEvent.type}
          onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
          style={{ margin: '5px' }}
        >
          <option value="earn">Earn</option>
          <option value="lose">Lose</option>
          <option value="spend">Spend</option>
        </select>
        <button onClick={handleEventSubmit} style={{ margin: '5px', background: '#0070f3', color: 'white' }}>
          {editingEventId ? 'Update Event' : 'Add Event'}
        </button>
        {editingEventId && (
          <button onClick={() => {
            setEditingEventId(null);
            setNewEvent({ title: '', description: '', image: '', amount: 0, type: 'earn' });
          }} style={{ margin: '5px', background: '#ccc' }}>
            Cancel
          </button>
        )}

        <h3>Existing Events</h3>
        <ul>
          {events.map((ev, idx) => (
            <li key={idx} style={{ marginBottom: '10px' }}>
              <strong>{ev.title}</strong> - {ev.type} ${ev.amount}<br />
              <em>{ev.description}</em><br />
              {ev.image && <img src={ev.image} alt={ev.title} width={100} />}<br />
              <button onClick={() => handleEditEvent(ev)} style={{ margin: '5px' }}>Edit</button>
              <button onClick={() => handleDeleteEvent(ev.eventId)} style={{ margin: '5px', background: '#ff0000', color: 'white' }}>Delete</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
