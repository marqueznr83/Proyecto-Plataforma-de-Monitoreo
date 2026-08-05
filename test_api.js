const token = "75433vd880684dfp20nav03t8zb10xp1";

async function testGrowattAPI() {
  const domains = [
    "https://openapi.growatt.com",
    "https://openapi-us.growatt.com",
    "https://openapi-cn.growatt.com"
  ];

  for (const domain of domains) {
    console.log(`\nTesting ${domain}...`);
    try {
      const res = await fetch(`${domain}/v1/plant/list`, {
        headers: { token }
      });
      const data = await res.json();
      console.log(`Response from ${domain}:`, JSON.stringify(data, null, 2));
      
      if (data.error_code === 0 && data.data && data.data.plants && data.data.plants.length > 0) {
        const plantId = data.data.plants[0].plant_id;
        console.log(`\nFetching devices for plant ${plantId}...`);
        
        const devRes = await fetch(`${domain}/v1/device/list?plant_id=${plantId}`, {
          headers: { token }
        });
        const devData = await devRes.json();
        console.log(`Devices:`, JSON.stringify(devData, null, 2));
        
        if (devData.error_code === 0 && devData.data && devData.data.devices) {
            for (const dev of devData.data.devices) {
                console.log(`\nFetching data for device ${dev.device_sn} (Type ${dev.type})...`);
                const sn = dev.device_sn;
                
                // Try inverter data
                if (dev.type === 1) {
                    const invRes = await fetch(`${domain}/v1/device/inverter/inverter_last_data`, {
                        method: 'POST',
                        headers: { token, 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: `inverter_sn=${sn}`
                    });
                    console.log(`Inverter Data:`, JSON.stringify(await invRes.json(), null, 2));
                }
                
                // Try storage data
                if (dev.type === 2) {
                    const stoRes = await fetch(`${domain}/v1/device/storage/storage_last_data`, {
                        method: 'POST',
                        headers: { token, 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: `storage_sn=${sn}`
                    });
                    console.log(`Storage Data:`, JSON.stringify(await stoRes.json(), null, 2));
                }
            }
        }
      }
    } catch (e) {
      console.error(`Failed to fetch from ${domain}:`, e.message);
    }
  }
}

testGrowattAPI();
