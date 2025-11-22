if (typeof CONFIG === 'undefined') console.error("Error: config.js belum dimuat!");

// ==========================================
// A. SETUP CHARTS
// ==========================================

// 1. Health Chart (Doughnut)
const ctxHealth = document.getElementById('health-chart').getContext('2d');
const healthChart = new Chart(ctxHealth, {
    type: 'doughnut',
    data: {
        labels: ['Health', 'Loss'],
        datasets: [{ data: [100, 0], backgroundColor: ['#4CAF50', '#e9ecef'], borderWidth: 0, cutout: '85%' }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
});

// 2. History Chart (Line)
const ctxHistory = document.getElementById('transceiver-history-chart').getContext('2d');
const historyChart = new Chart(ctxHistory, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            { label: 'RAM (KB)', data: [], borderColor: '#2196F3', backgroundColor: 'rgba(33, 150, 243, 0.1)', fill: true, tension: 0.4, yAxisID: 'y', pointRadius: 0 },
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

// ==========================================
// B. LOGIKA STORAGE (MEMORY)
// ==========================================
const TRX_KEY = 'weathertech_trx_data';

function saveTrxData(data) {
    let history = JSON.parse(localStorage.getItem(TRX_KEY)) || [];
    history.push(data);
    if (history.length > 50) history.shift(); // Simpan 50 data terakhir
    localStorage.setItem(TRX_KEY, JSON.stringify(history));
}

function loadTrxData() {
    const cached = localStorage.getItem(TRX_KEY);
    if (cached) {
        const history = JSON.parse(cached);
        
        // Isi ulang grafik history
        history.forEach(item => {
            updateChartHistory(item);
        });

        // Update tampilan angka dengan data TERAKHIR
        if (history.length > 0) {
            updateTransceiverUI(history[history.length - 1], false); // false = jangan update chart lagi
        }
    }
}

// ==========================================
// C. UPDATE UI
// ==========================================

function updateChartHistory(data) {
    const now = new Date().toLocaleTimeString();
    const ramUsed = Math.round(data.ram_used / 1024);

    if (historyChart.data.labels.length >= 50) {
        historyChart.data.labels.shift();
        historyChart.data.datasets.forEach(ds => ds.data.shift());
    }
    historyChart.data.labels.push(now);
    historyChart.data.datasets[0].data.push(ramUsed);
    historyChart.data.datasets[1].data.push(data.cpu_freq);
    historyChart.update('none');
}

function updateTransceiverUI(data, updateChart = true) {
    // 1. Update Resource Bars
    const totalRam = 320; 
    const ramUsed = Math.round(data.ram_used / 1024);
    const ramPercent = Math.min((ramUsed / totalRam) * 100, 100);
    const cpuPercent = Math.min((data.cpu_freq / 240) * 100, 100);

    document.getElementById('cpu-text').innerText = Math.round(cpuPercent) + "%";
    document.getElementById('cpu-bar').style.width = cpuPercent + "%";
    
    document.getElementById('ram-text').innerText = Math.round(ramPercent) + "%";
    document.getElementById('ram-bar').style.width = ramPercent + "%";
    
    document.getElementById('cpu-freq').innerText = data.cpu_freq;
    document.getElementById('ram-free').innerText = (totalRam - ramUsed);

    // 2. Update Health Score
    const health = 100 - ((ramPercent + cpuPercent) / 4);
    healthChart.data.datasets[0].data = [health, 100 - health];
    healthChart.update();
    document.getElementById('health-score').innerText = Math.round(health);

    // 3. Update Chart (Jika Data Baru)
    if (updateChart) {
        updateChartHistory(data);
    }

    // 4. Info Lainnya
    if(data.uptime_sec) {
        const jam = (data.uptime_sec / 3600).toFixed(1);
        document.getElementById('uptime-val').innerText = jam + " Jam";
    }
    if (data.eeprom_count) {
        document.getElementById('packet-count').innerText = data.eeprom_count;
    }
    
    const now = new Date().toLocaleTimeString();
    document.getElementById('last-update').innerText = "Updated: " + now;
    document.getElementById('last-packet').innerText = now;
}

// ==========================================
// D. EKSEKUSI & MQTT
// ==========================================

// 1. Load Data Lama Dulu
loadTrxData();

// 2. Koneksi Live
const client = new Paho.MQTT.Client(CONFIG.mqtt_host, CONFIG.mqtt_port, "web-trx-" + Date.now());

client.onMessageArrived = (msg) => {
    try {
        const data = JSON.parse(msg.payloadString);
        if (msg.destinationName.includes("system_data")) {
            saveTrxData(data);          // Simpan
            updateTransceiverUI(data);  // Tampilkan
        }
    } catch(e) {}
};

client.connect({
    useSSL: true, userName: CONFIG.mqtt_user, password: CONFIG.mqtt_pass,
    onSuccess: () => client.subscribe(CONFIG.topic_system)
});