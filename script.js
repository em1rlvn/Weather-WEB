const searchInput = document.querySelector(".search-box input");

const searchButton = document.querySelector(".search-box button");

const weatherIcon = document.querySelector(".weather-image i");

const weather = document.querySelector(".weather");

const errorText = document.querySelector(".error");


async function checkWeather(city) {
  if (!city || !city.trim()) return;
  try {
    const isCyrillic = /[\u0400-\u04FF]/.test(city);
    const preferredLang = isCyrillic ? "ru" : "en";

    async function geocodeOpenMeteo(name, lang) {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          name
        )}&count=1&language=${lang}`
      );
      return res.ok ? res.json() : null;
    }

    let geoData = await geocodeOpenMeteo(city, preferredLang);

   
    if (!geoData || !geoData.results || geoData.results.length === 0) {
      const otherLang = preferredLang === "ru" ? "en" : "ru";
      geoData = await geocodeOpenMeteo(city, otherLang);
    }

    
    if (!geoData || !geoData.results || geoData.results.length === 0) {
      try {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            city
          )}&limit=1`
        );
        const nomData = await nomRes.json();
        if (nomData && nomData.length > 0) {
          const first = nomData[0];
          const latitude = parseFloat(first.lat);
          const longitude = parseFloat(first.lon);
          const name = first.display_name || city;
          geoData = { results: [{ latitude, longitude, name }] };
        }
      } catch (e) {
       
        console.warn("Nominatim fallback failed", e);
      }
    }

    if (!geoData || !geoData.results || geoData.results.length === 0) {
      errorText.style.display = "block";
      errorText.querySelector("p").textContent = "Invalid city name";
      weather.style.display = "none";
      return;
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    const weatherResp = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=relativehumidity_2m&temperature_unit=celsius&windspeed_unit=kmh&timezone=auto`
    );
    const weatherData = await weatherResp.json();

    if (!weatherData || !weatherData.current_weather) {
      errorText.style.display = "block";
      weather.style.display = "none";
      return;
    }

    const cw = weatherData.current_weather;

    let humidityText = "--";
    if (weatherData.hourly && weatherData.hourly.time && weatherData.hourly.relativehumidity_2m) {
      const times = weatherData.hourly.time;
      const humidities = weatherData.hourly.relativehumidity_2m;
      const idx = times.indexOf(cw.time);
      if (idx !== -1 && humidities[idx] !== undefined) {
        humidityText = humidities[idx] + "%";
      }
    }


    document.querySelector(".city").innerHTML = `${name}${country ? ", " + country : ""}`;
    document.querySelector(".temp").innerHTML = Math.round(cw.temperature) + "&#8451";
    document.querySelector(".wind").innerHTML = cw.windspeed + " km/h";
    document.querySelector(".humidity").innerHTML = humidityText;

    const code = cw.weathercode;
   
    if (code === 0) {
      weatherIcon.className = "wi wi-day-sunny";
    } else if (code === 1 || code === 2 || code === 3) {
      weatherIcon.className = "wi wi-day-cloudy";
    } else if (code === 45 || code === 48) {
      weatherIcon.className = "wi wi-fog";
    } else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 86)) {
      weatherIcon.className = "wi wi-rain";
    } else if (code >= 71 && code <= 77) {
      weatherIcon.className = "wi wi-snow";
    } else if (code >= 95) {
      weatherIcon.className = "wi wi-thunderstorm";
    } else {
      weatherIcon.className = "wi wi-cloud";
    }

    weather.style.display = "block";
    errorText.style.display = "none";
  } catch (err) {
    console.error(err);
    errorText.style.display = "block";
    errorText.querySelector("p").textContent = "Error fetching weather";
    weather.style.display = "none";
  }
}

searchButton.addEventListener("click", () => {
  checkWeather(searchInput.value);
  searchInput.value = "";
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    checkWeather(searchInput.value);
    searchInput.value = "";
  }
});