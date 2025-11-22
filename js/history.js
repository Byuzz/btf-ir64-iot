if (typeof CONFIG === 'undefined') console.error("Error: config.js belum dimuat!");

// Variabel Global
let allData = [];        // Menyimpan semua data dari DB
let filteredData = [];   // Menyimpan data hasil search tabel
let currentPage = 1;
const rowsPerPage = 10;

// ==========================================
// 1. SETUP CHART
// ==========================================
const ctxTrend = document.getElementById('sensor-trends-chart').getContext('2d');
const trendChart = new Chart(ctxTrend, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            { label: 'Temp (°C)', data: [], borderColor: '#dc3545', backgroundColor: 'rgba(220, 53, 69, 0.1)', yAxisID: 'y', tension: 0.4, fill: true, pointRadius: 2 },
            { label: 'Hum (%)', data: [], borderColor: '#0d6efd', backgroundColor: 'rgba(13, 110, 253, 0.1)', yAxisID: 'y1', tension: 0.4, fill: true, pointRadius: 2 }
        ]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
            y: { type: 'linear', display: true, position: 'left', title: {display: true, text: 'Temperature'} },
            y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, title: {display: true, text: 'Humidity'} }
        }
    }
});

// ==========================================
// 2. LOGIKA FILTER TANGGAL (BARU)
// ==========================================

// Event Listener Tombol Filter
document.getElementById('filter-date-btn').addEventListener('click', () => {
    const startVal = document.getElementById('start-date').value;
    const endVal = document.getElementById('end-date').value;

    if (!startVal || !endVal) {
        alert("Harap pilih Tanggal Mulai dan Tanggal Akhir!");
        return;
    }

    const startDate = new Date(startVal);
    startDate.setHours(0, 0, 0); // Mulai jam 00:00

    const endDate = new Date(endVal);
    endDate.setHours(23, 59, 59); // Sampai jam 23:59

    // Lakukan Filtering pada allData
    const chartFiltered = allData.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= startDate && itemDate <= endDate;
    });

    if (chartFiltered.length === 0) {
        alert("Tidak ada data pada rentang tanggal tersebut.");
        return;
    }

    console.log(`Menampilkan ${chartFiltered.length} data hasil filter tanggal.`);
    
    // Update Grafik dengan data hasil filter (Harus dibalik biar urut waktu)
    updateChartData([...chartFiltered].reverse(), true); // true = mode filter
});

// Event Listener Tombol Reset
document.getElementById('reset-date-btn').addEventListener('click', () => {
    document.getElementById('start-date').value = "";
    document.getElementById('end-date').value = "";
    
    // Kembalikan ke tampilan default (50 data terakhir)
    updateChartData([...allData].reverse());
});


// ==========================================
// 3. FETCH DATA (DARI DATABASE)
// ==========================================
async function loadHistoryData() {
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">⏳ Memuat data dari database...</td></tr>';

    try {
        const response = await fetch(CONFIG.api_history);
        if (!response.ok) throw new Error("HTTP Error");
        
        const data = await response.json();
        console.log(`✅ ${data.length} data loaded.`);

        allData = data; 
        filteredData = data;

        // Update Statistik
        calculateStats(data);

        // Update Grafik Default (Balik urutan biar kronologis)
        updateChartData([...data].reverse());

        // Render Tabel
        renderTable();

    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red; padding: 20px;">❌ Gagal memuat data. Cek koneksi backend.</td></tr>';
    }
}

// ==========================================
// 4. LOGIKA CHART & UPDATE
// ==========================================
function updateChartData(data, isFiltered = false) {
    let chartData = [];

    if (isFiltered) {
        // Jika mode filter, TAMPILKAN SEMUA data yang ditemukan
        chartData = data;
    } else {
        // Jika mode default, batasi 50-100 data terakhir saja biar grafik tidak berat
        chartData = data.slice(-100); 
    }
    
    trendChart.data.labels = chartData.map(d => new Date(d.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
    trendChart.data.datasets[0].data = chartData.map(d => d.temp);
    trendChart.data.datasets[1].data = chartData.map(d => d.hum);
    
    trendChart.update();
}

function calculateStats(data) {
    if (data.length === 0) return;
    let totalTemp = 0, totalHum = 0, totalAir = 0;
    let count = 0;
    data.forEach(d => {
        if(d.temp) { totalTemp += parseFloat(d.temp); }
        if(d.hum) { totalHum += parseFloat(d.hum); }
        let air = d.air_clean_perc || d.air_clean || 0;
        totalAir += parseInt(air);
        count++;
    });
    document.getElementById('total-data-points').innerText = data.length.toLocaleString();
    if(count > 0) {
        document.getElementById('avg-temp').innerText = (totalTemp / count).toFixed(1) + "°C";
        document.getElementById('avg-hum').innerText = (totalHum / count).toFixed(1) + "%";
        document.getElementById('avg-air').innerText = (totalAir / count).toFixed(0) + "%";
    }
}

// ==========================================
// 5. LOGIKA TABEL & PAGINATION
// ==========================================
function renderTable() {
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = "";

    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    if (totalPages === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">Tidak ada data ditemukan.</td></tr>';
        return;
    }

    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filteredData.slice(start, end);

    pageData.forEach(item => {
        const dbTime = new Date(item.timestamp).toLocaleString();
        const rtcTime = item.rtc_time || "-";
        const temp = item.temp ? parseFloat(item.temp).toFixed(1) : "-";
        const hum = item.hum ? parseFloat(item.hum).toFixed(1) : "-";
        const pres = item.pres ? parseFloat(item.pres).toFixed(1) : "-";
        const air = item.air_clean_perc || item.air_clean || "-";

        const row = `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;">${dbTime}</td>
                <td style="padding: 10px; color: #666;">${rtcTime}</td>
                <td style="padding: 10px;"><span style="color:#dc3545; font-weight:bold;">${temp}°C</span></td>
                <td style="padding: 10px;"><span style="color:#0d6efd; font-weight:bold;">${hum}%</span></td>
                <td style="padding: 10px;">${pres}</td>
                <td style="padding: 10px;">${item.lux || "-"}</td>
                <td style="padding: 10px;"><strong>${air}%</strong></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    document.getElementById('page-info').innerText = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prev-btn').disabled = (currentPage === 1);
    document.getElementById('next-btn').disabled = (currentPage === totalPages);
}

document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderTable(); }
});
document.getElementById('next-btn').addEventListener('click', () => {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    if (currentPage < totalPages) { currentPage++; renderTable(); }
});

document.getElementById('search-box').addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase();
    filteredData = allData.filter(item => {
        const t1 = item.timestamp ? item.timestamp.toLowerCase() : "";
        const t2 = item.rtc_time ? item.rtc_time.toLowerCase() : "";
        return t1.includes(keyword) || t2.includes(keyword);
    });
    currentPage = 1;
    renderTable();
});

// ==========================================
// 6. EXPORT CSV
// ==========================================
document.getElementById('export-data').addEventListener('click', () => {
    if (allData.length === 0) { alert("No data to export!"); return; }
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Timestamp,RTC_Time,Temp,Hum,Pres,Lux,Air\n"; 
    allData.forEach(row => {
        const rtc = row.rtc_time || "";
        const air = row.air_clean_perc || row.air_clean || "";
        const line = `${row.timestamp},${rtc},${row.temp},${row.hum},${row.pres},${row.lux},${air}`;
        csvContent += line + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "weathertech_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Jalankan
loadHistoryData();