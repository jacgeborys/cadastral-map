import { useState } from 'react';
import { MapContainer, TileLayer, WMSTileLayer, useMapEvents, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

function MapClickHandler({ onPlotSelect }) {
  const map = useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      
      if (!window.confirm('Dodać punkt?')) {
        return;
      }
      
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

  const boroughEmails = {
    'Dzielnica Bemowo': 'bemowo.wab@um.warszawa.pl',
    'Dzielnica Białołęka': 'bialoleka.architektura@um.warszawa.pl',
    'Dzielnica Bielany': 'bielany.wab@um.warszawa.pl',
    'Dzielnica Mokotów': 'mokotow.wab@um.warszawa.pl',
    'Dzielnica Ochota': 'ochota.wab@um.warszawa.pl',
    'Dzielnica Praga-Południe': 'pragapoludnie.wab@um.warszawa.pl',
    'Dzielnica Praga-Północ': 'pragapolnoc.urzad@um.warszawa.pl',
    'Dzielnica Rembertów': 'rembertow.wab@um.warszawa.pl',
    'Dzielnica Śródmieście': 'srodmiescie.wab@um.warszawa.pl',
    'Dzielnica Targówek': 'targowek.wab@um.warszawa.pl',
    'Dzielnica Ursus': 'ursus.wab@um.warszawa.pl',
    'Dzielnica Ursynów': 'ursynow.wab@um.warszawa.pl',
    'Dzielnica Wawer': 'wawer.wab@um.warszawa.pl',
    'Dzielnica Wesoła': 'wesola.wab@um.warszawa.pl',
    'Dzielnica Wilanów': 'sekretariat.udwilanow@um.warszawa.pl',
    'Dzielnica Włochy': 'wlochy.wab@um.warszawa.pl',
    'Dzielnica Wola': 'wola.wab@um.warszawa.pl',
    'Dzielnica Żoliborz': 'Zoliborz.WAB@um.warszawa.pl'
  };

  const exportToCSV = () => {
    const BOM = '\uFEFF';
    
    const headers = ['ID', 'Wojewodztwo', 'Powiat', 'Gmina', 'Obreb', 'Nr_dzialki', 'Szerokosc', 'Dlugosc'];
    const rows = selectedPlots.map(plot => {
      const obreb = plot.precinct ? `="${plot.precinct}"` : '=""';
      const nrDzialki = plot.plotNumber ? `="${plot.plotNumber}"` : '=""';
      
      return [
        `="${plot.id}"`,
        `="${plot.voivodeship}"`,
        `="${plot.county}"`,
        `="${plot.municipality}"`,
        obreb,
        nrDzialki,
        `="${plot.coordinates.lat}"`,
        `="${plot.coordinates.lng}"`
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
    a.download = `wybrane_dzialki_${timestamp}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateWAiBLetters = () => {
    const plotsByBorough = selectedPlots.reduce((acc, plot) => {
      const borough = plot.municipality;
      const plotKey = `${plot.plotNumber}-${plot.precinct}`;
      
      if (!acc[borough]) {
        acc[borough] = {};
      }
      if (!acc[borough][plotKey]) {
        acc[borough][plotKey] = {
          count: 0,
          plotNumber: plot.plotNumber,
          precinct: plot.precinct
        };
      }
      acc[borough][plotKey].count++;
      
      return acc;
    }, {});

    Object.entries(plotsByBorough).forEach(([borough, plots]) => {
      const plotDescriptions = Object.values(plots).map(plot => {
        const billboardCount = plot.count;
        const billboardWord = billboardCount === 1 ? 'bilbord' : 'bilbordy';
        return `${billboardCount} ${billboardWord} na działce nr ${plot.plotNumber} z obrębu ${plot.precinct}`;
      }).join('\n• ');

      const email = boroughEmails[borough] || 'Nie znaleziono adresu e-mail';
      const letter = `DO: ${email}

Dzień dobry,
chciałbym się dowiedzieć czy poniższe wolnostojące bilbordy posiadają wymagane prawem pozwolenie na budowę:
• ${plotDescriptions}

Pozdrawiam,
[imię i nazwisko]`;

      const blob = new Blob([letter], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WAiB_${borough.replace('Dzielnica ', '')}_${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  };

  const generatePINBLetters = () => {
    const plotsByBorough = selectedPlots.reduce((acc, plot) => {
      const borough = plot.municipality;
      const plotKey = `${plot.plotNumber}-${plot.precinct}`;
      
      if (!acc[borough]) {
        acc[borough] = {};
      }
      if (!acc[borough][plotKey]) {
        acc[borough][plotKey] = {
          count: 0,
          plotNumber: plot.plotNumber,
          precinct: plot.precinct
        };
      }
      acc[borough][plotKey].count++;
      
      return acc;
    }, {});

    Object.entries(plotsByBorough).forEach(([borough, plots]) => {
      const plotDescriptions = Object.values(plots).map(plot => {
        const billboardCount = plot.count;
        const billboardWord = billboardCount === 1 ? 'bilbord' : 'bilbordy';
        return `${billboardCount} ${billboardWord} na działce nr ${plot.plotNumber} z obrębu ${plot.precinct}`;
      }).join('\n• ');

      const cleanBorough = borough.replace('Dzielnica ', '');
      const letter = `DO: sekretariat@pinb.pl

Szanowni Państwo,
w związku z ujawnieniem wolnostojących bilbordów bez wymaganego prawem pozwolenia na budowę zwracam się z prośbą o wszczęcie postępowania z urzędu i doprowadzenie do rozbiórki samowoli budowlanych ujawnionych przez Wydział Architektury i Budownictwa Urzędu Dzielnicy ${cleanBorough}. W załączeniu pismo z Urzędu.

Dotyczy:
• ${plotDescriptions}

Z poważaniem,
[imię i nazwisko]`;

      const blob = new Blob([letter], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PINB_${cleanBorough}_${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
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
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h2 style={{ color: '#000' }}>Wybrane działki ({selectedPlots.length})</h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={generateWAiBLetters}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Generuj pisma WAiB
            </button>
            <button 
              onClick={generatePINBLetters}
              style={{
                padding: '8px 16px',
                backgroundColor: '#9C27B0',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Generuj pisma PINB
            </button>
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
              Eksportuj do CSV
            </button>
          </div>
        </div>
        
        {selectedPlots.map((plot, index) => (
          <div 
            key={index}
            style={{
              backgroundColor: 'white',
              padding: '15px',
              marginBottom: '10px',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              position: 'relative'
            }}
          >
            <button
              onClick={() => {
                const newPlots = [...selectedPlots];
                newPlots.splice(index, 1);
                setSelectedPlots(newPlots);
              }}
              style={{
                position: 'absolute',
                right: '10px',
                top: '10px',
                backgroundColor: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: 'pointer'
              }}
            >
              Usuń
            </button>
            <h3 style={{ margin: '0 0 10px 0', color: '#000' }}>Działka {plot.plotNumber}</h3>
            <p style={{ color: '#000' }}><strong>Województwo:</strong> {plot.voivodeship}</p>
            <p style={{ color: '#000' }}><strong>Powiat:</strong> {plot.county}</p>
            <p style={{ color: '#000' }}><strong>Gmina:</strong> {plot.municipality}</p>
            <p style={{ color: '#000' }}><strong>Obręb:</strong> {plot.precinct}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;