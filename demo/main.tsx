/// <reference types="vite/client" />
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { FeedbackWidget } from '../src/index'

const API_URL = import.meta.env.VITE_FEEDBACK_API_URL ?? 'http://localhost:3001'

function DemoPrototype() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto', padding: 40 }}>
      <header style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
          Patient Schedule — Redesign v2
        </h1>
        <p style={{ color: '#6b7280', margin: 0 }}>
          Prototype for feedback review. Use the button in the corner to leave comments.
        </p>
      </header>

      <div style={{ display: 'grid', gap: 20 }}>
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: '#111827' }}>
            Today's Appointments
          </h2>
          {[
            { time: '9:00 AM', name: 'Jane Smith', type: 'Follow-up', status: 'Confirmed' },
            { time: '10:30 AM', name: 'Robert Chen', type: 'New Patient', status: 'Pending' },
            { time: '2:00 PM', name: 'Maria Garcia', type: 'Annual Physical', status: 'Confirmed' },
          ].map((appt) => (
            <div key={appt.time} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '12px 0',
              borderBottom: '1px solid #f3f4f6',
            }}>
              <span style={{ width: 72, fontSize: 13, color: '#6b7280', flexShrink: 0 }}>{appt.time}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{appt.name}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{appt.type}</div>
              </div>
              <span style={{
                fontSize: 12,
                padding: '3px 10px',
                borderRadius: 999,
                background: appt.status === 'Confirmed' ? '#f0fdf4' : '#fefce8',
                color: appt.status === 'Confirmed' ? '#16a34a' : '#a16207',
                fontWeight: 500,
              }}>
                {appt.status}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px', color: '#111827' }}>
              Patient Summary
            </h2>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#4f46e5' }}>24</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>appointments this week</div>
          </div>
          <div style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px', color: '#111827' }}>
              Open Tasks
            </h2>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#f59e0b' }}>7</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>pending follow-ups</div>
          </div>
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DemoPrototype />
    <FeedbackWidget
      projectName="demo-prototype"
      apiUrl={API_URL}
    />
  </StrictMode>,
)
