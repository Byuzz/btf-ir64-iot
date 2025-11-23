if (typeof CONFIG === 'undefined')
    console.error("Error: config.js belum dimuat!");

// ==========================================
// A. SETUP MAP
// ==========================================
const map = L.map('gps-map').setView([-8.178842, 113.726170], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let marker;
let pathLine;
let pathCoords = [];

const gpsIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    shadowSize: [41, 41]
});

// ==========================================
// B. UPDATE MAP & UI
// ==========================================
function updateGPS(lat, lng) {
    document.getElementById('current-latitude').innerText = lat.toFixed(6);
    document.getElementById('current-longitude').innerText = lng.toFixed(6);

    document.getElementById('gps-status').innerText = "Terkunci (3D Fix)";
    document.getElementById('last-update').innerText = "Updated: " + new Date().toLocaleTimeString();

    const newLatLng = [lat, lng];

    if (!marker) {
        marker = L.marker(newLatLng, {icon: gpsIcon}).addTo(map);
    } else {
        marker.setLatLng(newLatLng);
    }

    pathCoords.push(newLatLng);
    if (pathCoords.length > 50) pathCoords.shift();

    if (!pathLine) {
        pathLine = L.polyline(pathCoords, {color: 'blue', weight: 4}).addTo(map);
    } else {
        pathLine.setLatLngs(pathCoords);
    }

    map.panTo(newLatLng);
}

// ==========================================
// C. LOCAL STORAGE
// ==========================================
const GPS_KEY = "weathertech_last_gps";

function saveGPS(lat, lng) {
    localStorage.setItem(GPS_KEY, JSON.stringify({lat, lng}));
}

function loadCachedGPS() {
    const cached = localStorage.getItem(GPS_KEY);
    if (cached) {
        const data = JSON.parse(cached);
        updateGPS(data.lat, data.lng);
    }
}

// ==========================================
// D. FETCH API (TANPA MQTT)
// ==========================================
async function loadGPSFromAPI() {
    try {
        const res = await fetch(CONFIG.api_latest_sensor_system);
        const data = await res.json();

        if (!data.latitude || !data.longitude) return;

        const lat = parseFloat(data.latitude);
        const lng = parseFloat(data.longitude);

        if (lat !== 0 && lng !== 0) {
            saveGPS(lat, lng);
            updateGPS(lat, lng);
        }
    } catch (e) {
        console.error("GPS API Error:", e);
    }
}

loadCachedGPS();

// Update setiap 3 detik
setInterval(loadGPSFromAPI, 3000);
loadGPSFromAPI();
