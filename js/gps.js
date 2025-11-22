// 1. Cek Config
if (typeof CONFIG === 'undefined') console.error("Error: config.js belum dimuat!");

// ==========================================
// A. SETUP PETA (LEAFLET)
// ==========================================
// Default View: Jember (Sesuai konteks Anda)
const map = L.map('gps-map').setView([-8.178842, 113.726170], 15);

// Tile Layer (Tampilan Peta Jalan)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Marker & Jejak (Polyline)
let marker;
let pathLine; // Garis jejak
let pathCoords = []; // Array untuk menyimpan riwayat koordinat

// Custom Icon (Biar Keren - Opsional)
const gpsIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// ==========================================
// B. HELPER: KONVERSI DESIMAL KE DMS
// ==========================================
function toDMS(deg, type) {
    var d = Math.floor(Math.abs(deg));
    var minfloat = (Math.abs(deg) - d) * 60;
    var m = Math.floor(minfloat);
    var secfloat = (minfloat - m) * 60;
    var s = Math.round(secfloat);
    
    var dir = "";
    if (type === 'lat') dir = deg < 0 ? "S" : "N";
    if (type === 'lng') dir = deg < 0 ? "W" : "E";

    return `${d}° ${m}' ${s}" ${dir}`;
}

// ==========================================
// C. UPDATE PETA & UI
// ==========================================
function updateGPS(lat, lng) {
    // 1. Update Text UI
    document.getElementById('current-latitude').innerText = lat.toFixed(6);
    document.getElementById('current-longitude').innerText = lng.toFixed(6);
    
    // 2. Update DMS
    document.getElementById('lat-dms').innerText = toDMS(lat, 'lat');
    document.getElementById('lng-dms').innerText = toDMS(lng, 'lng');
    
    // 3. Update Status
    const statusEl = document.getElementById('gps-status');
    statusEl.innerText = "Terkunci (3D Fix)";
    statusEl.style.background = "#d1e7dd";
    statusEl.style.color = "#0f5132";
    
    document.getElementById('sat-count').innerText = "8+ Satellites"; // Simulasi atau ambil dari data jika ada
    document.getElementById('last-update').innerText = "Updated: " + new Date().toLocaleTimeString();

    // 4. Update Link Google Maps
    const gmapsBtn = document.getElementById('google-maps-link');
    gmapsBtn.href = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    // 5. UPDATE MAP MARKER
    const newLatLng = [lat, lng];

    if (!marker) {
        // Jika marker belum ada, buat baru
        marker = L.marker(newLatLng, {icon: gpsIcon}).addTo(map)
            .bindPopup("<b>Lokasi Terkini</b><br>WeatherTech Device").openPopup();
    } else {
        // Jika sudah ada, geser posisinya
        marker.setLatLng(newLatLng);
    }

    // 6. UPDATE JEJAK (POLYLINE)
    pathCoords.push(newLatLng);
    // Batasi jejak cuma 50 titik terakhir biar map gak berat
    if (pathCoords.length > 50) pathCoords.shift();

    if (!pathLine) {
        pathLine = L.polyline(pathCoords, {color: 'blue', weight: 4, opacity: 0.7}).addTo(map);
    } else {
        pathLine.setLatLngs(pathCoords);
    }

    // Geser kamera peta ke lokasi baru
    map.panTo(newLatLng);
}

// ==========================================
// D. LOCAL STORAGE (PERSISTENCE)
// ==========================================
const GPS_KEY = 'weathertech_last_gps';

function saveGPS(lat, lng) {
    const data = { lat: lat, lng: lng, time: Date.now() };
    localStorage.setItem(GPS_KEY, JSON.stringify(data));
}

function loadCachedGPS() {
    const cached = localStorage.getItem(GPS_KEY);
    if (cached) {
        const data = JSON.parse(cached);
        console.log("📍 Memuat lokasi terakhir:", data);
        updateGPS(data.lat, data.lng);
        
        // Beri info bahwa ini data lama
        document.getElementById('gps-status').innerText = "Last Known Pos";
        document.getElementById('gps-status').style.background = "#fff3cd";
        document.getElementById('gps-status').style.color = "#856404";
    }
}

// ==========================================
// E. MQTT CONNECTION
// ==========================================
loadCachedGPS(); // Load data lama dulu

const client = new Paho.MQTT.Client(CONFIG.mqtt_host, CONFIG.mqtt_port, "web-gps-" + Date.now());

client.onMessageArrived = (msg) => {
    try {
        // GPS biasanya ada di topic 'system_data' atau 'sensor_data'
        // Sesuaikan dengan JSON alat Anda. 
        // Di script ini saya cek di system_data
        if (msg.destinationName.includes("system_data") || msg.destinationName.includes("sensor_data")) {
            const data = JSON.parse(msg.payloadString);
            
            // Pastikan ada data Lat/Lng
            if (data.latitude && data.longitude) {
                const lat = parseFloat(data.latitude);
                const lng = parseFloat(data.longitude);
                
                // Cek validitas (kadang GPS kirim 0.0 jika belum lock)
                if (lat !== 0 && lng !== 0) {
                    saveGPS(lat, lng);
                    updateGPS(lat, lng);
                }
            }
        }
    } catch(e) { console.error(e); }
};

client.connect({
    useSSL: true, userName: CONFIG.mqtt_user, password: CONFIG.mqtt_pass,
    onSuccess: () => {
        console.log("✅ MQTT GPS Connected");
        // Subscribe ke kedua topic untuk jaga-jaga
        client.subscribe(CONFIG.topic_system); 
        client.subscribe(CONFIG.topic_sensor);
    }
});