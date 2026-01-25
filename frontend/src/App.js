import React, { useState, useEffect, useMemo, useRef } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';

const REGIONS = {
  WORLD: { 
    label: 'Global', 
    view: { lat: 15, lng: 0, altitude: 2.0 } 
  },
  EUROPE: { 
    label: 'Europe', 
    view: { lat: 50, lng: 10, altitude: 0.7 } 
  },
  USA: { 
    label: 'USA', 
    view: { lat: 39, lng: -98, altitude: 0.9 } 
  }
};

function App() {
  const [points, setPoints] = useState([]);
  const [activeRegion, setActiveRegion] = useState('WORLD');
  const globeEl = useRef();

  useEffect(() => {
    fetch('/api/air-quality')
      .then(res => res.json())
      .then(data => {
        setPoints(data);
      })
      .catch(err => console.error("Error loading data:", err));
  }, []);

  const handleRegionClick = (regionKey) => {
    const region = REGIONS[regionKey];
    setActiveRegion(regionKey);
    if (globeEl.current) {
      globeEl.current.pointOfView(region.view, 1500);
    }
  };

  const glowTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128; // Reducido de 256 a 128 para mejor rendimiento con 3000 nodos
    canvas.height = 128;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }, []);

  const getPointColor = (value) => {
    if (value <= 12) return new THREE.Color(0x00ff64); // Verde
    if (value <= 35) return new THREE.Color(0xffdc00); // Amarillo
    if (value <= 55) return new THREE.Color(0xff6400); // Naranja
    return new THREE.Color(0xff0000);                  // Rojo
  };

  const getDynamicScale = (value) => {
    return value > 35 ? 10.0 : 5.0; 
  };

  return (
    <div style={{ backgroundColor: '#000', height: '100vh', position: 'relative' }}>
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        // nodes
        customLayerData={points}
        customThreeObject={d => {
          const geometry = new THREE.PlaneGeometry(1, 1);
          const material = new THREE.MeshBasicMaterial({
            map: glowTexture,
            color: getPointColor(d.value),
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
          });
          const mesh = new THREE.Mesh(geometry, material);
          const scale = getDynamicScale(d.value);
          mesh.scale.set(scale, scale, scale);
          return mesh;
        }}
        customThreeObjectUpdate={(obj, d) => {
          if (globeEl.current) {
            Object.assign(obj.position, globeEl.current.getCoords(d.lat, d.lng, 0.008));
          }
          obj.lookAt(new THREE.Vector3(0, 0, 0));
        }}

        enablePointerInteraction={true}
        atmosphereColor="#3a228a"
        atmosphereAltitude={0.15}
      />

      {/* UI Overlay */}
      <div style={{
        position: 'absolute', top: '20px', left: '20px', color: 'white',
        fontFamily: 'Helvetica, Arial, sans-serif', pointerEvents: 'none', zIndex: 10
      }}>
        <h1 style={{margin: 0, fontSize: '24px', letterSpacing: '2px', fontWeight: '300'}}>
          GLOBAL AIR <span style={{fontWeight:'bold', color: '#4cc9f0'}}>QUALITY</span>
        </h1>
        <p style={{fontSize: '12px', opacity: 0.7, marginTop: '5px'}}>
          {points.length > 0 ? `Visualizing ${points.length} active sensors` : 'Loading  data...'}
        </p>
      </div>

      <div style={{
        position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: '15px', zIndex: 10
      }}>
        {Object.keys(REGIONS).map(key => (
          <button
            key={key}
            onClick={() => handleRegionClick(key)}
            style={{
              background: activeRegion === key ? '#4cc9f0' : 'rgba(255,255,255,0.1)',
              color: activeRegion === key ? '#000' : '#fff',
              border: '1px solid #4cc9f0',
              padding: '10px 20px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(5px)'
            }}
          >
            {REGIONS[key].label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;