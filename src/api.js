const BASE_URL = import.meta.env.VITE_SERVER_URL;

export async function getHospitals() {
  const res = await fetch(`${BASE_URL}/api/hospitals`);
  if (!res.ok) throw new Error("Failed to fetch hospitals");
  return res.json();
}

export async function acceptAlert(alertId) {
  const res = await fetch(`${BASE_URL}/api/alerts/${alertId}/accept`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to accept alert");
  return res.json();
}