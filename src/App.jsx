import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix icon mặc định Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Icon màu đỏ cho vị trí search
const redIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Component thay đổi vị trí camera
function ChangeView({ center }) {
  const map = useMap();
  map.setView(center, 15);
  return null;
}

// Component xử lý double-click
function MapDoubleClickHandler({ onDoubleClick }) {
  useMapEvents({
    dblclick(e) {
      onDoubleClick(e.latlng);
    },
  });
  return null;
}

function App() {
  //console.log(import.meta.env.VITE_OPENWEATHER_KEY);
  console.log("OPENWEATHER KEY =", import.meta.env.VITE_OPENWEATHER_KEY);

  const [query, setQuery] = useState("");
  const [center, setCenter] = useState([10.76391, 106.68223]); // HCMUS mặc định
  const [gpsPoint, setGpsPoint] = useState(null);
  const [pois, setPois] = useState([]);
  const [message, setMessage] = useState("");

  // Gợi ý autocomplete
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);

  // Weather State
  const [weather, setWeather] = useState(null)

  // Fallback mặc định: HCMUS
  const defaultCenter = [10.76391, 106.68223];

  // FETCH WEATHER API - Ham lay weather
  const fetchWeather = async (lat, lon) => {
    try {
      const apiKey = import.meta.env.VITE_OPENWEATHER_KEY;

      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?` +
          new URLSearchParams({
            lat,
            lon,
            units: "metric",
            lang: "vi",
            appid: apiKey,
          })
      );

      const data = await res.json();

      setWeather({
        temp: data.main.temp,
        desc: data.weather[0].description,
        humidity: data.main.humidity,
        wind: data.wind.speed,
        icon: data.weather[0].icon,
        name: data.name,
      });
    } catch (err) {
      console.log("Weather API error:", err);
    }
  };

  // Hàm lấy POI quanh một tọa độ
  const fetchPOI = async (lat, lon) => {
    try {
      const overpassQuery = `
        [out:json][timeout:25];
        node(around:1000, ${lat}, ${lon})["amenity"];
        out;
      `;

      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: overpassQuery,
      });

      const data = await res.json();

      const results = data.elements.slice(0, 5).map((el) => ({
        id: el.id,
        lat: el.lat,
        lon: el.lon,
        name: el.tags?.name || el.tags?.amenity || "Không tên",
        type: el.tags?.amenity || "unknown",
      }));

      setPois(results);
    } catch (err) {
      console.log(err);
      setPois([]);
    }
  };

  // Lấy GPS người dùng
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;

          setCenter([lat, lon]);
          setGpsPoint({
            coords: [lat, lon],
            type: "unknown",
            name: "Vị trí người dùng"
          });
          setMessage("Đã lấy GPS người dùng.");
          fetchPOI(lat, lon);
          fetchWeather(lat, lon);
        },
        () => {
          setCenter(defaultCenter);
          setGpsPoint({
            coords: defaultCenter,
            type: "Trường ĐH",
            name: "Trường ĐH KHTN"
          });
          setMessage("Không lấy được GPS → dùng vị trí Trường ĐH KHTN.");
          fetchPOI(defaultCenter[0], defaultCenter[1]);
        }
      );
    } else {
      setCenter(defaultCenter);
      setGpsPoint({
        coords: defaultCenter,
        type: "Trường ĐH",
        name: "Trường ĐH KHTN"
      });
      setMessage("Thiết bị không hỗ trợ GPS → dùng vị trí Trường ĐH KHTN.");
      fetchPOI(defaultCenter[0], defaultCenter[1]);
    }
  }, []);

  // Tìm kiếm địa điểm
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setMessage("Đang tìm kiếm...");
    setPois([]);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          new URLSearchParams({
            q: `${query}, Vietnam`,
            format: "json",
            limit: 1,
          })
      );

      const data = await res.json();

      if (data.length === 0) {
        setMessage("Không tìm thấy địa điểm!");
        return;
      }

      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);

      setCenter([lat, lon]);
      setGpsPoint({
        coords: [lat, lon],
        name: data[0].name || data[0].display_name.split(",")[0] || query
      });

      fetchPOI(lat, lon);
      fetchWeather(lat, lon);

      setMessage("Đã tìm thấy địa điểm.");
    } catch (err) {
      setMessage("Lỗi khi tìm kiếm!");
    }
  };

  // Gợi ý autocomplete
  const handleTyping = (text) => {
    setQuery(text);

    if (typingTimeout) clearTimeout(typingTimeout);

    const timeout = setTimeout(async () => {
      if (text.length < 2) {
        setSuggestions([]);
        return;
      }

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          new URLSearchParams({
            q: `${text}, Vietnam`,
            format: "json",
            addressdetails: 1,
            limit: 5,
          })
      );

      const data = await res.json();
      setSuggestions(data);
      setShowSuggestions(true);
    }, 400);

    setTypingTimeout(timeout);
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* SEARCH BAR */}
      <div
        style={{
          padding: "10px",
          background: "#f0f0f0",
          borderBottom: "1px solid #ccc",
          position: "relative",
        }}
      >
        <form onSubmit={handleSearch} style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            placeholder="Nhập địa điểm ở Việt Nam..."
            value={query}
            onChange={(e) => handleTyping(e.target.value)}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              color: "white",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "8px 16px",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
            }}
          >
            Tìm
          </button>
        </form>

        {/* WEATHER UI */}
        {weather && (
          <div
            style={{
              marginTop: "10px",
              padding: "10px",
              background: "white",
              borderRadius: "8px",
              border: "1px solid #ccc",
              color: "black",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <img
              src={`https://openweathermap.org/img/wn/${weather.icon}.png`}
              alt="icon"
            />
            <div>
              <b>{weather.name}</b> — {weather.temp}°C — {weather.desc} <br />
              Độ ẩm: {weather.humidity}% — Gió: {weather.wind} m/s
            </div>
          </div>
        )}

        {/* AUTOCOMPLETE LIST */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            style={{
              background: "white",
              color: "black",
              border: "1px solid #ccc",
              position: "absolute",
              top: "60px",
              width: "calc(100% - 20px)",
              maxHeight: "200px",
              overflowY: "auto",
              zIndex: 9999,
            }}
          >
            {suggestions.map((s) => (
              <div
                key={s.place_id}
                style={{
                  padding: "8px",
                  cursor: "pointer",
                  borderBottom: "1px solid #eee",
                }}
                onClick={() => {
                  const lat = parseFloat(s.lat);
                  const lon = parseFloat(s.lon);

                  setCenter([lat, lon]);
                  setGpsPoint({
                    coords: [lat, lon],
                    name: query
                  });
                  fetchPOI(lat, lon);
                  fetchWeather(lat, lon);

                  setQuery(s.display_name);
                  setShowSuggestions(false);
                  setSuggestions([]);
                }}
              >
                {s.display_name}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "5px" }}>{message}</div>
      </div>

      {/* MAP */}
      <div style={{ flex: 1 }}>
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <ChangeView center={center} />

          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {/* Marker trung tâm (đỏ) */}
          {gpsPoint && (
            <Marker position={gpsPoint.coords} icon={redIcon}>
              {/* POPUP (Click vào) */}
              <Popup>
                <div>
                  <b>{gpsPoint.name}</b> <br />
                  Toạ độ: ({gpsPoint.coords[0].toFixed(5)}, {gpsPoint.coords[1].toFixed(5)}) <br /><br />

                  {weather ? (
                    <div style={{ lineHeight: "1.4" }}>
                      <img
                        src={`https://openweathermap.org/img/wn/${weather.icon}.png`}
                        alt="icon"
                        style={{ verticalAlign: "middle" }}
                      />
                      <b> {weather.temp}°C — {weather.desc}</b> <br />
                      Độ ẩm: {weather.humidity}% <br />
                      Gió: {weather.wind} m/s <br />
                      Khu vực: {weather.name}
                    </div>
                  ) : (
                    <i>Đang tải thời tiết...</i>
                  )}
                </div>
              </Popup>
                
              {/* TOOLTIP (Rê chuột) */}
              <Tooltip direction="top">
                <b>{gpsPoint.name}</b> <br />
                ({gpsPoint.coords[0].toFixed(5)}, {gpsPoint.coords[1].toFixed(5)}) <br />
                {weather && `${weather.temp}°C • ${weather.desc}`}
              </Tooltip>
            </Marker>
          )}

          {/* POI markers */}
          {pois.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lon]}>
              
              {/* POPUP (Click vào) */}
              <Popup>
                <b>{p.name}</b> <br />
                Loại: {p.type} <br />
                Toạ độ: ({p.lat.toFixed(5)}, {p.lon.toFixed(5)}) <br /><br />

                {/* WEATHER */}
                {weather ? (
                  <div style={{ lineHeight: "1.4" }}>
                        <img
                          src={`https://openweathermap.org/img/wn/${weather.icon}.png`}
                          alt="icon"
                          style={{ verticalAlign: "middle" }}
                        />
                        <b> {weather.temp}°C — {weather.desc}</b> <br />
                        Độ ẩm: {weather.humidity}% <br />
                        Gió: {weather.wind} m/s <br />
                        Khu vực: {weather.name}
                      </div>
                    ) : (
                      <i>Đang tải thời tiết...</i>
                    )}
                </Popup>

              {/* TOOLTIP (Rê chuột) */}
              <Tooltip direction="top">
                <b>{p.name}</b> <br />
                {p.type} <br />
                ({p.lat.toFixed(5)}, {p.lon.toFixed(5)}) <br />
                {weather && `${weather.temp}°C • ${weather.desc}`}
              </Tooltip>
            </Marker>
          ))}

          {/* DOUBLE CLICK HANDLE */}
          <MapDoubleClickHandler
            onDoubleClick={(latlng) => {
              const lat = latlng.lat;
              const lon = latlng.lng;

              setGpsPoint({
                coords: [lat, lon],
                type: "unknown",
                name: "Vị trí chọn"
              });
              setCenter([lat, lon]);
              fetchPOI(lat, lon);
              fetchWeather(lat, lon);

              setMessage("Đã chọn vị trí trên bản đồ.");
            }}
          />
        </MapContainer>
      </div>
    </div>
  );
}

export default App;
