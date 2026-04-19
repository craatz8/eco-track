const { useState, useEffect } = React;


function ImpactChart() {
    const chartRef = React.useRef(null);
    const [range, setRange] = React.useState(1); 
    const [type, setType] = React.useState('line'); 
    const [isCumulative, setIsCumulative] = React.useState(true); // New Toggle State
    
    const [customDates, setCustomDates] = React.useState({ start: '', end: '' });
    const [isCustom, setIsCustom] = React.useState(false);

    React.useEffect(() => {
        fetch('/api/user-logs')
            .then(res => res.json())
            .then(data => {
                if (data.status === "Success") {
                    const ctx = document.getElementById('impactChart').getContext('2d');
                    
                    let startDate, endDate;
                    if (isCustom && customDates.start && customDates.end) {
                        startDate = new Date(customDates.start);
                        endDate = new Date(customDates.end);
                    } else {
                        endDate = new Date();
                        startDate = new Date();
                        startDate.setMonth(startDate.getMonth() - range);
                    }
                    startDate.setHours(0,0,0,0);
                    endDate.setHours(23,59,59,999);

                    if (startDate > endDate) return;

                    const diffTime = Math.abs(endDate - startDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const useMonthly = diffDays > 62; 

                    let labels = [];
                    let rawKeys = [];
                    let aggregatedData = {};

                    let current = new Date(startDate);
                    while (current <= endDate) {
                        let key = useMonthly 
                            ? current.toLocaleString('default', { month: 'short', year: '2-digit' })
                            : `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
                        
                        if (!aggregatedData.hasOwnProperty(key)) {
                            labels.push(useMonthly ? key : current.toLocaleDateString('default', { month: 'short', day: 'numeric' }));
                            rawKeys.push(key);
                            aggregatedData[key] = 0;
                        }
                        
                        if (useMonthly) {
                            current.setMonth(current.getMonth() + 1);
                            current.setDate(1);
                        } else {
                            current.setDate(current.getDate() + 1);
                        }
                    }

                    data.logs.forEach(log => {
                        const logDate = new Date(log.date);
                        if (logDate >= startDate && logDate <= endDate) {
                            const key = useMonthly 
                                ? logDate.toLocaleString('default', { month: 'short', year: '2-digit' })
                                : `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
                            if (aggregatedData.hasOwnProperty(key)) aggregatedData[key] += log.total_co2;
                        }
                    });

                    // CUMULATIVE VS INSTANT LOGIC
                    let runningTotal = 0;
                    const plotValues = rawKeys.map(key => {
                        if (isCumulative) {
                            runningTotal += aggregatedData[key];
                            return runningTotal;
                        }
                        return aggregatedData[key];
                    });

                    if (chartRef.current) chartRef.current.destroy();

                    chartRef.current = new Chart(ctx, {
                        type: type,
                        data: {
                            labels: labels,
                            datasets: [{
                                label: isCumulative ? 'Total Footprint' : 'Daily/Monthly Activity',
                                data: plotValues,
                                backgroundColor: type === 'bar' ? '#15803d' : 'rgba(21, 128, 61, 0.1)',
                                borderColor: '#15803d',
                                borderWidth: 3,
                                fill: true,
                                tension: 0.3,
                                pointRadius: !useMonthly ? 4 : 6,
                                borderRadius: type === 'bar' ? 8 : 0,
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                                y: { beginAtZero: true, title: { display: true, text: 'CO2 (kg)', font: { weight: 'bold' } } },
                                x: { ticks: { maxTicksLimit: useMonthly ? 12 : 10 } }
                            }
                        }
                    });
                }
            });
    }, [range, type, isCustom, customDates, isCumulative]);

    return (
        <div className="mt-10 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-inner">
            <div className="flex flex-col items-center gap-6 mb-8 text-center">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Impact Analytics</h4>
                
                <div className="flex flex-wrap justify-center items-center gap-4">
                    {/* Date Inputs */}
                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
                        <input type="date" className="text-xs font-bold text-slate-500 bg-transparent outline-none px-2"
                            onChange={(e) => setCustomDates({...customDates, start: e.target.value})} />
                        <span className="text-slate-300 font-black">→</span>
                        <input type="date" className="text-xs font-bold text-slate-500 bg-transparent outline-none px-2"
                            onChange={(e) => setCustomDates({...customDates, end: e.target.value})} />
                        <button onClick={() => setIsCustom(true)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isCustom ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
                            Apply
                        </button>
                    </div>

                    {/* Controls & Toggles */}
                    <div className="flex flex-wrap items-center justify-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
                        {[1, 3, 6, 12].map(m => (
                            <button key={m} onClick={() => { setIsCustom(false); setRange(m); }}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${(!isCustom && range === m) ? 'bg-green-700 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
                                {m === 12 ? '1Y' : m === 1 ? '1M' : `${m}M`}
                            </button>
                        ))}
                        
                        <div className="w-[1px] bg-slate-100 h-6 mx-1"></div>

                        {/* Cumulative Toggle */}
                        <button onClick={() => setIsCumulative(!isCumulative)}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${isCumulative ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                            {isCumulative ? 'Cumulative' : 'Activity'}
                        </button>

                        <div className="w-[1px] bg-slate-100 h-6 mx-1"></div>

                        <button onClick={() => setType('bar')} className={`p-2 rounded-xl ${type === 'bar' ? 'bg-slate-100 text-green-700' : 'text-slate-300'}`}>📊</button>
                        <button onClick={() => setType('line')} className={`p-2 rounded-xl ${type === 'line' ? 'bg-slate-100 text-green-700' : 'text-slate-300'}`}>📈</button>
                    </div>
                </div>
            </div>
            
            <div className="h-[300px]">
                <canvas id="impactChart"></canvas>
            </div>
        </div>
    );
}


function Profile() {
    const [viewDate, setViewDate] = useState({ 
        month: new Date().getMonth() + 1, 
        year: new Date().getFullYear() 
    });
    const [stats, setStats] = useState({ total_co2: 0, total_entries: 0 });
    const [projections, setProjections] = useState(null);

    const navItems = [
        { label: 'Dashboard', href: '/' },
        { label: 'User Guide', href: '/guide' },
        { label: 'Logout', href: '/logout' },
        { label: `Hi, ${window.currentUserName || 'User'}`, href: '/profile', isUser: true }
    ];

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    // Fetch stats for specific month
    useEffect(() => {
        fetch(`/api/user-stats?month=${viewDate.month}&year=${viewDate.year}`)
            .then(res => res.json())
            .then(data => {
                if (data.status === "Success") setStats(data.stats);
            });
    }, [viewDate]);

    // Fetch projections
    useEffect(() => {
        fetch('/api/projections')
            .then(res => res.json())
            .then(data => {
                if (data.status === "Success") setProjections(data);
            });
    }, []);

    return (
        <div className="relative min-h-screen pb-20 font-sans">
            <header className="sticky top-0 z-50 flex justify-center w-full py-4 px-6">
                <window.PillNav items={navItems} activeHref="/profile" pillColor="#166534" />
            </header>
            
            <div className="fixed inset-0 -z-10">
                <window.LiquidEther colors={['#10b981', '#34d399', '#059669']} autoDemo={true} />
            </div>

            <main className="max-w-4xl mx-auto px-6 mt-12">
                <div className="bg-white/80 backdrop-blur-2xl p-10 rounded-[3.5rem] shadow-2xl border border-white/50">
                    <div className="flex flex-wrap items-center justify-between gap-6 mb-12">
                        <div>
                            <h2 className="text-4xl font-[900] text-green-900 tracking-tight">Impact Analysis</h2>
                            <p className="text-slate-500 font-medium mt-1">Deep dive into your carbon history</p>
                        </div>
                        
                        {/* SELECTORS */}
                        <div className="flex gap-3 bg-white/50 p-2 rounded-3xl border border-white shadow-sm">
                            <select 
                                className="bg-white border-none p-3 px-5 rounded-2xl font-bold text-slate-700 outline-none ring-offset-2 focus:ring-2 focus:ring-green-500 cursor-pointer shadow-sm"
                                value={viewDate.month}
                                onChange={(e) => setViewDate({...viewDate, month: e.target.value})}
                            >
                                {months.map((name, i) => (
                                    <option key={i} value={i + 1}>{name}</option>
                                ))}
                            </select>
                            <select 
                                className="bg-white border-none p-3 px-5 rounded-2xl font-bold text-slate-700 outline-none ring-offset-2 focus:ring-2 focus:ring-green-500 cursor-pointer shadow-sm"
                                value={viewDate.year}
                                onChange={(e) => setViewDate({...viewDate, year: e.target.value})}
                            >
                                {[2024, 2025, 2026].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* MONTHLY TOTAL CARD */}
                        <div className="bg-gradient-to-br from-green-700 to-green-900 text-white p-8 rounded-[2.5rem] shadow-xl transform transition hover:scale-[1.02]">
                            <p className="text-xs font-black uppercase tracking-[0.2em] opacity-60">Total for {months[viewDate.month - 1]}</p>
                            <div className="text-5xl font-black mt-4 flex items-baseline gap-2">
                                {stats.total_co2.toFixed(2)} 
                                <span className="text-xl font-medium opacity-70">kg</span>
                            </div>
                            <div className="mt-8 flex items-center gap-2 text-sm font-bold bg-white/10 w-fit px-4 py-2 rounded-full">
                                <span>📊</span> {stats.total_entries} Activities Logged
                            </div>
                        </div>

                        {/* PROJECTION CARD */}
                        {projections && (
                            <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                                <div className="relative z-10">
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Monthly Forecast</p>
                                    <div className="text-5xl font-black mt-4 text-emerald-400">
                                        ~{projections.projected_total}
                                        <span className="text-xl font-medium text-white ml-2">kg</span>
                                    </div>
                                    <p className="text-sm mt-8 text-slate-400 font-medium leading-relaxed">
                                        At your current pace, you'll reach this total by the end of the month.
                                    </p>
                                </div>
                                <div className="absolute -right-8 -bottom-8 text-[12rem] opacity-[0.03] rotate-12 transition-transform group-hover:rotate-0">📈</div>
                            </div>
                        )}
                    </div>
                    <ImpactChart userId={window.currentUserId} />
                </div>
            </main>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('profile-root'));
root.render(<Profile />);