/* Phone shell — 390×N iOS-style with status bar at top and nav row at bottom.
   Children scroll content inside. */

function PhoneShell({ children, height = 1900, title = "Ачивки", showBack = true, screenLabel }) {
  return (
    <div data-screen-label={screenLabel} style={{
      width: 390, height,
      background: "#FAFBFF",
      position: "relative",
      borderRadius: 44,
      overflow: "hidden",
      boxShadow: "0 30px 60px -20px rgba(11,20,56,.35), 0 0 0 10px #0B1438, 0 0 0 11px #2A3158",
      fontFamily: "'Inter', system-ui, sans-serif",
      color: "#0B1438",
    }}>
      {/* Notch */}
      <div style={{
        position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
        width: 110, height: 32, borderRadius: 999, background: "#0B1438", zIndex: 100,
      }}/>
      {/* Status bar */}
      <div style={{
        height: 54, padding: "18px 30px 0", display: "flex", justifyContent: "space-between",
        alignItems: "center", fontSize: 15, fontWeight: 600, color: "#0B1438", letterSpacing: -.2,
      }}>
        <span>9:41</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {/* signal */}
          <svg width="17" height="11" viewBox="0 0 17 11"><g fill="#0B1438">
            <rect x="0" y="7" width="3" height="4" rx=".5"/>
            <rect x="4.5" y="5" width="3" height="6" rx=".5"/>
            <rect x="9" y="2.5" width="3" height="8.5" rx=".5"/>
            <rect x="13.5" y="0" width="3" height="11" rx=".5"/>
          </g></svg>
          {/* wifi */}
          <svg width="15" height="11" viewBox="0 0 15 11" fill="#0B1438">
            <path d="M7.5 0C4.5 0 1.9 1 0 2.7l1.4 1.5C2.9 2.9 5.1 2 7.5 2s4.6.9 6.1 2.2L15 2.7C13.1 1 10.5 0 7.5 0Zm0 4c-2 0-3.7.7-5 1.8L4 7.3c1-.8 2.2-1.3 3.5-1.3s2.5.5 3.5 1.3l1.5-1.5C11.2 4.7 9.5 4 7.5 4Zm0 4c-1 0-2 .3-2.7 1l2.7 2 2.7-2c-.7-.7-1.7-1-2.7-1Z"/>
          </svg>
          {/* battery */}
          <svg width="26" height="11" viewBox="0 0 26 11">
            <rect x=".5" y=".5" width="22" height="10" rx="3" fill="none" stroke="#0B1438" strokeOpacity=".4"/>
            <rect x="23" y="3.5" width="2" height="4" rx="1" fill="#0B1438" fillOpacity=".4"/>
            <rect x="2" y="2" width="16" height="7" rx="1.5" fill="#0B1438"/>
          </svg>
        </span>
      </div>

      {/* Header */}
      <div style={{
        height: 56, padding: "0 20px", display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "relative", zIndex: 10,
      }}>
        {showBack ? (
          <button style={{
            border: "none", background: "transparent", padding: 0, cursor: "pointer",
            width: 36, height: 36, display: "grid", placeItems: "center",
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M14 5L7.5 11L14 17" stroke="#0B1438" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ) : <div/>}
        <div style={{
          fontSize: 17, fontWeight: 700, letterSpacing: -.3,
        }}>{title}</div>
        <button style={{
          border: "none", background: "transparent", padding: 0, cursor: "pointer",
          width: 36, height: 36, display: "grid", placeItems: "center",
          fontSize: 18, color: "#4B5476",
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="9" stroke="#0B1438" strokeOpacity=".55" strokeWidth="1.8"/>
            <path d="M9 9a2 2 0 0 1 4 0c0 1.2-2 1.5-2 2.5M11 14.5v.5" stroke="#0B1438" strokeOpacity=".55" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Content area */}
      <div style={{
        height: height - 54 - 56,
        overflow: "hidden",
        position: "relative",
      }}>
        {children}
      </div>
    </div>
  );
}

window.PhoneShell = PhoneShell;
