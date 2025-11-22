// 1. Pastikan Config Dimuat
if (typeof CONFIG === 'undefined') console.error("Error: config.js belum dimuat!");

// ==========================================
// A. LOGIKA PENYIMPANAN (MEMORY)
// ==========================================
const OVERVIEW_KEY = 'weathertech_system_state';

// Simpan state terakhir ke browser
function saveSystemState(key, value) {
    let state = JSON.parse(localStorage.getItem(OVERVIEW_KEY)) || {};
    state[key] = value;
    localStorage.setItem(OVERVIEW_KEY, JSON.stringify(state));
}

// Load state saat pertama buka
function loadSystemState() {
    const state = JSON.parse(localStorage.getItem(OVERVIEW_KEY));
    if (state) {
        if (state.uptime) document.getElementById('sys-uptime').innerText = state.uptime;
        if (state.count) document.getElementById('sys-data-count').innerText = state.count;
        if (state.last_time) {
            document.getElementById('sys-last-update').innerText = state.last_time;
        }
    }
}

// Helper: Format Detik ke Waktu
function formatUptime(seconds) {
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    
    let result = "";
    if(d > 0) result += d + "d ";
    if(h > 0) result += h + "h ";
    return result + m + "m";
}

// ==========================================
// B. UPDATE UI (DARI MQTT)
// ==========================================
function updateSystemUI(type, data) {
    const now = new Date().toLocaleTimeString();
    const timeString = "Just now (" + now + ")";

    // Update Waktu Terakhir
    const lastUp = document.getElementById('sys-last-update');
    if(lastUp) {
        lastUp.innerText = timeString;
        lastUp.style.color = "#198754"; // Hijau saat update
        setTimeout(() => lastUp.style.color = "#2c3e50", 1000);
        
        saveSystemState('last_time', timeString); // Simpan ke memori
    }

    // 1. DATA SENSOR (Update Count)
    if (type === 'sensor' && data.eeprom_count) {
        const countStr = data.eeprom_count.toLocaleString() + " records";
        document.getElementById('sys-data-count').innerText = countStr;
        saveSystemState('count', countStr); // Simpan
    }

    // 2. DATA GATEWAY (Update Uptime)
    if (type === 'gateway' && data.g_uptime_sec) {
        const uptimeStr = formatUptime(data.g_uptime_sec);
        document.getElementById('sys-uptime').innerText = uptimeStr;
        saveSystemState('uptime', uptimeStr); // Simpan
    }
}

// ==========================================
// C. LOAD DATABASE (DATA PASTI)
// ==========================================
function loadFromDatabase() {
    fetch(CONFIG.api_history)
        .then(res => res.json())
        .then(data => {
            if (data.length > 0) {
                const latest = data[0]; // Data terbaru
                
                // Update Count dari Database (Lebih akurat)
                if (latest.eeprom_count) {
                    const countStr = latest.eeprom_count.toLocaleString() + " records";
                    document.getElementById('sys-data-count').innerText = countStr;
                    saveSystemState('count', countStr);
                }

                // Update Waktu Terakhir dari Database
                // (Hanya jika belum ada data live baru)
                const dbTime = new Date(latest.timestamp).toLocaleTimeString();
                const timeStr = "Last: " + dbTime;
                
                // Cek apakah tampilan sekarang masih "Waiting..." atau kosong
                const currentText = document.getElementById('sys-last-update').innerText;
                if (currentText.includes("Waiting") || currentText.includes("Loading")) {
                    document.getElementById('sys-last-update').innerText = timeStr;
                }
            }
        })
        .catch(err => console.error("DB Load Error:", err));
}

// ==========================================
// D. EKSEKUSI & MQTT
// ==========================================

// 1. Load Memori Browser (Instan)
loadSystemState();

// 2. Load Database (Konfirmasi)
loadFromDatabase();

// 3. Koneksi MQTT (Live Update)
const client = new Paho.MQTT.Client(CONFIG.mqtt_host, CONFIG.mqtt_port, "web-over-" + Date.now());

client.onConnectionLost = (res) => {
    if (res.errorCode !== 0) {
        console.log("Connection Lost:", res.errorMessage);
        const st = document.getElementById('sys-connection');
        if(st) { st.innerText = "Offline"; st.style.color = "red"; }
    }
};

client.onMessageArrived = (msg) => {
    try {
        const payload = JSON.parse(msg.payloadString);
        if (msg.destinationName.includes("sensor_data")) {
            updateSystemUI('sensor', payload);
        } else if (msg.destinationName.includes("gateway_system")) {
            updateSystemUI('gateway', payload);
        }
    } catch(e) { console.error(e); }
};

client.connect({
    useSSL: true, userName: CONFIG.mqtt_user, password: CONFIG.mqtt_pass,
    onSuccess: () => {
        console.log("✅ MQTT Connected");
        client.subscribe("/weathertech/#");
        
        // Update Status Koneksi
        const st = document.getElementById('sys-connection');
        if(st) {
            st.innerText = "System Online";
            st.style.color = "#0f5132";
            st.style.background = "#d1e7dd";
            st.style.padding = "2px 10px";
            st.style.borderRadius = "10px";
        }
    }
});