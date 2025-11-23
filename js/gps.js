if (typeof CONFIG === 'undefined') console.error("Error: config.js belum dimuat!");

// ==========================================
// A. SETUP PETA (LEAFLET)
// ==========================================

const map = L.map('gps-map').setView([-8.178842, 113.726170], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let marker = null; // Marker awal
let pathLine = null; // Jejak
let pathCoords = []; // Jejak sementara (reset saat refresh, atau ambil dari history jika mau)

const gpsIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// ==========================================
// B. FUNGSI UTAMA: POLLING DATABASE
// ==========================================

async function fetchGPSData() {
    try {
        // Ambil data sistem sensor node terbaru (Array 10 data)
        const response = await fetch(CONFIG.api_latest_sensor_system); 
        if (!response.ok) throw new Error("HTTP Error " + response.status);

        const dataArray = await response.json();

        // Cek Validitas Array
        if (Array.isArray(dataArray) && dataArray.length > 0) {
            // AMBIL DATA TERBARU (Index 0)
            const latestData = dataArray[0];

            // Pastikan ada koordinat dan bukan 0
            if (latestData.latitude && latestData.longitude && latestData.latitude !== 0) {
                updateGPSUI(latestData);
                updateMap(latestData.latitude, latestData.longitude);
            }
        }

    } catch (error) {
        console.error("❌ Gagal Polling Data GPS:", error);
    }
}

// ==========================================
// C. LOGIKA UPDATE PETA & UI
// ==========================================

function updateMap(lat, lng) {
    const newLatLng = [lat, lng];

    // 1. Update Marker
    if (!marker) {
        marker = L.marker(newLatLng, {icon: gpsIcon}).addTo(map);
    } else {
        marker.setLatLng(newLatLng);
    }

    // 2. Update Jejak (Opsional: Menggambar garis selama halaman dibuka)
    // Kita tidak simpan ke localStorage lagi, jadi jejak reset setiap refresh
    // (Sesuai permintaan Anda untuk 'langsung akses database')
    pathCoords.push(newLatLng);
    if (pathCoords.length > 50) pathCoords.shift(); // Batasi 50 titik
    
    if (!pathLine) {
        pathLine = L.polyline(pathCoords, {color: 'blue', weight: 4, opacity: 0.7}).addTo(map);
    } else {
        pathLine.setLatLngs(pathCoords);
    }

    // 3. Fokus Kamera ke Lokasi
    map.panTo(newLatLng);
}

function updateGPSUI(data) {
    const lat = data.latitude || 0;
    const lng = data.longitude || 0;
    const now = new Date().toLocaleTimeString();

    // 1. Koordinat Angka
    document.getElementById('current-latitude').innerText = lat.toFixed(6);
    document.getElementById('current-longitude').innerText = lng.toFixed(6);
    
    // 2. DMS Helper
    const toDMS = (deg) => {
        const d = Math.floor(Math.abs(deg));
        const minfloat = (Math.abs(deg) - d) * 60;
        const m = Math.floor(minfloat);
        const secfloat = (minfloat - m) * 60;
        const s = Math.round(secfloat);
        return `${d}° ${m}' ${s}" ${deg < 0 ? "S" : "N"}`;
    };
    document.getElementById('lat-dms').innerText = toDMS(lat);
    document.getElementById('lng-dms').innerText = toDMS(lng);

    // 3. Status
    document.getElementById('gps-status').innerText = "Terkunci (3D)";
    document.getElementById('gps-status').style.background = "#d1e7dd";
    document.getElementById('last-update').innerText = "Updated: " + now;
    
    // 4. Link Google Maps
    const gmapsBtn = document.getElementById('google-maps-link');
    if (lat !== 0) gmapsBtn.href = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}


// ==========================================
// D. EKSEKUSI (POLLING)
// ==========================================

const REFRESH_INTERVAL = 4000; // 4 detik

// Jalankan load data pertama kali
fetchGPSData(); 

// Set interval polling
setInterval(fetchGPSData, REFRESH_INTERVAL);