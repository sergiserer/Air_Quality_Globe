require('dotenv').config(); 
const express = require('express'); 
const axios = require('axios');    
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors()); 
const OPENAQ_API_KEY = process.env.OPENAQ_API_KEY;

app.get('/api/air-quality', async (req, res) => {
  try {
    const PAGES_TO_FETCH = 3; 
    
    console.log(` starting...`);

    const requests = [];

    for (let page = 1; page <= PAGES_TO_FETCH; page++) {
      const url = `https://api.openaq.org/v3/parameters/2/latest`;
      const params = { limit: 1000, page: page };

      requests.push(
        axios.get(url, { 
          params: params,
          headers: { 'X-API-Key': OPENAQ_API_KEY } 
        })
        .catch(err => {
          console.warn(` Warning: front failure ${page}: ${err.message}`);
          return { data: { results: [] } }; 
        })
      );
    }

    const responses = await Promise.all(requests);
    const allRawData = responses.flatMap(r => r.data.results || []);

    console.log(` data received: ${allRawData.length}.`);

    const cleanData = allRawData
      .map(d => {
        return {
          lat: d.coordinates?.latitude,
          lng: d.coordinates?.longitude,
          city: `Loc ${d.locationsId}`, 
          value: d.value 
        };
      })
     
      .filter(d => d.lat && d.lng && d.value >= 0 && d.value <= 100);

    console.log(`sending ${cleanData.length} data.`);
    res.json(cleanData);

  } catch (error) {
    console.error(" ERROR:", error.message);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server ready on port ${PORT}`));