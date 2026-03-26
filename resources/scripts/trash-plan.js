/**
 * Trash Plan - Bin Placement & Enclosure Planning Tool
 * Core Application Logic
 */

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================

const STORAGE_KEY = "trashplan_plans";
const APP_VERSION = 1;

// Scale: pixels per meter (default)
const DEFAULT_SCALE = 60;

const BIN_TYPES = {
  "660L": {
    label: "660 L",
    widthM: 1.255,
    depthM: 0.773,
    color: "#FFCC80",
    strokeColor: "#E65100",
    volumeL: 660,
    suitableFor: ["plastic", "paper", "cardboard"],
  },
  "370L": {
    label: "370 L",
    widthM: 0.77,
    depthM: 0.811,
    color: "#CE93D8",
    strokeColor: "#6A1B9A",
    volumeL: 370,
    suitableFor: ["metal", "newspaper", "catalogs"],
  },
  "370L-glass": {
    label: "370 L Glass",
    widthM: 0.77,
    depthM: 0.811,
    color: "#80DEEA",
    strokeColor: "#00695C",
    volumeL: 370,
    suitableFor: ["glass"],
    note: "Requires 3 wheels and flat ground",
  },
  "240L": {
    label: "240 L",
    widthM: 0.58,
    depthM: 0.724,
    color: "#A5D6A7",
    strokeColor: "#2E7D32",
    volumeL: 240,
    suitableFor: ["general"],
  },
  "190L": {
    label: "190 L",
    widthM: 0.559,
    depthM: 0.69,
    color: "#90CAF9",
    strokeColor: "#1565C0",
    volumeL: 190,
    suitableFor: ["glass"],
    note: "Standard choice for glass — weight management",
  },
};

const WASTE_TYPES = {
  plastic: { label: "Plastic", icon: "recycle" },
  paper: { label: "Paper", icon: "file" },
  cardboard: { label: "Cardboard", icon: "package" },
  metal: { label: "Metal", icon: "nut" },
  newspaper: { label: "Newspaper", icon: "newspaper" },
  catalogs: { label: "Catalogs", icon: "books" },
  glass: { label: "Glass", icon: "wine" },
  general: { label: "General", icon: "trash" },
};

// ==========================================
// STATE
// ==========================================

let plans = []; // Array of all saved plans
let currentPlan = null; // Currently active plan object
let currentPlanIndex = -1; // Index in the plans array

// Editor UI State
let activeTool = "select"; // select, bin, door, tree, bush, measure, surface
let canvasWidth = 0;
let canvasHeight = 0;

let currentBinType = "660L";

// Interaction State
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let isSpacePressed = false;

let selectedBinId = null;
let draggedBin = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

// ==========================================
// DOM ELEMENTS
// ==========================================

const DOM = {
  // Views
  landingView: document.getElementById("landing-view"),
  editorView: document.getElementById("editor-view"),

  // Landing Page
  btnNewPlan: document.getElementById("btn-new-plan"),
  planList: document.getElementById("plan-list"),
  planListEmpty: document.getElementById("plan-list-empty"),

  // Editor Toolbar
  btnBackToPlans: document.getElementById("btn-back-to-plans"),
  inputPlanName: document.getElementById("input-plan-name"),
  toolBtns: document.querySelectorAll(".tool-btn"),
  btnSave: document.getElementById("btn-save"),
  btnSaveAs: document.getElementById("btn-save-as"),
  btnExportPng: document.getElementById("btn-export-png"),
  saveStatus: document.getElementById("save-status"),

  // Canvas
  canvasWrapper: document.getElementById("canvas-wrapper"),
  canvas: document.getElementById("editor-canvas"),
  scaleIndicator: document.getElementById("scale-indicator"),

  // Sidebar Controls
  binPalette: document.getElementById("bin-palette"),
  selectSurfaceTexture: document.getElementById("select-surface-texture"),
  selectOutsideTexture: document.getElementById("select-outside-texture"),
  btnSurfaceSettings: document.getElementById("btn-surface-settings"),
  toggleGrid: document.getElementById("toggle-grid"),
  toggleDimensions: document.getElementById("toggle-dimensions"),

  // Zoom Controls
  btnZoomOut: document.getElementById("btn-zoom-out"),
  btnZoomIn: document.getElementById("btn-zoom-in"),
  btnZoomReset: document.getElementById("btn-zoom-reset"),
  zoomLevelDisplay: document.getElementById("zoom-level-display"),

  // Modals
  modals: document.querySelectorAll(".modal"),
  closeBtns: document.querySelectorAll(
    ".close-btn[data-close], .btn-secondary[data-close]",
  ),

  // Confirm Delete Modal
  modalConfirmDelete: document.getElementById("modal-confirm-delete"),
  btnConfirmDelete: document.getElementById("btn-confirm-delete"),
  deletePlanName: document.getElementById("delete-plan-name"),
};

const ctx = DOM.canvas.getContext("2d");

// ==========================================
// INITIALIZATION
// ==========================================

function init() {
  loadPlans();
  setupEventListeners();
  renderBinPalette();
  showView("landing");

  // Handle window resize for canvas
  window.addEventListener("resize", () => {
    if (!DOM.editorView.classList.contains("hidden")) {
      resizeCanvas();
      draw();
    }
  });
}

function setupEventListeners() {
  // Landing
  DOM.btnNewPlan.addEventListener("click", createNewPlan);

  // Toolbar
  DOM.btnBackToPlans.addEventListener("click", () => {
    saveCurrentPlan();
    showView("landing");
    renderPlanList();
  });

  DOM.inputPlanName.addEventListener("change", (e) => {
    if (currentPlan) {
      currentPlan.name = e.target.value.trim() || "Untitled Plan";
      e.target.value = currentPlan.name;
      saveCurrentPlan();
    }
  });

  DOM.btnSave.addEventListener("click", saveCurrentPlan);

  // Tools
  DOM.toolBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const tool = e.currentTarget.dataset.tool;
      setActiveTool(tool);
    });
  });

  // Modals
  DOM.closeBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const modalId = e.currentTarget.dataset.close;
      closeModal(modalId);
    });
  });

  // Sidebar Controls
  if (DOM.selectSurfaceTexture) {
    DOM.selectSurfaceTexture.addEventListener("change", (e) => {
      if (!currentPlan) return;
      currentPlan.surface.texture = e.target.value;
      saveCurrentPlan();
      draw();
    });
  }

  if (DOM.selectOutsideTexture) {
    DOM.selectOutsideTexture.addEventListener("change", (e) => {
      if (!currentPlan) return;
      currentPlan.outside.texture = e.target.value;
      saveCurrentPlan();
      draw();
    });
  }

  if (DOM.btnSurfaceSettings) {
    DOM.btnSurfaceSettings.addEventListener("click", () => {
      if (!currentPlan) return;
      document.getElementById("input-surface-width").value =
        currentPlan.surface.widthM;
      document.getElementById("input-surface-depth").value =
        currentPlan.surface.depthM;
      document.getElementById("input-wall-thickness").value =
        currentPlan.surface.wallThicknessM;
      updateExteriorReadout();
      openModal("modal-surface-settings");
    });
  }

  if (DOM.toggleGrid) {
    DOM.toggleGrid.addEventListener("change", draw);
  }

  if (DOM.toggleDimensions) {
    DOM.toggleDimensions.addEventListener("change", draw);
  }

  // Zoom Controls
  if (DOM.btnZoomIn)
    DOM.btnZoomIn.addEventListener("click", () => zoomView(1.2));
  if (DOM.btnZoomOut)
    DOM.btnZoomOut.addEventListener("click", () => zoomView(1 / 1.2));
  if (DOM.btnZoomReset)
    DOM.btnZoomReset.addEventListener("click", () => {
      if (!currentPlan) return;
      currentPlan.viewport.scale = DEFAULT_SCALE;
      centerViewport();
      draw();
    });

  // Canvas Panning and Zooming
  DOM.canvas.addEventListener("wheel", handleWheel, { passive: false });
  DOM.canvas.addEventListener("mousedown", handleMouseDown);
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (!DOM.editorView.classList.contains("hidden")) {
      if (e.key === "Escape") {
        setActiveTool("select");
        selectedBinId = null;
        draw();
      } else if (e.code === "Space") {
        isSpacePressed = true;
        DOM.canvas.classList.add("panning");
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedBinId
      ) {
        currentPlan.bins = currentPlan.bins.filter(
          (b) => b.id !== selectedBinId,
        );
        selectedBinId = null;
        saveCurrentPlan();
        draw();
      } else if ((e.key === "r" || e.key === "R") && selectedBinId) {
        const bin = currentPlan.bins.find((b) => b.id === selectedBinId);
        if (bin) {
          bin.rotation = (bin.rotation + 90) % 360;
          saveCurrentPlan();
          draw();
        }
      }
    }
  });

  document.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
      isSpacePressed = false;
      if (!isPanning) {
        DOM.canvas.classList.remove("panning");
      }
    }
  });
}

// ==========================================
// VIEW MANAGEMENT
// ==========================================

function showView(viewName) {
  if (viewName === "landing") {
    DOM.landingView.classList.remove("hidden");
    DOM.editorView.classList.add("hidden");
    renderPlanList();
  } else if (viewName === "editor") {
    DOM.landingView.classList.add("hidden");
    DOM.editorView.classList.remove("hidden");

    // Setup editor state
    DOM.inputPlanName.value = currentPlan.name;

    if (DOM.selectSurfaceTexture) {
      DOM.selectSurfaceTexture.value = currentPlan.surface.texture;
    }
    if (DOM.selectOutsideTexture) {
      DOM.selectOutsideTexture.value = currentPlan.outside.texture;
    }

    setActiveTool("select");

    // Initialize canvas
    resizeCanvas();
    centerViewport();
    draw();
  }
}

function setActiveTool(tool) {
  activeTool = tool;

  // Update button UI
  DOM.toolBtns.forEach((btn) => {
    if (btn.dataset.tool === tool) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Update canvas cursor
  DOM.canvas.className = "";
  DOM.canvas.classList.add(`tool-${tool}`);

  // Re-render
  draw();
}

// ==========================================
// STATE & PERSISTENCE
// ==========================================

function loadPlans() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      plans = JSON.parse(stored);
    } else {
      plans = [];
    }
  } catch (e) {
    console.error("Failed to load plans from localStorage", e);
    plans = [];
  }
}

function savePlans() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    showSaveStatus("Saved");
  } catch (e) {
    console.error("Failed to save plans to localStorage", e);
    showSaveStatus("Error saving");
  }
}

function saveCurrentPlan() {
  if (!currentPlan) return;

  currentPlan.modified = new Date().toISOString();

  if (currentPlanIndex >= 0) {
    plans[currentPlanIndex] = currentPlan;
  } else {
    plans.push(currentPlan);
    currentPlanIndex = plans.length - 1;
  }

  savePlans();
}

function showSaveStatus(message) {
  DOM.saveStatus.textContent = message;
  DOM.saveStatus.style.opacity = 1;

  setTimeout(() => {
    DOM.saveStatus.style.opacity = 0.5;
  }, 2000);
}

function createNewPlan() {
  const now = new Date().toISOString();
  currentPlan = {
    id: "plan_" + Date.now(),
    version: APP_VERSION,
    name: "Untitled Plan",
    created: now,
    modified: now,
    viewport: {
      scale: DEFAULT_SCALE,
      panX: 0,
      panY: 0,
    },
    surface: {
      xM: 0, // Top-left of interior
      yM: 0,
      widthM: 10.0,
      depthM: 8.0,
      texture: "concrete",
      wallThicknessM: 0.1,
    },
    outside: {
      texture: "grass",
    },
    bins: [],
    doors: [],
    foliage: [],
  };

  // Automatically center the surface in the plan coordinates
  currentPlan.surface.xM = -currentPlan.surface.widthM / 2;
  currentPlan.surface.yM = -currentPlan.surface.depthM / 2;

  plans.push(currentPlan);
  currentPlanIndex = plans.length - 1;
  savePlans();

  showView("editor");
}

function openPlan(index) {
  if (index >= 0 && index < plans.length) {
    currentPlan = JSON.parse(JSON.stringify(plans[index])); // Deep copy for editing
    currentPlanIndex = index;
    showView("editor");
  }
}

let planToDeleteIndex = -1;

function confirmDeletePlan(index) {
  planToDeleteIndex = index;
  DOM.deletePlanName.textContent = plans[index].name;
  openModal("modal-confirm-delete");
}

DOM.btnConfirmDelete.addEventListener("click", () => {
  if (planToDeleteIndex >= 0) {
    plans.splice(planToDeleteIndex, 1);
    savePlans();
    renderPlanList();
    closeModal("modal-confirm-delete");
    planToDeleteIndex = -1;
  }
});

// ==========================================
// LANDING UI
// ==========================================

function renderPlanList() {
  DOM.planList.innerHTML = "";

  if (plans.length === 0) {
    DOM.planListEmpty.classList.remove("hidden");
  } else {
    DOM.planListEmpty.classList.add("hidden");

    // Sort by modified date descending
    const sortedPlans = plans
      .map((p, i) => ({ ...p, originalIndex: i }))
      .sort((a, b) => new Date(b.modified) - new Date(a.modified));

    sortedPlans.forEach((plan) => {
      const li = document.createElement("li");
      li.className = "plan-list-item";

      const dateStr = new Date(plan.modified).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      li.innerHTML = `
        <div class="plan-info" onclick="openPlan(${plan.originalIndex})">
            <div class="plan-title">${plan.name}</div>
            <div class="plan-date">Modified: ${dateStr}</div>
        </div>
        <div class="plan-actions">
            <button class="icon-btn" title="Delete" onclick="confirmDeletePlan(${plan.originalIndex}); event.stopPropagation();">
                <i class="ph ph-trash text-danger"></i>
            </button>
        </div>
      `;

      DOM.planList.appendChild(li);
    });
  }
}

function renderBinPalette() {
  if (!DOM.binPalette) return;
  DOM.binPalette.innerHTML = "";
  Object.entries(BIN_TYPES).forEach(([key, bin]) => {
    const el = document.createElement("div");
    el.className = "palette-item";
    if (key === currentBinType) el.classList.add("active");
    el.dataset.type = key;
    el.innerHTML = `
      <div class="palette-swatch" style="background-color: ${bin.color}; border-color: ${bin.strokeColor};"></div>
      <div class="palette-label">${bin.label}</div>
      <div class="palette-dims">${bin.widthM}m × ${bin.depthM}m</div>
    `;
    el.addEventListener("click", () => {
      setActiveTool("bin");
      document
        .querySelectorAll(".palette-item")
        .forEach((item) => item.classList.remove("active"));
      el.classList.add("active");
      currentBinType = key;
    });
    DOM.binPalette.appendChild(el);
  });
}

// ==========================================
// MODAL MANAGEMENT
// ==========================================

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove("hidden");
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add("hidden");
  }
}

function updateExteriorReadout() {
  const w =
    parseFloat(document.getElementById("input-surface-width").value) || 0;
  const d =
    parseFloat(document.getElementById("input-surface-depth").value) || 0;
  const t =
    parseFloat(document.getElementById("input-wall-thickness").value) || 0;

  const extW = w + t * 2;
  const extD = d + t * 2;

  const readout = document.getElementById("surface-exterior-readout");
  if (readout) {
    readout.textContent = `${extW.toFixed(2)} m × ${extD.toFixed(2)} m`;
  }
}

// Surface modal listeners
if (document.getElementById("input-surface-width")) {
  document
    .getElementById("input-surface-width")
    .addEventListener("input", updateExteriorReadout);
  document
    .getElementById("input-surface-depth")
    .addEventListener("input", updateExteriorReadout);
  document
    .getElementById("input-wall-thickness")
    .addEventListener("input", updateExteriorReadout);

  document.getElementById("btn-apply-surface").addEventListener("click", () => {
    if (!currentPlan) return;
    const w =
      parseFloat(document.getElementById("input-surface-width").value) || 1;
    const d =
      parseFloat(document.getElementById("input-surface-depth").value) || 1;
    const t =
      parseFloat(document.getElementById("input-wall-thickness").value) || 0.1;

    currentPlan.surface.widthM = w;
    currentPlan.surface.depthM = d;
    currentPlan.surface.wallThicknessM = t;

    saveCurrentPlan();
    closeModal("modal-surface-settings");
    draw();
  });
}

// ==========================================
// CANVAS & RENDERING
// ==========================================

function resizeCanvas() {
  const rect = DOM.canvasWrapper.getBoundingClientRect();
  canvasWidth = rect.width;
  canvasHeight = rect.height;

  // Set actual size in memory (scaled to account for retina displays)
  const dpr = window.devicePixelRatio || 1;
  DOM.canvas.width = canvasWidth * dpr;
  DOM.canvas.height = canvasHeight * dpr;

  // Normalize coordinate system to use css pixels
  ctx.scale(dpr, dpr);
}

function centerViewport() {
  if (!currentPlan) return;
  currentPlan.viewport.panX = canvasWidth / 2;
  currentPlan.viewport.panY = canvasHeight / 2;
  updateScaleIndicator();
}

function updateScaleIndicator() {
  if (!currentPlan) return;
  DOM.scaleIndicator.textContent = `1 m = ${Math.round(currentPlan.viewport.scale)} px`;

  if (DOM.zoomLevelDisplay) {
    const zoomPct = Math.round(
      (currentPlan.viewport.scale / DEFAULT_SCALE) * 100,
    );
    DOM.zoomLevelDisplay.textContent = `${zoomPct}%`;
  }
}

// ==========================================
// PAN & ZOOM
// ==========================================

function handleWheel(e) {
  // Disabled wheel zoom as requested
  // if (!currentPlan || DOM.editorView.classList.contains("hidden")) return;
  // e.preventDefault();
  // const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
  // const rect = DOM.canvas.getBoundingClientRect();
  // const mouseX = e.clientX - rect.left;
  // const mouseY = e.clientY - rect.top;
  // zoomViewAroundPoint(zoomFactor, mouseX, mouseY);
}

function zoomView(factor) {
  if (!currentPlan) return;
  zoomViewAroundPoint(factor, canvasWidth / 2, canvasHeight / 2);
}

function zoomViewAroundPoint(factor, x, y) {
  const vp = currentPlan.viewport;

  let newScale = vp.scale * factor;
  if (newScale < 10) newScale = 10;
  if (newScale > 200) newScale = 200;

  const actualFactor = newScale / vp.scale;

  vp.panX = x - (x - vp.panX) * actualFactor;
  vp.panY = y - (y - vp.panY) * actualFactor;
  vp.scale = newScale;

  updateScaleIndicator();
  draw();
}

function getMouseWorldPos(e) {
  const rect = DOM.canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const vp = currentPlan.viewport;
  const worldX = (mouseX - vp.panX) / vp.scale;
  const worldY = (mouseY - vp.panY) / vp.scale;
  return { x: worldX, y: worldY };
}

function hitTestBins(x, y) {
  for (let i = currentPlan.bins.length - 1; i >= 0; i--) {
    const bin = currentPlan.bins[i];
    const type = BIN_TYPES[bin.type];
    if (!type) continue;

    const isRotated = bin.rotation === 90 || bin.rotation === 270;
    const w = isRotated ? type.depthM : type.widthM;
    const h = isRotated ? type.widthM : type.depthM;

    if (x >= bin.xM && x <= bin.xM + w && y >= bin.yM && y <= bin.yM + h) {
      return bin;
    }
  }
  return null;
}

function placeBin(x, y) {
  const type = BIN_TYPES[currentBinType];
  if (!type) return;

  let sx = x - type.widthM / 2;
  let sy = y - type.depthM / 2;

  if (DOM.toggleGrid && DOM.toggleGrid.checked) {
    sx = Math.round(sx * 10) / 10;
    sy = Math.round(sy * 10) / 10;
  }

  const newBin = {
    id: "bin_" + Date.now() + Math.floor(Math.random() * 1000),
    type: currentBinType,
    xM: sx,
    yM: sy,
    rotation: 0,
    wasteType: null,
  };

  currentPlan.bins.push(newBin);
  selectedBinId = newBin.id;
  setActiveTool("select");
  saveCurrentPlan();
}

function handleMouseDown(e) {
  if (!currentPlan || DOM.editorView.classList.contains("hidden")) return;

  if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
    isPanning = true;
    panStartX = e.clientX - currentPlan.viewport.panX;
    panStartY = e.clientY - currentPlan.viewport.panY;
    DOM.canvas.classList.add("panning");
    e.preventDefault();
    return;
  }

  if (e.button === 0) {
    const pos = getMouseWorldPos(e);
    if (activeTool === "bin") {
      placeBin(pos.x, pos.y);
    } else if (activeTool === "select") {
      const hitBin = hitTestBins(pos.x, pos.y);
      if (hitBin) {
        selectedBinId = hitBin.id;
        draggedBin = hitBin;
        dragOffsetX = pos.x - hitBin.xM;
        dragOffsetY = pos.y - hitBin.yM;
      } else {
        selectedBinId = null;
      }
      draw();
    }
  }
}

function handleMouseMove(e) {
  if (isPanning && currentPlan) {
    currentPlan.viewport.panX = e.clientX - panStartX;
    currentPlan.viewport.panY = e.clientY - panStartY;
    draw();
  } else if (draggedBin && activeTool === "select") {
    const pos = getMouseWorldPos(e);
    let newX = pos.x - dragOffsetX;
    let newY = pos.y - dragOffsetY;

    if (DOM.toggleGrid && DOM.toggleGrid.checked) {
      newX = Math.round(newX * 10) / 10;
      newY = Math.round(newY * 10) / 10;
    }

    draggedBin.xM = newX;
    draggedBin.yM = newY;
    draw();
  }
}

function handleMouseUp(e) {
  if (isPanning) {
    isPanning = false;
    if (!isSpacePressed) {
      DOM.canvas.classList.remove("panning");
    }
  }
  if (draggedBin) {
    draggedBin = null;
    saveCurrentPlan();
  }
}

function draw() {
  if (!currentPlan || !ctx) return;

  const vp = currentPlan.viewport;

  // Clear canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Save context state before applying camera transforms
  ctx.save();

  // Apply camera transform (pan & zoom)
  ctx.translate(vp.panX, vp.panY);
  ctx.scale(vp.scale, vp.scale);

  // DRAW LAYERS (Reverse Order)

  // 1. Outside Background (Grass)
  drawBackground();

  // 2. Surface & Walls
  drawSurface();

  // 3. TODO: Doors
  drawBins();
  // 5. TODO: Trees & Bushes
  // 6. TODO: Overlays (grid, handles, measure line)
  drawGrid();
  drawDimensions();

  ctx.restore();
}

function drawBins() {
  if (!currentPlan) return;
  const s = currentPlan.surface;

  const minX = s.xM;
  const minY = s.yM;
  const maxX = s.xM + s.widthM;
  const maxY = s.yM + s.depthM;

  currentPlan.bins.forEach((bin) => {
    const type = BIN_TYPES[bin.type];
    if (!type) return;

    const isRotated = bin.rotation === 90 || bin.rotation === 270;
    const w = isRotated ? type.depthM : type.widthM;
    const h = isRotated ? type.widthM : type.depthM;

    const eps = 0.001;
    const isOOB =
      bin.xM < minX - eps ||
      bin.yM < minY - eps ||
      bin.xM + w > maxX + eps ||
      bin.yM + h > maxY + eps;

    ctx.save();
    ctx.translate(bin.xM, bin.yM);

    ctx.fillStyle = type.color;
    ctx.fillRect(0, 0, w, h);

    ctx.lineWidth = 0.02;
    ctx.strokeStyle = isOOB ? "#D93025" : type.strokeColor;
    if (isOOB) {
      ctx.lineWidth = 0.05;
    }
    ctx.strokeRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((bin.rotation * Math.PI) / 180);
    ctx.translate(-type.widthM / 2, -type.depthM / 2);

    ctx.beginPath();
    ctx.moveTo(0, type.depthM * 0.15);
    ctx.lineTo(type.widthM, type.depthM * 0.15);
    ctx.strokeStyle = type.strokeColor;
    ctx.lineWidth = 0.02;
    ctx.stroke();

    ctx.fillStyle = "#000";
    ctx.font = "0.18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(type.label, type.widthM / 2, type.depthM / 2);

    ctx.restore();

    if (bin.id === selectedBinId) {
      ctx.strokeStyle = "#1A73E8";
      ctx.lineWidth = 0.04;
      ctx.strokeRect(-0.02, -0.02, w + 0.04, h + 0.04);
    }

    ctx.restore();
  });
}

function drawBackground() {
  // To handle infinite background while translated, draw a large rect relative to inverse translation
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform

  // Fill with grass color
  ctx.fillStyle =
    currentPlan.outside.texture === "grass" ? "#C8E6C9" : "#C8E6C9";
  ctx.fillRect(0, 0, DOM.canvas.width, DOM.canvas.height);

  ctx.restore();
}

function drawSurface() {
  const s = currentPlan.surface;

  // Calculate exterior bounds (walls extend outwards)
  const extX = s.xM - s.wallThicknessM;
  const extY = s.yM - s.wallThicknessM;
  const extW = s.widthM + s.wallThicknessM * 2;
  const extH = s.depthM + s.wallThicknessM * 2;

  // Draw Wall (Exterior Fill)
  ctx.fillStyle = "#9E9E9E";
  ctx.fillRect(extX, extY, extW, extH);

  // Draw Wall Stroke
  ctx.strokeStyle = "#616161";
  ctx.lineWidth = 0.05; // 5cm visible stroke
  ctx.strokeRect(extX, extY, extW, extH);

  // Draw Interior Fill
  if (s.texture === "concrete") ctx.fillStyle = "#EEEEEE";
  else if (s.texture === "asphalt") ctx.fillStyle = "#757575";
  else if (s.texture === "tiles") ctx.fillStyle = "#E0E0E0";
  else ctx.fillStyle = "#EEEEEE";

  ctx.fillRect(s.xM, s.yM, s.widthM, s.depthM);

  // Interior stroke
  ctx.strokeStyle = "#BDBDBD";
  ctx.lineWidth = 0.02;
  ctx.strokeRect(s.xM, s.yM, s.widthM, s.depthM);

  // TODO: if tiles, draw grid pattern inside interior
}

function drawGrid() {
  if (!DOM.toggleGrid || !DOM.toggleGrid.checked) return;
  const s = currentPlan.surface;

  ctx.save();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
  ctx.lineWidth = 1 / currentPlan.viewport.scale; // 1px physical width

  ctx.beginPath();
  // Draw grid inside surface only
  const eps = 0.001;
  for (let x = 0; x <= s.widthM + eps; x += 0.1) {
    const posX = s.xM + x;
    ctx.moveTo(posX, s.yM);
    ctx.lineTo(posX, s.yM + s.depthM);
  }
  for (let y = 0; y <= s.depthM + eps; y += 0.1) {
    const posY = s.yM + y;
    ctx.moveTo(s.xM, posY);
    ctx.lineTo(s.xM + s.widthM, posY);
  }
  ctx.stroke();
  ctx.restore();
}

function drawDimensions() {
  if (!DOM.toggleDimensions || !DOM.toggleDimensions.checked) return;
  const s = currentPlan.surface;

  ctx.save();
  ctx.fillStyle = "#5F6368";

  // Dynamic font size relative to scale so it stays readable when zooming
  const fontSize = 14 / currentPlan.viewport.scale;
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const wStr = `${s.widthM.toFixed(1)} m`;
  const dStr = `${s.depthM.toFixed(1)} m`;

  const extX = s.xM - s.wallThicknessM;
  const extY = s.yM - s.wallThicknessM;
  const extW = s.widthM + s.wallThicknessM * 2;
  const extH = s.depthM + s.wallThicknessM * 2;

  const offset = fontSize * 1.5;

  // North (width)
  ctx.fillText(wStr, extX + extW / 2, extY - offset);
  // South (width)
  ctx.fillText(wStr, extX + extW / 2, extY + extH + offset);

  ctx.save();
  ctx.translate(extX - offset, extY + extH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(dStr, 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(extX + extW + offset, extY + extH / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillText(dStr, 0, 0);
  ctx.restore();

  ctx.restore();
}

// Start application
document.addEventListener("DOMContentLoaded", init);
