if (typeof CONFIG === 'undefined') console.error("Error: config.js belum dimuat!");

// ==========================================
// A. SETUP CHART
// ==========================================
const ctxMem = document.getElementById('gw-mem-chart').getContext('2d');
const memChart = new Chart(ctxMem, {
    type: 'doughnut',
    data: {
        labels: ['Used', 'Free'],
        datasets: [{ data: [50, 50], backgroundColor: ['#673AB7', '#e9ecef'], borderWidth: 0, cutout: '70%' }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
});

// ==========================================
// B. LOGIKA STORAGE (MEMORY)
// ==========================================
const GW_KEY = 'weathertech_gw_data';

function saveGwData(data) {
    // Simpan data terakhir saja (Object), tidak perlu array history
    localStorage.setItem(GW_KEY, JSON.stringify(data));
}

function loadGwData() {
    const cached = localStorage.getItem(GW_KEY);
    if (cached) {
        const data = JSON.parse(cached);
        updateGatewayUI(data); // Tampilkan langsung
        
        // Beri tanda bahwa ini data cache
        document.getElementById('last-update').innerText = "Last Known State";
        document.getElementById('last-update').style.color = "orange";
    }
}

// ==========================================
// C. UPDATE UI
// ==========================================
function updateGatewayUI(data) {
    const now = new Date().toLocaleTimeString();

    // Update Uptime
    if(data.g_uptime_sec) {
        const d = Math.floor(data.g_uptime_sec / 86400);
        const h = Math.floor((data.g_uptime_sec % 86400) / 3600);
        const m = Math.floor((data.g_uptime_sec % 3600) / 60);
        let str = "";
        if(d > 0) str += d + "d ";
        if(h > 0) str += h + "h ";
        str += m + "m";
        document.getElementById('gw-uptime').innerText = str;
    }

    // Update Memory Chart
    if(data.g_ram_used) {
        const used = Math.round(data.g_ram_used / 1024);
        const total = 320; // Asumsi 320KB
        const free = total - used;
        memChart.data.datasets[0].data = [used, free];
        memChart.update();
        document.getElementById('gw-mem-val').innerText = used;
    }

    // Info Lain
    if(data.g_cpu_freq) document.getElementById('gw-cpu').innerText = data.g_cpu_freq + " MHz";
    document.getElementById('gw-last-msg').innerText = now;
    document.getElementById('last-update').innerText = "Updated: " + now;
    document.getElementById('last-update').style.color = ""; // Reset warna
}

// ==========================================
// D. EKSEKUSI & MQTT
// ==========================================

// 1. Load Cache
loadGwData();

// 2. Koneksi Live
const client = new Paho.MQTT.Client(CONFIG.mqtt_host, CONFIG.mqtt_port, "web-gw-" + Date.now());

client.onMessageArrived = (msg) => {
    try {
        const data = JSON.parse(msg.payloadString);
        if (msg.destinationName.includes("gateway_system")) {
            saveGwData(data);       // Simpan
            updateGatewayUI(data);  // Tampilkan
        }
    } catch(e) {}
};

client.connect({
    useSSL: true, userName: CONFIG.mqtt_user, password: CONFIG.mqtt_pass,
    onSuccess: () => client.subscribe(CONFIG.topic_gateway)
});