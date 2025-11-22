// 1. Cek Config
if (typeof CONFIG === 'undefined') console.error("❌ Error: config.js belum dimuat!");
if (!CONFIG.api_latest_sensor) console.error("❌ Error: CONFIG.api_latest_sensor belum didefinisikan di config.js!");

// ==========================================
// A. SETUP CHART
// ==========================================
function createLineChart(elementId, color, label) {
    const canvas = document.getElementById(elementId);
    if (!canvas) return null;
    return new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: label,
                data: [],
                borderColor: color,
                backgroundColor: color + '20',
                fill: true,
                tension: 0.4,
                pointRadius: 2
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false } } }
    });
}

const luxChart = createLineChart('lux-chart', '#ffc107', 'Lux');
const tempChart = createLineChart('temp-chart', '#dc3545', 'Suhu');
const humChart  = createLineChart('hum-chart', '#0d6efd', 'Hum');
const presChart = createLineChart('pres-chart', '#6c757d', 'Pres'); 

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
// B. FUNGSI UTAMA: POLLING API
// ==========================================

async function loadAndRenderData() {
    console.log("🔄 Polling data ke: " + CONFIG.api_latest_sensor); // Debugging Log

    try {
        const response = await fetch(CONFIG.api_latest_sensor); 
        
        if (!response.ok) {
            console.error("❌ HTTP Error:", response.status);
            return;
        }

        const dataArray = await response.json();
        console.log("📦 Data Diterima:", dataArray); // Debugging Log - Lihat isinya di Console

        if (!dataArray || dataArray.length === 0) {
            console.warn("⚠️ Database Kosong (Array []). Pastikan alat mengirim data atau isi dummy data.");
            return;
        }

        // Data terbaru ada di index 0 (karena DESC di SQL)
        const latestData = dataArray[0];
        
        // 1. Update Angka
        updateDashboardUI(latestData);

        // 2. Update Chart (Balik urutan biar kronologis Kiri -> Kanan)
        const chartData = [...dataArray].reverse(); 
        updateAllCharts(chartData); 
        calculateMinMax(chartData);

    } catch (error) {
        console.error("❌ Gagal Fetch API:", error);
    }
}

// ==========================================
// C. UPDATE UI & CHART
// ==========================================

function updateAllCharts(dataArray) {
    const labels = dataArray.map(d => new Date(d.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
    
    const setChartData = (chart, data) => {
        if (chart) {
            chart.data.labels = labels;
            chart.data.datasets[0].data = data;
            chart.update('none');
        }
    };

    setChartData(luxChart, dataArray.map(d => d.lux));
    setChartData(tempChart, dataArray.map(d => d.temp));
    setChartData(humChart, dataArray.map(d => d.hum));
    setChartData(presChart, dataArray.map(d => d.pres));
    
    if (trendChart) {
        trendChart.data.labels = labels;
        trendChart.data.datasets[0].data = dataArray.map(d => d.temp);
        trendChart.data.datasets[1].data = dataArray.map(d => d.hum);
        trendChart.update('none');
    }
}

function updateDashboardUI(data) {
    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
        else console.warn(`⚠️ Element ID '${id}' tidak ditemukan di HTML.`);
    };

    // Pastikan data tidak null sebelum di-parse
    if (data.lux != null) setText('lux-value', parseFloat(data.lux).toFixed(0) + " lux");
    if (data.temp != null) setText('temp-value', parseFloat(data.temp).toFixed(1) + " °C");
    if (data.hum != null) setText('hum-value', parseFloat(data.hum).toFixed(1) + " %");
    if (data.pres != null) setText('pres-value', parseFloat(data.pres).toFixed(1) + " hPa");

    // Kualitas Udara
    const air = (data.air_clean_perc !== undefined) ? data.air_clean_perc : data.air_clean;
    if (air != null) {
        setText('air-value', air + " %");
        const bar = document.getElementById('air-progress-bar');
        const badge = document.getElementById('air-status-badge');
        
        if(bar) bar.style.width = air + "%";
        if(badge) {
            if(air > 70) { // Logika: >70 = Bersih, <70 = Kurang
                bar.style.background = "#4CAF50"; badge.innerText = "Bersih"; badge.style.background = "#d1e7dd"; badge.style.color = "#0f5132";
            } else {
                bar.style.background = "#FFC107"; badge.innerText = "Sedang"; badge.style.background = "#fff3cd"; badge.style.color = "#856404";
            }
        }
    }

    if (data.rtc_time) setText('rtc-time', data.rtc_time);
    if (data.eeprom_count) setText('eeprom-count', "#" + data.eeprom_count);
    
    const now = new Date().toLocaleTimeString();
    setText('last-update-time', now);
}

function calculateMinMax(dataArray) {
    if (dataArray.length === 0) return;
    const temps = dataArray.map(d => parseFloat(d.temp)).filter(n => !isNaN(n));
    const hums = dataArray.map(d => parseFloat(d.hum)).filter(n => !isNaN(n));

    if (temps.length > 0) {
        const tMin = document.getElementById('temp-min'); const tMax = document.getElementById('temp-max');
        if(tMin) tMin.innerText = Math.min(...temps).toFixed(1); 
        if(tMax) tMax.innerText = Math.max(...temps).toFixed(1);
    }
    if (hums.length > 0) {
        const hMin = document.getElementById('hum-min'); const hMax = document.getElementById('hum-max');
        if(hMin) hMin.innerText = Math.min(...hums).toFixed(1); 
        if(hMax) hMax.innerText = Math.max(...hums).toFixed(1);
    }
}

// Eksekusi
loadAndRenderData(); 
setInterval(loadAndRenderData, 4000);