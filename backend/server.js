const express = require('express'); 
const axios = require('axios');    
const cors = require('cors');     
const app = express();

app.use(cors());

const OPENAQ_API_KEY = process.env.OPENAQ_API_KEY;

app.get('/api/air-quality', async (req, res) => {
  try {
    console.log(" Connecting to OpenAQ (Endpoint LATEST)...");

    const response = await axios.get('https://api.openaq.org/v3/parameters/2/latest', {
      params: { 
        limit: 1000,      
      },
      headers: { 'X-API-Key': OPENAQ_API_KEY }
    });

    console.log(`received ${response.data.results.length} data.`);

    const cleanData = response.data.results
      .filter(d => d.coordinates && d.value >= 0) 
      .map(d => {
        return {
          lat: d.coordinates.latitude,
          lng: d.coordinates.longitude,
          city: `Location ${d.locationsId || 'Unknown'}`, 
          value: d.value,
          color: d.value > 35 ? '#ff0000' : d.value > 12 ? '#f1c40f' : '#2ecc71'
        };
      });

    console.log(` OK! sending ${cleanData.length} data.`);
    res.json(cleanData);

  } catch (error) {
    const msg = error.response?.data || error.message;
    console.error(" Error API:", JSON.stringify(msg, null, 2));
    res.status(500).json({ error: 'Failed to fetch latest data' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend v3 (Modo Latest) ready on ${PORT}`);
});