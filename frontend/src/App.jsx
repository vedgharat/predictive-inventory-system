import { useState, useEffect, memo } from 'react'
import SockJS from 'sockjs-client'
import { Client } from '@stomp/stompjs'
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts' // ⬅️ Removed ResponsiveContainer
import './App.css'

const InventoryChart = memo(({ data, color }) => {
    return (
        /* 🛡️ FIX: Using fixed dimensions (280x120) instead of 100%
           This prevents Recharts from measuring -1 during page load. */
        <LineChart width={280} height={120} data={data}>
            <XAxis dataKey="time" hide />
            <YAxis domain={['auto', 'auto']} hide />
            <Tooltip contentStyle={{ borderRadius: '8px', color: 'black' }} />
            <Line
                type="monotone"
                dataKey="stock"
                stroke={color}
                strokeWidth={4}
                dot={false}
                isAnimationActive={false}
            />
        </LineChart>
    );
});

function App() {
    const [inventory, setInventory] = useState({})
    const [predictions, setPredictions] = useState({})
    const [chartData, setChartData] = useState({})

    const getTime = () => new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    useEffect(() => {
        fetch('http://localhost:8082/api/inventory')
            .then(res => res.json())
            .then(data => {
                const initialInv = {};
                const initialChart = {};
                data.forEach(item => {
                    initialInv[item.sku] = item.quantity;
                    initialChart[item.sku] = [{ time: getTime(), stock: item.quantity }];
                });
                setInventory(initialInv);
                setChartData(initialChart);
            });

        const stompClient = new Client({
            webSocketFactory: () => new SockJS('http://localhost:8082/ws'),
            onConnect: () => {
                stompClient.subscribe('/topic/inventory', (msg) => {
                    const item = JSON.parse(msg.body)
                    setInventory(prev => ({ ...prev, [item.sku]: item.quantity }))
                    setChartData(prev => ({
                        ...prev,
                        [item.sku]: [...(prev[item.sku] || []), { time: getTime(), stock: item.quantity }].slice(-15)
                    }));
                })
                stompClient.subscribe('/topic/ai-predictions', (msg) => {
                    const event = JSON.parse(msg.body)
                    setPredictions(prev => ({ ...prev, [event.sku]: event.ai_velocity }))
                });
            }
        });
        stompClient.activate();
        return () => stompClient.deactivate();
    }, [])

    return (
        <div style={{ padding: '2rem', background: '#f4f7f6', minHeight: '100vh' }}>
            <h1 style={{ color: '#2c3e50' }}>🚀 Real-Time AI Inventory</h1>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {Object.keys(inventory).map(sku => (
                    <div key={sku} style={{
                        background: 'white',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        width: '320px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
                    }}>
                        <h3 style={{ margin: 0, color: '#7f8c8d' }}>{sku}</h3>
                        <h2 style={{ fontSize: '2rem', margin: '10px 0', color: inventory[sku] < 20 ? '#e74c3c' : '#2ecc71' }}>
                            {inventory[sku]} <span style={{ fontSize: '1rem', color: '#bdc3c7' }}>units</span>
                        </h2>

                        <div style={{ height: '120px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {chartData[sku] && (
                                <InventoryChart
                                    data={chartData[sku]}
                                    color={inventory[sku] < 20 ? '#e74c3c' : '#3498db'}
                                />
                            )}
                        </div>

                        <p style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '10px', fontSize: '0.9rem' }}>
                            <strong>AI Velocity:</strong> {predictions[sku] || '...'} units/min
                        </p>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default App