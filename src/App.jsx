import { useState, useEffect } from "react";
import "./App.css";
import { getHospitals, acceptAlert } from "./api";
import socket from "./socket";
import { MOCK_HOSPITALS } from "./data/mockHospital";

const SPECIALTY_LABELS = {
  neurosurgery: "Neurosurgery",
  burnUnit: "Burn Unit",
  cardiothoracic: "Cardiothoracic",
  cardiology: "Cardiology",
  orthopedics: "Orthopedics",
  generalSurgery: "General Surgery",
  plasticSurgery: "Plastic Surgery",
  forensicExam: "Forensic Exam",
  gynecology: "Gynecology",
  psychiatricSupport: "Psychiatric Support",
};

const RESOURCE_LABELS = {
  otSlots: "OT Slots (Theatres Free)",
};

/* ---------- Icons (inline, no external icon library needed) ---------- */

function IconGrid({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconBell({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}

function IconBed({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M13 13v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v7" />
      <path d="M3 13h18" />
      <path d="M3 18h18" />
      <path d="M5 11V6" />
    </svg>
  );
}

function IconUsers({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
      <path d="M17 3.13a4 4 0 0 1 0 7.75" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  );
}

function IconBuilding({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 9h.01" /><path d="M9 13h.01" /><path d="M9 17h.01" />
      <path d="M15 9h.01" /><path d="M15 13h.01" /><path d="M15 17h.01" />
    </svg>
  );
}

function IconSettings({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconActivity({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

const NAV_ITEMS = [
  { key: "overview", label: "Overview", icon: IconGrid },
  { key: "alerts", label: "Ambulance Alerts", icon: IconBell, live: true },
  { key: "beds", label: "Bed & Specialty Management", icon: IconBed },
  { key: "patients", label: "Patients", icon: IconUsers, disabled: true },
  { key: "departments", label: "Departments", icon: IconBuilding, disabled: true },
  { key: "settings", label: "Settings", icon: IconSettings, disabled: true },
];

/* ---------- Small chart components, driven by real hospital data ---------- */

function DonutChart({ value, max, color, caption }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const offset = circumference * (1 - pct);

  return (
    <div className="donut-wrap">
      <svg className="donut-svg" viewBox="0 0 140 140">
        <circle className="donut-track" cx="70" cy="70" r={radius} />
        <circle
          className="donut-value"
          cx="70"
          cy="70"
          r={radius}
          style={{
            stroke: color,
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="donut-center">
        <span className="donut-number">{value}/{max}</span>
        <span className="donut-caption">{caption}</span>
      </div>
    </div>
  );
}

function SpecialtyBars({ specialties }) {
  const entries = Object.entries(SPECIALTY_LABELS).map(([key, label]) => ({
    key,
    label,
    value: specialties[key] || 0,
  }));
  const max = Math.max(1, ...entries.map((e) => e.value));

  return (
    <div className="bars-list">
      {entries.map((e) => (
        <div className="bar-row" key={e.key}>
          <span className="bar-label">{e.label}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: `${(e.value / max) * 100}%`,
                background: e.value > 0 ? "var(--accent)" : "var(--line)",
              }}
            />
          </div>
          <span className="bar-value">{e.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [hospitals, setHospitals] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const selectedHospital = hospitals.find((h) => h.id === selectedId);
  const pendingCount = alerts.filter((a) => a.status === "pending").length;

  useEffect(() => {
    getHospitals()
      .then((data) => {
        setHospitals(data);
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .catch(() => {
        setHospitals(MOCK_HOSPITALS);
        setSelectedId(MOCK_HOSPITALS[0].id);
        setUsingMockData(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleStatusChanged(updated) {
      setHospitals((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
    }
    socket.on("hospital:statusChanged", handleStatusChanged);
    return () => socket.off("hospital:statusChanged", handleStatusChanged);
  }, []);

  useEffect(() => {
    function handleNewAlert(alert) {
      if (alert.hospitalId === selectedId) {
        setAlerts((prev) => [alert, ...prev]);
      }
    }
    socket.on("alert:new", handleNewAlert);
    return () => socket.off("alert:new", handleNewAlert);
  }, [selectedId]);

  function adjustSpecialtyBeds(key, delta) {
    if (!selectedHospital) return;
    const newValue = Math.max(0, (selectedHospital.specialties[key] || 0) + delta);

    setHospitals((prev) =>
      prev.map((h) =>
        h.id === selectedId
          ? { ...h, specialties: { ...h.specialties, [key]: newValue } }
          : h
      )
    );

    if (!usingMockData) {
      socket.emit("hospital:updateStatus", {
        hospitalId: selectedId,
        specialties: { [key]: newValue },
      });
    }
  }

  function adjustResource(key, delta) {
    if (!selectedHospital) return;
    const newValue = Math.max(0, (selectedHospital.resources[key] || 0) + delta);

    setHospitals((prev) =>
      prev.map((h) =>
        h.id === selectedId
          ? { ...h, resources: { ...h.resources, [key]: newValue } }
          : h
      )
    );

    if (!usingMockData) {
      socket.emit("hospital:updateStatus", {
        hospitalId: selectedId,
        resources: { [key]: newValue },
      });
    }
  }

  async function handleAccept(alertId) {
    try {
      await acceptAlert(alertId);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: "accepted" } : a))
      );
    } catch (err) {
      console.error("Failed to accept alert:", err);
    }
  }

  if (loading) return <div className="page">Loading hospitals...</div>;
  if (!selectedHospital) return <div className="page">No hospital data available.</div>;

  const totalBeds = Object.values(selectedHospital.specialties).reduce((a, b) => a + b, 0);
  const totalSpecialties = Object.keys(SPECIALTY_LABELS).length;
  const availableSpecialties = Object.values(selectedHospital.specialties).filter((v) => v > 0).length;

  return (
    <div className="dashboard-shell">
      {/* SIDEBAR NAV */}
      <nav className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">TL</span>
          <span className="brand-name">TraumaLink<br /><small>Hospital Console</small></span>
        </div>

        <div className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={`nav-item ${activeTab === item.key ? "active" : ""} ${item.disabled ? "disabled" : ""}`}
                onClick={() => !item.disabled && setActiveTab(item.key)}
                disabled={item.disabled}
              >
                <Icon className="nav-icon" />
                <span className="nav-label">{item.label}</span>
                {item.key === "alerts" && pendingCount > 0 && (
                  <span className="nav-badge">{pendingCount}</span>
                )}
                {item.disabled && <span className="nav-soon">Soon</span>}
              </button>
            );
          })}
        </div>

        <div className="sidebar-footer">
          <span className={`connection-dot ${usingMockData ? "offline" : "online"}`} />
          {usingMockData ? "Mock data (offline)" : "Connected"}
        </div>
      </nav>

      {/* MAIN AREA */}
      <div className="main-area">
        <header className="topbar">
          <h1>{NAV_ITEMS.find((n) => n.key === activeTab)?.label}</h1>
          <div className="topbar-right">
            <button
              className="icon-btn"
              aria-label="Pending ambulance alerts"
              onClick={() => setActiveTab("alerts")}
            >
              <IconBell className="icon-btn-icon" />
              {pendingCount > 0 && <span className="icon-btn-badge">{pendingCount}</span>}
            </button>
            <select
              className="hospital-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        </header>

        <main className="content-area">
          {activeTab === "overview" && (
            <div className="overview-layout">
              <div className="overview-main">
                <div className="stat-cards-grid">
                  <div className="stat-card">
                    <span className="stat-icon"><IconBuilding /></span>
                    <span className="stat-body">
                      <span className="stat-value">{availableSpecialties}</span>
                      <span className="stat-label">Specialties Available</span>
                    </span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon"><IconBed /></span>
                    <span className="stat-body">
                      <span className="stat-value">{totalBeds}</span>
                      <span className="stat-label">Total Beds Free</span>
                    </span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon"><IconActivity /></span>
                    <span className="stat-body">
                      <span className="stat-value">{selectedHospital.resources.otSlots}</span>
                      <span className="stat-label">OT Slots Free</span>
                    </span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon"><IconBell /></span>
                    <span className="stat-body">
                      <span className="stat-value">{pendingCount}</span>
                      <span className="stat-label">Pending Alerts</span>
                    </span>
                  </div>
                </div>

                <div className="panel overview-hospital-info">
                  <h2>{selectedHospital.name}</h2>
                  <p className="dim">Live status snapshot — switch to "Bed & Specialty Management" to edit.</p>
                  <div className="specialty-chip-row">
                    {Object.entries(SPECIALTY_LABELS).map(([key, label]) => {
                      const beds = selectedHospital.specialties[key] || 0;
                      return (
                        <span key={key} className={`chip ${beds > 0 ? "on" : "off"}`}>
                          {label} · {beds}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              <aside className="overview-sidebar">
                <div className="panel chart-panel">
                  <h2>Specialty Availability</h2>
                  <div className="donut-row">
                    <DonutChart
                      value={availableSpecialties}
                      max={totalSpecialties}
                      color="var(--accent)"
                      caption="specialties open"
                    />
                    <div className="donut-legend">
                      <span className="donut-legend-item">
                        <span className="donut-legend-dot" style={{ background: "var(--accent)" }} />
                        {availableSpecialties} available
                      </span>
                      <span className="donut-legend-item">
                        <span className="donut-legend-dot" style={{ background: "var(--panel-soft)", border: "1px solid var(--line)" }} />
                        {totalSpecialties - availableSpecialties} unavailable
                      </span>
                    </div>
                  </div>
                </div>

                <div className="panel chart-panel">
                  <h2>Beds by Specialty</h2>
                  <SpecialtyBars specialties={selectedHospital.specialties} />
                </div>
              </aside>
            </div>
          )}

          {activeTab === "beds" && (
            <div className="beds-grid">
              <section className="panel">
                <h2>Specialties (beds available)</h2>
                <div className="specialty-list">
                  {Object.entries(SPECIALTY_LABELS).map(([key, label]) => {
                    const beds = selectedHospital.specialties[key] || 0;
                    const available = beds > 0;
                    return (
                      <div key={key} className="specialty-row">
                        <div className="specialty-info">
                          <span className="specialty-name">{label}</span>
                          <span className={`specialty-badge ${available ? "on" : "off"}`}>
                            {available ? "Available" : "Unavailable"}
                          </span>
                        </div>
                        <div className="counter">
                          <button onClick={() => adjustSpecialtyBeds(key, -1)}>−</button>
                          <span className="count">{beds}</span>
                          <button onClick={() => adjustSpecialtyBeds(key, 1)}>+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="panel">
                <h2>Resources</h2>
                <div className="resource-list">
                  {Object.entries(RESOURCE_LABELS).map(([key, label]) => (
                    <div key={key} className="resource-row">
                      <span>{label}</span>
                      <div className="counter">
                        <button onClick={() => adjustResource(key, -1)}>−</button>
                        <span className="count">{selectedHospital.resources[key]}</span>
                        <button onClick={() => adjustResource(key, 1)}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === "alerts" && (
            <div className="panel alerts-panel-full">
              <h2>
                Incoming Ambulance Alerts
                {pendingCount > 0 && <span className="pending-badge">{pendingCount}</span>}
              </h2>
              {alerts.length === 0 && <p className="dim">No alerts yet.</p>}
              <div className="alerts-grid">
                {alerts.map((alert) => (
                  <div key={alert.id} className={`alert-card ${alert.status}`}>
                    <div className="alert-top">
                      <strong>ETA: {alert.eta} min</strong>
                      <span className="status-tag">{alert.status}</span>
                    </div>
                    <div className="alert-injuries">{alert.injuries.join(", ")}</div>
                    {alert.vitals && Object.keys(alert.vitals).length > 0 && (
                      <div className="alert-vitals">
                        {alert.vitals.systolic && (
                          <span>BP: {alert.vitals.systolic}/{alert.vitals.diastolic} </span>
                        )}
                        {alert.vitals.heartRate && <span>HR: {alert.vitals.heartRate}bpm </span>}
                        {alert.vitals.spo2 && <span>SpO2: {alert.vitals.spo2}% </span>}
                      </div>
                    )}
                    {alert.status === "pending" && (
                      <button className="accept-btn" onClick={() => handleAccept(alert.id)}>
                        Accept
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}