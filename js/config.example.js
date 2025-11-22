const CONFIG = {
    // Kredensial HiveMQ Cloud (ISI DENGAN DATA ANDA)
    mqtt_host: "URL_HOST_HIVEMQ_ANDA", 
    mqtt_port: 8884,
    mqtt_user: "USERNAME_ANDA",
    mqtt_pass: "PASSWORD_ANDA",
    
    // Topik MQTT
    topic_sensor: "/weathertech/sensor_data",
    topic_system: "/weathertech/system_data",
    topic_gateway: "/weathertech/gateway_system",
    
    // API Database (Ganti dengan URL Domain VPS Anda)
    api_history: "https://domain-anda.com/api/history",
    api_latest_sensor: "https://domain-anda.com/api/latest/sensor",
    api_latest_sensor_system: "https://domain-anda.comh/api/latest/sensor_system",
    api_latest_gateway_system: "https://domain-anda.com/api/latest/gateway_system"
};