const { useState, useEffect, useRef } = React;

function ForestGlobe() {
    const wrapperRef = useRef(null);
    const svgRef = useRef(null);
    
    // UI States
    const [plantingData, setPlantingData] = useState(null);
    const [uiMode, setUiMode] = useState(false);
    const [form, setForm] = useState({ species: '', location_name: '' });
    
    const [hoveredTree, setHoveredTree] = useState(null);
    const [selectedTree, setSelectedTree] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    // Autocomplete States & Refs
    const [suggestions, setSuggestions] = useState([]);
    const typingTimeoutRef = useRef(null);
    const worldDataRef = useRef(null); 

    const isPlantingModeRef = useRef(false);

    // ==========================================
    // 🎨 THEME CONFIGURATION
    // ==========================================
    const THEME = {
        ocean: "#141c2b",          
        land: "#1e6d3a",           
        landHover: "#258a49",      
        borders: "#ffffff",        
        borderWidth: 0.6,          
        grid: "rgba(255, 255, 255, 0.08)", 
        tree: "#022c16",           
        treeBorder: "#ffffff"      
    };

    const TREE_PATH = "M0,-12 L-4,-4 L-1,-4 L-6,4 L-1,4 L-8,12 L-2,12 L-2,16 L2,16 L2,12 L8,12 L1,4 L6,4 L1,-4 L4,-4 Z";

    const toggleMode = () => {
        isPlantingModeRef.current = !isPlantingModeRef.current;
        setUiMode(isPlantingModeRef.current);
        setSelectedTree(null); 
        setIsConfirmingDelete(false);
    };

    const getTreeAge = (dateString) => {
        if (!dateString) return "Unknown";
        const planted = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - planted) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return "Planted Today";
        if (diffDays === 1) return "1 day old";
        if (diffDays < 30) return `${diffDays} days old`;
        return `${Math.floor(diffDays / 30)} months old`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return "Unknown";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' });
    };

    const handlePlantSubmit = () => {
        fetch('/api/user-forest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ...form, 
                lat: parseFloat(plantingData.lat), 
                lng: parseFloat(plantingData.lng),
                date_planted: new Date().toISOString() 
            })
        }).then(() => window.location.reload());
    };

    const handleDelete = () => {
        if (!selectedTree) return;
        fetch(`/api/user-forest`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: selectedTree.id, lat: selectedTree.lat, lng: selectedTree.lng })
        }).then(() => window.location.reload());
    };

    const handleEditSubmit = () => {
        if (!selectedTree) return;
        fetch(`/api/user-forest`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                id: selectedTree.id, 
                lat: parseFloat(selectedTree.lat), 
                lng: parseFloat(selectedTree.lng),
                species: form.species || selectedTree.species, 
                location_name: form.location_name || selectedTree.location_name 
            })
        }).then(() => window.location.reload());
    };

    // --- THE NEW PHOTON AUTOCOMPLETE ENGINE ---
    const handleLocationSearch = (e) => {
        const val = e.target.value;
        setForm(prev => ({...prev, location_name: val}));
        
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        
        // Trigger immediately at 2 characters
        if (val.length < 2) {
            setSuggestions([]);
            return;
        }
        
        typingTimeoutRef.current = setTimeout(async () => {
            try {
                // Build the Photon Query (True Prefix Autocomplete)
                let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&limit=40`;
                
                // Location Bias: Feed it the exact GPS coordinates of your click!
                // This guarantees local cities rise to the top of the search instantly.
                if (plantingData && plantingData.lat && plantingData.lng) {
                    url += `&lat=${plantingData.lat}&lon=${plantingData.lng}`;
                }

                const res = await fetch(url);
                const data = await res.json();
                
                // Photon returns a GeoJSON FeatureCollection
                if (data && data.features && data.features.length > 0) {
                    let formattedSuggestions = data.features.map(f => ({
                        name: f.properties.name || 'Unknown Place',
                        admin1: f.properties.state || f.properties.county || '',
                        country: f.properties.country || '',
                        latitude: parseFloat(f.geometry.coordinates[1]),
                        longitude: parseFloat(f.geometry.coordinates[0])
                    }));

                    // Strict Sandbox: Delete anything not in the requested country
                    if (plantingData && plantingData.country) {
                        const contextCountry = plantingData.country.toLowerCase();
                        
                        formattedSuggestions = formattedSuggestions.filter(s => {
                            const cApi = (s.country || "").toLowerCase();
                            if (!cApi) return false; // Nuke results with missing country data

                            // Catch aliases
                            if (contextCountry === "usa" || contextCountry === "united states of america") {
                                return cApi.includes("united states");
                            }
                            if (contextCountry === "uk" || contextCountry === "united kingdom") {
                                return cApi.includes("united kingdom");
                            }
                            if (contextCountry.includes("russia")) {
                                return cApi.includes("russia");
                            }

                            // Strict match
                            return cApi === contextCountry || cApi.includes(contextCountry) || contextCountry.includes(cApi);
                        });
                    }

                    // Clean up messy identical data entries
                    const uniqueSuggestions = [];
                    const seen = new Set();
                    for (const s of formattedSuggestions) {
                        const key = `${s.name}-${s.admin1}`;
                        if (!seen.has(key) && s.name !== 'Unknown Place') {
                            seen.add(key);
                            uniqueSuggestions.push(s);
                        }
                    }

                    setSuggestions(uniqueSuggestions.slice(0, 10));
                } else {
                    setSuggestions([]);
                }
            } catch (err) {
                console.error("Geocoding failed:", err);
            }
        }, 250); // Faster debounce for smoother typing feel
    };

    useEffect(() => {
        if (!wrapperRef.current || !svgRef.current) return;

        const width = wrapperRef.current.clientWidth || 800;
        const height = 750; 
        const initialScale = 350; 

        const projection = d3.geoOrthographic()
            .scale(initialScale)
            .translate([width / 2, height / 2])
            .clipAngle(90)
            .rotate([90, -40]); 

        const path = d3.geoPath().projection(projection);
        const graticule = d3.geoGraticule();

        const svg = d3.select(svgRef.current)
            .attr("width", width) 
            .attr("height", height);

        svg.selectAll("*").remove();

        svg.append("circle")
            .attr("class", "ocean")
            .attr("cx", width / 2)
            .attr("cy", height / 2)
            .attr("r", projection.scale())
            .attr("fill", THEME.ocean) 
            .attr("stroke", "rgba(255, 255, 255, 0.1)") 
            .attr("stroke-width", 1);

        svg.append("path")
            .datum(graticule)
            .attr("class", "graticule")
            .attr("d", path)
            .attr("fill", "none")
            .attr("stroke", THEME.grid)
            .attr("stroke-width", 1);

        const loadGlobe = async () => {
            try {
                const worldRes = await fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson');
                const worldData = await worldRes.json();
                
                worldDataRef.current = worldData;

                svg.selectAll("path.land")
                   .data(worldData.features)
                   .join("path")
                   .attr("class", "land")
                   .attr("d", path)
                   .attr("fill", THEME.land) 
                   .attr("stroke", THEME.borders) 
                   .attr("stroke-width", THEME.borderWidth)
                   .on("mouseover", function() { d3.select(this).attr("fill", THEME.landHover); }) 
                   .on("mouseout", function() { d3.select(this).attr("fill", THEME.land); });

                let trees = [];
                try {
                    const treeRes = await fetch('/api/user-forest');
                    const treeData = await treeRes.json();
                    
                    if (treeData && treeData.trees) {
                        const locationCounts = {};
                        trees = treeData.trees.map(tree => {
                            const key = `${Number(tree.lat).toFixed(4)}_${Number(tree.lng).toFixed(4)}`;
                            if (!locationCounts[key]) locationCounts[key] = 0;
                            
                            const count = locationCounts[key];
                            let rLat = Number(tree.lat);
                            let rLng = Number(tree.lng);
                            
                            if (count > 0) {
                                const radius = 0.08 + (Math.floor(count / 6) * 0.04); 
                                const angle = count * (Math.PI / 3); 
                                
                                rLat += Math.sin(angle) * radius;
                                rLng += Math.cos(angle) * radius;
                            }
                            
                            locationCounts[key]++;
                            return { ...tree, renderLat: rLat, renderLng: rLng };
                        });
                    }
                } catch (e) {
                    console.warn("Tree data not ready.");
                }

                svg.selectAll("path.tree")
                    .data(trees)
                    .join("path")
                    .attr("class", "tree cursor-pointer") 
                    .attr("d", TREE_PATH)
                    .attr("fill", THEME.tree)
                    .attr("stroke", THEME.treeBorder)
                    .attr("stroke-width", 1.5)
                    .on("mouseenter", (event, d) => setHoveredTree(d))
                    .on("mouseleave", () => setHoveredTree(null))
                    .on("click", (event, d) => {
                        event.stopPropagation(); 
                        setSelectedTree(d);
                        setForm({ species: d.species, location_name: d.location_name }); 
                        setIsEditing(false);
                        setIsConfirmingDelete(false); 
                    });

                const redraw = () => {
                    svg.select("circle.ocean").attr("r", projection.scale());
                    svg.selectAll("path.land").attr("d", path);
                    svg.selectAll("path.graticule").attr("d", path);
                    
                    svg.selectAll("path.tree")
                       .attr("transform", d => {
                           const p = projection([d.renderLng, d.renderLat]);
                           return p ? `translate(${p[0]}, ${p[1]}) scale(0.9)` : "";
                       })
                       .style("display", d => {
                           const center = projection.invert([width/2, height/2]);
                           if(!center) return "none";
                           const dist = d3.geoDistance([d.renderLng, d.renderLat], center);
                           return dist > 1.57 ? "none" : "block"; 
                       });
                };

                const zoom = d3.zoom()
                    .scaleExtent([0.5, 30]) 
                    .filter(event => event.type === 'wheel') 
                    .on("zoom", (event) => {
                        projection.scale(initialScale * event.transform.k);
                        redraw();
                    });

                let r0, p0;
                const drag = d3.drag()
                    .on("start", (event) => {
                        r0 = projection.rotate();
                        p0 = [event.x, event.y];
                    })
                    .on("drag", (event) => {
                        const scaleFactor = initialScale / projection.scale();
                        const rot = [
                            r0[0] + (event.x - p0[0]) * 0.3 * scaleFactor,
                            r0[1] - (event.y - p0[1]) * 0.3 * scaleFactor 
                        ];
                        rot[1] = Math.max(-90, Math.min(90, rot[1]));
                        projection.rotate(rot);
                        redraw();
                    });

                svg.call(zoom);
                svg.call(drag);
                redraw();

            } catch (err) {
                console.error("D3 Failed to draw map layers:", err);
            }
        };

        svg.on("click", (event) => {
            if (event.defaultPrevented) return; 

            if (!isPlantingModeRef.current) {
                setSelectedTree(null);
                return;
            }
            
            const [x, y] = d3.pointer(event);
            const dx = x - (width / 2);
            const dy = y - (height / 2);
            const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
            
            if (distanceFromCenter > projection.scale()) {
                return; 
            }

            const coords = projection.invert([x, y]);
            
            if (coords && !isNaN(coords[0])) {
                let clickedCountry = "";
                if (worldDataRef.current) {
                    const feature = worldDataRef.current.features.find(f => d3.geoContains(f, coords));
                    if (feature) clickedCountry = feature.properties.name;
                }

                setPlantingData({ lat: coords[1], lng: coords[0], country: clickedCountry });
                setForm({ species: '', location_name: '' }); 
                setSuggestions([]); 
                isPlantingModeRef.current = false;
                setUiMode(false);
            }
        });

        loadGlobe();

    }, []);

    return (
        <>
            <header className="flex justify-center w-full py-4 px-6 mb-4">
                {window.PillNav ? (
                    <div className="flex items-center justify-center">
                        <window.PillNav 
                            items={[
                                { label: 'Dashboard', href: '/' },
                                { label: 'My Forest', href: '/forest' },
                                { label: 'User Guide', href: '/guide' },
                                { label: 'Logout', href: '/logout' },
                                { label: `Hi, ${window.currentUserName || 'User'}`, href: '/profile', isUser: true }
                            ]} 
                            activeHref="/forest" 
                            pillColor="#1e6d3a" 
                        />
                    </div>
                ) : (
                    <div className="bg-white/80 px-6 py-2 rounded-full shadow-sm text-[#1e6d3a] animate-pulse font-bold text-sm">
                        Loading Navigation...
                    </div>
                )}
            </header>

            <div ref={wrapperRef} className="relative w-full bg-slate-50 rounded-[4rem] overflow-hidden border-[16px] border-white shadow-2xl">
                
                <div className="absolute top-10 right-10 z-30">
                    <button 
                        onClick={toggleMode}
                        className={`px-12 py-6 rounded-[2.5rem] font-black text-sm tracking-widest transition-all shadow-xl ${
                            uiMode ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-[#1e6d3a] border-2 border-slate-100 hover:bg-slate-100 hover:scale-105'
                        }`}
                    >
                        {uiMode ? 'CANCEL TARGETING' : '➕ PLANT A NEW TREE'}
                    </button>
                </div>

                <svg ref={svgRef} className={`w-full h-[750px] bg-slate-50 ${uiMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`} />

                {/* HOVER TOOLTIP */}
                {hoveredTree && !plantingData && !selectedTree && (
                    <div className="absolute top-10 left-10 z-40 bg-white p-5 rounded-3xl shadow-xl transition-all duration-300 pointer-events-none border border-slate-100 w-64">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="h-2 w-2 rounded-full bg-[#1e6d3a] animate-pulse"></span>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">RECORDED PLOT</p>
                        </div>
                        <h3 className="text-xl font-black text-[#141c2b] mb-3 truncate">{hoveredTree.location_name || 'Unknown Zone'}</h3>
                        
                        <div className="bg-slate-50 rounded-2xl p-3 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Species</span>
                                <span className="font-bold text-[#1e6d3a] text-sm">{hoveredTree.species || 'Unclassified'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Age</span>
                                <span className="font-bold text-[#141c2b] text-sm">{getTreeAge(hoveredTree.date_planted)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Planted</span>
                                <span className="font-bold text-[#141c2b] text-sm">{formatDate(hoveredTree.date_planted)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* SELECTED TREE COMMAND CARD */}
                {selectedTree && !plantingData && (
                    <div className="absolute top-10 left-10 z-40 bg-white p-8 rounded-[3rem] shadow-2xl w-96 max-h-[90%] overflow-y-auto border-2 border-slate-100 animate-fade-in-up">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-[#1e6d3a] font-black uppercase tracking-widest text-[10px] mb-1">ACTIVE SELECTION</p>
                                <h3 className="text-3xl font-black text-[#141c2b] leading-tight">{selectedTree.location_name || 'Unknown Zone'}</h3>
                            </div>
                            <button onClick={() => setSelectedTree(null)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200">
                                ✕
                            </button>
                        </div>

                        {!isEditing ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-2xl">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Species</p>
                                        <p className="font-bold text-[#141c2b]">{selectedTree.species || 'Unclassified'}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Age</p>
                                        <p className="font-bold text-[#141c2b]">{getTreeAge(selectedTree.date_planted)}</p>
                                    </div>
                                    
                                    <div className="bg-slate-50 p-4 rounded-2xl col-span-2 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Date Planted</p>
                                            <p className="font-bold text-[#141c2b]">{formatDate(selectedTree.date_planted)}</p>
                                        </div>
                                        <div className="text-2xl">🌱</div>
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-2xl col-span-2 flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">GPS Coordinates</p>
                                            <p className="font-bold text-slate-600 text-sm">
                                                {Number(selectedTree.lat).toFixed(4)}°N, {Number(selectedTree.lng).toFixed(4)}°E
                                            </p>
                                        </div>
                                        <div className="h-8 w-8 bg-[#1e6d3a]/10 rounded-full flex items-center justify-center text-[#1e6d3a]">
                                            📍
                                        </div>
                                    </div>
                                </div>

                                {isConfirmingDelete ? (
                                    <div className="pt-4 border-t border-slate-100">
                                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-3 text-center">Are you sure?</p>
                                        <div className="flex gap-3">
                                            <button onClick={handleDelete} className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl hover:bg-red-600 transition-colors">
                                                YES, DELETE
                                            </button>
                                            <button onClick={() => setIsConfirmingDelete(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-colors">
                                                CANCEL
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                                        <button onClick={() => setIsEditing(true)} className="flex-1 py-4 bg-slate-100 text-[#141c2b] font-black rounded-2xl hover:bg-slate-200 transition-colors">
                                            EDIT INFO
                                        </button>
                                        <button onClick={() => setIsConfirmingDelete(true)} className="flex-1 py-4 bg-red-50 text-red-600 font-black rounded-2xl hover:bg-red-100 transition-colors">
                                            DELETE
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm font-bold text-slate-400 mb-4">Modify this tree's database records.</p>
                                
                                <div className="flex gap-4 mb-2">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Latitude</label>
                                        <input 
                                            type="number" step="any"
                                            className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none border-2 border-transparent focus:border-[#1e6d3a] transition-colors text-[#141c2b]" 
                                            value={selectedTree.lat}
                                            onChange={e => setSelectedTree({...selectedTree, lat: e.target.value})}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Longitude</label>
                                        <input 
                                            type="number" step="any"
                                            className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none border-2 border-transparent focus:border-[#1e6d3a] transition-colors text-[#141c2b]" 
                                            value={selectedTree.lng}
                                            onChange={e => setSelectedTree({...selectedTree, lng: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Tree Species</label>
                                    <input 
                                        className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none border-2 border-transparent focus:border-[#1e6d3a] text-[#141c2b]" 
                                        value={form.species}
                                        placeholder="e.g. Oak" 
                                        onChange={e => setForm({...form, species: e.target.value})} 
                                    />
                                </div>
                                
                                <div className="relative">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Location Name</label>
                                    <input 
                                        className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none border-2 border-transparent focus:border-[#1e6d3a] text-[#141c2b]" 
                                        value={form.location_name}
                                        placeholder="e.g. Front Yard" 
                                        onChange={handleLocationSearch} 
                                        onBlur={() => setTimeout(() => setSuggestions([]), 200)}
                                    />
                                    {suggestions.length > 0 && (
                                        <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] max-h-52 overflow-y-auto z-50">
                                            {suggestions.map((s, i) => (
                                                <div 
                                                    key={i} 
                                                    className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                                                    onClick={() => {
                                                        const locationStr = s.admin1 ? `${s.name}, ${s.admin1}` : `${s.name}, ${s.country}`;
                                                        setForm({...form, location_name: locationStr});
                                                        
                                                        setSelectedTree(prev => ({
                                                            ...prev,
                                                            lat: s.latitude,
                                                            lng: s.longitude
                                                        }));
                                                        setSuggestions([]);
                                                    }}
                                                >
                                                    <p className="font-bold text-[#141c2b] text-sm">{s.name}</p>
                                                    <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">
                                                        {s.admin1 ? `${s.admin1}, ` : ''}{s.country}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-slate-100">
                                    <button onClick={handleEditSubmit} className="flex-1 py-4 bg-[#141c2b] text-white font-black rounded-2xl hover:bg-[#1e6d3a] transition-colors">
                                        SAVE
                                    </button>
                                    <button onClick={() => setIsEditing(false)} className="px-6 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-colors">
                                        BACK
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* PLANTING MODAL WITH AUTOCOMPLETE */}
                {plantingData && (
                    <div className="absolute inset-0 bg-[#141c2b]/80 backdrop-blur-md flex items-center justify-center z-50 p-6">
                        <div className="bg-white p-14 rounded-[4rem] w-full max-w-lg shadow-2xl">
                            <h2 className="text-4xl font-black text-[#141c2b] mb-6">Log New Tree</h2>
                            
                            <div className="space-y-4">
                                
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Latitude</label>
                                        <input 
                                            type="number" step="any"
                                            className="w-full p-4 bg-slate-50 rounded-[1.5rem] font-bold outline-none border-2 border-transparent focus:border-[#1e6d3a] transition-colors text-[#141c2b]" 
                                            value={plantingData.lat !== undefined ? plantingData.lat : ''}
                                            onChange={e => setPlantingData({...plantingData, lat: e.target.value})}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Longitude</label>
                                        <input 
                                            type="number" step="any"
                                            className="w-full p-4 bg-slate-50 rounded-[1.5rem] font-bold outline-none border-2 border-transparent focus:border-[#1e6d3a] transition-colors text-[#141c2b]" 
                                            value={plantingData.lng !== undefined ? plantingData.lng : ''}
                                            onChange={e => setPlantingData({...plantingData, lng: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <hr className="border-slate-100 my-2" />

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Tree Species</label>
                                    <input 
                                        className="w-full p-5 bg-slate-50 rounded-[1.5rem] font-bold outline-none border-2 border-transparent focus:border-[#1e6d3a] transition-colors text-[#141c2b]" 
                                        placeholder="e.g. Oak" 
                                        onChange={e => setForm({...form, species: e.target.value})} 
                                    />
                                </div>
                                
                                <div className="relative">
                                    <div className="flex justify-between items-end mb-2 ml-1">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Location Name</label>
                                        {plantingData.country && (
                                            <span className="text-[9px] font-black text-[#1e6d3a] bg-[#1e6d3a]/10 px-2 py-1 rounded-full uppercase">
                                                {plantingData.country}
                                            </span>
                                        )}
                                    </div>
                                    <input 
                                        className="w-full p-5 bg-slate-50 rounded-[1.5rem] font-bold outline-none border-2 border-transparent focus:border-[#1e6d3a] transition-colors text-[#141c2b]" 
                                        placeholder="e.g. Lincoln" 
                                        value={form.location_name}
                                        onChange={handleLocationSearch} 
                                        onBlur={() => setTimeout(() => setSuggestions([]), 200)}
                                    />
                                    
                                    {suggestions.length > 0 && (
                                        <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-slate-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] max-h-52 overflow-y-auto z-50">
                                            {suggestions.map((s, i) => (
                                                <div 
                                                    key={i} 
                                                    className="p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                                                    onClick={() => {
                                                        const locationStr = s.admin1 ? `${s.name}, ${s.admin1}` : `${s.name}, ${s.country}`;
                                                        setForm({...form, location_name: locationStr});
                                                        
                                                        setPlantingData(prev => ({
                                                            ...prev,
                                                            lat: s.latitude,
                                                            lng: s.longitude
                                                        }));
                                                        
                                                        setSuggestions([]);
                                                    }}
                                                >
                                                    <p className="font-bold text-[#141c2b]">{s.name}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                                                        {s.admin1 ? `${s.admin1}, ` : ''}{s.country}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button onClick={handlePlantSubmit} className="flex-1 py-5 bg-[#141c2b] text-white font-black rounded-[1.5rem] hover:bg-[#1e6d3a] transition-colors">CONFIRM</button>
                                    <button onClick={() => {
                                        setPlantingData(null);
                                        setSuggestions([]);
                                    }} className="px-8 py-5 bg-slate-100 text-slate-400 font-black rounded-[1.5rem] hover:bg-slate-200 transition-colors">BACK</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}