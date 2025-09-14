"use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

class Workout {
  date = new Date();

  id = (Date.now() + "").slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    const jDate = jalaali.toJalaali(this.date);
    // prettier-ignore
    const months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

    this.description = `${this.name} در ${jDate.jd} ${months[jDate.jm - 1]}`;
  }
}

class Running extends Workout {
  name = "دویدن";
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  name = "دوچرخه سواری";
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];

  constructor() {
    this._getPosition();

    this._getLocaleStorage();

    form.addEventListener("submit", this._newWorkout.bind(this));
    // Change form type
    inputType.addEventListener("change", this._toggleElevationField);
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
  }

  _getPosition() {
    // نمایش نقشه
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("اجازه دسترسی به موقعیت مکانیت رو ندادی :(");
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on("click", this._showForm.bind(this));

    this.#workouts.forEach((work) => this._renderWorkoutMarker(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    // نمایش فرم وقتی روی نقشه کلیک کردیم
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  _hideForm() {
    // prettier-ignore
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';

    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  _toggleElevationField() {
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _newWorkout(e) {
    const validInput = (...inputs) =>
      inputs.every((int) => Number.isFinite(int));
    const allPositive = (...inputs) => inputs.every((int) => int > 0);

    e.preventDefault();

    // بدست آوردن دیتا از فرم
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // اگه دوچرخه سواریه ، آبجکت دوچرخه سواری ساخته بشه
    if (type === "running") {
      const cadence = +inputCadence.value;

      // چک کردن اینکه دیتا معتبر باشه
      if (
        !validInput(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert("مقدار وارد شده باید عدد مثبت باشد!");

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // اگه دویدنه ، آبجکت دویدنه ساخته بشه
    if (type === "cycling") {
      const elevation = +inputElevation.value;

      // چک کردن اینکه دیتا معتبر باشه
      if (
        !validInput(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert("مقدار وارد شده باید عدد مثبت باشد!");

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // اضافه کردن آبجکت جدید
    this.#workouts.push(workout);

    // رندر و نمایش نشانه روی نقشه
    this._renderWorkoutMarker(workout);

    // رندر کردن workout
    this._renderWorkout(workout);

    // clear input fields
    this._hideForm();

    // set locale storage
    this._setLocaleStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 300,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details">
              <span class="workout__icon">${
                workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
              }</span>
              <span class="workout__value">${workout.distance}</span>
              <span class="workout__unit">کیلومتر</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">🕛</span>
              <span class="workout__value">${workout.duration}</span>
              <span class="workout__unit">دقیقه</span>
            </div>
    `;

    if (workout.type === "running")
      html += `
    <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">سرعت</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">گام/دقیقه</span>
          </div>
        </li>
    `;

    if (workout.type === "cycling")
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">سرعت</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🏔️</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">متر</span>
          </div>
        </li>
    `;

    form.insertAdjacentHTML("afterend", html);
  }

  _moveToPopup(e) {
    const workoutEL = e.target.closest(".workout");
    console.log(workoutEL);
    if (!workoutEL) return;

    const workout = this.#workouts.find(
      (work) => work.id === workoutEL.dataset.id
    );
    console.log(workout);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocaleStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  _getLocaleStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach((work) => this._renderWorkout(work));
  }
}
const app = new App();
