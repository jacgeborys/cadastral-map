import { useState } from 'react';
import { MapContainer, TileLayer, WMSTileLayer, useMapEvents, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

function MapClickHandler({ onPlotSelect }) {
  const map = useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      
      const bounds = map.getBounds();
      const size = map.getSize();
      const x = Math.round((lng - bounds.getWest()) / (bounds.getEast() - bounds.getWest()) * size.x);
      const y = Math.round((bounds.getNorth() - lat) / (bounds.getNorth() - bounds.getSouth()) * size.y);
      
      const wmsUrl = 'https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow';
      const params = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: '1.3.0',
        REQUEST: 'GetFeatureInfo',
        LAYERS: 'dzialki',
        QUERY_LAYERS: 'dzialki',
        INFO_FORMAT: 'application/vnd.ogc.gml',
        I: x,
        J: y,
        WIDTH: size.x,
        HEIGHT: size.y,
        CRS: 'EPSG:4326',
        BBOX: `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`
      });

      try {
        const response = await fetch(`${wmsUrl}?${params}`);
        const text = await response.text();
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        
        const plotInfo = {
          id: getAttributeValue(xmlDoc, "Identyfikator działki"),
          voivodeship: getAttributeValue(xmlDoc, "Województwo"),
          county: getAttributeValue(xmlDoc, "Powiat"),
          municipality: getAttributeValue(xmlDoc, "Gmina"),
          precinct: getAttributeValue(xmlDoc, "Obręb"),
          plotNumber: getAttributeValue(xmlDoc, "Numer działki"),
          area: getAttributeValue(xmlDoc, "Pole pow. w ewidencji gruntów (ha)"),
          coordinates: { lat, lng }
        };
        
        onPlotSelect(plotInfo);
      } catch (error) {
        console.error('Error fetching plot info:', error);
      }
    }
  });
  return null;
}

function getAttributeValue(xmlDoc, attributeName) {
  const element = xmlDoc.querySelector(`Attribute[Name="${attributeName}"]`);
  return element ? element.textContent : '';
}

function App() {
  const [selectedPlots, setSelectedPlots] = useState([]);
  
  const handlePlotSelect = (plotInfo) => {
    setSelectedPlots(prev => [...prev, plotInfo]);
  };

  const exportToCSV = () => {
    const BOM = '\uFEFF';
    
    const headers = ['ID', 'Wojewodztwo', 'Powiat', 'Gmina', 'Obreb', 'Nr dzialki', 'Powierzchnia', 'Szerokosc', 'Dlugosc'];
    const rows = selectedPlots.map(plot => {
      const obreb = plot.precinct ? `'${plot.precinct}` : '';
      
      return [
        `"${plot.id}"`,
        `"${plot.voivodeship}"`,
        `"${plot.county}"`,
        `"${plot.municipality}"`,
        `"${obreb}"`,
        `"${plot.plotNumber}"`,
        `"${plot.area}"`,
        `"${plot.coordinates.lat}"`,
        `"${plot.coordinates.lng}"`
      ];
    });
    
    const csvContent = BOM + [
      headers.map(header => `"${header}"`).join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `selected_plots_${timestamp}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <div style={{ flex: '3', position: 'relative' }}>
        <MapContainer 
          center={[52.237049, 21.017532]}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <WMSTileLayer
            url="https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow"
            layers="dzialki"
            format="image/png"
            transparent={true}
            version="1.3.0"
          />
          <MapClickHandler onPlotSelect={handlePlotSelect} />
          {selectedPlots.map((plot, index) => (
            <Marker 
              key={index}
              position={[plot.coordinates.lat, plot.coordinates.lng]}
            />
          ))}
        </MapContainer>
      </div>
      
      <div style={{ flex: '1', padding: '20px', overflowY: 'auto', backgroundColor: '#f5f5f5' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2>Selected Plots ({selectedPlots.length})</h2>
          <button 
            onClick={exportToCSV}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Export to CSV
          </button>
        </div>
        
        {selectedPlots.map((plot, index) => (
          <div 
            key={index}
            style={{
              backgroundColor: 'white',
              padding: '15px',
              marginBottom: '10px',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{ margin: '0 0 10px 0' }}>Plot {plot.plotNumber}</h3>
            <p><strong>ID:</strong> {plot.id}</p>
            <p><strong>Województwo:</strong> {plot.voivodeship}</p>
            <p><strong>Powiat:</strong> {plot.county}</p>
            <p><strong>Gmina:</strong> {plot.municipality}</p>
            <p><strong>Obręb:</strong> {plot.precinct}</p>
            <p><strong>Powierzchnia:</strong> {plot.area} ha</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;