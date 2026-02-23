import { useState, useEffect } from 'react'
import SockJS from 'sockjs-client'
import { Stomp } from '@stomp/stompjs'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import './App.css'

function App() {
    const [inventory, setInventory] = useState({})
    const [predictions, setPredictions] = useState({})
    const [chartData, setChartData] = useState({}) // 📈 NEW: Rolling history for the charts!

    // Helper to get a clean timestamp for the graph's X-axis
    const getTime = () => new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });

    useEffect(() => {
        // 1. HYDRATION
        fetch('http://localhost:8082/api/inventory')
            .then(res => res.json())
            .then(data => {
                const initialInventory = {};
                const initialPredictions = {};
                const initialChart = {};

                data.forEach(item => {
                    initialInventory[item.sku] = item.quantity;
                    if (item.aiVelocity) initialPredictions[item.sku] = item.aiVelocity;

                    // Seed the chart with the starting dot
                    initialChart[item.sku] = [{ time: getTime(), stock: item.quantity }];
                });

                setInventory(initialInventory);
                setPredictions(initialPredictions);
                setChartData(initialChart);
            })
            .catch(err => console.error("Error fetching history:", err));

        // 2. THE LIVE STREAM
        const socket = new SockJS('http://localhost:8082/ws')
        const stompClient = Stomp.over(socket)
        stompClient.debug = () => {}

        stompClient.connect({}, () => {
            stompClient.subscribe('/topic/inventory', (message) => {
                const item = JSON.parse(message.body)
                setInventory(prev => ({ ...prev, [item.sku]: item.quantity }))

                // 📈 Add the new Kafka event to the chart's history (keep last 15 points)
                setChartData(prev => {
                    const existingData = prev[item.sku] || [];
                    const newData = [...existingData, { time: getTime(), stock: item.quantity }].slice(-15);
                    return { ...prev, [item.sku]: newData };
                });
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
            <p>Watching Kafka streams & rendering live Recharts...</p>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginTop: '2rem' }}>
                {Object.keys(inventory).map(sku => (
                    <div key={sku} style={{ border: '1px solid #ccc', padding: '1.5rem', borderRadius: '8px', minWidth: '300px', backgroundColor: 'white', color: 'black', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <h2 style={{ marginTop: 0 }}>{sku}</h2>
                        <h1 style={{ color: inventory[sku] < 20 ? '#d32f2f' : '#2e7d32', margin: '10px 0' }}>
                            {inventory[sku]} in stock
                        </h1>

                        {/* 📈 THE LIVE CHART */}
                        <div style={{ width: '100%', height: '120px', marginTop: '1rem', marginBottom: '1rem' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData[sku] || []}>
                                    <XAxis dataKey="time" hide />
                                    <YAxis domain={['dataMin - 10', 'dataMax + 10']} hide />
                                    <Tooltip contentStyle={{ borderRadius: '8px', color: 'black' }} />
                                    <Line
                                        type="monotone"
                                        dataKey="stock"
                                        stroke={inventory[sku] < 20 ? '#d32f2f' : '#3b82f6'}
                                        strokeWidth={4}
                                        isAnimationActive={true}
                                        animationDuration={300}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>
                            <strong>AI Velocity:</strong> {predictions[sku] ? `${predictions[sku]} units/min` : 'Calculating...'}
                        </p>
                        {predictions[sku] && inventory[sku] > 0 && (
                            <p style={{ color: '#666', margin: '5px 0', fontSize: '0.9rem' }}>
                                ⏳ Time to zero: <strong>{(inventory[sku] / predictions[sku]).toFixed(1)} mins</strong>
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default App