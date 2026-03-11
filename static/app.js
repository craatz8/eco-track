const { useState, useEffect, useRef } = React;

function Dashboard() {
    const [activities, setActivities] = useState([]);
    const [selectedActivity, setSelectedActivity] = useState('');
    const [amount, setAmount] = useState('');
    const [message, setMessage] = useState('');
    const [stats, setStats] = useState({ total_co2: 0, total_entries: 0 });
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [logs, setLogs] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [currentTip, setCurrentTip] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [isAnimatedBg, setIsAnimatedBg] = useState(() => {
        const saved = localStorage.getItem('ecoTrack_animatedBg');
        // Default to true if no preference is saved
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [weeklyGoal, setWeeklyGoal] = useState(() => {
    const saved = localStorage.getItem('ecoTrack_goal');
      return saved !== null ? JSON.parse(saved) : 100;
    });
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [tempGoal, setTempGoal] = useState(weeklyGoal);

    const percentage = Math.min((stats.total_co2 / weeklyGoal) * 100, 100);
    const barColor = percentage > 90 ? '#d32f2f' : '#2e7d32';

    const totalCo2 = stats?.total_co2 || 0;
    const totalEntries = stats?.total_entries || 0;
    const PillNav = window.PillNav;


    const navItems = [
        { label: 'Dashboard', href: '/' },
        { label: 'User Guide', href: '/guide' },
        { label: 'Logout', href: '/logout' },
        { label: `Hi, ${window.currentUserName || 'User'}`, href: '#', isUser: true }
    ];

    // Tip selection logic
    useEffect(() => {
        const ecoTips = [
            "Switching to LED bulbs can reduce energy use by up to 75%.",
            "A single beef meal has the same carbon footprint as driving 16 miles.",
            "Washing clothes in cold water saves about 90% of the energy used by a washer.",
            "Unplugging electronics when not in use can save 5-10% of household energy.",
            "Composting food scraps reduces methane emissions from landfills.",
            "Taking a train instead of a short-haul flight reduces emissions by 80%.",
            "Eating one plant-based meal a day for a year saves the equivalent of 3,000 miles of driving.",
            "Properly inflating your tires improves gas mileage by up to 3%.",
            "A 10-minute shower uses about 25 gallons of water; try a 5-minute timer!",
            "Reducing your thermostat by just 2 degrees in winter saves 2,000 lbs of CO2 per year.",
            "Drying clothes on a line instead of a dryer saves 2kg of CO2 per load.",
            "Using a reusable water bottle saves an average of 156 plastic bottles per year.",
            "Cutting out one serving of poultry a week is like taking your car off the road for 200 miles.",
            "Replacing an old refrigerator with an Energy Star model can save $200 a year.",
            "Planting one tree can absorb 48 pounds of CO2 per year.",
            "Recycling one aluminum can saves enough energy to run a TV for 3 hours.",
            "Choosing 'Standard Shipping' instead of 'Express' reduces the carbon cost of delivery.",
            "A leaky faucet dripping once per second wastes 3,000 gallons of water a year.",
            "Keeping your water heater at 120°F (49°C) reduces standby heat loss.",
            "Switching to a laptop from a desktop can reduce energy consumption by 80%."
        ];
        setCurrentTip(ecoTips[Math.floor(Math.random() * ecoTips.length)]);
    }, []);

    // API Fetches
    useEffect(() => {
        fetch('/api/test-db').then(res => res.json()).then(result => setActivities(result.data));
    }, []);

    useEffect(() => {
        fetch('/api/user-stats').then(res => res.json()).then(data => {
            if(data.status === "Success") setStats(data.stats);
        });
    }, [refreshTrigger]);

    useEffect(() => {
        fetch('/api/user-logs').then(res => res.json()).then(data => {
            if(data.status === "Success") setLogs(data.logs);
        });
    }, [refreshTrigger]);

    useEffect(() => {
      localStorage.setItem('ecoTrack_animatedBg', JSON.stringify(isAnimatedBg));
      if (isAnimatedBg) {
          document.body.classList.remove('simple-bg');
      } else {
          document.body.classList.add('simple-bg');
      }
    }, [isAnimatedBg]);

    // Table Actions
    const deleteLog = (id) => {
        if(confirm("Are you sure?")) {
            fetch(`/api/delete-log/${id}`, { method: 'DELETE' })
                .then(() => setRefreshTrigger(prev => prev + 1));
        }
    };

    // Function to handle log reset
    const resetAllLogs = () => {
        if (confirm("⚠️ DANGER: This will permanently delete ALL your logged activities. Are you sure?")) {
            fetch('/api/reset-logs', { method: 'DELETE' })
                .then(() => setRefreshTrigger(prev => prev + 1));
        }
    };

    const saveEdit = (id) => {
        fetch(`/api/update-log/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: editValue })
        }).then(() => {
            setEditingId(null);
            setEditValue('');
            setRefreshTrigger(prev => prev + 1);
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        fetch('/api/add-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activity_id: selectedActivity, amount: amount })
        }).then(res => res.json()).then(data => {
            if(data.status === "Success") {
                setMessage("✅ Activity logged!");
                setAmount('');
                setSelectedActivity('');
                setRefreshTrigger(prev => prev + 1);
                setTimeout(() => setMessage(''), 3000);
            }
        });
    };

    // Function to save the goal
    const saveGoal = () => {
        setWeeklyGoal(tempGoal);
        localStorage.setItem('ecoTrack_goal', JSON.stringify(tempGoal));
        setIsEditingGoal(false);
    };

    return (
      <div className="dashboard-wrapper">
        {/* 1. NAVIGATION (Now behaves as a normal top-row header) */}
        {window.PillNav ? (
            <window.PillNav
                logo={null}
                items={navItems}
                activeHref="/"
                pillColor="#2e7d32"
            />
        ) : (
            <div className="nav-placeholder" style={{ padding: '20px', textAlign: 'center' }}>
                Loading Navigation...
            </div>
        )}
        {/* CONDITIONAL BACKGROUND LAYER */}
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }}>
            {isAnimatedBg ? (
                window.LiquidEther && <LiquidEther colors={['#29ffc9', '#d8ff9e', '#a3f0cf']} autoDemo={true} />
            ) : (
                <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    background: 'linear-gradient(135deg, #f1f8e9 0%, #ffffff 100%)' 
                }} />
            )}
        </div>

        {/* SETTINGS TOGGLE BUTTON (Floating) */}
        <button 
            className="settings-fab"
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
        >
            ⚙️
        </button>

        {/* SETTINGS PANEL */}
        {showSettings && (
            <div className="settings-overlay" onClick={() => setShowSettings(false)}>
                <div className="settings-modal glass-panel" onClick={e => e.stopPropagation()}>
                    <h3>Dashboard Settings</h3>
                    <hr />
                    <div className="setting-item">
                        <span>Animated Background</span>
                        <label className="switch">
                            <input 
                                type="checkbox" 
                                checked={isAnimatedBg} 
                                onChange={() => setIsAnimatedBg(!isAnimatedBg)} 
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                    <p style={{fontSize: '0.75rem', color: '#2e7d32', textAlign: 'right', margin: '0'}}>
                        ✓ Preferences saved
                    </p>
                    <p style={{fontSize: '0.8rem', color: '#666', marginTop: '10px'}}>
                        * Disable animations to save battery and improve performance.
                    </p>
                    <button className="eco-btn" onClick={() => setShowSettings(false)}>Close</button>
                </div>
            </div>
        )}
        <div className="container" style={{ position: 'relative', zIndex: 1, marginTop: '0'}}>
          <div className="eco-header">
            <h2>Your Total Carbon Footprint</h2>
            <p className="stat">
                {totalCo2.toFixed(2)} <span className="unit">kg CO2</span>
            </p>
            <div onClick={() => document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' })} className="eco-link-btn">
                {stats.total_entries} Activities Logged (View History ↓)
            </div>
        </div>

        {/* GOAL SECTION */}
        <div className="eco-card-white">
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center'}}>
                <span style={{fontWeight: 'bold', color: '#333'}}>Weekly Budget Goal</span>
                <button 
                    onClick={() => { 
                        setTempGoal(weeklyGoal); // Sync the input with current goal
                        setIsEditingGoal(true);  // Open the edit box
                    }} 
                    className="btn-pill btn-primary-pill">
                    Set Goal
                </button>           
             </div>
            
            {/* Status text sitting above progress bar */}
            <div style={{marginBottom: '10px'}}>
                <span style={{fontWeight: 'bold'}}>{stats.total_co2.toFixed(1)} / {weeklyGoal} kg</span>
            </div>

            {isEditingGoal && (
                <div style={{marginBottom: '15px', padding: '15px', background: '#f9f9f9', borderRadius: '10px', border: '1px dashed #2e7d32'}}>
                    <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                        <input 
                            type="number" 
                            className="eco-input" 
                            style={{width: '100px'}} 
                            value={tempGoal} 
                            onChange={(e) => setTempGoal(Number(e.target.value))}
                        />
                        <button onClick={saveGoal} className="eco-btn" style={{padding: '8px 15px'}}>Save</button>
                        <button onClick={() => setIsEditingGoal(false)} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#666'}}>Cancel</button>
                    </div>
                    <p style={{margin: '10px 0 0 0', fontSize: '0.8rem', color: '#2e7d32', fontStyle: 'italic'}}>
                        💡 Tip: A typical person emits about 70-100kg per week.
                    </p>
                </div>
            )}

            {/* Progress Bar - Inside the white card */}
            <div style={{width: '100%', background: '#e0e0e0', borderRadius: '10px', height: '15px', overflow: 'hidden'}}>
                <div style={{ width: `${percentage}%`, background: barColor, height: '100%', transition: 'width 0.5s ease' }}></div>
            </div>
        </div>

        <div className="dashboard-grid" style={{ display: 'flex', alignItems: 'stretch', gap: '20px' }}>
            {/* COLUMN 1: TIP */}
            <aside className="glass-panel tip-box" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h4>Daily Eco-Tip</h4>
                <p style={{ flex: 1, display: 'flex', alignItems: 'center' }}>"{currentTip}"</p>
            </aside>

            {/* COLUMN 2: FORM */}
            <section className="eco-card-green glass-panel">
                <h3 style={{ color: '#2e7d32', margin: '0 0 20px 0', fontSize: '1.4rem' }}>Log an Activity</h3>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>ACTIVITY TYPE</label>
                        <select className="eco-input" value={selectedActivity} onChange={(e) => setSelectedActivity(e.target.value)} required>
                            <option value="">Select Activity...</option>
                            {activities.map(a => <option key={a.id} value={a.id}>{a.activity_name}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>AMOUNT</label>
                        <input 
                            type="number" 
                            className="eco-input"
                            value={amount} 
                            onChange={(e) => setAmount(e.target.value === "" ? "" : Math.max(0, e.target.value))} 
                            placeholder="e.g. 50"
                            required 
                        />
                    </div>

                    <div style={{ flex: 1 }}></div> {/* Pushes button to the bottom */}
                    <button type="submit" className="eco-btn" style={{ padding: '15px' }}>Save Activity Log</button>
                </form>
            </section>

            {/* COLUMN 3: REFERENCE CARDS */}
            <aside className="emission-sidebar">
                <div className="reference-card glass-panel">
                    <span>Beef Meal</span>
                    <strong>6.5 <small>kg/serving</small></strong>
                </div>
                <div className="reference-card glass-panel">
                    <span>Gasoline Car</span>
                    <strong>0.404 <small>kg/mile</small></strong>
                </div>
                <div className="reference-card glass-panel">
                    <span>Short Flight</span>
                    <strong>0.25 <small>kg/mile</small></strong>
                </div>
                <div className="reference-card glass-panel">
                    <span>Long Flight</span>
                    <strong>0.17 <small>kg/mile</small></strong>
                </div>
                <div className="reference-card glass-panel">
                    <span>Electricity</span>
                    <strong>0.39 <small>kg/kWh</small></strong>
                </div>
            </aside>
        </div>

        {/* HISTORY SECTION */}
        <section id="history-section" style={{marginTop: '40px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px', borderBottom: '2px solid #e8f5e9', paddingBottom: '10px'}}>
              <h3 style={{color: '#2e7d32', margin: 0}}>Recent History</h3>
              <button className="btn-pill btn-danger-pill" onClick={resetAllLogs}>
                  🗑️ Reset All Logs
              </button>
          </div>
          <table className="eco-table">
              <thead>
                  <tr><th>Date</th><th>Activity</th><th>Amount</th><th>CO2 (kg)</th><th style={{textAlign: 'center'}}>Actions</th></tr>
              </thead>
              <tbody>
                  {logs.length > 0 ? (
                      logs.map(log => (
                          <tr key={log.id}>
                              <td>{log.date}</td>
                              <td style={{fontWeight: 'bold'}}>{log.activity_name}</td>
                              <td>{editingId === log.id ? <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} style={{width: '60px'}} /> : log.amount}</td>
                          <td style={{fontWeight: 'bold', color: '#2e7d32'}}>{log.total_co2.toFixed(2)}</td>
                          <td style={{textAlign: 'center'}}>
                            <div className="action-icon-group">
                              {editingId === log.id ? <button className="btn-icon-pill" onClick={() => saveEdit(log.id)}>💾</button> : <button className="btn-icon-pill" onClick={() => {setEditingId(log.id); setEditValue(log.amount);}}>✏️</button>}
                              <button className="btn-icon-pill" onClick={() => deleteLog(log.id)}>🗑️</button>
                            </div>
                          </td>
                      </tr>
                  ))
                  ) : (
                    <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                            🌿 No activities logged yet. Start by adding one above!
                        </td>
                    </tr>
                  )}
              </tbody>
          </table>
      </section>
  </div> 
</div>
);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Dashboard />);