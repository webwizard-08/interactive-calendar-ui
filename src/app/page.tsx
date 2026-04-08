// page.tsx — Main Calendar Page
// यह पूरी app का main component है।
// इसमें calendar, date range selection, notes, themes और dark mode सब कुछ है।

"use client"; // यह Next.js को बताता है कि यह component browser में run होगा (client-side)

import Image from "next/image"; // Next.js का optimized image component
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// useCallback  = function को re-create होने से बचाता है
// useEffect    = side effects के लिए (localStorage, animations)
// useMemo      = heavy calculations को cache करता है
// useRef       = DOM element को directly access करने के लिए
// useState     = component का state manage करने के लिए

// ─────────────────────────────────────
// TYPE DEFINITIONS
// TypeScript में data का shape define करना
// ─────────────────────────────────────

// Range = selected date range (start और end date)
type Range = { start: Date | null; end: Date | null };

// Theme = तीन available themes
type Theme = "alpine" | "coast" | "sunset";

// ─────────────────────────────────────
// CONSTANTS — ये values कभी change नहीं होतीं
// ─────────────────────────────────────

// Calendar header में weekday names
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Theme switcher के लिए themes की list
const THEMES: { id: Theme; label: string; emoji: string }[] = [
  { id: "alpine", label: "Alpine", emoji: "🏔️" },
  { id: "coast",  label: "Coast",  emoji: "🌊" },
  { id: "sunset", label: "Sunset", emoji: "🌅" },
];

// हर theme के लिए floating particles का RGB color
const PARTICLE_COLORS: Record<Theme, string> = {
  alpine: "43,123,187",
  coast:  "42,157,143",
  sunset: "224,123,57",
};

// Indian public holidays — "MM-DD" format में
// key = date, value = holiday name (tooltip में दिखेगा)
const HOLIDAYS: Record<string, string> = {
  "01-26": "Republic Day",
  "03-25": "Holi",
  "04-14": "Ambedkar Jayanti",
  "04-18": "Good Friday",
  "05-01": "Labour Day",
  "08-15": "Independence Day",
  "10-02": "Gandhi Jayanti",
  "10-20": "Dussehra",
  "11-05": "Diwali",
  "12-25": "Christmas",
};

// ─────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────

// Date को "YYYY-MM-DD" string में convert करना
// जैसे: 2026-04-08
const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Date का time part हटाना (सिर्फ date compare करने के लिए)
// जैसे: 2026-04-08 14:30:00 → 2026-04-08 00:00:00
const normalize = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// दो dates same हैं या नहीं check करना
const isSameDay = (a: Date | null, b: Date | null) =>
  !!a && !!b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// Holiday check के लिए "MM-DD" format में key बनाना
const getHolidayKey = (d: Date) =>
  `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ─────────────────────────────────────
// CUSTOM HOOK: useLocalStorage
// localStorage में data save और load करना
// page refresh होने पर भी data बचा रहता है
// ─────────────────────────────────────
function useLocalStorage<T>(key: string, fallback: T): [T, (v: T | ((p: T) => T)) => void] {
  const [val, setVal] = useState<T>(fallback); // always start with fallback (SSR-safe)
  const [mounted, setMounted] = useState(false);

  // client mount होने के बाद localStorage से value load करो
  useEffect(() => {
    setMounted(true);
    try {
      const s = localStorage.getItem(key);
      if (s) setVal(JSON.parse(s));
    } catch {
      // ignore
    }
  }, [key]);

  // जब भी value change हो, localStorage में save करो (mount के बाद ही)
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(key, JSON.stringify(val));
  }, [key, val, mounted]);

  return [val, setVal];
}

// ─────────────────────────────────────
// COMPONENT: Particles
// Background में floating dots animate होते हैं
// HTML Canvas API use होती है
// ─────────────────────────────────────
function Particles({ theme }: { theme: Theme }) {
  const canvasRef = useRef<HTMLCanvasElement>(null); // canvas element का reference
  const colorRef  = useRef(PARTICLE_COLORS[theme]);  // current color (ref में रखा ताकि animation loop में latest color मिले)

  // theme change होने पर color update करो
  useEffect(() => {
    colorRef.current = PARTICLE_COLORS[theme];
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d"); // 2D drawing context
    if (!ctx) return;

    let raf: number; // requestAnimationFrame का ID (cleanup के लिए)

    // canvas को window size के बराबर करना
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // 38 random dots बनाना
    const dots = Array.from({ length: 38 }, () => ({
      x:  Math.random() * window.innerWidth,   // random x position
      y:  Math.random() * window.innerHeight,  // random y position
      r:  Math.random() * 3 + 1,               // random radius (1-4px)
      vx: (Math.random() - 0.5) * 0.4,         // random x velocity
      vy: (Math.random() - 0.5) * 0.4,         // random y velocity
      o:  Math.random() * 0.5 + 0.15,          // random opacity
    }));

    // हर frame में dots को move और draw करना
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height); // पिछला frame clear करो

      for (const d of dots) {
        // dot को move करो
        d.x += d.vx;
        d.y += d.vy;

        // screen के बाहर जाए तो दूसरी side से वापस आए (wrap around)
        if (d.x < 0) d.x = canvas.width;
        if (d.x > canvas.width) d.x = 0;
        if (d.y < 0) d.y = canvas.height;
        if (d.y > canvas.height) d.y = 0;

        // dot draw करो
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${colorRef.current},${d.o})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw); // अगला frame schedule करो
    };
    draw();

    // cleanup: component unmount होने पर animation और event listener हटाओ
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} id="particles-canvas" aria-hidden="true" />;
}

// ─────────────────────────────────────
// COMPONENT: TiltCard
// Mouse move पर card 3D में झुकता है
// ─────────────────────────────────────
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null); // card element का reference

  // mouse move पर tilt calculate करना
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;

    const { left, top, width, height } = el.getBoundingClientRect();

    // mouse position को -0.5 से 0.5 के बीच normalize करना
    const x = ((e.clientX - left) / width  - 0.5) * 10;  // Y-axis rotation
    const y = ((e.clientY - top)  / height - 0.5) * -10; // X-axis rotation

    el.style.transform = `perspective(900px) rotateY(${x}deg) rotateX(${y}deg) scale(1.01)`;
    el.style.boxShadow = `${-x * 2}px ${y * 2}px 60px rgba(21,24,31,0.18)`;
  };

  // mouse leave पर card को normal position पर वापस लाना
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg) scale(1)";
    el.style.boxShadow = "";
  };

  return (
    <div ref={ref} className={`tilt-card ${className ?? ""}`} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────
// MAIN COMPONENT: Home
// पूरा calendar page यहाँ render होता है
// ─────────────────────────────────────
export default function Home() {

  // आज की date (time हटाकर) — एक बार calculate होगी
  const today = useMemo(() => normalize(new Date()), []);

  // Time-based greeting और motivational subtitle
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning ☀️";
    if (hour < 17) return "Good afternoon 🌤️";
    if (hour < 21) return "Good evening 🌇";
    return "Good night 🌙";
  }, []);

  const subtitle = useMemo(() => {
    const day = new Date().getDay(); // 0 = Sunday, 6 = Saturday
    if (day === 0 || day === 6) return "It's the weekend — plan something fun.";
    if (day === 1) return "Fresh week, fresh start. Let's map it out.";
    if (day === 5) return "Friday! Wrap up the week, plan the next.";
    return "Pick your dates, jot your thoughts, own your month.";
  }, []);

  // currently दिख रहा month (default = current month का पहला दिन)
  const [activeMonth, setActiveMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );

  // selected date range (start और end)
  const [range, setRange] = useState<Range>({ start: null, end: null });

  // hover preview के लिए — user किस date पर hover कर रहा है
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // month flip animation state
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDir, setFlipDir]       = useState<"next" | "prev">("next");

  // click ripple effect के लिए — कौन सी date पर ripple दिखाना है
  const [rippleKey, setRippleKey] = useState<string | null>(null);

  // range days counter animation के लिए previous value track करना
  const [prevRangeDays, setPrevRangeDays] = useState(0);

  // dark/light toggle reveal animation state
  const [revealing, setRevealing]   = useState(false);
  const [revealDark, setRevealDark] = useState(false);
  const [revealPos, setRevealPos]   = useState({ x: "50%", y: "50%" });
  const toggleRef = useRef<HTMLButtonElement>(null);

  // localStorage में save होने वाली values
  const [monthNotes, setMonthNotes] = useLocalStorage<Record<string, string>>("wallcal-month-notes", {});
  const [rangeNotes, setRangeNotes] = useLocalStorage<Record<string, string>>("wallcal-range-notes", {});
  const [theme, setTheme]           = useLocalStorage<Theme>("wallcal-theme", "alpine");
  const [dark, setDark]             = useLocalStorage<boolean>("wallcal-dark", false);

  // current month की unique key (notes save करने के लिए)
  // जैसे: "2026-04"
  const monthKey = `${activeMonth.getFullYear()}-${String(activeMonth.getMonth() + 1).padStart(2, "0")}`;

  // selected range की unique key (range notes के लिए)
  // जैसे: "2026-04-01_2026-04-10"
  const rangeKey = range.start && range.end
    ? `${toKey(range.start)}_${toKey(range.end)}`
    : "";

  // current month और range के notes
  const monthNote = monthNotes[monthKey] ?? "";
  const rangeNote = rangeKey ? rangeNotes[rangeKey] ?? "" : "";

  // display के लिए month और year
  const monthLabel = activeMonth.toLocaleDateString("en-US", { month: "long" });
  const yearLabel  = activeMonth.getFullYear();

  // ─────────────────────────────────────
  // Calendar days array बनाना
  // 42 cells (6 rows × 7 cols) — blank cells + actual dates
  // ─────────────────────────────────────
  const calendarDays = useMemo(() => {
    const first   = new Date(activeMonth.getFullYear(), activeMonth.getMonth(), 1);
    const last    = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 0);

    // month का पहला दिन किस weekday पर है (Monday = 0)
    const leading = (first.getDay() + 6) % 7;

    // leading blank cells से शुरू करो
    const days: Array<Date | null> = Array(leading).fill(null);

    // actual dates add करो
    for (let d = 1; d <= last.getDate(); d++) {
      days.push(new Date(activeMonth.getFullYear(), activeMonth.getMonth(), d));
    }

    // 42 cells पूरे करने के लिए trailing blanks
    while (days.length < 42) days.push(null);

    return days;
  }, [activeMonth]);

  // ─────────────────────────────────────
  // Month change handler (Prev/Next buttons)
  // flip animation के साथ
  // ─────────────────────────────────────
  const changeMonth = useCallback((dir: "next" | "prev") => {
    if (isFlipping) return; // animation चल रही हो तो ignore करो

    setFlipDir(dir);
    setIsFlipping(true);

    // animation complete होने के बाद month change करो
    setTimeout(() => {
      setActiveMonth((m) => new Date(m.getFullYear(), m.getMonth() + (dir === "next" ? 1 : -1), 1));
      setIsFlipping(false);
    }, 360);
  }, [isFlipping]);

  // ─────────────────────────────────────
  // Day click handler
  // पहली click = start date, दूसरी click = end date
  // ─────────────────────────────────────
  const handleDayClick = (date: Date) => {
    // ripple animation trigger करो
    const key = toKey(date);
    setRippleKey(key);
    setTimeout(() => setRippleKey(null), 460);

    setRange((prev) => {
      // अगर कोई selection नहीं है या range complete है → नई start date set करो
      if (!prev.start || (prev.start && prev.end)) {
        return { start: date, end: null };
      }
      // अगर clicked date start से पहले है → नई start date set करो
      if (normalize(date).getTime() < normalize(prev.start).getTime()) {
        return { start: date, end: null };
      }
      // otherwise → end date set करो (range complete)
      return { start: prev.start, end: date };
    });
  };

  // date range के अंदर है या नहीं check करना
  const isInRange = (date: Date) => {
    if (!range.start || !range.end) return false;
    const t = normalize(date).getTime();
    return t >= normalize(range.start).getTime() && t <= normalize(range.end).getTime();
  };

  // hover preview range check (start select के बाद hover पर)
  const isInHoverRange = (date: Date) => {
    if (!range.start || range.end || !hoverDate) return false;
    const t = normalize(date).getTime();
    const s = normalize(range.start).getTime();
    const h = normalize(hoverDate).getTime();
    return h >= s && t > s && t <= h;
  };

  // selected range में कितने दिन हैं
  const rangeDays = range.start && range.end
    ? Math.round(Math.abs(
        (normalize(range.end).getTime() - normalize(range.start).getTime()) / 86400000
      )) + 1
    : 0;

  // range days change होने पर counter animation trigger करना
  useEffect(() => {
    if (rangeDays !== prevRangeDays) setPrevRangeDays(rangeDays);
  }, [rangeDays, prevRangeDays]);

  // ─────────────────────────────────────
  // Dark/Light toggle handler
  // button की position से circular reveal animation
  // ─────────────────────────────────────
  const handleDarkToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    // button की screen position निकालो
    const rect = e.currentTarget.getBoundingClientRect();
    const x = `${rect.left + rect.width / 2}px`;
    const y = `${rect.top  + rect.height / 2}px`;

    // reveal animation की origin position set करो
    setRevealPos({ x, y });
    setRevealDark(!dark); // कौन सा reveal दिखाना है
    setRevealing(true);

    // animation के बाद actual theme change करो
    setTimeout(() => {
      setDark((d) => !d);
      setRevealing(false);
    }, 280);
  };

  // ─────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────
  return (
    <>
      {/* Background floating particles */}
      <Particles theme={theme} />

      {/* Dark/Light circular reveal overlay
          toggle click होने पर screen पर circle expand होता है */}
      {revealing && (
        <div
          className={`theme-reveal expanding ${revealDark ? "dark-reveal" : "light-reveal"}`}
          style={{
            "--reveal-x": revealPos.x,
            "--reveal-y": revealPos.y,
          } as React.CSSProperties}
        />
      )}

      {/* Main wrapper — theme और dark mode data attributes यहाँ लगते हैं
          CSS इन्हें read करके colors change करती है */}
      <div
        className="relative min-h-screen w-full transition-all duration-700"
        data-theme={theme}
        data-dark={dark ? "true" : "false"}
        style={{ background: "var(--bg-gradient)" }}
      >
        <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 sm:pt-10">

          {/* ── HEADER ── */}
          <header className="fade-up flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">{greeting}</p>
              <h1 className="font-display text-3xl text-[var(--ink)] sm:text-5xl">Your Wall Calendar.</h1>
              <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
            </div>

            <div className="flex items-center gap-3">

              {/* Theme switcher buttons (Alpine / Coast / Sunset) */}
              <div className="flex items-center gap-1 rounded-full border border-[var(--ring)] bg-[var(--paper)]/80 px-2 py-1.5 backdrop-blur-sm">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    className={`theme-btn rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                      theme === t.id
                        ? "active bg-[var(--accent)] text-white shadow-sm"
                        : "text-[var(--muted)] hover:text-[var(--ink)]"
                    }`}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>

              {/* Dark / Light mode toggle button */}
              <button
                ref={toggleRef}
                type="button"
                aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
                onClick={handleDarkToggle}
                className={`dark-toggle ${dark ? "dark-mode" : "light-mode"}`}
              >
                {/* Dark mode में दिखने वाले stars */}
                <span className="dark-toggle-stars" aria-hidden="true">
                  <span style={{ width: 3, height: 3 }} />
                  <span style={{ width: 2, height: 2 }} />
                  <span style={{ width: 3, height: 3 }} />
                </span>
                {/* Sliding thumb — ☀️ या 🌙 */}
                <span className="dark-toggle-thumb">
                  {dark ? "🌙" : "☀️"}
                </span>
              </button>
            </div>
          </header>

          {/* ── MAIN GRID: Calendar + Notes ── */}
          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">

            {/* ── CALENDAR CARD ── */}
            <TiltCard className="fade-up overflow-hidden rounded-[28px] border border-[var(--ring)] bg-[var(--paper)]/95 backdrop-blur-sm">

              {/* Spiral binding rings (decorative) */}
              <div className="flex items-center justify-center gap-[9px] bg-[var(--paper-strong)] py-3 px-6">
                {Array.from({ length: 18 }).map((_, i) => (
                  <span key={i} className="spiral-ring" />
                ))}
              </div>

              {/* Hero image + month/year overlay + wave divider */}
              <div className="relative">
                <div className="relative h-[220px] w-full overflow-hidden sm:h-[260px]">
                  <Image src="/hero.svg" alt="Calendar hero" fill className="object-cover" priority />

                  {/* Bottom-right diagonal overlay with month name */}
                  <div
                    className="absolute bottom-0 right-0 flex flex-col items-end justify-end px-6 py-4 transition-all duration-500"
                    style={{ background: "linear-gradient(135deg, transparent 38%, var(--wave-fill) 38%)" }}
                  >
                    <span className="text-sm font-light tracking-widest text-white/90">{yearLabel}</span>
                    <span className="font-display text-3xl font-bold uppercase tracking-wide text-white sm:text-4xl">
                      {monthLabel}
                    </span>
                  </div>
                </div>

                {/* Animated SVG wave divider between image and calendar */}
                <div className="relative -mt-1 w-full overflow-hidden leading-none">
                  <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="w-full" style={{ height: 52, display: "block" }}>
                    {/* Solid wave background */}
                    <path d="M0,0 L0,60 L1200,60 L1200,0 L900,50 L600,0 L300,50 Z" fill="var(--wave-fill)" />
                    {/* Animated foreground wave */}
                    <path className="wave-path" d="M0,60 L300,10 L600,60 L900,10 L1200,60 L1200,60 L0,60 Z" fill="var(--paper)" />
                  </svg>
                </div>
              </div>

              {/* Calendar grid — flip animation class लगती है */}
              <div
                className={`px-5 pb-6 pt-2 sm:px-6 ${
                  isFlipping
                    ? flipDir === "next" ? "page-flip-exit" : "page-flip-enter"
                    : "page-flip-enter"
                }`}
              >
                {/* Month navigation */}
                <div className="mb-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => changeMonth("prev")}
                    className="nav-btn rounded-full border border-[var(--ring)] px-4 py-1.5 text-sm text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent-dark)]"
                    style={{ "--nudge": "-2px" } as React.CSSProperties}
                  >
                    ← Prev
                  </button>
                  <p className="font-display text-xl text-[var(--ink)]">{monthLabel} {yearLabel}</p>
                  <button
                    type="button"
                    onClick={() => changeMonth("next")}
                    className="nav-btn rounded-full border border-[var(--ring)] px-4 py-1.5 text-sm text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent-dark)]"
                    style={{ "--nudge": "2px" } as React.CSSProperties}
                  >
                    Next →
                  </button>
                </div>

                {/* Weekday headers (Mon-Sun) — Sat/Sun accent color में */}
                <div className="grid grid-cols-7 text-center text-xs font-semibold uppercase tracking-wider">
                  {WEEKDAYS.map((d, i) => (
                    <div key={d} className={`py-2 ${i >= 5 ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                      {d}
                    </div>
                  ))}
                </div>

                {/* Date cells grid */}
                <div className="grid grid-cols-7 gap-1 pt-1">
                  {calendarDays.map((date, idx) => {
                    // blank cell (leading/trailing)
                    if (!date) return <div key={`b-${idx}`} className="h-10 sm:h-12" />;

                    // हर date के लिए states calculate करो
                    const isToday   = isSameDay(date, today);
                    const isStart   = isSameDay(date, range.start);
                    const isEnd     = isSameDay(date, range.end);
                    const inRange   = isInRange(date);
                    const inHover   = isInHoverRange(date);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    const holiday   = HOLIDAYS[getHolidayKey(date)];
                    const key       = toKey(date);
                    const hasRipple = rippleKey === key; // इस date पर ripple दिखाना है?

                    return (
                      <button
                        key={key}
                        type="button"
                        title={holiday} // hover पर holiday name tooltip
                        onClick={() => handleDayClick(date)}
                        onMouseEnter={() => setHoverDate(date)}
                        onMouseLeave={() => setHoverDate(null)}
                        className={[
                          "day-btn relative flex h-10 w-full items-center justify-center rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] sm:h-12",
                          // background color based on state
                          isStart || isEnd
                            ? "day-start bg-[var(--accent)] text-white shadow-lg"
                            : inRange
                            ? "day-in-range bg-[var(--accent-soft)] text-[var(--ink)]"
                            : inHover
                            ? "day-in-hover"
                            : "text-[var(--ink)] hover:bg-[var(--accent-soft)]",
                          // weekends को accent color में
                          isWeekend && !isStart && !isEnd ? "font-semibold text-[var(--accent-dark)]" : "",
                          // ripple class
                          hasRipple ? "ripple" : "",
                        ].join(" ")}
                      >
                        {/* Today indicator dot */}
                        {isToday && !isStart && !isEnd && (
                          <span className="today-dot absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[var(--accent)]" />
                        )}

                        {/* Date number */}
                        {date.getDate()}

                        {/* Holiday dot */}
                        {holiday && <span className="holiday-dot" />}
                      </button>
                    );
                  })}
                </div>

                {/* Selected range summary bar */}
                <div className="range-bar-enter mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--ring)] bg-[var(--paper-strong)] px-4 py-3 text-sm">
                  <div>
                    <p className="text-xs text-[var(--muted)]">Selected range</p>
                    <p className="font-semibold text-[var(--ink)]">
                      {range.start ? toKey(range.start) : "Pick a start date"}
                      {range.end ? ` → ${toKey(range.end)}` : ""}
                    </p>
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />Start/End
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)]" />Between
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-400" />Holiday
                    </span>
                  </div>
                </div>
              </div>
            </TiltCard>

            {/* ── NOTES SIDEBAR ── */}
            <aside className="aside-card fade-up-delay card-shadow flex flex-col gap-5 rounded-[28px] border border-[var(--ring)] bg-[var(--paper)]/95 p-5 backdrop-blur-sm sm:p-6">

              {/* Notes header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Your Notes</p>
                  <h2 className="font-display text-2xl text-[var(--ink)]">What's on your mind?</h2>
                </div>
                <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase text-[var(--accent-dark)]">
                  Auto-saved
                </span>
              </div>

              {/* Month notes textarea — हर month के लिए अलग note */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  📝 {monthLabel} {yearLabel} — Monthly goals
                </label>
                <textarea
                  className="note-area min-h-[130px] w-full resize-none rounded-2xl border border-[var(--ring)] bg-white px-4 py-3 text-sm text-[var(--ink)] shadow-sm"
                  placeholder={`What do you want to achieve in ${monthLabel}? Write your goals, reminders, or anything on your mind...`}
                  value={monthNote}
                  onChange={(e) => setMonthNotes((p) => ({ ...p, [monthKey]: e.target.value }))}
                />
              </div>

              {/* Range notes — selected range के लिए note */}
              <div className="flex flex-col gap-2 rounded-2xl border border-[var(--ring)] bg-[var(--note)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-dark)]">📌 Range note</p>
                <p className="text-xs text-[var(--muted)]">
                  {range.start && range.end
                    ? `📅 ${toKey(range.start)} → ${toKey(range.end)}`
                    : "👆 Select a start & end date on the calendar first."}
                </p>
                <textarea
                  className="note-area min-h-[100px] w-full resize-none rounded-xl border border-[var(--ring)] bg-white px-3 py-2 text-sm text-[var(--ink)] shadow-sm disabled:opacity-40"
                  placeholder="What's happening in this period? A trip, a project, a deadline..."
                  value={rangeNote}
                  disabled={!range.start || !range.end} // range select नहीं है तो disabled
                  onChange={(e) => {
                    if (!rangeKey) return;
                    setRangeNotes((p) => ({ ...p, [rangeKey]: e.target.value }));
                  }}
                />
              </div>

              {/* Stats / Highlights section */}
              <div className="rounded-2xl border border-[var(--ring)] bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">✨ Highlights</p>
                <ul className="mt-3 space-y-2.5 text-sm">

                  {/* Today's date */}
                  <li className="flex items-center justify-between">
                    <span className="text-[var(--ink)]">Today</span>
                    <span className="rounded-full border border-[var(--accent)] px-2 py-0.5 text-xs text-[var(--accent-dark)]">
                      {toKey(today)}
                    </span>
                  </li>

                  {/* Range days count — key prop से re-animate होगा */}
                  <li className="flex items-center justify-between">
                    <span className="text-[var(--ink)]">Range days</span>
                    <span
                      key={rangeDays}
                      className={`counter-pop rounded-full px-2 py-0.5 text-xs text-white ${
                        rangeDays > 0 ? "bg-[var(--accent)]" : "bg-[var(--muted)]"
                      }`}
                    >
                      {rangeDays > 0 ? `${rangeDays} days` : "—"}
                    </span>
                  </li>

                  {/* Weekends info */}
                  <li className="flex items-center justify-between">
                    <span className="text-[var(--ink)]">Weekends</span>
                    <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs text-[var(--accent-dark)]">
                      Sat + Sun
                    </span>
                  </li>

                  {/* Holidays info */}
                  <li className="flex items-center justify-between">
                    <span className="text-[var(--ink)]">Holidays</span>
                    <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Marked
                    </span>
                  </li>
                </ul>
              </div>

              {/* Clear selection button — range select होने पर दिखता है */}
              {(range.start || range.end) && (
                <button
                  type="button"
                  onClick={() => setRange({ start: null, end: null })}
                  className="clear-btn rounded-full border border-[var(--ring)] py-2 text-sm text-[var(--muted)] hover:border-red-300 hover:text-red-500"
                >
                  ✕ Clear selection & start over
                </button>
              )}
            </aside>
          </section>
        </main>
      </div>
    </>
  );
}
