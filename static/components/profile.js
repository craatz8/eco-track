const { useState, useEffect } = React;

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
                </div>
            </main>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('profile-root'));
root.render(<Profile />);