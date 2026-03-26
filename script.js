// ========== API CONFIGURATION ==========
// IMPORTANT: Replace with your own API key from OpenWeatherMap
// Get your free API key at: https://openweathermap.org/api
const API_KEY = 'YOUR_API_KEY_HERE'; // <-- REPLACE WITH YOUR ACTUAL API KEY
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Note: For production, use environment variables or a backend proxy
// This demo uses direct API calls - be mindful of rate limits

// ========== DOM Elements ==========
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const useLocationBtn = document.getElementById('useLocationBtn');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const weatherContent = document.getElementById('weatherContent');
const errorMessage = document.getElementById('errorMessage');
const retryBtn = document.getElementById('retryBtn');
const suggestionsDiv = document.getElementById('suggestions');

// Current weather elements
const cityNameEl = document.getElementById('cityName');
const currentDateEl = document.getElementById('currentDate');
const currentTempEl = document.getElementById('currentTemp');
const weatherIconEl = document.getElementById('weatherIcon');
const weatherDescEl = document.getElementById('weatherDesc');
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('windSpeed');
const pressureEl = document.getElementById('pressure');
const visibilityEl = document.getElementById('visibility');
const sunriseEl = document.getElementById('sunrise');
const sunsetEl = document.getElementById('sunset');
const feelsLikeEl = document.getElementById('feelsLike');
const cloudCoverEl = document.getElementById('cloudCover');

// Forecast container
const forecastContainer = document.getElementById('forecastContainer');

// Unit toggle
const celsiusBtn = document.getElementById('celsiusBtn');
const fahrenheitBtn = document.getElementById('fahrenheitBtn');

// ========== State Management ==========
let currentUnit = 'metric'; // 'metric' for °C, 'imperial' for °F
let currentCity = '';
let debounceTimeout;
let abortController = null;

// Popular cities for suggestions (common search terms)
const popularCities = [
  'London', 'New York', 'Tokyo', 'Paris', 'Sydney', 
  'Berlin', 'Moscow', 'Dubai', 'Singapore', 'Mumbai',
  'Beijing', 'Los Angeles', 'Chicago', 'Toronto', 'Amsterdam'
];

// ========== Helper Functions ==========
function formatDate(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function formatTime(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function getWeatherIconUrl(iconCode) {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

function convertTemp(temp) {
  if (currentUnit === 'metric') return temp;
  return (temp * 9/5) + 32;
}

function formatTemp(temp) {
  const converted = convertTemp(temp);
  const unit = currentUnit === 'metric' ? '°C' : '°F';
  return `${Math.round(converted)}${unit}`;
}

function formatSpeed(speed) {
  const unit = currentUnit === 'metric' ? 'km/h' : 'mph';
  const converted = currentUnit === 'metric' ? speed : speed * 0.621371;
  return `${Math.round(converted)} ${unit}`;
}

// ========== Debounced Search ==========
function debouncedSearch() {
  clearTimeout(debounceTimeout);
  const query = cityInput.value.trim();
  
  if (query.length < 2) {
    suggestionsDiv.classList.remove('show');
    return;
  }
  
  debounceTimeout = setTimeout(() => {
    showSuggestions(query);
  }, 300);
}

// ========== Search Suggestions ==========
function showSuggestions(query) {
  const filtered = popularCities.filter(city => 
    city.toLowerCase().includes(query.toLowerCase())
  );
  
  if (filtered.length === 0) {
    suggestionsDiv.classList.remove('show');
    return;
  }
  
  suggestionsDiv.innerHTML = filtered.map(city => `
    <div class="suggestion-item" data-city="${city}">
      ${city}
    </div>
  `).join('');
  
  suggestionsDiv.classList.add('show');
  
  document.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', () => {
      cityInput.value = item.dataset.city;
      suggestionsDiv.classList.remove('show');
      fetchWeatherData(item.dataset.city);
    });
  });
}

// ========== Fetch Weather Data ==========
async function fetchWeatherData(city) {
  // Cancel previous request if exists
  if (abortController) {
    abortController.abort();
  }
  
  abortController = new AbortController();
  
  // Show loading, hide other states
  loadingState.classList.remove('hidden');
  errorState.classList.add('hidden');
  weatherContent.classList.add('hidden');
  
  try {
    // Fetch current weather
    const currentResponse = await fetch(
      `${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${currentUnit}`,
      { signal: abortController.signal }
    );
    
    if (!currentResponse.ok) {
      throw new Error(currentResponse.status === 404 ? 'City not found' : 'Failed to fetch weather data');
    }
    
    const currentData = await currentResponse.json();
    
    // Fetch 5-day forecast
    const forecastResponse = await fetch(
      `${BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${currentUnit}`,
      { signal: abortController.signal }
    );
    
    if (!forecastResponse.ok) {
      throw new Error('Failed to fetch forecast data');
    }
    
    const forecastData = await forecastResponse.json();
    
    // Update UI with data
    updateCurrentWeather(currentData);
    updateForecast(forecastData);
    updateAdditionalInfo(currentData);
    
    currentCity = city;
    loadingState.classList.add('hidden');
    weatherContent.classList.remove('hidden');
    
    // Save last searched city
    localStorage.setItem('lastCity', city);
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Fetch aborted');
      return;
    }
    
    loadingState.classList.add('hidden');
    errorState.classList.remove('hidden');
    errorMessage.textContent = error.message || 'Unable to fetch weather data. Please check your connection and try again.';
  }
}

// ========== Update Current Weather ==========
function updateCurrentWeather(data) {
  cityNameEl.textContent = data.name;
  currentDateEl.textContent = formatDate(data.dt);
  currentTempEl.textContent = formatTemp(data.main.temp);
  weatherIconEl.src = getWeatherIconUrl(data.weather[0].icon);
  weatherIconEl.alt = data.weather[0].description;
  weatherDescEl.textContent = data.weather[0].description;
  humidityEl.textContent = `${data.main.humidity}%`;
  windSpeedEl.textContent = formatSpeed(data.wind.speed);
  pressureEl.textContent = `${data.main.pressure} hPa`;
  
  // Visibility (convert from meters to km)
  const visibilityKm = (data.visibility / 1000).toFixed(1);
  visibilityEl.textContent = `${visibilityKm} km`;
  
  feelsLikeEl.textContent = formatTemp(data.main.feels_like);
  cloudCoverEl.textContent = `${data.clouds.all}%`;
  sunriseEl.textContent = formatTime(data.sys.sunrise);
  sunsetEl.textContent = formatTime(data.sys.sunset);
}

// ========== Update Forecast ==========
function updateForecast(data) {
  // Group forecast by day (remove entries for every 3 hours)
  const dailyForecasts = {};
  
  data.list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const day = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dateKey = date.toDateString();
    
    if (!dailyForecasts[dateKey]) {
      dailyForecasts[dateKey] = {
        day: day,
        date: dateKey,
        temp_min: item.main.temp,
        temp_max: item.main.temp,
        icon: item.weather[0].icon,
        description: item.weather[0].description
      };
    } else {
      dailyForecasts[dateKey].temp_min = Math.min(dailyForecasts[dateKey].temp_min, item.main.temp);
      dailyForecasts[dateKey].temp_max = Math.max(dailyForecasts[dateKey].temp_max, item.main.temp);
    }
  });
  
  // Get next 5 days (skip today)
  const forecasts = Object.values(dailyForecasts).slice(0, 5);
  
  forecastContainer.innerHTML = forecasts.map(forecast => `
    <div class="forecast-card">
      <div class="forecast-day">${forecast.day}</div>
      <img src="${getWeatherIconUrl(forecast.icon)}" alt="${forecast.description}" class="forecast-icon">
      <div class="forecast-temp">
        ${formatTemp(forecast.temp_max)} / ${formatTemp(forecast.temp_min)}
      </div>
      <div class="forecast-desc">${forecast.description}</div>
    </div>
  `).join('');
}

// ========== Update Additional Info ==========
function updateAdditionalInfo(data) {
  // Already updated in current weather
  // This function is for any additional updates if needed
}

// ========== Unit Toggle ==========
function toggleUnit(unit) {
  currentUnit = unit;
  
  if (unit === 'metric') {
    celsiusBtn.classList.add('active');
    fahrenheitBtn.classList.remove('active');
  } else {
    celsiusBtn.classList.add('active');
    fahrenheitBtn.classList.remove('active');
    // Fix: Actually set the correct active state
    if (unit === 'metric') {
      celsiusBtn.classList.add('active');
      fahrenheitBtn.classList.remove('active');
    } else {
      celsiusBtn.classList.remove('active');
      fahrenheitBtn.classList.add('active');
    }
  }
  
  // Re-fetch data with new unit
  if (currentCity) {
    fetchWeatherData(currentCity);
  }
}

// ========== Get User Location ==========
function getUserLocation() {
  if (!navigator.geolocation) {
    errorMessage.textContent = 'Geolocation is not supported by your browser';
    errorState.classList.remove('hidden');
    return;
  }
  
  loadingState.classList.remove('hidden');
  errorState.classList.add('hidden');
  weatherContent.classList.add('hidden');
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      
      try {
        const response = await fetch(
          `${BASE_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=${currentUnit}`
        );
        
        if (!response.ok) throw new Error('Failed to get weather for your location');
        
        const data = await response.json();
        fetchWeatherData(data.name);
        
      } catch (error) {
        loadingState.classList.add('hidden');
        errorState.classList.remove('hidden');
        errorMessage.textContent = 'Unable to get weather for your location';
      }
    },
    (error) => {
      loadingState.classList.add('hidden');
      errorState.classList.remove('hidden');
      errorMessage.textContent = 'Please allow location access to use this feature';
    }
  );
}

// ========== Load Last City ==========
function loadLastCity() {
  const lastCity = localStorage.getItem('lastCity');
  if (lastCity) {
    fetchWeatherData(lastCity);
  } else {
    // Default city
    fetchWeatherData('London');
  }
}

// ========== Event Listeners ==========
searchBtn.addEventListener('click', () => {
  const city = cityInput.value.trim();
  if (city) {
    suggestionsDiv.classList.remove('show');
    fetchWeatherData(city);
  }
});

cityInput.addEventListener('input', debouncedSearch);

cityInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const city = cityInput.value.trim();
    if (city) {
      suggestionsDiv.classList.remove('show');
      fetchWeatherData(city);
    }
  }
});

useLocationBtn.addEventListener('click', getUserLocation);

celsiusBtn.addEventListener('click', () => toggleUnit('metric'));
fahrenheitBtn.addEventListener('click', () => toggleUnit('imperial'));

retryBtn.addEventListener('click', () => {
  if (currentCity) {
    fetchWeatherData(currentCity);
  } else {
    loadLastCity();
  }
});

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
  if (!cityInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
    suggestionsDiv.classList.remove('show');
  }
});

// ========== Initialize ==========
function init() {
  // Check if API key is configured
  if (API_KEY === '400c1ce67618ae31215defbe2c74c659') {
    errorMessage.innerHTML = '⚠️ API key not configured. Please add your OpenWeatherMap API key in script.js.<br><br>Get a free key at: <a href="https://openweathermap.org/api" target="_blank">openweathermap.org/api</a>';
    errorState.classList.remove('hidden');
    loadingState.classList.add('hidden');
    return;
  }
  
  loadLastCity();
}

init();