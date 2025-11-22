if (typeof CONFIG === 'undefined') console.error("Error: config.js belum dimuat!");

// ==========================================
// A. SETUP CHARTS
// ==========================================
const ctxHealth = document.getElementById('health-chart').getContext('2d');
const healthChart = new Chart(ctxHealth, {
    type: 'doughnut',
    data: {
        labels: ['Health', 'Loss'],
        datasets: [{ data: [100, 0], backgroundColor: ['#4CAF50', '#e9ecef'], borderWidth: 0, cutout: '85%' }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
});

const ctxHistory = document.getElementById('transceiver-history-chart').getContext('2d');
const historyChart = new Chart(ctxHistory, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            { label: 'RAM (KB)', data: [], borderColor: '#2196F3', backgroundColor: 'rgba(33, 150, 243, 0.1)', fill: true, tension: 0.4, yAxisID: 'y', pointRadius: 3 },
            { label: 'Freq (MHz)', data: [], borderColor: '#FF9800', borderDash: [5, 5], fill: false, tension: 0.4, yAxisID: 'y1', pointRadius: 0 }
        ]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
            y: { position: 'left', min: 0, max: 350, title: {display: true, text: 'Memory (KB)'} },
            y1: { position: 'right', min: 0, max: 260, grid: {drawOnChartArea: false}, title: {display: true, text: 'Freq (MHz)'} },
            x: { display: false }
        }
    }
});

// Helper
function formatUptime(seconds) {
    if (!seconds) return "0 Jam";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h} Jam ${m} Menit`;
}

// ==========================================
// B. FUNGSI UTAMA: POLLING DATABASE
// ==========================================
async function fetchTrxData() {
    try {
        const response = await fetch(CONFIG.api_latest_sensor_system); 
        if (!response.ok) throw new Error("HTTP Error " + response.status);

        const dataArray = await response.json();
        
        // Cek Validitas Data
        if (!dataArray || dataArray.length === 0) return;

        // 1. Update UI dengan Data TERBARU (Index 0)
        updateTransceiverUI(dataArray[0]); 

        // 2. Update Grafik dengan 10 Data (Balik urutan)
        updateChartHistory(dataArray.slice().reverse());

    } catch (error) {
        console.error("❌ Gagal Polling Transceiver:", error);
    }
}

// ==========================================
// C. UPDATE LOGIC (DENGAN SAFETY CHECK)
// ==========================================

function updateChartHistory(historyData) {
    const labels = historyData.map(item => new Date(item.timestamp).toLocaleTimeString());
    const ramData = historyData.map(item => Math.round((item.ram_used || 0) / 1024));
    const cpuData = historyData.map(item => item.cpu_freq || 0);

    historyChart.data.labels = labels;
    historyChart.data.datasets[0].data = ramData;
    historyChart.data.datasets[1].data = cpuData;
    historyChart.update('none');
}

function updateTransceiverUI(data) {
    // SAFETY CHECK: Jika data null/undefined, berhenti agar tidak error
    if (!data) return;

    // Gunakan nilai default 0 jika data kosong
    const rawRam = data.ram_used || 0;
    const rawCpu = data.cpu_freq || 0;

    const totalRam = 320; 
    const ramUsed = Math.round(rawRam / 1024);
    const ramFree = totalRam - ramUsed;
    const ramPercent = Math.min((ramUsed / totalRam) * 100, 100);
    const cpuPercent = Math.min((rawCpu / 240) * 100, 100);

    // UI Updates
    document.getElementById('cpu-text').innerText = Math.round(cpuPercent) + "%";
    document.getElementById('cpu-bar').style.width = cpuPercent + "%";
    document.getElementById('ram-text').innerText = Math.round(ramPercent) + "%";
    document.getElementById('ram-bar').style.width = ramPercent + "%";
    
    document.getElementById('cpu-freq').innerText = rawCpu;
    document.getElementById('ram-free').innerText = ramFree;

    // Health Score
    const health = 100 - ((ramPercent + cpuPercent) / 4);
    healthChart.data.datasets[0].data = [health, 100 - health];
    healthChart.update();
    document.getElementById('health-score').innerText = Math.round(health);

    // Info Bawah
    if(data.g_uptime_sec) document.getElementById('uptime-val').innerText = formatUptime(data.g_uptime_sec);
    
    // Simulasi Packets & Temp
    const packets = data.id ? data.id * 12 : "--"; 
    document.getElementById('packet-count').innerText = packets.toLocaleString();
    
    const fakeTemp = (40 + Math.random() * 5).toFixed(1);
    document.getElementById('cpu-temp').innerText = fakeTemp + "°C";

    if(data.g_uptime_sec < 60) {
        document.getElementById('reset-reason').innerText = "Just Reset";
        document.getElementById('reset-reason').style.color = "red";
    } else {
        document.getElementById('reset-reason').innerText = "Normal";
        document.getElementById('reset-reason').style.color = "green";
    }

    const now = new Date().toLocaleTimeString();
    document.getElementById('last-update').innerText = "Updated: " + now;
    document.getElementById('last-packet').innerText = now;
}

// Eksekusi
fetchTrxData(); 
setInterval(fetchTrxData, 4000);