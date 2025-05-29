let rawData = [];
let pbwChart, wbpChart;

document.addEventListener("DOMContentLoaded", function () {
    const difficultySelector = document.getElementById("difficulty");
    difficultySelector.addEventListener("change", () => {
        RefreshData(difficultySelector.value);
    });

    RefreshData(difficultySelector.value);
});

function RefreshData(difficulty) {
    fetch(`https://flazhik.github.io/cybergrind-waves-distribution/data-${difficulty}.csv`, { cache: "default" })
        .then(response => response.text())
        .then(csvText => {
            const parsed = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true
            });
            rawData = parsed.data
                .sort((a, b) => b.wave - a.wave)
                .map((row, i) => ({
                    pos: i,
                    steamid: row.steamid,
                    wave: parseFloat(row.wave),
                }));

            const maxWave = rawData[0].wave;
            document.getElementById('start-wave-input').value = 1;
            document.getElementById('end-wave-input').value = maxWave;

            SetupWaveRangeInput();
            ApplyFilter();
            SetupWaveInput();
            SetupSteamIdInput();
        })
        .catch(err => console.error("Failed to load CSV:", err));
}

function RenderCharts(data) {
    const positions = data.map((_, idx) => idx + 1);

    const ctx1 = document.getElementById("pbw-chart").getContext("2d");
    const ctx2 = document.getElementById("wbp-chart").getContext("2d");

    if (pbwChart instanceof Chart)
        pbwChart.destroy();

    if (wbpChart instanceof Chart)
        wbpChart.destroy();

    const pbwSampledData = data.map(d => ({
        x: d.pos,
        y: d.wave
    }));

    pbwChart = new Chart(ctx1, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Position vs Wave',
                data: pbwSampledData,
                parsing: {
                    xAxisKey: 'x',
                    yAxisKey: 'y'
                },
                borderColor: 'rgba(75, 192, 192, 1)',
                fill: false,
                pointRadius: 0,
                pointHoverRadius: 0,
                tension: 0.5
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    enabled: false
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Position in the Scoreboard'
                    },
                    type: 'linear',

                },
                y: {
                    type: 'logarithmic',
                    title: {
                        display: true,
                        text: 'Reached Wave'
                    },
                    ticks: {
                        callback: FractionsCanSuckMyAss
                    }
                }
            },
            chartArea: {
                backgroundColor: 'rgba(251, 85, 85, 0.4)'
            },
            animation: {
                duration: 0
            }
        }
    });

    const maxWave = Math.floor(data[0]);
    const wbpSampledData = [...new Set(data.map(d => Math.floor(d.wave)))]
        .map(wave => ({
            x: wave,
            y: rawData.filter(d => d.wave >= Math.floor(wave)).length
        }));

    wbpChart = new Chart(ctx2, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Wave vs Position',
                data: wbpSampledData,
                parsing: {
                    xAxisKey: 'x',
                    yAxisKey: 'y'
                },
                borderColor: 'rgba(255, 99, 132, 1)',
                fill: false,
                pointRadius: 10,
                pointHoverRadius: 50,
                tension: 0.5
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: context => {
                            const wave = context.parsed.x;
                            const count = rawData.filter(d => d.wave >= wave).length;
                            return `Wave ${wave} is reached or surpassed by ${count} player(s)`;
                        }
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Reached Wave'
                    },
                    type: 'linear'
                },
                y: {
                    type: 'logarithmic',
                    title: {
                        display: true,
                        text: 'Position in the Scoreboard'
                    },
                    ticks: {
                        callback: FractionsCanSuckMyAss
                    }
                }
            },
            animation: {
                duration: 0
            }
        }
    });

    function FractionsCanSuckMyAss(value, index, values) {
        if (Math.floor(value) === value) {
            return value;
        }
    }
}

function SetupWaveInput() {
    const input = document.getElementById("wave-input");
    input.disabled = false;

    input.addEventListener("input", () => {
        const val = parseFloat(input.value);
        if (isNaN(val)) {
            document.getElementById("position").innerText = "-";
            document.getElementById("percentile").innerText = "-";
            return;
        }

        const sorted = [...rawData].sort((a, b) => b.wave - a.wave);
        const index = sorted.findIndex(d => val >= d.wave);
        const position = index === -1 ? sorted.length + 1 : index + 1;
        const percentile = ((1 - (position - 1) / sorted.length) * 100).toFixed(3);

        document.getElementById("position").innerText = position;
        document.getElementById("percentile").innerText = percentile + "%";
    });
}

function SetupSteamIdInput() {
    const input = document.getElementById("steam-id-input");
    const infoBox = document.getElementById("steam-info");
    const positionSpan = document.getElementById("steam-position");
    const profileLink = document.getElementById("steam-profile-link");
    const notFoundMsg = document.getElementById("steam-id-not-found");

    input.disabled = false;
    input.addEventListener("input", () => {
        const val = input.value.trim();
        if (!val) {
            infoBox.style.display = "none";
            notFoundMsg.style.display = "none";
            return;
        }

        const user = rawData.find(d => d.steamid === val);
        if (!user) {
            infoBox.style.display = "none";
            notFoundMsg.style.display = "block";
            return;
        }

        notFoundMsg.style.display = "none";
        infoBox.style.display = "block";

        const pos = rawData.findIndex(d => d.steamid === val) + 1;
        positionSpan.textContent = pos;

        profileLink.href = `https://steamcommunity.com/profiles/${val}`;
        profileLink.textContent = `View Steam Profile`;
    });
}

function SetupWaveRangeInput() {
    const startInput = document.getElementById("start-wave-input");
    const endInput = document.getElementById("end-wave-input");
    
    startInput.addEventListener("input", ApplyFilter);
    endInput.addEventListener("input", ApplyFilter);
}

function ApplyFilter() {
    const startInput = document.getElementById("start-wave-input");
    const endInput = document.getElementById("end-wave-input");

    const start = parseFloat(startInput.value);
    const end = parseFloat(endInput.value);
    if (isNaN(start) || isNaN(end) || start > end)
        return;

    const filtered = rawData.filter(d => d.wave >= start && d.wave <= end);
    RenderCharts(filtered);
}