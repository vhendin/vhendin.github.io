const ctx = document.getElementById("myChart");
const expensiveInput = document.getElementById("expensive-input");
const cheapInput = document.getElementById("cheap-input");

let prices = [];

let pricesWithIndex = prices.map((value, index) => ({
    value,
    index,
    color: "grey"
}));

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

async function fetchPrices() {
    const today = new Date();
    const date = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const area = 'SE3';

    const url = `https://www.elprisetjustnu.se/api/v1/prices/${year}/${month}-${date}_${area}.json`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // Process 15-minute data as individual intervals
        pricesWithIndex = processFifteenMinutePrices(data);

        // Update the chart with new data
        updateChart();
        updateValues();
    } catch (error) {
        console.error('Error fetching prices:', error);
    }
}

fetchPrices();

function updateChart() {
    chart.data.datasets[0].data = pricesWithIndex
        .sort((a, b) => a.index - b.index)
        .map((item) => item.value);
    chart.data.datasets[0].backgroundColor = pricesWithIndex
        .sort((a, b) => a.index - b.index)
        .map((item) => item.color);
    chart.update();
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

updateValues();
