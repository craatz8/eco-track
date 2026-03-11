const { useState, useEffect, useRef } = React;

const PillNav = ({
  logo,
  items,
  activeHref,
  pillColor = '#2e7d32', 
  baseColor = '#333',
  hoveredPillTextColor = '#fff'
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const circleRefs = useRef([]);
  const tlRefs = useRef([]);
  const activeTweenRefs = useRef([]);
  const logoImgRef = useRef(null);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    const layout = () => {
      circleRefs.current.forEach(circle => {
        if (!circle?.parentElement) return;
        const pill = circle.parentElement;
        const rect = pill.getBoundingClientRect();
        const { width: w, height: h } = rect;
        const R = ((w * w) / 4 + h * h) / (2 * h);
        const D = Math.ceil(2 * R) + 2;
        const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
        const originY = D - delta;

        circle.style.width = `${D}px`;
        circle.style.height = `${D}px`;
        circle.style.bottom = `-${delta}px`;

        gsap.set(circle, { xPercent: -50, scale: 0, transformOrigin: `50% ${originY}px` });
        const label = pill.querySelector('.pill-label');
        const white = pill.querySelector('.pill-label-hover');

        if (label) gsap.set(label, { y: 0 });
        if (white) gsap.set(white, { y: h + 12, opacity: 0 });

        const index = circleRefs.current.indexOf(circle);
        const tl = gsap.timeline({ paused: true });
        tl.to(circle, { scale: 1.2, xPercent: -50, duration: 0.4, ease: 'power2.out' }, 0);
        if (label) tl.to(label, { y: -(h + 8), duration: 0.4, ease: 'power2.out' }, 0);
        if (white) tl.to(white, { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }, 0);
        tlRefs.current[index] = tl;
      });
    };

    layout();
    window.addEventListener('resize', layout);
    return () => window.removeEventListener('resize', layout);
  }, [items]);

  const handleEnter = i => tlRefs.current[i]?.play();
  const handleLeave = i => tlRefs.current[i]?.reverse();

    return (
    <div className="pill-nav-container">
        <nav className="pill-nav">
        {/* 1. THE LEAF LOGO: Replaces the text logo to avoid squishing */}
        <div className="pill-logo">
            <span style={{ fontSize: '1.5rem' }}>🌿</span>
        </div>

        <div className="pill-nav-items desktop-only">
            <ul className="pill-list">
            {items.map((item, i) => (
                <li key={item.href || i}>
                <a 
                    href={item.href} 
                    className={`pill ${activeHref === item.href ? 'is-active' : ''} ${item.isUser ? 'user-pill' : ''}`}
                    onMouseEnter={() => handleEnter(i)}
                    onMouseLeave={() => handleLeave(i)}
                >
                    <span className="hover-circle" ref={el => (circleRefs.current[i] = el)} />
                    <span className="label-stack">
                    {/* These labels are swapped by GSAP in your layout() function */}
                    <span className="pill-label">{item.label}</span>
                    <span className="pill-label-hover">{item.label}</span>
                    </span>
                </a>
                </li>
            ))}
            </ul>
        </div>
        </nav>
    </div>
    );
};

window.PillNav = PillNav;