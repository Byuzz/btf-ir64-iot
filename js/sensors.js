// 1. Pastikan Config Dimuat
if (typeof CONFIG === 'undefined') console.error("Error: config.js belum dimuat!");

// ==========================================
// A. SETUP CHART (DENGAN SAFETY CHECK)
// ==========================================

// Helper untuk membuat chart dengan aman
function createLineChart(elementId, color, label) {
    const canvas = document.getElementById(elementId);
    if (!canvas) {
        console.warn(`Canvas dengan ID '${elementId}' tidak ditemukan. Grafik dilewati.`);
        return null;
    }
    return new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: label,
                data: [],
                borderColor: color,
                backgroundColor: color + '20', // Transparan dikit
                fill: true,
                tension: 0.4,
                pointRadius: 2
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } }, 
            scales: { x: { display: false } } 
        }
    });
}

// Init Chart Kecil
const luxChart = createLineChart('lux-chart', '#ffc107', 'Lux');
const tempChart = createLineChart('temp-chart', '#dc3545', 'Suhu');
const humChart  = createLineChart('hum-chart', '#0d6efd', 'Hum');
const presChart = createLineChart('pres-chart', '#6c757d', 'Pres');

// Init Trend Chart Besar
let trendChart;
const trendCanvas = document.getElementById('sensor-trend-chart');
if (trendCanvas) {
    trendChart = new Chart(trendCanvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Suhu', data: [], borderColor: '#dc3545', yAxisID: 'y', tension: 0.4 },
                { label: 'Hum', data: [], borderColor: '#0d6efd', yAxisID: 'y1', tension: 0.4 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { type: 'linear', display: true, position: 'left' },
                y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false } }
            }
        }
    });
}

// ==========================================
// B. LOGIKA STORAGE (MAX 10 DATA)
// ==========================================
const STORAGE_KEY = 'weathertech_local_data';

function saveToLocalStorage(newData) {
    let currentData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    currentData.push(newData);
    if (currentData.length > 10) currentData.shift(); // BATAS 10 DATA
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentData));
    calculateMinMax(currentData);
}

function loadCachedData() {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
        const dataArray = JSON.parse(cached);
        dataArray.forEach(item => {
            updateAllCharts(item);
            updateDashboardUI(item);
        });
        calculateMinMax(dataArray);
    }
}

function calculateMinMax(dataArray) {
    if (dataArray.length === 0) return;
    const temps = dataArray.map(d => parseFloat(d.temp)).filter(n => !isNaN(n));
    const hums = dataArray.map(d => parseFloat(d.hum)).filter(n => !isNaN(n));

    if (temps.length > 0) {
        const tMin = document.getElementById('temp-min');
        const tMax = document.getElementById('temp-max');
        if(tMin) tMin.innerText = Math.min(...temps).toFixed(1);
        if(tMax) tMax.innerText = Math.max(...temps).toFixed(1);
    }
    if (hums.length > 0) {
        const hMin = document.getElementById('hum-min');
        const hMax = document.getElementById('hum-max');
        if(hMin) hMin.innerText = Math.min(...hums).toFixed(1);
        if(hMax) hMax.innerText = Math.max(...hums).toFixed(1);
    }
}

// ==========================================
// C. UPDATE UI & CHART
// ==========================================

function updateAllCharts(data) {
    const timeLabel = new Date().toLocaleTimeString();
    
    const pushDataSingle = (chart, val) => {
        if (!chart) return; // Safety Check
        if (chart.data.labels.length >= 10) { // MAX 10 DATA
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }
        chart.data.labels.push(timeLabel);
        chart.data.datasets[0].data.push(val);
        chart.update('none');
    };

    if (data.lux) pushDataSingle(luxChart, data.lux);
    if (data.temp) pushDataSingle(tempChart, data.temp);
    if (data.hum) pushDataSingle(humChart, data.hum);
    if (data.pres) pushDataSingle(presChart, data.pres);

    // Update Trend Chart Besar
    if (trendChart && data.temp && data.hum) {
        if (trendChart.data.labels.length >= 10) { // MAX 10 DATA
            trendChart.data.labels.shift();
            trendChart.data.datasets.forEach(dataset => dataset.data.shift());
        }
        trendChart.data.labels.push(timeLabel);
        trendChart.data.datasets[0].data.push(data.temp);
        trendChart.data.datasets[1].data.push(data.hum);
        trendChart.update('none');
    }
}

function updateDashboardUI(data) {
    // Helper untuk update text aman
    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    // 1. Update Angka
    if(data.lux) setText('lux-value', parseFloat(data.lux).toFixed(0) + " lux");
    if(data.temp) setText('temp-value', parseFloat(data.temp).toFixed(1) + " °C");
    if(data.hum) setText('hum-value', parseFloat(data.hum).toFixed(1) + " %");
    if(data.pres) setText('pres-value', parseFloat(data.pres).toFixed(1) + " hPa");

    // 2. Kualitas Udara
    const air = (data.air_clean_perc !== undefined) ? data.air_clean_perc : data.air_clean;
    if(air !== undefined) {
        setText('air-value', air + " %");
        const bar = document.getElementById('air-progress-bar');
        const badge = document.getElementById('air-status-badge');
        
        if(bar) bar.style.width = air + "%";
        
        if(badge) {
            if(air < 40) {
                bar.style.background = "#4CAF50"; badge.innerText = "Sangat Baik";
                badge.style.background = "#d1e7dd"; badge.style.color = "#0f5132";
            } else if (air < 70) {
                bar.style.background = "#FFC107"; badge.innerText = "Cukup";
                badge.style.background = "#fff3cd"; badge.style.color = "#856404";
            } else {
                bar.style.background = "#F44336"; badge.innerText = "Buruk";
                badge.style.background = "#f8d7da"; badge.style.color = "#842029";
            }
        }
    }

    // 3. Info Sistem
    if(data.rtc_time) setText('rtc-time', data.rtc_time);
    if(data.eeprom_count) setText('eeprom-count', "#" + data.eeprom_count);
    
    const now = new Date().toLocaleTimeString();
    setText('last-update-time', now);
    setText('last-update', "Updated: " + now);
}

// ==========================================
// D. EKSEKUSI
// ==========================================
console.log("🚀 Memulai Sensor Script...");
loadCachedData();

const client = new Paho.MQTT.Client(CONFIG.mqtt_host, CONFIG.mqtt_port, "web-v3-" + Date.now());

client.onMessageArrived = (msg) => {
    try {
        const data = JSON.parse(msg.payloadString);
        if (msg.destinationName.includes("sensor_data")) {
            saveToLocalStorage(data);
            updateAllCharts(data);
            updateDashboardUI(data);
        }
    } catch(e) { console.error("JSON Error:", e); }
};

client.connect({
    useSSL: true, userName: CONFIG.mqtt_user, password: CONFIG.mqtt_pass,
    onSuccess: () => {
        console.log("✅ MQTT Connected!");
        client.subscribe(CONFIG.topic_sensor);
    },
    onFailure: (e) => console.log("❌ MQTT Failed:", e.errorMessage)
});