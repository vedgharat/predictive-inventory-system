import { useState, useEffect, memo } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import SockJS from 'sockjs-client'
import { Client } from '@stomp/stompjs'
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'
import './App.css'

// 🛡️ SUB-COMPONENT: The Chart
const InventoryChart = memo(({ data, color }) => {
    return (
        <LineChart width={260} height={100} data={data}>
            <XAxis dataKey="time" hide />
            <YAxis domain={['auto', 'auto']} hide />
            <Tooltip contentStyle={{ borderRadius: '8px', color: 'black', fontSize: '12px' }} />
            <Line type="monotone" dataKey="stock" stroke={color} strokeWidth={3} dot={false} isAnimationActive={false} />
        </LineChart>
    );
});

// 🧭 SUB-COMPONENT: The Navigation Bar
function Navbar() {
    const location = useLocation(); // Knows which URL we are currently on

    return (
        <div style={{ background: '#2c3e50', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '2rem', color: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 10 }}>
            <h2 style={{ margin: 0, letterSpacing: '1px' }}>🏢 TechCorp Inc.</h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
                <Link to="/" style={{ textDecoration: 'none' }}>
                    <button style={{ padding: '8px 16px', cursor: 'pointer', background: location.pathname === '/' ? '#3498db' : 'transparent', border: '1px solid #3498db', color: 'white', borderRadius: '4px', fontWeight: 'bold' }}>
                        🛍️ Customer Store
                    </button>
                </Link>
                <Link to="/admin" style={{ textDecoration: 'none' }}>
                    <button style={{ padding: '8px 16px', cursor: 'pointer', background: location.pathname === '/admin' ? '#e67e22' : 'transparent', border: '1px solid #e67e22', color: 'white', borderRadius: '4px', fontWeight: 'bold' }}>
                        📊 Admin Dashboard
                    </button>
                </Link>
            </div>
        </div>
    );
}

// 🛍️ ROUTE 1: THE CUSTOMER STOREFRONT (Lightweight, No WebSockets)
function CustomerStore() {
    const [inventory, setInventory] = useState({});

    // Fetch initial items just to display the storefront
    useEffect(() => {
        fetch('http://localhost:8082/api/inventory')
            .then(res => res.json())
            .then(data => {
                const initialInv = {};
                data.forEach(item => initialInv[item.sku] = item.quantity);
                setInventory(initialInv);
            });
    }, []);

    const handleOrder = async (sku, quantity) => {
        try {
            await fetch(`http://localhost:8081/api/orders/place?sku=${sku}&quantity=${quantity}`, { method: 'POST' });
            // In a real app, we'd show a "Success!" toast notification here
        } catch (err) {
            console.error("Order failed:", err);
        }
    };

    return (
        <div style={{ padding: '3rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center', background: '#f4f7f6', minHeight: '100vh' }}>
            {Object.keys(inventory).map(sku => (
                <div key={sku} style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '250px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', height: 'fit-content' }}>
                    <h2 style={{ color: '#2c3e50', margin: '0 0 1rem 0' }}>{sku}</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1.5rem' }}>
                        <button onClick={() => handleOrder(sku, 1)} style={{ padding: '10px', background: '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                            Buy 1
                        </button>
                        <button onClick={() => handleOrder(sku, 5)} style={{ padding: '10px', background: '#2980b9', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                            Buy 5
                        </button>
                        <button onClick={() => handleOrder(sku, 15)} style={{ padding: '10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                            Flash Sale! (Buy 15)
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

// 📊 ROUTE 2: THE SECURE ADMIN DASHBOARD (Heavy WebSockets & Charts)
function AdminDashboard() {
    const [inventory, setInventory] = useState({})
    const [sales, setSales] = useState([])
    const [predictions, setPredictions] = useState(() => {
        const saved = localStorage.getItem('dashboard_predictions');
        return saved ? JSON.parse(saved) : {};
    });
    const [chartData, setChartData] = useState(() => {
        const saved = localStorage.getItem('dashboard_chart');
        return saved ? JSON.parse(saved) : {};
    });

    const getTime = () => new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    useEffect(() => {
        localStorage.setItem('dashboard_predictions', JSON.stringify(predictions));
    }, [predictions]);

    useEffect(() => {
        localStorage.setItem('dashboard_chart', JSON.stringify(chartData));
    }, [chartData]);

    useEffect(() => {
        const formatTime = (timestamp) => {
            if (!timestamp) return getTime();
            if (Array.isArray(timestamp)) {
                const [year, month, day, hour, minute] = timestamp;
                const d = new Date(year, month - 1, day, hour || 0, minute || 0);
                return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            const d = new Date(timestamp);
            return isNaN(d) ? getTime() : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };

        fetch('http://localhost:8082/api/inventory')
            .then(res => res.json())
            .then(data => {
                const initialInv = {};
                setChartData(prevChart => {
                    const newChart = { ...prevChart };
                    data.forEach(item => {
                        initialInv[item.sku] = item.quantity;
                        const history = newChart[item.sku] || [];
                        newChart[item.sku] = [...history, { time: getTime(), stock: item.quantity }].slice(-15);
                    });
                    return newChart;
                });
                setInventory(initialInv);
            });

        fetch('http://localhost:8082/api/inventory/sales')
            .then(res => res.json())
            .then(data => {
                const formattedSales = data.map(sale => ({
                    sku: sale.sku,
                    quantity: sale.quantitySold || sale.quantity || 'Sold',
                    time: formatTime(sale.timestamp || sale.saleDate || sale.createdAt)
                }));
                setSales(formattedSales);
            });

        const stompClient = new Client({
            webSocketFactory: () => new SockJS('http://localhost:8082/ws'),
            debug: () => {},
            onConnect: () => {
                stompClient.subscribe('/topic/inventory', (msg) => {
                    const item = JSON.parse(msg.body)
                    setInventory(prev => ({ ...prev, [item.sku]: item.quantity }))
                    setChartData(prev => ({ ...prev, [item.sku]: [...(prev[item.sku] || []), { time: getTime(), stock: item.quantity }].slice(-15) }));
                    setSales(prev => [{ sku: item.sku, quantity: 'Stock Updated', time: getTime() }, ...prev].slice(0, 10));
                });
                stompClient.subscribe('/topic/ai-predictions', (msg) => {
                    const event = JSON.parse(msg.body)
                    setPredictions(prev => ({ ...prev, [event.sku]: event.ai_velocity }))
                });
            }
        });

        stompClient.activate();
        return () => stompClient.deactivate();
    }, []);

    return (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: '#f4f7f6', minHeight: 'calc(100vh - 70px)' }}>
            <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                <h1 style={{ color: '#2c3e50', marginTop: 0 }}>🚀 AI Command Center</h1>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '2rem' }}>
                    {Object.keys(inventory).map(sku => (
                        <div key={sku} style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', width: '280px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ margin: 0, color: '#7f8c8d' }}>{sku}</h3>
                            <h2 style={{ fontSize: '2rem', margin: '10px 0', color: inventory[sku] < 20 ? '#e74c3c' : '#2ecc71' }}>
                                {inventory[sku]} <span style={{ fontSize: '1rem', color: '#bdc3c7' }}>units</span>
                            </h2>
                            <div style={{ height: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '10px' }}>
                                {chartData[sku] && <InventoryChart data={chartData[sku]} color={inventory[sku] < 20 ? '#e74c3c' : '#3498db'} />}
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
            <div style={{ width: '320px', background: 'white', borderLeft: '1px solid #ddd', padding: '1.5rem', overflowY: 'auto', boxShadow: '-4px 0 15px rgba(0,0,0,0.03)' }}>
                <h2 style={{ margin: '0 0 1rem 0', color: '#2c3e50', borderBottom: '2px solid #f4f7f6', paddingBottom: '15px' }}>🕒 Recent Activity</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {sales.map((sale, index) => (
                        <div key={index} style={{ padding: '10px', background: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #3498db' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                <strong style={{ color: '#2c3e50' }}>{sale.sku}</strong>
                                <span style={{ fontSize: '0.8rem', color: '#95a5a6' }}>{sale.time}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#7f8c8d' }}>Action: <span style={{ color: '#34495e', fontWeight: '500' }}>{sale.quantity}</span></p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// 🌐 THE MAIN APP ORCHESTRATOR
export default function App() {
    return (
        <BrowserRouter>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', margin: 0, fontFamily: 'system-ui' }}>
                <Navbar />
                <Routes>
                    {/* The root URL loads the public store */}
                    <Route path="/" element={<CustomerStore />} />
                    {/* The /admin URL loads the protected dashboard */}
                    <Route path="/admin" element={<AdminDashboard />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}