const { useState, useEffect } = React;

function ImpactChart() {
    const chartRef = React.useRef(null);
    const [range, setRange] = React.useState(1); 
    const [type, setType] = React.useState('line'); 
    const [isCumulative, setIsCumulative] = React.useState(true);
    const [granularity, setGranularity] = React.useState('auto'); 
    
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
                    
                    const useMonthly = granularity === 'month' || (granularity === 'auto' && diffDays > 31); 

                    let labels = [];
                    let rawKeys = [];
                    let aggregatedData = {};

                    let current = new Date(startDate);
                    while (current <= endDate) {
                        let key = useMonthly 
                            ? current.toLocaleString('default', { month: 'short', year: 'numeric' })
                            : `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
                        
                        if (!aggregatedData.hasOwnProperty(key)) {
                            labels.push(useMonthly 
                                ? current.toLocaleString('default', { month: 'short', year: 'numeric' }) 
                                : current.toLocaleDateString('default', { month: 'short', day: 'numeric' })
                            );
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
                        const logDate = new Date(log.log_date || log.date);
                        if (logDate >= startDate && logDate <= endDate) {
                            const key = useMonthly 
                                ? logDate.toLocaleString('default', { month: 'short', year: 'numeric' })
                                : `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
                            
                            const val = log.total_co2 || (log.amount * (log.co2_per_unit || 0));
                            if (aggregatedData.hasOwnProperty(key)) aggregatedData[key] += val;
                        }
                    });

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
                                label: isCumulative ? 'Total Footprint' : 'Activity',
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
                                x: { ticks: { maxTicksLimit: 12 } }
                            }
                        }
                    });
                }
            });
    }, [range, type, isCustom, customDates, isCumulative, granularity]);

    return (
        <div className="mt-10 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-inner">
            <div className="flex flex-col items-center gap-6 mb-8 text-center">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Impact Analytics</h4>
                
                <div className="flex flex-wrap justify-center items-center gap-4">
                    <div className={`flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border transition-all duration-300 ${isCustom ? 'border-emerald-500 ring-4 ring-emerald-500/10' : 'border-slate-200'}`}>
                        <input type="date" className="text-xs font-bold text-slate-500 bg-transparent outline-none px-2"
                            value={customDates.start}
                            onChange={(e) => setCustomDates({...customDates, start: e.target.value})} />
                        <span className="text-slate-300 font-black">➔</span>
                        <input type="date" className="text-xs font-bold text-slate-500 bg-transparent outline-none px-2"
                            value={customDates.end}
                            onChange={(e) => setCustomDates({...customDates, end: e.target.value})} />
                        <button 
                            onClick={() => { setIsCustom(true); setGranularity('auto'); }}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${isCustom 
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' 
                                : 'bg-white text-emerald-700 border-emerald-200 hover:border-emerald-400 shadow-sm'}`}>
                            APPLY
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
                        {[1, 3, 6, 12].map(m => (
                            <button key={m} onClick={() => { setIsCustom(false); setRange(m); setGranularity('auto'); }}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${(!isCustom && range === m) ? 'bg-green-700 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
                                {m === 12 ? '1Y' : m === 1 ? '1M' : `${m}M`}
                            </button>
                        ))}
                        
                        <div className="w-[1px] bg-slate-100 h-6 mx-1"></div>

                        <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                            <button onClick={() => setGranularity('day')}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${granularity === 'day' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400'}`}>Day</button>
                            <button onClick={() => setGranularity('month')}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${granularity === 'month' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400'}`}>Month</button>
                        </div>

                        <div className="w-[1px] bg-slate-100 h-6 mx-1"></div>

                        <button onClick={() => setIsCumulative(!isCumulative)}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${isCumulative ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                            {isCumulative ? 'Cumulative' : 'Activity'}
                        </button>

                        <div className="w-[1px] bg-slate-100 h-6 mx-1"></div>

                        <button onClick={() => setType('bar')} className={`p-2 rounded-xl transition-colors ${type === 'bar' ? 'bg-slate-100 text-green-700' : 'text-slate-300 hover:text-slate-400'}`}>📊</button>
                        <button onClick={() => setType('line')} className={`p-2 rounded-xl transition-colors ${type === 'line' ? 'bg-slate-100 text-green-700' : 'text-slate-300 hover:text-slate-400'}`}>📈</button>
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
    
    // Forest State
    const [trees, setTrees] = useState([]);
    const [achievements, setAchievements] = useState([]);
    const [isAchievementsExpanded, setIsAchievementsExpanded] = useState(false);
    const [editingTreeId, setEditingTreeId] = useState(null);
    const [treeEditForm, setTreeEditForm] = useState({ species: '', location_name: '', lat: '', lng: '' });

    const [isAnimatedBg, setIsAnimatedBg] = useState(() => {
        const saved = localStorage.getItem('ecoTrack_animatedBg');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const navItems = [
        { label: 'Dashboard', href: '/' },
        { label: 'My Forest', href: '/forest' },
        { label: 'User Guide', href: '/guide' },
        { label: `Hi, ${window.currentUserName ? window.currentUserName.split(' ')[0] : 'User'}`, href: '/profile', isUser: true },
        { label: 'Logout', href: '/logout' },
    ];

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    useEffect(() => {
        fetch(`/api/user-stats?month=${viewDate.month}&year=${viewDate.year}`)
            .then(res => res.json())
            .then(data => {
                if (data.status === "Success") setStats(data.stats);
            });
    }, [viewDate]);

    useEffect(() => {
        fetch('/api/projections')
            .then(res => res.json())
            .then(data => {
                if (data.status === "Success") setProjections(data);
            });
    }, []);

    const fetchForest = () => {
        fetch('/api/user-forest')
            .then(res => res.json())
            .then(data => {
                if (data && data.trees) {
                    setTrees(data.trees);
                    updateAchievements(data.trees);
                }
            })
            .catch(e => console.error("Failed to fetch forest", e));
    };

    useEffect(() => {
        fetchForest();
    }, []);

    // --- DYNAMIC ACHIEVEMENT ENGINE ---
    const updateAchievements = (forestData) => {
        const count = forestData ? forestData.length : 0;
        let maxAgeDays = 0;
        
        if (forestData && forestData.length > 0) {
            const now = new Date();
            forestData.forEach(t => {
                if (t.date_planted) {
                    const days = (now - new Date(t.date_planted)) / (1000 * 60 * 60 * 24);
                    if (days > maxAgeDays) maxAgeDays = days;
                }
            });
        }

        const allAchievements = [
            { icon: '🌱', title: 'First Seed', desc: 'Plant your very first tree', progress: Math.min((count / 1) * 100, 100) },
            { icon: '🌿', title: 'Forest Starter', desc: 'Plant 5 trees globally', progress: Math.min((count / 5) * 100, 100) },
            { icon: '🌳', title: 'Grove Master', desc: 'Plant 10 trees globally', progress: Math.min((count / 10) * 100, 100) },
            { icon: '👑', title: 'Captain Planet', desc: 'Plant 50 trees globally', progress: Math.min((count / 50) * 100, 100) },
            { icon: '🗓️', title: 'Rooting', desc: 'Have a tree reach 1 month old', progress: Math.min((maxAgeDays / 30) * 100, 100) },
            { icon: '🎂', title: 'Yearling', desc: 'Have a tree reach 1 year old', progress: Math.min((maxAgeDays / 365) * 100, 100) },
            { icon: '🕰️', title: 'Deep Roots', desc: 'Have a tree reach 5 years old', progress: Math.min((maxAgeDays / 1825) * 100, 100) },
        ];

        // Sort: Unlocked first, then by progress percentage
        allAchievements.sort((a, b) => b.progress - a.progress);
        setAchievements(allAchievements);
    };

    const startEditingTree = (tree) => {
        setEditingTreeId(tree.id);
        setTreeEditForm({
            species: tree.species || '',
            location_name: tree.location_name || '',
            lat: tree.lat,
            lng: tree.lng
        });
    };

    const handleSaveTree = (tree) => {
        fetch(`/api/user-forest`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                id: tree.id, 
                lat: parseFloat(treeEditForm.lat), 
                lng: parseFloat(treeEditForm.lng),
                species: treeEditForm.species, 
                location_name: treeEditForm.location_name 
            })
        }).then(() => {
            setEditingTreeId(null);
            fetchForest();
        });
    };

    const handleDeleteTree = (tree) => {
        if (confirm("Are you sure you want to uproot this tree from the database?")) {
            fetch(`/api/user-forest`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: tree.id, lat: tree.lat, lng: tree.lng })
            }).then(() => fetchForest());
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "Unknown";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getTreeAge = (dateString) => {
        if (!dateString) return "Unknown";
        const planted = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - planted) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return "Planted Today";
        if (diffDays === 1) return "1 day old";
        if (diffDays < 30) return `${diffDays} days old`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months old`;
        return `${Math.floor(diffDays / 365)} years old`;
    };

    return (
        <div className={`relative min-h-screen pb-20 font-sans transition-colors duration-700 ${!isAnimatedBg ? 'bg-slate-50' : ''}`}>
            <header className="sticky top-0 z-50 flex justify-center w-full py-4 px-6">
                <window.PillNav items={navItems} activeHref="/profile" pillColor="#166534" />
            </header>
            
            {isAnimatedBg && (
                <div className="fixed inset-0 -z-10">
                    <window.LiquidEther colors={['#10b981', '#34d399', '#059669']} autoDemo={true} />
                </div>
            )}

            <main className="max-w-4xl mx-auto px-6 mt-12 space-y-12">
                <div className="bg-white/80 backdrop-blur-2xl p-10 rounded-[3.5rem] shadow-2xl border border-white/50">
                    <div className="flex flex-wrap items-center justify-between gap-6 mb-12">
                        <div>
                            <h2 className="text-4xl font-[900] text-green-900 tracking-tight">Impact Analysis</h2>
                            <p className="text-slate-500 font-medium mt-1">Deep dive into your carbon history</p>
                        </div>
                        
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
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

                    {/* NEW: VIBRANT ACHIEVEMENTS ENGINE */}
                    <div className="mb-10 bg-white/60 p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🏆</span>
                                <h3 className="text-sm font-black text-[#1e6d3a] uppercase tracking-widest">Achievements</h3>
                            </div>
                            <button 
                                onClick={() => setIsAchievementsExpanded(!isAchievementsExpanded)}
                                className="text-[10px] font-black tracking-widest text-green-700 hover:text-green-900 bg-green-100/50 hover:bg-green-100 px-4 py-2 rounded-full transition-colors"
                            >
                                {isAchievementsExpanded ? 'HIDE ALL ▲' : 'VIEW ALL ▼'}
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {(isAchievementsExpanded ? achievements : achievements.slice(0, 3)).map((achieve, idx) => {
                                const isUnlocked = achieve.progress >= 100;
                                return (
                                    <div key={idx} className={`p-5 rounded-[1.5rem] border-2 transition-all duration-300 ${isUnlocked ? 'bg-green-50 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'bg-slate-50 border-slate-100 opacity-60 grayscale hover:grayscale-0'}`}>
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className={`h-12 w-12 shrink-0 rounded-full flex items-center justify-center text-2xl shadow-sm ${isUnlocked ? 'bg-white border border-green-200' : 'bg-slate-200'}`}>
                                                {achieve.icon}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className={`font-black leading-tight text-sm ${isUnlocked ? 'text-green-900' : 'text-slate-500'}`}>{achieve.title}</h4>
                                                <p className={`text-[9px] font-bold uppercase mt-1 tracking-wider ${isUnlocked ? 'text-green-700' : 'text-slate-400'}`}>{achieve.desc}</p>
                                            </div>
                                        </div>
                                        {/* Progress Bar Container */}
                                        <div className="w-full bg-slate-200/50 rounded-full h-1.5 overflow-hidden flex">
                                            <div className={`h-full rounded-full transition-all duration-1000 ${isUnlocked ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-slate-400'}`} style={{ width: `${achieve.progress}%` }}></div>
                                        </div>
                                        <div className="text-right mt-1.5">
                                            <span className={`text-[9px] font-black tracking-widest ${isUnlocked ? 'text-green-600' : 'text-slate-400'}`}>
                                                {Math.floor(achieve.progress)}%
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <ImpactChart userId={window.currentUserId} />
                </div>

                <div className="bg-white/80 backdrop-blur-2xl p-10 rounded-[3.5rem] shadow-2xl border border-white/50">
                    <div className="mb-8">
                        <h2 className="text-3xl font-[900] text-green-900 tracking-tight">Forest Ledger</h2>
                        <p className="text-slate-500 font-medium mt-1">Review and manage your planted trees.</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/80 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                    <th className="p-4 rounded-l-2xl">Date Planted</th>
                                    <th className="p-4">Species</th>
                                    <th className="p-4">Location</th>
                                    <th className="p-4">Age</th>
                                    <th className="p-4">Coordinates</th>
                                    <th className="p-4 text-center rounded-r-2xl">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {trees.length > 0 ? trees.map(tree => (
                                    <tr key={tree.id} className="hover:bg-green-50/30 transition-colors group">
                                        <td className="p-4 text-slate-500 text-sm font-medium">{formatDate(tree.date_planted)}</td>
                                        
                                        <td className="p-4 font-bold text-slate-800">
                                            {editingTreeId === tree.id ? (
                                                <input type="text" className="w-24 p-2 rounded-lg border-2 border-green-200 outline-none text-sm" value={treeEditForm.species} onChange={(e) => setTreeEditForm({...treeEditForm, species: e.target.value})} placeholder="e.g. Oak" /> 
                                            ) : (tree.species || 'Unclassified')}
                                        </td>
                                        
                                        <td className="p-4 font-bold text-slate-800">
                                            {editingTreeId === tree.id ? (
                                                <input type="text" className="w-32 p-2 rounded-lg border-2 border-green-200 outline-none text-sm" value={treeEditForm.location_name} onChange={(e) => setTreeEditForm({...treeEditForm, location_name: e.target.value})} placeholder="Location" /> 
                                            ) : (tree.location_name || 'Unknown')}
                                        </td>

                                        <td className="p-4 text-slate-500 text-sm font-medium">{getTreeAge(tree.date_planted)}</td>
                                        
                                        <td className="p-4 text-xs font-bold text-slate-400">
                                            {editingTreeId === tree.id ? (
                                                <div className="flex flex-col gap-1">
                                                    <input type="number" step="any" className="w-20 p-1 rounded border border-green-200 outline-none" value={treeEditForm.lat} onChange={(e) => setTreeEditForm({...treeEditForm, lat: e.target.value})} placeholder="Lat" /> 
                                                    <input type="number" step="any" className="w-20 p-1 rounded border border-green-200 outline-none" value={treeEditForm.lng} onChange={(e) => setTreeEditForm({...treeEditForm, lng: e.target.value})} placeholder="Lng" /> 
                                                </div>
                                            ) : (`${Number(tree.lat).toFixed(3)}°, ${Number(tree.lng).toFixed(3)}°`)}
                                        </td>

                                        <td className="p-4">
                                            <div className="flex justify-center gap-2">
                                                {editingTreeId === tree.id ? (
                                                    <button className="w-9 h-9 flex items-center justify-center bg-green-100 text-green-700 rounded-full hover:bg-green-700 hover:text-white transition-all shadow-sm" onClick={() => handleSaveTree(tree)}>💾</button> 
                                                ) : (
                                                    <button className="w-9 h-9 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-green-700 hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100" onClick={() => startEditingTree(tree)}>✏️</button>
                                                )}
                                                <button className="w-9 h-9 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100" onClick={() => handleDeleteTree(tree)}>🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="6" className="p-16 text-center text-slate-400 font-medium">🌍 Your forest is empty. Head to the globe to start planting!</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('profile-root'));
root.render(<Profile />);