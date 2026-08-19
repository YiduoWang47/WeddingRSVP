// ---------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------
// Paste the URL you get from deploying the Apps Script (see
// apps-script.gs) as a Web App. It looks like:
// https://script.google.com/macros/s/AKfycb.../exec
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzXR5GPNlnmT0q9oOeSdDJPmWRBiReMlDMIBePFRWNqyjoCISep4qMIR_dWenXjbYQqZw/exec";


// ---------------------------------------------------------------------
// Elements
// ---------------------------------------------------------------------
const template = document.getElementById("guest-template");
const guestsContainer = document.getElementById("guests-container");
const addGuestBtn = document.getElementById("add-guest-btn");
const form = document.getElementById("rsvp-form");
const submitBtn = document.getElementById("submit-btn");
const errorEl = document.getElementById("form-error");
const thankYouEl = document.getElementById("thank-you");

let guestCount = 0;


// ---------------------------------------------------------------------
// Adding / removing guests
// ---------------------------------------------------------------------
function addGuest() {
    guestCount += 1;
    const isFirstGuest = guestCount === 1;

    guestsContainer.appendChild(template.content.cloneNode(true));
    const guestEl = guestsContainer.lastElementChild;

    guestEl.querySelector(".guest-title").textContent = isFirstGuest
        ? "Your Details"
        : `Guest ${guestCount}`;

    const removeBtn = guestEl.querySelector(".remove-guest-btn");
    if (isFirstGuest) {
        removeBtn.remove();
    } else {
        removeBtn.hidden = false;
        removeBtn.addEventListener("click", () => {
            guestEl.remove();
            renumberGuests();
        });
    }
}

function renumberGuests() {
    const guestEls = guestsContainer.querySelectorAll(".guest");
    guestEls.forEach((el, i) => {
        const position = i + 1;
        el.querySelector(".guest-title").textContent =
            position === 1 ? "Details of Invited Guest" : `Invited Guest ${position}`;
    });
}

addGuestBtn.addEventListener("click", addGuest);

// Start with one guest block (the primary RSVP-er) already on the page
addGuest();


// ---------------------------------------------------------------------
// Yes / No choice buttons (event delegation - covers guests added later)
// ---------------------------------------------------------------------
guestsContainer.addEventListener("click", (event) => {
    const button = event.target.closest(".choice");
    if (!button) return;

    const group = button.closest(".choice-group");
    group.querySelectorAll(".choice").forEach((b) => {
        b.classList.remove("selected");
        b.setAttribute("aria-pressed", "false");
    });

    button.classList.add("selected");
    button.setAttribute("aria-pressed", "true");
});


// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
}

function clearError() {
    errorEl.hidden = true;
    errorEl.textContent = "";
}

function collectGuestData() {
    const guestEls = [...guestsContainer.querySelectorAll(".guest")];
    const guests = [];

    for (let i = 0; i < guestEls.length; i++) {
        const el = guestEls[i];
        const label = i === 0 ? "your details" : `guest ${i + 1}`;

        const name = el.querySelector(".guest-name").value.trim();
        const dietary = el.querySelector(".guest-dietary").value.trim();
        const eventOneBtn = el.querySelector('.choice-group[data-part="one"] .choice.selected');
        const eventTwoBtn = el.querySelector('.choice-group[data-part="two"] .choice.selected');

        if (!name) {
            throw new Error(`Please enter a name for ${label}.`);
        }
        if (!eventOneBtn || !eventTwoBtn) {
            throw new Error(`Please answer both Ceremony and Reception attendance for ${label}.`);
        }

        guests.push({
            name,
            eventOne: eventOneBtn.dataset.value,
            eventTwo: eventTwoBtn.dataset.value,
            dietary: dietary || "None",
        });
    }

    return guests;
}


// ---------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------
form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();

    // Give instant feedback that the click registered, before the
    // network request even starts.
    submitBtn.classList.add("sending");
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    let guests;
    try {
        guests = collectGuestData();
    } catch (err) {
        submitBtn.classList.remove("sending");
        submitBtn.disabled = false;
        submitBtn.textContent = "Send RSVP";
        showError(err.message);
        return;
    }

    try {
        // Content-Type "text/plain" avoids a CORS preflight (which Apps
        // Script web apps don't handle), while doPost() on the other end
        // still parses the body as JSON.
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ guests }),
        });

        if (!response.ok) {
            throw new Error("Request failed");
        }

        const result = await response.json();
        if (result.status !== "success") {
            throw new Error(result.message || "Unknown error");
        }

        submitBtn.textContent = "Sent!";
        form.hidden = true;
        thankYouEl.hidden = false;
    } catch (err) {
        submitBtn.classList.remove("sending");
        submitBtn.disabled = false;
        submitBtn.textContent = "Send RSVP";
        showError("Sorry, something went wrong sending your RSVP. Please try again.");
    }
});


// ---------------------------------------------------------------------
// Rose petals that trail the mouse
// ---------------------------------------------------------------------
let lastPetalTime = 0;
const PETAL_INTERVAL = 60; // ms between spawns, so movement doesn't flood the page with petals

document.addEventListener("mousemove", (event) => {
    const now = Date.now();
    if (now - lastPetalTime < PETAL_INTERVAL) return;
    lastPetalTime = now;
    spawnPetal(event.clientX, event.clientY);
});

function spawnPetal(x, y) {
    const petal = document.createElement("div");
    petal.className = "petal";

    const size = 8 + Math.random() * 8;       // 8-16px
    const driftX = (Math.random() - 0.5) * 80; // sideways drift as it falls
    const driftY = 60 + Math.random() * 60;    // always falls down
    const spin = (Math.random() - 0.5) * 360;  // random rotation direction/amount
    const duration = 1 + Math.random() * 0.8;  // 1-1.8s lifespan
    const hueShift = Math.random() * 20 - 10;  // slight colour variation

    petal.style.left = `${x - size / 2}px`;
    petal.style.top = `${y - size / 2}px`;
    petal.style.width = `${size}px`;
    petal.style.height = `${size}px`;
    petal.style.setProperty("--drift-x", `${driftX}px`);
    petal.style.setProperty("--drift-y", `${driftY}px`);
    petal.style.setProperty("--spin", `${spin}deg`);
    petal.style.animationDuration = `${duration}s`;
    petal.style.filter = `hue-rotate(${hueShift}deg)`;

    document.body.appendChild(petal);
    petal.addEventListener("animationend", () => petal.remove());
}