import { useState, useEffect, useRef, memo } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import SockJS from 'sockjs-client'
import { Client } from '@stomp/stompjs'
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts'
import {
    Activity, LayoutDashboard, ShoppingCart, TrendingUp,
    Package, Server, ShoppingBag, Zap, Clock, AlertTriangle,
    CheckCircle, XCircle, RefreshCw, ArrowUp, ArrowDown
} from 'lucide-react'
import './index.css'

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n) => n != null ? n.toFixed(2) : '—'
const getTime = () => new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })

function stockStatus(qty) {
    if (qty <= 0)  return { label: 'Out of Stock', cls: 'badge-red',    icon: <XCircle size={12} /> }
    if (qty < 20)  return { label: 'Critical',     cls: 'badge-red',    icon: <AlertTriangle size={12} /> }
    if (qty < 50)  return { label: 'Low Stock',    cls: 'badge-yellow', icon: <AlertTriangle size={12} /> }
    return              { label: 'Healthy',         cls: 'badge-green',  icon: <CheckCircle size={12} /> }
}

// ─── Mini sparkline chart ────────────────────────────────────────────────────

const Sparkline = memo(({ data, color }) => (
    <ResponsiveContainer width="100%" height={60}>
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
            <defs>
                <linearGradient id={`g-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="90%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>
            <YAxis domain={['auto', 'auto']} hide />
            <Area
                type="monotone"
                dataKey="stock"
                stroke={color}
                strokeWidth={2}
                fill={`url(#g-${color.replace('#', '')})`}
                dot={false}
                isAnimationActive={false}
            />
        </AreaChart>
    </ResponsiveContainer>
))

// ─── Navbar ─────────────────────────────────────────────────────────────────

function Navbar() {
    const location = useLocation()
    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <div className="brand-icon"><Server size={18} /></div>
                <span className="brand-name">Nexus Inventory</span>
            </div>
            <div className="navbar-links">
                <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
                    <ShoppingCart size={16} /> Point of Sale
                </Link>
                <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>
                    <LayoutDashboard size={16} /> Dashboard
                </Link>
            </div>
        </nav>
    )
}

// ─── Point of Sale ───────────────────────────────────────────────────────────

function PointOfSale() {
    const [inventory, setInventory] = useState([])
    const [toasts, setToasts] = useState([])

    const addToast = (msg, type = 'success') => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, msg, type }])
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
    }

    useEffect(() => {
        fetch('http://localhost:8082/api/inventory')
            .then(r => r.json())
            .then(setInventory)
    }, [])

    // Keep inventory up-to-date via WebSocket
    useEffect(() => {
        const client = new Client({
            webSocketFactory: () => new SockJS('http://localhost:8082/ws'),
            debug: () => {},
            onConnect: () => {
                client.subscribe('/topic/inventory', msg => {
                    const item = JSON.parse(msg.body)
                    setInventory(prev => prev.map(i => i.sku === item.sku ? { ...i, quantity: item.quantity } : i))
                })
            }
        })
        client.activate()
        return () => client.deactivate()
    }, [])

    const handleOrder = async (sku, qty) => {
        try {
            const res = await fetch(`http://localhost:8081/api/orders/place?sku=${sku}&quantity=${qty}`, { method: 'POST' })
            if (res.ok) addToast(`Ordered ${qty}× ${sku}`, 'success')
            else addToast('Order failed — service error', 'error')
        } catch {
            addToast('Order failed — cannot reach server', 'error')
        }
    }

    return (
        <div className="page">
            {/* Toast notifications */}
            <div className="toast-stack">
                {toasts.map(t => (
                    <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
                ))}
            </div>

            <div className="page-header">
                <div>
                    <h1><ShoppingBag size={24} /> Point of Sale</h1>
                    <p className="subtitle">Place orders against live inventory. Each order fires a Kafka event consumed by the ML forecasting service.</p>
                </div>
            </div>

            <div className="product-grid">
                {inventory.length === 0 && (
                    <div className="empty-state">
                        <RefreshCw size={32} className="spin" />
                        <p>Connecting to inventory service...</p>
                    </div>
                )}
                {inventory.map(item => {
                    const status = stockStatus(item.quantity)
                    const outOfStock = item.quantity <= 0
                    return (
                        <div key={item.sku} className={`product-card ${outOfStock ? 'card-disabled' : ''}`}>
                            <div className="product-card-header">
                                <div>
                                    <div className="product-name">{item.sku.split('-')[0]}</div>
                                    <code className="sku-code">{item.sku}</code>
                                </div>
                                <span className={`badge ${status.cls}`}>
                                    {status.icon} {status.label}
                                </span>
                            </div>

                            <div className="stock-display">
                                <span className="stock-number" style={{ color: item.quantity < 20 ? 'var(--c-red)' : item.quantity < 50 ? 'var(--c-yellow)' : 'var(--c-green)' }}>
                                    {item.quantity}
                                </span>
                                <span className="stock-label">units in stock</span>
                            </div>

                            <div className="product-actions">
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleOrder(item.sku, 1)}
                                    disabled={outOfStock}
                                >
                                    <ShoppingCart size={15} /> Purchase 1
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => handleOrder(item.sku, 10)}
                                    disabled={outOfStock}
                                >
                                    <Zap size={15} /> Order 10
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Admin Dashboard ─────────────────────────────────────────────────────────

function Dashboard() {
    const [items, setItems]           = useState([])     // [{sku, quantity, aiVelocity}]
    const [velocities, setVelocities] = useState({})     // sku -> velocity from WS
    const [chartData, setChartData]   = useState({})     // sku -> [{time,stock}]
    const [eventLog, setEventLog]     = useState([])
    const [connected, setConnected]   = useState(false)
    const [lastUpdate, setLastUpdate] = useState(null)

    const chartRef = useRef({})

    // Initial HTTP load
    useEffect(() => {
        fetch('http://localhost:8082/api/inventory')
            .then(r => r.json())
            .then(data => {
                setItems(data)
                const now = getTime()
                const initial = {}
                data.forEach(item => {
                    initial[item.sku] = [{ time: now, stock: item.quantity }]
                })
                setChartData(initial)
            })
    }, [])

    // WebSocket for real-time updates
    useEffect(() => {
        const client = new Client({
            webSocketFactory: () => new SockJS('http://localhost:8082/ws'),
            debug: () => {},
            onConnect: () => {
                setConnected(true)

                client.subscribe('/topic/inventory', msg => {
                    const item = JSON.parse(msg.body)
                    const now = getTime()
                    setLastUpdate(now)

                    setItems(prev =>
                        prev.map(i => i.sku === item.sku ? { ...i, quantity: item.quantity } : i)
                    )
                    setChartData(prev => ({
                        ...prev,
                        [item.sku]: [...(prev[item.sku] || []), { time: now, stock: item.quantity }].slice(-30)
                    }))
                    setEventLog(prev => [{
                        sku: item.sku,
                        type: 'ORDER',
                        detail: `Stock → ${item.quantity}`,
                        time: now
                    }, ...prev].slice(0, 50))
                })

                client.subscribe('/topic/ai-predictions', msg => {
                    const ev = JSON.parse(msg.body)
                    setVelocities(prev => ({ ...prev, [ev.sku]: ev.ai_velocity }))
                })
            },
            onDisconnect: () => setConnected(false),
        })
        client.activate()
        return () => client.deactivate()
    }, [])

    // Summary stats
    const totalUnits  = items.reduce((s, i) => s + (i.quantity || 0), 0)
    const criticalCount = items.filter(i => i.quantity > 0 && i.quantity < 20).length
    const outCount    = items.filter(i => i.quantity <= 0).length
    const avgVelocity = Object.values(velocities).length
        ? (Object.values(velocities).reduce((a, b) => a + b, 0) / Object.values(velocities).length)
        : null

    return (
        <div className="page dashboard">
            {/* ── Header ── */}
            <div className="dash-header">
                <div>
                    <h1><TrendingUp size={24} /> Inventory Dashboard</h1>
                    <p className="subtitle">
                        Live telemetry via Kafka + WebSockets &nbsp;·&nbsp;
                        ML velocity = units sold / elapsed minutes (5-min sliding window)
                    </p>
                </div>
                <div className={`connection-pill ${connected ? 'conn-ok' : 'conn-err'}`}>
                    <span className="conn-dot" />
                    {connected ? 'Stream connected' : 'Disconnected'}
                </div>
            </div>

            {/* ── Summary KPI bar ── */}
            <div className="kpi-bar">
                <div className="kpi-card">
                    <div className="kpi-label">Total Units</div>
                    <div className="kpi-value">{totalUnits.toLocaleString()}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">SKUs Tracked</div>
                    <div className="kpi-value">{items.length}</div>
                </div>
                <div className="kpi-card kpi-warn">
                    <div className="kpi-label">Low / Critical</div>
                    <div className="kpi-value">{criticalCount}</div>
                </div>
                <div className="kpi-card kpi-danger">
                    <div className="kpi-label">Out of Stock</div>
                    <div className="kpi-value">{outCount}</div>
                </div>
                <div className="kpi-card kpi-info">
                    <div className="kpi-label">Avg ML Velocity</div>
                    <div className="kpi-value">{avgVelocity != null ? `${fmt(avgVelocity)} u/m` : '—'}</div>
                </div>
                {lastUpdate && (
                    <div className="kpi-card">
                        <div className="kpi-label">Last Event</div>
                        <div className="kpi-value kpi-sm">{lastUpdate}</div>
                    </div>
                )}
            </div>

            <div className="dash-body">
                {/* ── SKU cards grid ── */}
                <div className="sku-grid">
                    {items.length === 0 && (
                        <div className="empty-state">
                            <RefreshCw size={28} className="spin" />
                            <p>Loading inventory...</p>
                        </div>
                    )}
                    {items.map(item => {
                        const vel   = velocities[item.sku]
                        const qty   = item.quantity
                        const status = stockStatus(qty)
                        const isCrit = qty < 20
                        const depMin = vel > 0 && qty > 0 ? qty / vel : null
                        const chartColor = isCrit ? '#ef4444' : '#22d3ee'

                        return (
                            <div key={item.sku} className={`sku-card ${isCrit && qty > 0 ? 'sku-card-critical' : ''}`}>
                                {/* Header row */}
                                <div className="sku-card-top">
                                    <div>
                                        <div className="sku-card-name">
                                            <Package size={15} /> {item.sku}
                                        </div>
                                        <span className={`badge ${status.cls}`}>{status.icon} {status.label}</span>
                                    </div>
                                    <div className="sku-qty" style={{ color: isCrit ? 'var(--c-red)' : 'var(--c-text)' }}>
                                        {qty}
                                    </div>
                                </div>

                                {/* Sparkline */}
                                <div className="sku-sparkline">
                                    {chartData[item.sku]?.length > 1
                                        ? <Sparkline data={chartData[item.sku]} color={chartColor} />
                                        : <div className="spark-placeholder">Waiting for events…</div>
                                    }
                                </div>

                                {/* Metrics footer */}
                                <div className="sku-metrics">
                                    <div className="metric">
                                        <span className="metric-label"><Activity size={12} /> ML Velocity</span>
                                        <span className="metric-val" style={{ color: 'var(--c-cyan)' }}>
                                            {vel !== undefined ? `${fmt(vel)} u/m` : <span className="muted">awaiting data</span>}
                                        </span>
                                    </div>
                                    <div className="metric">
                                        <span className="metric-label"><Clock size={12} /> Est. Depletion</span>
                                        <span className="metric-val" style={{ color: isCrit ? 'var(--c-red)' : 'var(--c-orange)' }}>
                                            {depMin != null
                                                ? depMin < 1 ? `${(depMin * 60).toFixed(0)}s`
                                                             : depMin < 60 ? `${depMin.toFixed(1)}m`
                                                             : `${(depMin / 60).toFixed(1)}h`
                                                : <span className="muted">{vel === 0 ? 'No sales yet' : 'Waiting for data'}</span>
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* ── Event log sidebar ── */}
                <div className="event-log">
                    <div className="event-log-header">
                        <Activity size={16} /> Event Log
                        <span className="event-count">{eventLog.length}</span>
                    </div>
                    <div className="event-log-body">
                        {eventLog.length === 0 && (
                            <div className="empty-log">No events yet. Place orders from the Point of Sale.</div>
                        )}
                        {eventLog.map((ev, i) => (
                            <div key={i} className="event-row">
                                <div className="event-row-top">
                                    <code className="event-sku">{ev.sku}</code>
                                    <span className="event-time">{ev.time}</span>
                                </div>
                                <div className="event-detail">{ev.detail}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── App Root ────────────────────────────────────────────────────────────────

export default function App() {
    return (
        <BrowserRouter>
            <div className="app-shell">
                <Navbar />
                <main className="app-main">
                    <Routes>
                        <Route path="/"      element={<PointOfSale />} />
                        <Route path="/admin" element={<Dashboard />}   />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    )
}