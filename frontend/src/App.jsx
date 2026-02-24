import { useState, useEffect, memo } from 'react'
import SockJS from 'sockjs-client'
import { Client } from '@stomp/stompjs'
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'
import './App.css'

// 🛡️ The Warning-Free Chart Component
const InventoryChart = memo(({ data, color }) => {
    return (
        <LineChart width={260} height={100} data={data}>
            <XAxis dataKey="time" hide />
            <YAxis domain={['auto', 'auto']} hide />
            <Tooltip contentStyle={{ borderRadius: '8px', color: 'black', fontSize: '12px' }} />
            <Line
                type="monotone"
                dataKey="stock"
                stroke={color}
                strokeWidth={3}
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
    const [sales, setSales] = useState([]) // ⬅️ New state for the sidebar

    const getTime = () => new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    useEffect(() => {
        // 1A. Fetch current stock for the main dashboard
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

        // 1B. Fetch recent sales history for the sidebar
        fetch('http://localhost:8082/api/inventory/sales')
            .then(res => res.json())
            .then(data => {
                // Map database records to our sidebar format
                const formattedSales = data.map(sale => ({
                    sku: sale.sku,
                    quantity: sale.quantitySold, // adjust if your entity field is just 'quantity'
                    time: new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }));
                setSales(formattedSales);
            })
            .catch(err => console.error("Error fetching sales history:", err));

        // 2. Open WebSockets for Live Updates
        const stompClient = new Client({
            webSocketFactory: () => new SockJS('http://localhost:8082/ws'),
            debug: () => {},
            onConnect: () => {
                stompClient.subscribe('/topic/inventory', (msg) => {
                    const item = JSON.parse(msg.body)

                    // Update Stock Number
                    setInventory(prev => ({ ...prev, [item.sku]: item.quantity }))

                    // Update Chart Line
                    setChartData(prev => ({
                        ...prev,
                        [item.sku]: [...(prev[item.sku] || []), { time: getTime(), stock: item.quantity }].slice(-15)
                    }));

                    // Add live event to the top of the Sidebar!
                    setSales(prev => [
                        { sku: item.sku, quantity: 'Stock Updated', time: getTime() },
                        ...prev
                    ].slice(0, 10)); // Keep only the latest 10
                });

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
        <div style={{ display: 'flex', height: '100vh', background: '#f4f7f6', fontFamily: 'system-ui', margin: 0 }}>

            {/* ⬅️ LEFT SIDE: MAIN DASHBOARD */}
            <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                <h1 style={{ color: '#2c3e50', marginTop: 0 }}>🚀 Real-Time AI Inventory</h1>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '2rem' }}>
                    {Object.keys(inventory).map(sku => (
                        <div key={sku} style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', width: '280px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ margin: 0, color: '#7f8c8d' }}>{sku}</h3>
                            <h2 style={{ fontSize: '2rem', margin: '10px 0', color: inventory[sku] < 20 ? '#e74c3c' : '#2ecc71' }}>
                                {inventory[sku]} <span style={{ fontSize: '1rem', color: '#bdc3c7' }}>units</span>
                            </h2>

                            <div style={{ height: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '10px' }}>
                                {chartData[sku] && (
                                    <InventoryChart
                                        data={chartData[sku]}
                                        color={inventory[sku] < 20 ? '#e74c3c' : '#3498db'}
                                    />
                                )}
                            </div>

                            <p style={{ margin: '0', borderTop: '1px solid #eee', paddingTop: '10px', fontSize: '0.9rem', color: '#555' }}>
                                <strong>AI Velocity:</strong> {predictions[sku] || '...'} units/min
                            </p>
                            {predictions[sku] && inventory[sku] > 0 && (
                                <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#e67e22', fontWeight: 'bold' }}>
                                    ⏳ Depletes in: {(inventory[sku] / predictions[sku]).toFixed(1)} mins
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ➡️ RIGHT SIDE: RECENT ACTIVITY SIDEBAR */}
            <div style={{ width: '320px', background: 'white', borderLeft: '1px solid #ddd', padding: '1.5rem', overflowY: 'auto', boxShadow: '-4px 0 15px rgba(0,0,0,0.03)' }}>
                <h2 style={{ margin: '0 0 1rem 0', color: '#2c3e50', borderBottom: '2px solid #f4f7f6', paddingBottom: '15px' }}>
                    🕒 Recent Activity
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {sales.map((sale, index) => (
                        <div key={index} style={{ padding: '10px', background: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #3498db' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                <strong style={{ color: '#2c3e50' }}>{sale.sku}</strong>
                                <span style={{ fontSize: '0.8rem', color: '#95a5a6' }}>{sale.time}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#7f8c8d' }}>
                                Action: <span style={{ color: '#34495e', fontWeight: '500' }}>{sale.quantity}</span>
                            </p>
                        </div>
                    ))}

                    {sales.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#95a5a6', marginTop: '2rem' }}>
                            <p>No recent activity...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default App