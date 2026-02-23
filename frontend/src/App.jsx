import { useState, useEffect } from 'react'
import SockJS from 'sockjs-client'
import { Stomp } from '@stomp/stompjs'
import './App.css'

function App() {
  const [inventory, setInventory] = useState({})
  const [predictions, setPredictions] = useState({})

  useEffect(() => {
    console.log("Fetching history from database...");

    // 1. HYDRATION: Fetch the current database state immediately on load
    fetch('http://localhost:8082/api/inventory')
        .then(res => res.json())
        .then(data => {
          console.log("Database History Loaded:", data);
          const initialInventory = {};
          const initialPredictions = {};

          data.forEach(item => {
            initialInventory[item.sku] = item.quantity;
            if (item.aiVelocity) {
              initialPredictions[item.sku] = item.aiVelocity;
            }
          });

          setInventory(initialInventory);
          setPredictions(initialPredictions);
        })
        .catch(err => console.error("Error fetching history:", err));

    // 2. THE LIVE STREAM: Open the WebSocket for new events
    const socket = new SockJS('http://localhost:8082/ws')
    const stompClient = Stomp.over(socket)
    stompClient.debug = () => {}

    stompClient.connect({}, () => {
      console.log('🟢 Connected to Spring Boot WebSocket!')

      stompClient.subscribe('/topic/inventory', (message) => {
        const item = JSON.parse(message.body)
        setInventory(prev => ({ ...prev, [item.sku]: item.quantity }))
      })

      stompClient.subscribe('/topic/ai-predictions', (message) => {
        const event = JSON.parse(message.body)
        setPredictions(prev => ({ ...prev, [event.sku]: event.ai_velocity }))
      })
    })

    return () => {
      if (stompClient) stompClient.disconnect()
    }
  }, [])

  return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <h1>🚀 Real-Time AI Inventory Dashboard</h1>
        <p>Hydrating from PostgreSQL & watching Kafka via WebSockets...</p>

        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginTop: '2rem' }}>
          {Object.keys(inventory).map(sku => (
              <div key={sku} style={{ border: '1px solid #ccc', padding: '1.5rem', borderRadius: '8px', minWidth: '250px', backgroundColor: 'white', color: 'black' }}>
                <h2 style={{ marginTop: 0 }}>{sku}</h2>
                <h1 style={{ color: inventory[sku] < 20 ? '#d32f2f' : '#2e7d32', margin: '10px 0' }}>
                  {inventory[sku]} in stock
                </h1>
                <p style={{ margin: '5px 0' }}>
                  <strong>AI Velocity:</strong> {predictions[sku] ? `${predictions[sku]} units/min` : 'Calculating...'}
                </p>
                {predictions[sku] && inventory[sku] > 0 && (
                    <p style={{ color: '#666', margin: '5px 0' }}>
                      ⏳ Time to zero: <strong>{(inventory[sku] / predictions[sku]).toFixed(1)} mins</strong>
                    </p>
                )}
              </div>
          ))}
        </div>

        {Object.keys(inventory).length === 0 && (
            <div style={{ marginTop: '2rem', padding: '2rem', backgroundColor: '#f0f0f0', borderRadius: '8px', color: '#333' }}>
              Loading inventory...
            </div>
        )}
      </div>
  )
}

export default App