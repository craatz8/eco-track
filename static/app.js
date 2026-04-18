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
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [weeklyGoal, setWeeklyGoal] = useState(() => {
        const saved = localStorage.getItem('ecoTrack_goal');
        return saved !== null ? JSON.parse(saved) : 100;
    });
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [tempGoal, setTempGoal] = useState(weeklyGoal);

    const percentage = Math.min((stats.total_co2 / weeklyGoal) * 100, 100);
    const barColor = percentage > 90 ? 'bg-red-600' : 'bg-green-700';
    const totalCo2 = stats?.total_co2 || 0;

    const navItems = [
        { label: 'Dashboard', href: '/' },
        { label: 'User Guide', href: '/guide' },
        { label: 'Logout', href: '/logout' },
        { label: `Hi, ${window.currentUserName || 'User'}`, href: '/profile', isUser: true }
    ];

    // --- EFFECTS & API ---
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
      if (isAnimatedBg) document.body.classList.remove('simple-bg');
      else document.body.classList.add('simple-bg');
    }, [isAnimatedBg]);

    const deleteLog = (id) => { 
        if(confirm("Are you sure?")) {
            fetch(`/api/delete-log/${id}`, { method: 'DELETE' })
                .then(() => {
                    setRefreshTrigger(prev => prev + 1);
                    scrollToTracker(); 
                });
        }
    }; 

    const resetAllLogs = () => { 
        if (confirm("⚠️ DANGER: Permanently delete ALL logs?")) {
            fetch('/api/reset-logs', { method: 'DELETE' })
                .then(() => {
                    setRefreshTrigger(prev => prev + 1);
                    scrollToTracker(); 
                });
        }
    };    

    const saveEdit = (id) => {
        fetch(`/api/update-log/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: editValue })
          }).then(() => 
            { setEditingId(null);
            setRefreshTrigger(prev => prev + 1); });
            scrollToTracker();
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
                setAmount(''); setSelectedActivity('');
                setRefreshTrigger(prev => prev + 1);
                scrollToTracker();
                setTimeout(() => setMessage(''), 3000);
            }
        });
    };

    const scrollToTracker = () => {
      const tracker = document.getElementById('total-footprint-card');
      if (tracker) {
          tracker.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' // Centers the card in the viewport
          });
      }
    };

    const saveGoal = () => { setWeeklyGoal(tempGoal); localStorage.setItem('ecoTrack_goal', JSON.stringify(tempGoal)); setIsEditingGoal(false); };
    
    const ratio = totalCo2 / weeklyGoal;

    const calculateHeatColor = (r) => {
        // Default Base Green
        if (r <= 0.1) return 'hsl(153, 42%, 18%)'; 

        // OVER GOAL: Transition from Red to Darker "Burnt" Red
        if (r > 1) {
            const burnIntensity = Math.min((r - 1) * 20, 15); 
            return `hsl(0, 70%, ${25 - burnIntensity}%)`;
        }

        // TOWARD GOAL: Green -> Yellow -> Red
        const hue = Math.max(0, 150 - (r * 150));
        return `hsl(${hue}, 50%, 25%)`;
    };

const dynamicBgColor = calculateHeatColor(ratio);
    return (
        <div className="relative min-h-screen font-sans text-slate-900 pb-20">
            {/* 1. NAVIGATION */}
            <header className="sticky top-0 z-50 flex justify-center w-full py-4 px-6">
                {window.PillNav ? (
                    <div className="flex items-center justify-center">
                        <window.PillNav items={navItems} activeHref="/" pillColor="#2e7d32" />
                    </div>
                ) : (
                    <div className="bg-white/80 px-6 py-2 rounded-full shadow-sm text-green-700 animate-pulse">Loading Navigation...</div>
                )}
            </header>

            {/* CONDITIONAL BACKGROUND */}
            <div className="fixed inset-0 -z-10 overflow-hidden">
                {isAnimatedBg ? (
                    window.LiquidEther && <LiquidEther colors={['#29ffc9', '#d8ff9e', '#a3f0cf']} autoDemo={true} />
                ) : (
                    <div className="w-full h-full bg-gradient-to-t from-[#f0fdf4] to-white" />
                )}
            </div>

            {/* SETTINGS FAB */}
            <button 
                className="fixed bottom-8 right-8 w-14 h-14 bg-green-700 text-white rounded-full shadow-2xl z-50 text-2xl flex items-center justify-center transition-transform hover:rotate-90 hover:scale-110"
                onClick={() => setShowSettings(!showSettings)}
            >
                ⚙️
            </button>

            {/* SETTINGS MODAL */}
            {showSettings && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowSettings(false)}>
                    <div className="bg-white/90 backdrop-blur-xl w-full max-w-sm p-8 rounded-[2rem] shadow-2xl border border-white" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-black text-green-800 mb-6">Dashboard Settings</h3>
                        <div className="flex justify-between items-center py-4 border-y border-slate-100">
                            <span className="font-semibold text-slate-700">Background Animation</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={isAnimatedBg} onChange={() => setIsAnimatedBg(!isAnimatedBg)} />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                            </label>
                        </div>
                        <p className="text-xs text-slate-500 mt-4 mb-8 italic">Disable to improve performance.</p>
                        <button className="w-full bg-green-700 text-white font-bold py-3 rounded-2xl shadow-lg hover:bg-green-800 transition-colors" onClick={() => setShowSettings(false)}>Close</button>
                    </div>
                </div>
            )}

            <main className="max-w-6xl mx-auto px-6 mt-12">
              {/* HERO SECTION */}
              <div 
                  id="total-footprint-card"
                  className={`rounded-[3.5rem] p-14 text-center shadow-[0_20px_50px_rgba(0,0,0,0.15)] mb-12 relative overflow-hidden group transition-all duration-1000 ease-in-out ${message ? 'ring-8 ring-green-400/50' : 'ring-0 ring-transparent'}`}
                  style={{
                    background: `radial-gradient(circle at top left, ${dynamicBgColor}, #0a1a14)` 
                  }}
              >
                  {/* Subtle Decorative Elements */}
                  <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-700"></div>
                  
                  <h2 className="text-white/70 uppercase tracking-[0.2em] font-black text-xs mb-8">
                      {totalCo2 > weeklyGoal ? "⚠️ Goal Exceeded" : "Global Impact Summary"}
                  </h2>

                  {/* CORE STAT: AnimatedNumber & Pulse */}
                  <div 
                      className="relative mx-auto flex h-60 w-60 flex-col items-center justify-center rounded-full border-8 border-white/10 bg-white/5 backdrop-blur-md"
                      style={{ 
                          animation: 'eco-pulse 4s infinite ease-in-out',
                          boxShadow: ratio > 1 ? '0 0 50px rgba(220, 38, 38, 0.3)' : 'none'
                      }}
                  >
                      <div className="text-6xl font-black text-white drop-shadow-lg">
                          <AnimatedNumber value={totalCo2} />
                      </div>
                      <div className="text-white/60 font-bold text-[10px] uppercase tracking-widest mt-1">kg CO2e</div>
                  </div>

                  {/* SCROLL BUTTON */}
                  <div 
                      onClick={() => document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' })} 
                      className="mt-10 inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white px-8 py-3 rounded-full text-sm font-bold cursor-pointer transition-all"
                  >
                      <span>{stats.total_entries} Activities Recorded</span>
                      <span className="opacity-60 text-xs">View History ↓</span>
                  </div>
              </div>

                {/* GOAL SECTION */}
                <div className="bg-white/80 backdrop-blur-md p-8 rounded-[2rem] border border-white shadow-xl mb-8">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-xl font-black text-slate-800">Weekly Goal</span>
                        <button onClick={() => { setTempGoal(weeklyGoal); setIsEditingGoal(true); }} 
                                className="px-6 py-2 rounded-full border-2 border-green-700 text-green-700 font-bold hover:bg-green-700 hover:text-white transition-all">
                            Set Goal
                        </button>
                    </div>
                    
                    <div className="mb-2 font-black text-2xl text-slate-700">{stats.total_co2.toFixed(1)} <span className="text-sm font-normal text-slate-400">/ {weeklyGoal} kg</span></div>

                    {isEditingGoal && (
                        <div className="mb-6 p-6 bg-green-50 rounded-2xl border-2 border-dashed border-green-200 flex flex-wrap gap-4 items-center">
                            <input type="number" className="w-24 p-3 rounded-xl border-2 border-green-200 focus:border-green-600 outline-none font-bold" value={tempGoal} onChange={(e) => setTempGoal(Number(e.target.value))} />
                            <button onClick={saveGoal} className="bg-green-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-800 transition-colors">Save Goal</button>
                            <button onClick={() => setIsEditingGoal(false)} className="text-slate-400 hover:text-slate-600">Cancel</button>
                            <p className="w-full mt-4 text-sm text-green-700 italic">
                                💡 Tip: A typical person emits about 70-100kg per week.
                            </p>
                        </div>
                    )}

                    <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden shadow-inner">
                        <div className={`h-full transition-all duration-1000 ease-out ${barColor}`} style={{ width: `${percentage}%` }}></div>
                    </div>
                </div>

                {/* GRID SECTION */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    {/* TIP */}
                    <div className="bg-white/40 backdrop-blur-md p-8 rounded-[2rem] border border-white/50 shadow-sm flex flex-col justify-center">
                        <h4 className="text-green-800 font-black uppercase text-xs tracking-tighter mb-4">Daily Eco-Tip</h4>
                        <p className="text-xl font-medium italic text-slate-700 leading-relaxed">"{currentTip}"</p>
                    </div>

                    {/* FORM */}
                    <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-green-100 flex flex-col">
                        <h3 className="text-2xl font-black text-green-800 mb-6">Log Activity</h3>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activity Type</label>
                                <select className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-green-500 outline-none transition-all appearance-none" value={selectedActivity} onChange={(e) => setSelectedActivity(e.target.value)} required>
                                    <option value="">Select...</option>
                                    {activities.map(a => <option key={a.id} value={a.id}>{a.activity_name}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</label>
                                <input type="number" className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-green-500 outline-none transition-all" value={amount} onChange={(e) => setAmount(e.target.value === "" ? "" : Math.max(0, e.target.value))} placeholder="e.g. 50" required />
                            </div>
                            <button type="submit" className="mt-auto w-full bg-green-700 text-white font-black py-5 rounded-[1.5rem] shadow-lg hover:bg-green-800 hover:scale-[1.02] active:scale-95 transition-all">
                                Save Activity Log
                            </button>
                        </form>
                    </div>

                    {/* SIDEBAR CARDS */}
                    <div className="flex flex-col gap-3">
                        {[{n:"Beef Meal", v:"6.5", u:"kg/serv"}, {n:"Gasoline Car", v:"0.40", u:"kg/mi"}, {n:"Flights", v:"0.25", u:"kg/mi"}, {n:"Electricity", v:"0.39", u:"kg/kWh"}].map((item, i) => (
                            <div key={i} className="bg-white p-5 rounded-2xl border-l-8 border-green-700 shadow-md hover:translate-x-2 transition-transform">
                                <span className="text-[10px] text-slate-400 uppercase font-black">{item.n}</span>
                                <div className="text-xl font-black text-green-900 leading-none mt-1">{item.v} <small className="text-[10px] font-normal text-slate-400 uppercase">{item.u}</small></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* HISTORY SECTION */}
                <section id="history-section" className="mt-16 bg-white/90 backdrop-blur-md rounded-[2.5rem] shadow-2xl border border-white overflow-hidden">
                    <div className="p-8 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4">
                        <h3 className="text-2xl font-black text-green-800 tracking-tight">Recent History</h3>
                        <button className="px-6 py-2 rounded-full border-2 border-red-100 text-red-500 font-bold text-sm hover:bg-red-500 hover:text-white transition-all" onClick={resetAllLogs}>
                            🗑️ Reset All Logs
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                    <th className="p-6">Date</th>
                                    <th className="p-6">Activity</th>
                                    <th className="p-6">Amount</th>
                                    <th className="p-6">CO2 (kg)</th>
                                    <th className="p-6 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {logs.length > 0 ? logs.map(log => (
                                    <tr key={log.id} className="hover:bg-green-50/30 transition-colors group">
                                        <td className="p-6 text-slate-400 text-sm">{log.date}</td>
                                        <td className="p-6 font-bold text-slate-800">{log.activity_name}</td>
                                        <td className="p-6">
                                            {editingId === log.id ? 
                                                <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-20 p-2 rounded-lg border-2 border-green-200 outline-none" /> 
                                                : log.amount}
                                        </td>
                                        <td className="p-6 font-black text-green-700 text-lg">{log.total_co2.toFixed(2)}</td>
                                        <td className="p-6">
                                            <div className="flex justify-center gap-2">
                                                {editingId === log.id ? 
                                                    <button className="w-9 h-9 flex items-center justify-center bg-green-100 text-green-700 rounded-full hover:bg-green-700 hover:text-white transition-all" onClick={() => saveEdit(log.id)}>💾</button> 
                                                    : <button className="w-9 h-9 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-green-700 hover:text-white transition-all" onClick={() => {setEditingId(log.id); setEditValue(log.amount);}}>✏️</button>}
                                                <button className="w-9 h-9 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-red-500 hover:text-white transition-all" onClick={() => deleteLog(log.id)}>🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="5" className="p-20 text-center text-slate-400 font-medium">🌿 No activities logged yet. Start by adding one above!</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
}

// --- ANIMATED NUMBER COMPONENT ---
function AnimatedNumber({ value }) {
    const [displayValue, setDisplayValue] = React.useState(0);
    const prevValue = useRef(0);
    useEffect(() => {
        const start = prevValue.current;
        const end = value;
        const duration = 1500; 
        let startTime = null;
        const animate = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const currentNumber = (progress * (end - start) + start).toFixed(2);
            setDisplayValue(currentNumber);
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
        prevValue.current = value;
    }, [value]);
    return <span>{displayValue} <small className="text-xs opacity-60 font-normal">kg</small></span>;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Dashboard />);