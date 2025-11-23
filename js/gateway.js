if (typeof CONFIG === 'undefined') console.error("Error: config.js belum dimuat!");

// ==========================================
// A. SETUP CHART
// ==========================================

// 1. Chart Memory Gateway (Doughnut) - ID: gw-mem-chart
const ctxMem = document.getElementById('gw-mem-chart');
let memChart;

if (ctxMem) {
    memChart = new Chart(ctxMem.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Used', 'Free'],
            datasets: [{ 
                data: [0, 100], // Default awal
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
}

// Helper: Format Uptime
function formatUptime(seconds) {
    if (!seconds) return "0m";
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    
    let str = "";
    if(d > 0) str += d + "d ";
    if(h > 0) str += h + "h ";
    str += m + "m";
    return str;
}

// Helper: Update Text Aman
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
    // Tidak perlu error log jika ID tidak ketemu, biar console bersih
}

// ==========================================
// B. FUNGSI UTAMA: POLLING DATABASE
// ==========================================

async function fetchGateway() {
    try {
        const response = await fetch(CONFIG.api_latest_gateway_system);
        
        if (!response.ok) throw new Error("HTTP Error " + response.status);

        const dataArray = await response.json();

        // Cek validitas data
        if (Array.isArray(dataArray) && dataArray.length > 0) {
            // Ambil data TERBARU (Index 0) karena Backend melakukan ORDER BY DESC
            updateGatewayUI(dataArray[0]);
        } else {
            console.warn("Data Gateway Kosong di Database");
        }

    } catch (e) { 
        console.error("GW Error:", e); 
    }
}

// ==========================================
// C. UPDATE UI
// ==========================================

function updateGatewayUI(data) {
    const now = new Date().toLocaleTimeString();

    // 1. Update Uptime (ID: gw-uptime)
    if(data.g_uptime_sec) {
        setText('gw-uptime', formatUptime(data.g_uptime_sec));
    }
    
    // 2. Update Memory (ID: gw-mem-val & Chart)
    if(data.g_ram_used) {
        const usedKB = Math.round(data.g_ram_used / 1024);
        const totalKB = 320; // Asumsi ESP32
        const freeKB = totalKB - usedKB;
        
        // Update Chart
        if (memChart) {
            memChart.data.datasets[0].data = [usedKB, freeKB];
            memChart.update();
        }
        
        // Update Teks
        setText('gw-mem-val', usedKB);
    }

    // 3. Update CPU (ID: gw-cpu)
    if (data.g_cpu_freq) {
        setText('gw-cpu', data.g_cpu_freq + " MHz");
    }
    
    // 4. Info Lainnya (ID: gw-last-msg & last-update)
    setText('gw-last-msg', now);
    setText('last-update', "Updated: " + now);
}

// ==========================================
// D. EKSEKUSI
// ==========================================

const REFRESH_INTERVAL = 4000; 

fetchGateway(); 
setInterval(fetchGateway, REFRESH_INTERVAL);