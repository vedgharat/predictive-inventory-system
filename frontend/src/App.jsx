import { useState, useEffect, memo } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import SockJS from 'sockjs-client'
import { Client } from '@stomp/stompjs'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Activity, LayoutDashboard, ShoppingCart, TrendingUp, Package, Server, AlertCircle, ShoppingBag, Zap, Clock } from 'lucide-react'
import './index.css'

// SUB-COMPONENT: The Chart
const InventoryChart = memo(({ data, color }) => {
    return (
        <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                <defs>
                    <linearGradient id={`colorUv-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={color} stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis domain={['auto', 'auto']} hide />
                <Tooltip 
                    contentStyle={{ 
                        background: 'rgba(15, 23, 42, 0.9)', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        borderRadius: '8px', 
                        color: 'white', 
                        boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                    }} 
                    itemStyle={{ color: 'white', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="stock" stroke={color} strokeWidth={3} fillOpacity={1} fill={`url(#colorUv-${color.replace('#','')})`} isAnimationActive={false} />
            </AreaChart>
        </ResponsiveContainer>
    );
});

// SUB-COMPONENT: The Navigation Bar
function Navbar() {
    const location = useLocation();

    return (
        <div className="glass-nav" style={{ padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: 'var(--gradient-glow-cyan)' }}>
                    <Server size={22} />
                </div>
                <h2 style={{ margin: 0, background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '1.25rem', letterSpacing: '1px' }}>
                    NEXUS INVENTORY
                </h2>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
                <Link to="/" style={{ textDecoration: 'none' }}>
                    <button className={`nav-btn ${location.pathname === '/' ? 'active-cyan' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShoppingCart size={18} /> Point of Sale
                    </button>
                </Link>
                <Link to="/admin" style={{ textDecoration: 'none' }}>
                    <button className={`nav-btn ${location.pathname === '/admin' ? 'active-orange' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <LayoutDashboard size={18} /> Telemetry Dashboard
                    </button>
                </Link>
            </div>
        </div>
    );
}

// ROUTE 1: THE CUSTOMER STOREFRONT
function CustomerStore() {
    const [inventory, setInventory] = useState({});

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
        } catch (err) {
            console.error("Order failed:", err);
        }
    };

    return (
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '3rem' }}>
            <div style={{ padding: '3rem 2rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ShoppingBag /> Retail Simulation Environment
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', margin: '0' }}>Generate synthetic orders to test predictive restocking capabilities.</p>
            </div>

            <div className="store-grid">
                {Object.keys(inventory).length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        <h3>No items in inventory. Check database connection.</h3>
                    </div>
                )}
                
                {Object.keys(inventory).map(sku => (
                    <div key={sku} className="glass-panel product-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>{sku.split('-')[0]}</h2>
                                <span className="sku-badge">{sku}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Current Stock</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: inventory[sku] > 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                                    {inventory[sku]}
                                </div>
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
                            <button className="btn-action btn-buy" onClick={() => handleOrder(sku, 1)} disabled={inventory[sku] <= 0} style={{ opacity: inventory[sku] <= 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <ShoppingCart size={18} /> Purchase 1
                            </button>
                            <button className="btn-action btn-flash" onClick={() => handleOrder(sku, 15)} disabled={inventory[sku] <= 0} style={{ opacity: inventory[sku] <= 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <Zap size={18} /> Bulk Order (15)
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ROUTE 2: THE SECURE ADMIN DASHBOARD
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
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <div style={{ flex: 1, padding: '2.5rem', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                    <div>
                        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2.2rem', display: 'flex', alignItems: 'center', gap: '12px' }}><TrendingUp size={32} /> Real-Time Telemetry</h1>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '1.1rem' }}>Streaming inventory events and ML velocity predictions.</p>
                    </div>
                    <div className="glass-panel" style={{ padding: '1rem 2rem', display: 'flex', gap: '2rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <Activity size={16} /> Kafka Event Stream
                            </div>
                            <div style={{ color: 'var(--accent-emerald)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '8px', height: '8px', background: 'var(--accent-emerald)', borderRadius: '50%', boxShadow: '0 0 10px var(--accent-emerald)' }}></div>
                                Connected
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
                    {Object.keys(inventory).length === 0 && (
                        <div style={{ color: 'var(--text-muted)' }}>No telemetry data available.</div>
                    )}
                    
                    {Object.keys(inventory).map(sku => {
                        const isCritical = inventory[sku] < 30;
                        const cardClass = isCritical ? 'dash-card critical pulse-critical' : 'dash-card healthy';
                        const chartColor = isCritical ? '#f43f5e' : '#06b6d4';
                        
                        return (
                            <div key={sku} className={`glass-panel ${cardClass}`} style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 5px 0', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Package size={18}/> {sku}</h3>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>UNITS AVAILABLE</div>
                                    </div>
                                    <h2 style={{ margin: 0, fontSize: '2.5rem', color: isCritical ? 'var(--accent-rose)' : 'var(--text-main)' }}>
                                        {inventory[sku]}
                                    </h2>
                                </div>
                                
                                <div style={{ height: '120px', margin: '1rem -1.5rem', background: 'rgba(0,0,0,0.2)' }}>
                                    {chartData[sku] && <InventoryChart data={chartData[sku]} color={chartColor} />}
                                </div>
                                
                                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '1rem', marginTop: 'auto' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={14}/> ML Velocity</span>
                                        <strong style={{ color: 'var(--accent-cyan)' }}>{predictions[sku] ? `${predictions[sku].toFixed(2)} units/m` : 'Calculating...'}</strong>
                                    </div>
                                    
                                    {predictions[sku] && inventory[sku] > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14}/> Est. Depletion</span>
                                            <strong style={{ color: isCritical ? 'var(--accent-rose)' : 'var(--accent-orange)' }}>
                                                {(inventory[sku] / predictions[sku]).toFixed(1)} mins
                                            </strong>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
            
            {/* Right Sidebar - Recent Activity */}
            <div className="glass-panel" style={{ width: '380px', borderRight: 'none', borderTop: 'none', borderBottom: 'none', borderRadius: '0', padding: '2rem 0', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '0 2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem' }}>
                        <Activity size={20} /> Event Log
                    </h2>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0' }}>
                    {sales.length === 0 && <div style={{ padding: '0 2rem', color: 'var(--text-muted)' }}>Awaiting Kafka events...</div>}
                    {sales.map((sale, index) => (
                        <div key={index} className="activity-item" style={{ padding: '1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <strong style={{ color: 'var(--text-main)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Package size={14}/> {sale.sku}
                                </strong>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{sale.time}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', color: '#cbd5e1' }}>
                                    {sale.quantity === 'Stock Updated' ? 'SYSTEM' : 'TXN'}
                                </span>
                                <span style={{ color: sale.quantity === 'Stock Updated' ? 'var(--accent-cyan)' : 'var(--accent-emerald)', fontWeight: 'bold' }}>
                                    {sale.quantity === 'Stock Updated' ? 'Autonomous Restock' : `Quantity: ${sale.quantity}`}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// THE MAIN APP ORCHESTRATOR
export default function App() {
    return (
        <BrowserRouter>
            <div className="app-container">
                <Navbar />
                <Routes>
                    <Route path="/" element={<CustomerStore />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}