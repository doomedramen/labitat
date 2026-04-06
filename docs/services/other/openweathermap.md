# OpenWeatherMap

Current weather data from OpenWeatherMap API.

## Configuration

| Field     | Type     | Required | Description                                                  |
| --------- | -------- | -------- | ------------------------------------------------------------ |
| API Key   | Password | Yes      | OpenWeatherMap API key                                       |
| Latitude  | Number   | Yes      | Latitude coordinate (e.g., 52.52)                            |
| Longitude | Number   | Yes      | Longitude coordinate (e.g., 13.41)                           |
| Units     | Select   | No       | Temperature units: Metric (°C), Imperial (°F), or Kelvin (K) |

## Finding Your API Key

1. Sign up at [OpenWeatherMap](https://openweathermap.org/api)
2. Go to your account dashboard
3. Copy your API key
4. Note: Free tier allows 1,000 calls per day

## Finding Coordinates

1. Use [Google Maps](https://maps.google.com) or similar service
2. Right-click on your location
3. Copy the latitude and longitude values

## Widget Displays

- Current temperature
- Feels-like temperature
- Weather condition icon
- Weather description
- Humidity percentage
- Atmospheric pressure (hPa)
- Wind speed
- Cloudiness percentage

## Notes

Fetches current weather data from OpenWeatherMap's free API. The widget displays comprehensive weather information with intuitive icons and statistics. Default polling interval is 60 seconds to stay within API rate limits.
