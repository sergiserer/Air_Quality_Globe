import React, { useState, useEffect, useMemo, useRef } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';

function App() {
  const [points, setPoints] = useState([]);
  const globeEl = useRef();

  useEffect(() => {
    fetch('http://localhost:5000/api/air-quality')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPoints(data);
        } else {
          console.error("Invalid data format received:", data);
          setPoints([]);
        }
      })
      .catch(err => {
        console.error("Network error:", err);
        setPoints([]);
      });
  }, []);

  // Generate a radial gradient texture for the points
  const glowTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
  }, []);

  // Determine color based on PM2.5 value
  const getPointColor = (value) => {
    if (value <= 10) return new THREE.Color(0x00ff64); // Green
    if (value <= 30) return new THREE.Color(0xffdc00); // Yellow
    if (value <= 50) return new THREE.Color(0xff6400); // Orange
    return new THREE.Color(0xff0000);                  // Red
  };

  // Scale cloud size based on pollution severity
  const getDynamicScale = (value) => {
    if (value <= 10) return 8.0;
    if (value <= 30) return 8.0;
    if (value <= 50) return 9.0;
    return 13.0;
  };

  // Adjust opacity based on pollution severity
  const getDynamicOpacity = (value) => {
    if (value <= 10) return 0.25;
    if (value <= 30) return 0.25;
    if (value <= 50) return 0.35;
    return 0.35;
  };

  return (
    <div style={{ backgroundColor: '#000', height: '100vh' }}>
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        customLayerData={Array.isArray(points) ? points : []}
        customThreeObject={d => {
          const geometry = new THREE.PlaneGeometry(1, 1);
          const material = new THREE.MeshBasicMaterial({
            map: glowTexture,
            color: getPointColor(d.value),
            transparent: true,
            opacity: getDynamicOpacity(d.value),
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
            Object.assign(
              obj.position,
              globeEl.current.getCoords(d.lat, d.lng, 0.01)
            );
          }
          obj.lookAt(new THREE.Vector3(0, 0, 0)); 
        }}

        enablePointerInteraction={true}
        showAtmosphere={true}
        atmosphereColor="#3a228a"
        atmosphereAltitude={0.2}
      />

      <div style={{
        position: 'absolute', top: '20px', left: '20px', color: 'white',
        fontFamily: 'Helvetica, Arial, sans-serif', pointerEvents: 'none'
      }}>
        <h1 style={{margin: 0, fontSize: '24px', letterSpacing: '2px', fontWeight: '300'}}>
          GLOBAL AIR <span style={{fontWeight:'bold', color: '#4cc9f0'}}>QUALITY</span>
        </h1>
      </div>
    </div>
  );
}

export default App;