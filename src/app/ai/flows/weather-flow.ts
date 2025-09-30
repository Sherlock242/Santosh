
'use server';
/**
 * @fileOverview A utility for fetching weather information using the Open-Meteo API.
 *
 * - getWeather - A function that handles the weather data fetching process.
 * - WeatherInput - The input type for the getWeather function.
 * - WeatherOutput - The return type for the getWeather function.
 */

export interface WeatherInput {
  query?: string;
  latitude?: number;
  longitude?: number;
}

export interface WeatherOutput {
  summary: string;
}

interface GeocodingResult {
  latitude: number;
  longitude: number;
  name: string;
  country: string;
}

function getWeatherDescription(code: number): string {
    const descriptions: { [key: number]: string } = {
        0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
        45: 'Fog', 48: 'Depositing rime fog',
        51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
        56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
        61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
        66: 'Light freezing rain', 67: 'Heavy freezing rain',
        71: 'Slight snow fall', 73: 'Moderate snow fall', 75: 'Heavy snow fall',
        77: 'Snow grains',
        80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
        85: 'Slight snow showers', 86: 'Heavy snow showers',
        95: 'Slight or moderate thunderstorm',
        96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
    };
    return descriptions[code] || 'Unknown weather';
}

const getNotFoundResponse = (query: string) => {
    const responses = [
        `I couldn't find a location named "${query}". Please be more specific.`,
        `I can't seem to locate "${query}". Is the spelling correct?`,
        `Sorry, I don't have any weather data for a place called "${query}".`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}


export async function getWeather(input: WeatherInput): Promise<WeatherOutput> {
  const { query, latitude, longitude } = input;
  
  let location: GeocodingResult;

  if (latitude && longitude) {
    // Reverse geocode to get location name from coordinates
    const reverseGeocodeUrl = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
    reverseGeocodeUrl.searchParams.append('latitude', latitude.toString());
    reverseGeocodeUrl.searchParams.append('longitude', longitude.toString());
    reverseGeocodeUrl.searchParams.append('localityLanguage', 'en');
    try {
        const geoResponse = await fetch(reverseGeocodeUrl.toString());
        const geoData = await geoResponse.json();
        location = {
            latitude,
            longitude,
            name: geoData.city || geoData.locality || 'your location',
            country: geoData.countryName || '',
        };
    } catch (error) {
        console.error('Reverse Geocoding API error:', error);
        // Fallback if reverse geocoding fails
        location = { latitude, longitude, name: 'your current location', country: '' };
    }
  } else if (query) {
      // Geocode the location name to get coordinates
      const geocodeUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
      geocodeUrl.searchParams.append('name', query);
      geocodeUrl.searchParams.append('count', '1');
      try {
        const geoResponse = await fetch(geocodeUrl.toString());
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
          return { summary: getNotFoundResponse(query) };
        }
        location = geoData.results[0];
      } catch (error) {
        console.error('Geocoding API error:', error);
        return { summary: 'There was an error finding the location. Please try again later.' };
      }
  } else {
    return { summary: "Please provide a location name or coordinates." };
  }

  // Fetch the weather for the found coordinates
  const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
  weatherUrl.searchParams.append('latitude', location.latitude.toString());
  weatherUrl.searchParams.append('longitude', location.longitude.toString());
  weatherUrl.searchParams.append('current', 'temperature_2m,weather_code');
  weatherUrl.searchParams.append('temperature_unit', 'celsius');

  try {
    const weatherResponse = await fetch(weatherUrl.toString());
    const weatherData = await weatherResponse.json();
    
    if (!weatherData.current) {
        return { summary: `Could not retrieve current weather data for ${location.name}.` };
    }

    const temp = weatherData.current.temperature_2m;
    const weatherCode = weatherData.current.weather_code;
    const weatherDescription = getWeatherDescription(weatherCode);

    const summary = `The current weather in ${location.name}, ${location.country} is ${weatherDescription} with a temperature of ${temp}°C.`;

    return { summary };
  } catch (error) {
    console.error('Weather API error:', error);
    return { summary: 'There was an error fetching the weather data. Please try again later.' };
  }
}
