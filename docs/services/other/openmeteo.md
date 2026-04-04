# OpenMeteo Weather

Weather display using the free [Open-Meteo](https://open-meteo.com/) API. No API key required.

## Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Latitude | Number | Yes | Location latitude |
| Longitude | Number | Yes | Location longitude |

## Finding Your Coordinates

1. Visit [open-meteo.com](https://open-meteo.com/)
2. Use the interactive map or search to find your location
3. Note the latitude and longitude values

Alternatively, search "[your city] coordinates" on any search engine.

## Widget Displays

- Current temperature (°C)
- Weather condition with icon
- Wind speed (km/h)
- Humidity (%)
- Day/night indicator

## Notes

- Open-Meteo is free and requires no API key
- Data updates every 60 seconds by default
- Supports all WMO weather codes including thunderstorms, snow, rain, and fog
