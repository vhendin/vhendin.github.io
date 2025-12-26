const ctx = document.getElementById("myChart");
const expensiveInput = document.getElementById("expensive-input");
const cheapInput = document.getElementById("cheap-input");
const previousButton = document.getElementById("previous-day");
const todayButton = document.getElementById("today");
const nextButton = document.getElementById("next-day");
const selectedDateLabel = document.getElementById("selected-date");
const dateStatus = document.getElementById("date-status");

let pricesWithIndex = [];

const AREA = "SE3";
const dateCache = {};
const todayKey = formatDateKey(new Date());
let selectedDateKey = todayKey;
let isSwitching = false;

// Generate 15-minute interval labels
function generateFifteenMinuteLabels() {
    const labels = [];
    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            const endMinute = minute + 15;
            const endHour = endMinute >= 60 ? hour + 1 : hour;
            const adjustedEndMinute = endMinute >= 60 ? 0 : endMinute;
            const endTime = `${endHour.toString().padStart(2, '0')}:${adjustedEndMinute.toString().padStart(2, '0')}`;
            labels.push(`${startTime} - ${endTime}`);
        }
    }
    return labels;
}

const timesOfDay = generateFifteenMinuteLabels();

function processFifteenMinutePrices(minutePrices) {
    return minutePrices.map((item, index) => {
        const startTime = new Date(item.time_start);
        const hour = startTime.getHours();

        return {
            value: item.SEK_per_kWh * 100, // Convert to öre
            index: index,
            color: "grey",
            hour: hour, // Track which hour this 15-min interval belongs to
            startTime: startTime,
            endTime: new Date(item.time_end)
        };
    });
}

function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function buildUrl(dateKey) {
    const [year, month, day] = dateKey.split("-");
    return `https://www.elprisetjustnu.se/api/v1/prices/${year}/${month}-${day}_${AREA}.json`;
}

async function fetchDate(dateKey) {
    if (dateCache[dateKey]) {
        return dateCache[dateKey];
    }

    const url = buildUrl(dateKey);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        const data = await response.json();
        const processed = processFifteenMinutePrices(data);
        dateCache[dateKey] = processed;
        return processed;
    } catch (error) {
        console.error(`Error fetching prices for ${dateKey}:`, error);
        throw error;
    }
}

function offsetDateKey(baseKey, offsetDays) {
    const [year, month, day] = baseKey.split("-").map(Number);
    const baseDate = new Date(year, month - 1, day);
    baseDate.setDate(baseDate.getDate() + offsetDays);
    return formatDateKey(baseDate);
}

async function prefetchDay(dateKey) {
    try {
        await fetchDate(dateKey);
    } catch (error) {
        // Intentionally swallow errors for optional days
    }
}

async function initialize() {
    setDateStatus("Loading today's prices...");
    try {
        const data = await fetchDate(todayKey);
        applySelectedDate(todayKey, data);
        await Promise.allSettled([
            prefetchDay(offsetDateKey(todayKey, -1)),
            prefetchDay(offsetDateKey(todayKey, 1))
        ]);
        updateNavigationAvailability();
        setDateStatus("");
    } catch (error) {
        setDateStatus("Unable to load today's prices.");
    }
}

initialize();

function applySelectedDate(dateKey, data) {
    selectedDateKey = dateKey;
    pricesWithIndex = data.slice();
    selectedDateLabel.textContent = dateKey;
    updateValues();
    todayButton.disabled = selectedDateKey === todayKey;
}

function updateChart() {
    chart.data.datasets[0].data = pricesWithIndex
        .sort((a, b) => a.index - b.index)
        .map((item) => item.value);
    chart.data.datasets[0].backgroundColor = pricesWithIndex
        .sort((a, b) => a.index - b.index)
        .map((item) => item.color);
    chart.update();
}

function setDateStatus(message) {
    dateStatus.textContent = message;
}

function updateNavigationAvailability() {
    const previousKey = offsetDateKey(todayKey, -1);
    const nextKey = offsetDateKey(todayKey, 1);
    const hasPrevious = Boolean(dateCache[previousKey]);
    const hasNext = Boolean(dateCache[nextKey]);

    previousButton.style.display = hasPrevious ? "inline-flex" : "none";
    nextButton.style.display = hasNext ? "inline-flex" : "none";
}

function updateValues() {
    const expensiveCount = parseInt(expensiveInput.value, 10) || 0; // Number of expensive hours
    const cheapCount = parseInt(cheapInput.value, 10) || 0; // Number of cheap hours

    // Reset all colors to default
    pricesWithIndex.forEach(item => {
        item.color = "#FFBF00"; // Default middle color
    });

    if (expensiveCount > 0 || cheapCount > 0) {
        // Calculate average price per hour for sorting
        const hourlyAverages = [];
        for (let hour = 0; hour < 24; hour++) {
            const hourIntervals = pricesWithIndex.filter(item => item.hour === hour);
            if (hourIntervals.length > 0) {
                const avgPrice = hourIntervals.reduce((sum, item) => sum + item.value, 0) / hourIntervals.length;
                hourlyAverages.push({ hour, avgPrice, intervals: hourIntervals });
            }
        }

        // Sort hours by average price
        hourlyAverages.sort((a, b) => a.avgPrice - b.avgPrice);

        // Color the cheapest hours (and their 4 intervals)
        for (let i = 0; i < Math.min(cheapCount, hourlyAverages.length); i++) {
            hourlyAverages[i].intervals.forEach(interval => {
                interval.color = "#007000"; // Green for cheap
            });
        }

        // Color the most expensive hours (and their 4 intervals)
        for (let i = Math.max(0, hourlyAverages.length - expensiveCount); i < hourlyAverages.length; i++) {
            hourlyAverages[i].intervals.forEach(interval => {
                interval.color = "#D2222D"; // Red for expensive
            });
        }
    }

    // Re-render the chart with updated colors
    updateChart();
}

expensiveInput.addEventListener("input", updateValues);
cheapInput.addEventListener("input", updateValues);

todayButton.addEventListener("click", () => switchToDate(todayKey));
previousButton.addEventListener("click", () => switchToDate(offsetDateKey(selectedDateKey, -1)));
nextButton.addEventListener("click", () => switchToDate(offsetDateKey(selectedDateKey, 1)));

const chart = new Chart(ctx, {
    type: "bar",
    data: {
        labels: timesOfDay,
        datasets: [
            {
                data: pricesWithIndex
                    .sort((a, b) => a.index - b.index)
                    .map((item) => item.value),
                backgroundColor: pricesWithIndex
                    .sort((a, b) => a.index - b.index)
                    .map((item) => item.color)
            }
        ]
    },
    options: {
        scales: {
            y: {
                beginAtZero: true
            }
        },
        plugins: {
            legend: {
                display: false // Disable the legend
            },
            tooltip: {
                callbacks: {
                    label: function (tooltipItem) {
                        return `${tooltipItem.raw} öre`;
                    }
                }
            }
        }
    }
});

function setDateStatus(message) {
    dateStatus.textContent = message;
}

function updateNavigationAvailability() {
    const previousKey = offsetDateKey(todayKey, -1);
    const nextKey = offsetDateKey(todayKey, 1);
    const hasPrevious = Boolean(dateCache[previousKey]);
    const hasNext = Boolean(dateCache[nextKey]);

    previousButton.style.display = hasPrevious ? "inline-flex" : "none";
    nextButton.style.display = hasNext ? "inline-flex" : "none";
}

async function switchToDate(dateKey) {
    if (isSwitching || !dateKey) {
        return;
    }

    if (dateKey === selectedDateKey && dateCache[dateKey]) {
        return;
    }

    isSwitching = true;
    setDateStatus("Loading prices...");
    try {
        const data = await fetchDate(dateKey);
        applySelectedDate(dateKey, data);
        setDateStatus("");
    } catch (error) {
        setDateStatus(`Pricing unavailable for ${dateKey}.`);
    } finally {
        isSwitching = false;
    }
}

updateValues();
