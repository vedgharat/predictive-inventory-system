import { useState, useEffect, memo } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import SockJS from 'sockjs-client'
import { Client } from '@stomp/stompjs'
import { AreaChart, Area, YAxis, ResponsiveContainer } from 'recharts'
import {
    Activity, LayoutDashboard, ShoppingCart, TrendingUp,
    Package, Server, Zap, Clock, AlertTriangle,
    CheckCircle, XCircle, RefreshCw, Star, ShoppingBag
} from 'lucide-react'
import './index.css'

// ─── Product catalogue (static metadata) ────────────────────────────────────
// Prices and descriptions live in the frontend; stock lives in the DB.
const CATALOGUE = {
    'LAPTOP-001':     { name: 'ProBook X15',          category: 'Laptops',    price: 1299, rating: 4.8, reviews: 342, desc: '15" OLED · Intel Core Ultra 9 · 32GB RAM · 1TB SSD' },
    'PHONE-001':      { name: 'Nexus S24 Pro',         category: 'Phones',     price: 999,  rating: 4.7, reviews: 891, desc: '6.7" AMOLED · 200MP Camera · 5G · 5000mAh battery' },
    'HEADPHONES-001': { name: 'SoundPro ANC Elite',    category: 'Audio',      price: 349,  rating: 4.9, reviews: 1204,desc: 'Active Noise Cancellation · 40h battery · Hi-Res Audio' },
    'WATCH-001':      { name: 'ChromaWatch Series 9',  category: 'Wearables',  price: 399,  rating: 4.6, reviews: 528, desc: 'Always-on AMOLED · Health tracking · GPS · 72h battery' },
    'EARBUDS-001':    { name: 'AirPods Pro Max',       category: 'Audio',      price: 249,  rating: 4.8, reviews: 2103,desc: 'Spatial Audio · Transparency mode · Wireless charging' },
    'TABLET-001':     { name: 'SlateBook Pro 12',      category: 'Tablets',    price: 799,  rating: 4.5, reviews: 416, desc: '12.9" Liquid Retina · M3 Chip · 5G · Apple Pencil support' },
    'KEYBOARD-001':   { name: 'MechType Pro 75%',      category: 'Peripherals',price: 179,  rating: 4.7, reviews: 673, desc: 'Hot-swap switches · RGB · Bluetooth 5.3 · Aluminum frame' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) => (n != null ? n.toFixed(2) : '—')
const getTime = () => new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })

function stockStatus(qty) {
    if (qty <= 0)  return { label: 'Out of Stock', cls: 'badge-red',    icon: <XCircle size={12} /> }
    if (qty < 20)  return { label: 'Critical',     cls: 'badge-red',    icon: <AlertTriangle size={12} /> }
    if (qty < 50)  return { label: 'Low Stock',    cls: 'badge-yellow', icon: <AlertTriangle size={12} /> }
    return              { label: 'In Stock',        cls: 'badge-green',  icon: <CheckCircle size={12} /> }
}

const Sparkline = memo(({ data, color }) => (
    <ResponsiveContainer width="100%" height={52}>
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
            <defs>
                <linearGradient id={`g-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="90%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>
            <YAxis domain={['auto', 'auto']} hide />
            <Area type="monotone" dataKey="stock" stroke={color} strokeWidth={2}
                fill={`url(#g-${color.replace('#', '')})`} dot={false} isAnimationActive={false} />
        </AreaChart>
    </ResponsiveContainer>
))

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ cartCount }) {
    const location = useLocation()
    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <div className="brand-icon"><Server size={18} /></div>
                <span className="brand-name">Nexus Store</span>
            </div>
            <div className="navbar-links">
                <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
                    <ShoppingBag size={16} /> Store
                </Link>
                <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>
                    <LayoutDashboard size={16} /> Dashboard
                </Link>
            </div>
            <div className="navbar-right">
                {cartCount > 0 && (
                    <div className="cart-indicator">
                        <ShoppingCart size={18} />
                        <span className="cart-badge">{cartCount}</span>
                    </div>
                )}
            </div>
        </nav>
    )
}

// ─── Star Rating ──────────────────────────────────────────────────────────────
function Stars({ rating }) {
    return (
        <div className="stars">
            {[1,2,3,4,5].map(i => (
                <Star key={i} size={12} className={i <= Math.round(rating) ? 'star-filled' : 'star-empty'} />
            ))}
            <span className="rating-num">{rating}</span>
        </div>
    )
}

// ─── Store Page ───────────────────────────────────────────────────────────────
function StorePage({ onCartChange }) {
    const [inventory, setInventory] = useState([])
    const [toasts, setToasts] = useState([])
    const [cart, setCart] = useState({})
    const [filter, setFilter] = useState('All')

    const categories = ['All', ...new Set(Object.values(CATALOGUE).map(p => p.category))]

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
            if (res.ok) {
                const meta = CATALOGUE[sku]
                addToast(`Added ${meta?.name || sku} to cart`, 'success')
                setCart(prev => {
                    const next = { ...prev, [sku]: (prev[sku] || 0) + qty }
                    onCartChange(Object.values(next).reduce((a,b) => a+b, 0))
                    return next
                })
            } else {
                addToast('Could not place order', 'error')
            }
        } catch {
            addToast('Server unreachable', 'error')
        }
    }

    const filtered = inventory.filter(item => {
        const meta = CATALOGUE[item.sku]
        return filter === 'All' || meta?.category === filter
    })

    return (
        <div className="store-page">
            <div className="toast-stack">
                {toasts.map(t => (
                    <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
                ))}
            </div>

            {/* Hero Banner */}
            <div className="store-hero">
                <div className="store-hero-content">
                    <p className="store-hero-tag">POWERED BY PREDICTIVE AI</p>
                    <h1 className="store-hero-title">Next-Gen Tech,<br />Delivered Fast</h1>
                    <p className="store-hero-sub">Real-time inventory · ML-powered restocking · Kafka event streaming</p>
                </div>
            </div>

            {/* Category filter tabs */}
            <div className="store-filters">
                {categories.map(cat => (
                    <button
                        key={cat}
                        className={`filter-tab ${filter === cat ? 'filter-active' : ''}`}
                        onClick={() => setFilter(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Product Grid */}
            <div className="store-grid">
                {filtered.length === 0 && (
                    <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                        <RefreshCw size={28} className="spin" />
                        <p>Connecting to inventory service…</p>
                    </div>
                )}
                {filtered.map(item => {
                    const meta = CATALOGUE[item.sku] || { name: item.sku, price: 0, rating: 0, reviews: 0, desc: '' }
                    const status = stockStatus(item.quantity)
                    const outOfStock = item.quantity <= 0

                    return (
                        <div key={item.sku} className={`product-card ${outOfStock ? 'card-disabled' : ''}`}>
                            <div className="product-img-wrap">
                                <img
                                    src={`/products/${item.sku}.png`}
                                    alt={meta.name}
                                    className="product-img"
                                    onError={e => { e.target.style.display = 'none' }}
                                />
                                <span className={`product-badge badge ${status.cls}`}>
                                    {status.icon} {status.label}
                                </span>
                            </div>

                            <div className="product-body">
                                <p className="product-category">{meta.category}</p>
                                <h3 className="product-name">{meta.name}</h3>
                                <p className="product-desc">{meta.desc}</p>

                                <Stars rating={meta.rating} />
                                <p className="product-reviews">{meta.reviews.toLocaleString()} reviews</p>

                                <div className="product-footer">
                                    <span className="product-price">${meta.price.toLocaleString()}</span>
                                    <div className="product-actions">
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => handleOrder(item.sku, 1)}
                                            disabled={outOfStock}
                                        >
                                            <ShoppingCart size={14} /> Add to Cart
                                        </button>
                                        <button
                                            className="btn btn-ghost"
                                            onClick={() => handleOrder(item.sku, 5)}
                                            disabled={outOfStock}
                                            title="Order 5 units"
                                        >
                                            <Zap size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="stock-bar-wrap">
                                    <div className="stock-bar">
                                        <div
                                            className="stock-bar-fill"
                                            style={{
                                                width: `${Math.min(100, (item.quantity / 200) * 100)}%`,
                                                background: item.quantity < 20
                                                    ? 'var(--c-red)'
                                                    : item.quantity < 50
                                                    ? 'var(--c-yellow)'
                                                    : 'var(--c-green)'
                                            }}
                                        />
                                    </div>
                                    <span className="stock-text">{item.quantity} left</span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
function Dashboard() {
    const [items, setItems]           = useState([])
    const [velocities, setVelocities] = useState({})
    const [chartData, setChartData]   = useState({})
    const [eventLog, setEventLog]     = useState([])
    const [connected, setConnected]   = useState(false)
    const [lastUpdate, setLastUpdate] = useState(null)

    useEffect(() => {
        fetch('http://localhost:8082/api/inventory')
            .then(r => r.json())
            .then(data => {
                setItems(data)
                const now = getTime()
                const initial = {}
                data.forEach(item => { initial[item.sku] = [{ time: now, stock: item.quantity }] })
                setChartData(initial)
            })
    }, [])

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
                    setItems(prev => prev.map(i => i.sku === item.sku ? { ...i, quantity: item.quantity } : i))
                    setChartData(prev => ({
                        ...prev,
                        [item.sku]: [...(prev[item.sku] || []), { time: now, stock: item.quantity }].slice(-30)
                    }))
                    setEventLog(prev => [{
                        sku: item.sku,
                        name: CATALOGUE[item.sku]?.name || item.sku,
                        detail: `Stock updated → ${item.quantity} units`,
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

    const totalUnits    = items.reduce((s, i) => s + (i.quantity || 0), 0)
    const criticalCount = items.filter(i => i.quantity > 0 && i.quantity < 20).length
    const outCount      = items.filter(i => i.quantity <= 0).length
    const velValues     = Object.values(velocities)
    const avgVelocity   = velValues.length ? velValues.reduce((a, b) => a + b, 0) / velValues.length : null

    return (
        <div className="page dashboard">
            <div className="dash-header">
                <div>
                    <h1><TrendingUp size={22} /> Inventory Dashboard</h1>
                    <p className="subtitle">
                        Live telemetry via Kafka + WebSockets &nbsp;·&nbsp;
                        Velocity = units / elapsed minutes (5-min window)
                    </p>
                </div>
                <div className={`connection-pill ${connected ? 'conn-ok' : 'conn-err'}`}>
                    <span className="conn-dot" />
                    {connected ? 'Stream connected' : 'Disconnected'}
                </div>
            </div>

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
                <div className="sku-grid">
                    {items.length === 0 && (
                        <div className="empty-state">
                            <RefreshCw size={28} className="spin" />
                            <p>Loading inventory…</p>
                        </div>
                    )}
                    {items.map(item => {
                        const vel    = velocities[item.sku]
                        const qty    = item.quantity
                        const status = stockStatus(qty)
                        const isCrit = qty < 20
                        const meta   = CATALOGUE[item.sku]
                        const depMin = vel > 0 && qty > 0 ? qty / vel : null
                        const chartColor = isCrit ? '#ef4444' : '#22d3ee'

                        return (
                            <div key={item.sku} className={`sku-card ${isCrit && qty > 0 ? 'sku-card-critical' : ''}`}>
                                <div className="sku-card-top">
                                    <div>
                                        <div className="sku-card-name">
                                            <Package size={14} />
                                            {meta?.name || item.sku}
                                        </div>
                                        <code className="sku-code-sm">{item.sku}</code>
                                        <span className={`badge ${status.cls}`} style={{ marginTop: '6px', display: 'inline-flex' }}>
                                            {status.icon} {status.label}
                                        </span>
                                    </div>
                                    <div className="sku-qty" style={{ color: isCrit ? 'var(--c-red)' : 'var(--c-text)' }}>
                                        {qty}
                                    </div>
                                </div>

                                <div className="sku-sparkline">
                                    {chartData[item.sku]?.length > 1
                                        ? <Sparkline data={chartData[item.sku]} color={chartColor} />
                                        : <div className="spark-placeholder">Waiting for events…</div>
                                    }
                                </div>

                                <div className="sku-metrics">
                                    <div className="metric">
                                        <span className="metric-label"><Activity size={12} /> ML Velocity</span>
                                        <span className="metric-val" style={{ color: 'var(--c-cyan)' }}>
                                            {vel !== undefined
                                                ? `${fmt(vel)} u/m`
                                                : <span className="muted">awaiting orders</span>}
                                        </span>
                                    </div>
                                    <div className="metric">
                                        <span className="metric-label"><Clock size={12} /> Est. Depletion</span>
                                        <span className="metric-val" style={{ color: isCrit ? 'var(--c-red)' : 'var(--c-orange)' }}>
                                            {depMin != null
                                                ? depMin < 1
                                                    ? `${(depMin * 60).toFixed(0)}s`
                                                    : depMin < 60
                                                    ? `${depMin.toFixed(1)}m`
                                                    : `${(depMin / 60).toFixed(1)}h`
                                                : <span className="muted">{vel === 0 ? 'No sales yet' : 'Waiting for data'}</span>}
                                        </span>
                                    </div>
                                    {meta && (
                                        <div className="metric">
                                            <span className="metric-label"><ShoppingBag size={12} /> Price</span>
                                            <span className="metric-val" style={{ color: 'var(--c-subtle)' }}>
                                                ${meta.price.toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="event-log">
                    <div className="event-log-header">
                        <Activity size={15} /> Event Log
                        <span className="event-count">{eventLog.length}</span>
                    </div>
                    <div className="event-log-body">
                        {eventLog.length === 0 && (
                            <div className="empty-log">No events yet.<br />Place orders from the Store.</div>
                        )}
                        {eventLog.map((ev, i) => (
                            <div key={i} className="event-row">
                                <div className="event-row-top">
                                    <span className="event-name">{ev.name}</span>
                                    <span className="event-time">{ev.time}</span>
                                </div>
                                <div className="event-detail">{ev.detail}</div>
                                <code className="event-sku">{ev.sku}</code>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
    const [cartCount, setCartCount] = useState(0)
    return (
        <BrowserRouter>
            <div className="app-shell">
                <Navbar cartCount={cartCount} />
                <main className="app-main">
                    <Routes>
                        <Route path="/"      element={<StorePage onCartChange={setCartCount} />} />
                        <Route path="/admin" element={<Dashboard />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    )
}