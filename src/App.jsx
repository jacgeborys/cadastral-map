import { MapContainer, TileLayer, WMSTileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

function App() {
  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <MapContainer 
        center={[52.237049, 21.017532]} // Warsaw coordinates
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
          crs={L.CRS.EPSG4326}
          srs="EPSG:4326"
        />
      </MapContainer>
    </div>
  );
}

export default App;