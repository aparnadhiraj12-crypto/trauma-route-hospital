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
};

const RESOURCE_LABELS = {
  otSlots: "OT Slots (Theatres Free)",
};

const NAV_ITEMS = [
  { key: "overview", label: "Overview" },
  { key: "alerts", label: "Ambulance Alerts", live: true },
  { key: "beds", label: "Bed & Specialty Management" },
  { key: "patients", label: "Patients", disabled: true },
  { key: "departments", label: "Departments", disabled: true },
  { key: "settings", label: "Settings", disabled: true },
];

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
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${activeTab === item.key ? "active" : ""} ${item.disabled ? "disabled" : ""}`}
              onClick={() => !item.disabled && setActiveTab(item.key)}
              disabled={item.disabled}
            >
              <span className="nav-label">{item.label}</span>
              {item.key === "alerts" && pendingCount > 0 && (
                <span className="nav-badge">{pendingCount}</span>
              )}
              {item.disabled && <span className="nav-soon">Soon</span>}
            </button>
          ))}
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
        </header>

        <main className="content-area">
          {activeTab === "overview" && (
            <div className="overview-grid">
              <div className="stat-card">
                <span className="stat-value">{availableSpecialties}</span>
                <span className="stat-label">Specialties Available</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{totalBeds}</span>
                <span className="stat-label">Total Beds Free</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{selectedHospital.resources.otSlots}</span>
                <span className="stat-label">OT Slots Free</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{pendingCount}</span>
                <span className="stat-label">Pending Alerts</span>
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

