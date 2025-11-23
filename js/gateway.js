if (typeof CONFIG === 'undefined') 
    console.error("Error: config.js belum dimuat!");

// ==========================================
// A. SETUP CHART
// ==========================================
const ctxMem = document.getElementById('gw-mem-chart').getContext('2d');
const memChart = new Chart(ctxMem, {
    type: 'doughnut',
    data: {
        labels: ['Used', 'Free'],
        datasets: [{
            data: [50, 50],
            backgroundColor: ['#673AB7', '#e9ecef'],
            borderWidth: 0,
            cutout: '70%'
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } }
    }
});

// ==========================================
// B. LOCAL STORAGE
// ==========================================
const GW_KEY = 'weathertech_gw_data';

function saveGwData(data) {
    localStorage.setItem(GW_KEY, JSON.stringify(data));
}

function loadGwData() {
    const cached = localStorage.getItem(GW_KEY);
    if (cached) {
        const data = JSON.parse(cached);
        updateGatewayUI(data);
        document.getElementById('last-update').innerText = "Last Known State";
        document.getElementById('last-update').style.color = "orange";
    }
}

// ==========================================
// C. UPDATE UI
// ==========================================
function updateGatewayUI(data) {
    const now = new Date().toLocaleTimeString();

    if (data.g_uptime_sec) {
        const d = Math.floor(data.g_uptime_sec / 86400);
        const h = Math.floor((data.g_uptime_sec % 86400) / 3600);
        const m = Math.floor((data.g_uptime_sec % 3600) / 60);
        let str = "";
        if(d > 0) str += d + "d ";
        if(h > 0) str += h + "h ";
        str += m + "m";
        document.getElementById('gw-uptime').innerText = str;
    }

    if (data.g_ram_used) {
        const used = Math.round(data.g_ram_used / 1024);
        const total = 320;
        const free = total - used;
        memChart.data.datasets[0].data = [used, free];
        memChart.update();
        document.getElementById('gw-mem-val').innerText = used;
    }

    if (data.g_cpu_freq)
        document.getElementById('gw-cpu').innerText = data.g_cpu_freq + " MHz";

    document.getElementById('gw-last-msg').innerText = now;
    document.getElementById('last-update').innerText = "Updated: " + now;
    document.getElementById('last-update').style.color = "";
}

// ==========================================
// D. FETCH API (tanpa MQTT)
// ==========================================
async function loadGatewayFromAPI() {
    try {
        const res = await fetch(CONFIG.api_latest_gateway_system);
        const data = await res.json();

        saveGwData(data);
        updateGatewayUI(data);

    } catch (e) {
        console.error("Gateway API Error:", e);
    }
}

// Load cache pertama
loadGwData();

// Update setiap 3 detik
setInterval(loadGatewayFromAPI, 3000);
loadGatewayFromAPI();
