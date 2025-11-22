async function fetchSystemStatus() {
    try {
        // Ambil data Gateway
        const resGw = await fetch(CONFIG.api_latest_gateway_system);
        const dataGw = await resGw.json();
        
        // Ambil data Sensor (untuk count)
        const resSens = await fetch(CONFIG.api_latest_sensor);
        const dataSens = await resSens.json(); // Array

        updateOverviewUI(dataGw, dataSens[0]); // dataSens[0] adalah terbaru

    } catch (e) { console.error("Overview Error:", e); }
}

function updateOverviewUI(gwData, sensorData) {
    const now = new Date().toLocaleTimeString();
    
    // 1. Last Data Received
    const lastUp = document.getElementById('sys-last-update');
    if(lastUp) {
        lastUp.innerText = "Just now (" + now + ")";
        lastUp.style.color = "#198754";
        setTimeout(() => lastUp.style.color = "#2c3e50", 1000);
    }

    // 2. System Status (Asumsi Online jika berhasil fetch)
    const st = document.getElementById('sys-connection');
    if(st) {
        st.innerText = "System Online";
        st.style.color = "#0f5132";
        st.style.background = "#d1e7dd";
    }

    // 3. Gateway Uptime
    if (gwData && gwData.g_uptime_sec) {
        document.getElementById('sys-uptime').innerText = formatUptime(gwData.g_uptime_sec);
    }

    // 4. Total Data
    if (sensorData && sensorData.eeprom_count) {
        document.getElementById('sys-data-count').innerText = sensorData.eeprom_count.toLocaleString() + " records";
    }
}

// Helper Uptime (Sama kayak gateway.js)
function formatUptime(s) {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    let r = ""; if(d>0) r+=d+"d "; if(h>0) r+=h+"h "; return r+m+"m";
}

fetchSystemStatus();
setInterval(fetchSystemStatus, 4000);