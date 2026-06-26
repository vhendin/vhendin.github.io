// ── PDF.js worker setup ───────────────────────────────────────────────────────
// Worker URL must match the exact version loaded from the CDN in the HTML.
pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// ── State ─────────────────────────────────────────────────────────────────────
let currentFile = null;
let currentFormat = "image/png";
let currentScale = 2;
let currentQuality = 0.92;
let results = []; // { pageNumber, blob, filename }

// ── DOM refs ──────────────────────────────────────────────────────────────────
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const fileInfo = document.getElementById("file-info");
const fileNameEl = document.getElementById("file-name");
const fileSizeEl = document.getElementById("file-size");
const clearFileBtn = document.getElementById("clear-file");
const formatBtns = document.querySelectorAll("[data-format]");
const qualityRow = document.getElementById("quality-row");
const qualitySlider = document.getElementById("quality-slider");
const qualityValue = document.getElementById("quality-value");
const scaleBtns = document.querySelectorAll("[data-scale]");
const convertBtn = document.getElementById("convert-btn");
const progressSection = document.getElementById("progress-section");
const progressFill = document.getElementById("progress-fill");
const progressText = document.getElementById("progress-text");
const resultsSection = document.getElementById("results-section");
const pageCountEl = document.getElementById("page-count");
const resultsGrid = document.getElementById("results-grid");
const downloadAllBtn = document.getElementById("download-all-btn");

// ── File selection ────────────────────────────────────────────────────────────
dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", (e) => {
    if (!dropZone.contains(e.relatedTarget)) {
        dropZone.classList.remove("drag-over");
    }
});

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) setFile(file);
});

// Clicking anywhere on the drop zone (other than the label) opens the picker.
dropZone.addEventListener("click", (e) => {
    if (e.target.tagName === "LABEL" || e.target.closest("label")) return;
    fileInput.click();
});

fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) setFile(fileInput.files[0]);
});

clearFileBtn.addEventListener("click", clearFile);

function setFile(file) {
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext !== "pdf") {
        alert("Please choose a PDF file.");
        return;
    }
    currentFile = file;
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatBytes(file.size);
    fileInfo.classList.remove("hidden");
    convertBtn.disabled = false;
    clearResults();
}

function clearFile() {
    currentFile = null;
    fileInput.value = "";
    fileInfo.classList.add("hidden");
    convertBtn.disabled = true;
    clearResults();
}

// ── Options ───────────────────────────────────────────────────────────────────
formatBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        formatBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentFormat = btn.dataset.format;
        qualityRow.style.display =
            currentFormat === "image/jpeg" ? "flex" : "none";
    });
});

qualitySlider.addEventListener("input", () => {
    currentQuality = parseInt(qualitySlider.value, 10) / 100;
    qualityValue.textContent = `${qualitySlider.value}%`;
});

scaleBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        scaleBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentScale = parseInt(btn.dataset.scale, 10);
    });
});

// ── Convert ───────────────────────────────────────────────────────────────────
convertBtn.addEventListener("click", async () => {
    if (!currentFile) return;

    const options = {
        format: currentFormat,
        quality: currentQuality,
        scale: currentScale,
    };

    convertBtn.disabled = true;
    clearResults();
    showProgress(0, "Starting…");

    try {
        results = await pdfToImages(currentFile, options);
        showResults(results);
    } catch (err) {
        console.error("Conversion failed:", err);
        alert("Conversion failed: " + (err.message || err));
    } finally {
        hideProgress();
        convertBtn.disabled = false;
    }
});

// ── PDF conversion ────────────────────────────────────────────────────────────
async function pdfToImages(file, options) {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const numPages = pdf.numPages;
    const scale = options.scale;
    const out = [];

    // Process pages sequentially to avoid memory pressure on large documents.
    for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
        showProgress(
            (pageNumber - 1) / numPages,
            `Rendering page ${pageNumber} of ${numPages}…`
        );

        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
            canvasContext: canvas.getContext("2d"),
            viewport,
        }).promise;

        const blob = await canvasToBlob(canvas, options);
        const filename = makeFilename(file.name, pageNumber, options.format);
        out.push({ pageNumber, blob, filename });
    }

    showProgress(1, "Done!");
    return out;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function canvasToBlob(canvas, options) {
    const format = options.format;
    const quality = options.quality;
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) =>
                blob
                    ? resolve(blob)
                    : reject(new Error("canvas.toBlob() returned null")),
            format,
            format === "image/jpeg" ? quality : undefined
        );
    });
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    // Revoke after a short delay so the browser has time to start the download.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function makeFilename(originalName, pageNumber, format) {
    const base = originalName.replace(/\.[^.]+$/, "");
    const ext = format === "image/jpeg" ? "jpg" : "png";
    const padded = String(pageNumber).padStart(2, "0");
    return `${base}_page_${padded}.${ext}`;
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Progress ──────────────────────────────────────────────────────────────────
function showProgress(fraction, message) {
    progressSection.classList.remove("hidden");
    progressFill.style.width = `${Math.round(fraction * 100)}%`;
    progressText.textContent = message;
}

function hideProgress() {
    progressSection.classList.add("hidden");
    progressFill.style.width = "0%";
}

// ── Results ───────────────────────────────────────────────────────────────────
function showResults(items) {
    resultsSection.classList.remove("hidden");
    pageCountEl.textContent = `(${items.length})`;

    items.forEach(({ pageNumber, blob, filename }) => {
        const url = URL.createObjectURL(blob);

        const card = document.createElement("div");
        card.className = "result-card";

        const img = document.createElement("img");
        img.className = "result-preview";
        img.src = url;
        img.alt = `Page ${pageNumber}`;
        img.loading = "lazy";

        const footer = document.createElement("div");
        footer.className = "result-footer";

        const pageLabel = document.createElement("span");
        pageLabel.className = "result-page";
        pageLabel.textContent = `Page ${pageNumber}`;

        const dlBtn = document.createElement("button");
        dlBtn.className = "btn-download-page";
        dlBtn.textContent = "↓";
        dlBtn.title = `Download ${filename}`;
        dlBtn.addEventListener("click", () => downloadBlob(blob, filename));

        footer.append(pageLabel, dlBtn);
        card.append(img, footer);
        resultsGrid.appendChild(card);
    });
}

function clearResults() {
    results = [];
    resultsSection.classList.add("hidden");
    resultsGrid.innerHTML = "";
    pageCountEl.textContent = "";
}

// ── Download all ──────────────────────────────────────────────────────────────
downloadAllBtn.addEventListener("click", () => {
    // Stagger downloads slightly so browsers don't block them.
    results.forEach(({ blob, filename }, i) => {
        setTimeout(() => downloadBlob(blob, filename), i * 200);
    });
});
