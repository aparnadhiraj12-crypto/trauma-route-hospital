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

export default function App() {
  const [hospitals, setHospitals] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);

  const selectedHospital = hospitals.find((h) => h.id === selectedId);

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

  return (
    <div className="app-shell">
      <header className="dash-header">
        <h1>🏥 Hospital Dashboard</h1>
        {usingMockData && (
          <p className="mock-warning">⚠️ Using mock data — server not connected</p>
        )}
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {hospitals.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </header>

      {selectedHospital && (
        <div className="dash-grid">
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

          <section className="panel alerts-panel">
            <h2>🚨 Incoming Alerts</h2>
            {alerts.length === 0 && <p className="dim">No alerts yet.</p>}
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
          </section>
        </div>
      )}
    </div>
  );
}