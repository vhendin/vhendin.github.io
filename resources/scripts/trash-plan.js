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
    suitableFor: ["metal", "newspaper"],
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
  glass: { label: "Glass", icon: "wine" },
  general: { label: "General", icon: "trash" },
};

const iconImages = {};
Object.entries(WASTE_TYPES).forEach(([key, type]) => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = `https://unpkg.com/@phosphor-icons/core@2.0.1/assets/regular/${type.icon}.svg`;
  img.onload = () => {
    if (typeof draw === "function") draw();
  };
  iconImages[key] = img;
});

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

let selectedDoorId = null;
let draggedDoor = null;

let selectedFoliageId = null;
let draggedFoliage = null;

let draggedHandle = null;
let surfaceStartBounds = null;

let measurePointA = null;
let measurePointB = null;
let currentMousePos = null;

let isSidebarOpen = true;
let isExporting = false;

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
  btnToggleSidebar: document.getElementById("btn-toggle-sidebar"),
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
  sidebar: document.getElementById("editor-sidebar"),
  btnActionRotate: document.getElementById("btn-action-rotate"),
  btnActionDelete: document.getElementById("btn-action-delete"),
  selectionPanel: document.getElementById("selection-panel"),
  panelBinSettings: document.getElementById("panel-bin-settings"),
  panelDoorSettings: document.getElementById("panel-door-settings"),
  wasteTypeGrid: document.getElementById("waste-type-grid"),
  inputDoorWidth: document.getElementById("input-door-width"),
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
  renderWasteTypeGrid();
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
  if (DOM.btnToggleSidebar) {
    DOM.btnToggleSidebar.addEventListener("click", () => {
      isSidebarOpen = !isSidebarOpen;
      if (isSidebarOpen) {
        DOM.sidebar.classList.remove("hidden");
      } else {
        DOM.sidebar.classList.add("hidden");
      }
      // Give DOM time to update flex layout before resizing canvas
      setTimeout(() => {
        resizeCanvas();
        draw();
      }, 10);
    });
  }

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

  if (DOM.btnExportPng) {
    DOM.btnExportPng.addEventListener("click", () => {
      if (!currentPlan) return;
      isExporting = true;
      draw();

      const dataUrl = DOM.canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      const fileName =
        currentPlan.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() ||
        "trash_plan";
      a.download = `${fileName}.png`;
      a.click();

      isExporting = false;
      draw();
    });
  }

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
  if (DOM.btnActionRotate) {
    DOM.btnActionRotate.addEventListener("click", () => {
      if (selectedBinId) {
        const bin = currentPlan.bins.find((b) => b.id === selectedBinId);
        if (bin) {
          bin.rotation = (bin.rotation + 90) % 360;
          saveCurrentPlan();
          draw();
        }
      }
    });
  }

  if (DOM.btnActionDelete) {
    DOM.btnActionDelete.addEventListener("click", () => {
      if (selectedBinId) {
        currentPlan.bins = currentPlan.bins.filter(
          (b) => b.id !== selectedBinId,
        );
        selectedBinId = null;
      } else if (selectedDoorId) {
        currentPlan.doors = currentPlan.doors.filter(
          (d) => d.id !== selectedDoorId,
        );
        selectedDoorId = null;
      } else if (selectedFoliageId) {
        currentPlan.foliage = currentPlan.foliage.filter(
          (f) => f.id !== selectedFoliageId,
        );
        selectedFoliageId = null;
      }
      saveCurrentPlan();
      updateSelectionPanel();
      draw();
    });
  }

  if (DOM.inputDoorWidth) {
    DOM.inputDoorWidth.addEventListener("change", (e) => {
      if (!currentPlan || !selectedDoorId) return;
      const door = currentPlan.doors.find((d) => d.id === selectedDoorId);
      if (door) {
        let w = parseFloat(e.target.value) || 1.2;
        if (w < 1.2) w = 1.2;
        door.widthM = w;
        e.target.value = w;
        saveCurrentPlan();
        draw();
      }
    });
  }

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

  // Use pointer events to handle both mouse and touch unified
  DOM.canvas.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("pointercancel", handlePointerUp);

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (!DOM.editorView.classList.contains("hidden")) {
      if (e.key === "Escape") {
        setActiveTool("select");
        selectedBinId = null;
        selectedDoorId = null;
        selectedFoliageId = null;
        updateSelectionPanel();
        draw();
      } else if (e.code === "Space") {
        isSpacePressed = true;
        DOM.canvas.classList.add("panning");
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedBinId) {
          currentPlan.bins = currentPlan.bins.filter(
            (b) => b.id !== selectedBinId,
          );
          selectedBinId = null;
          saveCurrentPlan();
          updateSelectionPanel();
          draw();
        } else if (selectedDoorId) {
          currentPlan.doors = currentPlan.doors.filter(
            (d) => d.id !== selectedDoorId,
          );
          selectedDoorId = null;
          saveCurrentPlan();
          updateSelectionPanel();
          draw();
        } else if (selectedFoliageId) {
          currentPlan.foliage = currentPlan.foliage.filter(
            (f) => f.id !== selectedFoliageId,
          );
          selectedFoliageId = null;
          saveCurrentPlan();
          updateSelectionPanel();
          draw();
        }
      } else if ((e.key === "r" || e.key === "R") && selectedBinId) {
        const bin = currentPlan.bins.find((b) => b.id === selectedBinId);
        if (bin) {
          bin.rotation = (bin.rotation + 90) % 360;
          saveCurrentPlan();
          draw();
        }
      } else if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        let moved = false;
        let dx = 0;
        let dy = 0;
        const amount = 0.1;

        if (e.key === "ArrowUp") dy = -amount;
        if (e.key === "ArrowDown") dy = amount;
        if (e.key === "ArrowLeft") dx = -amount;
        if (e.key === "ArrowRight") dx = amount;

        if (selectedBinId) {
          const bin = currentPlan.bins.find((b) => b.id === selectedBinId);
          if (bin) {
            bin.xM = Math.round((bin.xM + dx) * 100) / 100;
            bin.yM = Math.round((bin.yM + dy) * 100) / 100;
            moved = true;
          }
        } else if (selectedFoliageId) {
          const f = currentPlan.foliage.find((b) => b.id === selectedFoliageId);
          if (f) {
            f.xM = Math.round((f.xM + dx) * 100) / 100;
            f.yM = Math.round((f.yM + dy) * 100) / 100;
            moved = true;
          }
        }

        if (moved) {
          e.preventDefault();
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
    updateSelectionPanel();

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

  if (tool !== "select") {
    selectedBinId = null;
    selectedDoorId = null;
    selectedFoliageId = null;
    if (typeof updateSelectionPanel === "function") updateSelectionPanel();
  }

  if (tool !== "measure") {
    measurePointA = null;
    measurePointB = null;
  }

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

function updateSelectionPanel() {
  if (!DOM.selectionPanel) return;

  if (selectedBinId && activeTool === "select") {
    DOM.selectionPanel.classList.remove("hidden");
    if (DOM.panelBinSettings) DOM.panelBinSettings.classList.remove("hidden");
    if (DOM.panelDoorSettings) DOM.panelDoorSettings.classList.add("hidden");
    if (DOM.btnActionRotate) DOM.btnActionRotate.classList.remove("hidden");

    const selectedBin = currentPlan.bins.find((b) => b.id === selectedBinId);

    // Update active state in grid
    if (DOM.wasteTypeGrid) {
      document.querySelectorAll(".waste-icon").forEach((el) => {
        if (el.dataset.type === selectedBin.wasteType) {
          el.classList.add("active");
        } else {
          el.classList.remove("active");
        }
      });
    }
  } else if (selectedDoorId && activeTool === "select") {
    DOM.selectionPanel.classList.remove("hidden");
    if (DOM.panelBinSettings) DOM.panelBinSettings.classList.add("hidden");
    if (DOM.panelDoorSettings) DOM.panelDoorSettings.classList.remove("hidden");
    if (DOM.btnActionRotate) DOM.btnActionRotate.classList.add("hidden");

    const selectedDoor = currentPlan.doors.find((d) => d.id === selectedDoorId);
    if (DOM.inputDoorWidth && selectedDoor) {
      DOM.inputDoorWidth.value = selectedDoor.widthM;
    }
  } else if (selectedFoliageId && activeTool === "select") {
    DOM.selectionPanel.classList.remove("hidden");
    if (DOM.panelBinSettings) DOM.panelBinSettings.classList.add("hidden");
    if (DOM.panelDoorSettings) DOM.panelDoorSettings.classList.add("hidden");
    if (DOM.btnActionRotate) DOM.btnActionRotate.classList.add("hidden");
  } else {
    DOM.selectionPanel.classList.add("hidden");
  }
}

function renderWasteTypeGrid() {
  if (!DOM.wasteTypeGrid) return;
  DOM.wasteTypeGrid.innerHTML = "";
  Object.entries(WASTE_TYPES).forEach(([key, type]) => {
    const el = document.createElement("div");
    el.className = "waste-icon";
    el.dataset.type = key;
    el.title = type.label;
    el.innerHTML = `<i class="ph ph-${type.icon}"></i>`;

    el.addEventListener("click", () => {
      if (!selectedBinId) return;
      const bin = currentPlan.bins.find((b) => b.id === selectedBinId);
      if (bin) {
        // Toggle off if clicking the same one
        if (bin.wasteType === key) {
          bin.wasteType = null;
        } else {
          bin.wasteType = key;
        }
        updateSelectionPanel();
        saveCurrentPlan();
        draw();
      }
    });
    DOM.wasteTypeGrid.appendChild(el);
  });
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

  const scale = currentPlan.viewport.scale; // px per meter

  // Determine appropriate distance for a reasonable bar width (target ~80px)
  let meters = 80 / scale;

  // Snap to nice numbers: 0.1, 0.2, 0.5, 1, 2, 5, 10...
  const magnitude = Math.pow(10, Math.floor(Math.log10(meters)));
  const normalized = meters / magnitude;

  let snappedNormalized;
  if (normalized < 1.5) snappedNormalized = 1;
  else if (normalized < 3.5) snappedNormalized = 2;
  else if (normalized < 7.5) snappedNormalized = 5;
  else snappedNormalized = 10;

  meters = snappedNormalized * magnitude;
  const barWidth = Math.round(meters * scale);

  const displayValue =
    meters < 1 ? `${Math.round(meters * 100)} cm` : `${meters} m`;

  DOM.scaleIndicator.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center;">
      <span style="font-size: 11px; font-weight: bold; color: var(--color-text-main); text-shadow: 1px 1px 0 rgba(255,255,255,0.9), -1px -1px 0 rgba(255,255,255,0.9), 1px -1px 0 rgba(255,255,255,0.9), -1px 1px 0 rgba(255,255,255,0.9);">${displayValue}</span>
      <div style="height: 6px; border: 2px solid var(--color-text-main); border-top: none; width: ${barWidth}px; box-sizing: border-box; box-shadow: 0 1px 2px rgba(255,255,255,0.5);"></div>
    </div>
  `;
  DOM.scaleIndicator.style.background = "transparent";
  DOM.scaleIndicator.style.border = "none";
  DOM.scaleIndicator.style.boxShadow = "none";
  DOM.scaleIndicator.style.padding = "0";

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
  if (!currentPlan || DOM.editorView.classList.contains("hidden")) return;
  e.preventDefault();

  const isPinch = e.ctrlKey;

  if (isPinch) {
    // Zooming (pinch)
    // Mac trackpad pinch-to-zoom fires wheel events with ctrlKey=true
    // deltaY represents the zoom scale directly
    const zoomFactor = 1 - e.deltaY * 0.01;
    const rect = DOM.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    zoomViewAroundPoint(zoomFactor, mouseX, mouseY);
  } else {
    // Panning (two-finger swipe)
    // Trackpads emit fine-grained wheel events for panning
    currentPlan.viewport.panX -= e.deltaX;
    currentPlan.viewport.panY -= e.deltaY;
    draw();
  }
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

function getPointerWorldPos(e) {
  const rect = DOM.canvas.getBoundingClientRect();
  const pointerX = e.clientX - rect.left;
  const pointerY = e.clientY - rect.top;
  const vp = currentPlan.viewport;
  const worldX = (pointerX - vp.panX) / vp.scale;
  const worldY = (pointerY - vp.panY) / vp.scale;
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
  selectedDoorId = null;
  setActiveTool("select");
  updateSelectionPanel();
  saveCurrentPlan();
}

function getSurfaceHandles(s) {
  return [
    { id: "nw", x: s.xM, y: s.yM },
    { id: "n", x: s.xM + s.widthM / 2, y: s.yM },
    { id: "ne", x: s.xM + s.widthM, y: s.yM },
    { id: "e", x: s.xM + s.widthM, y: s.yM + s.depthM / 2 },
    { id: "se", x: s.xM + s.widthM, y: s.yM + s.depthM },
    { id: "s", x: s.xM + s.widthM / 2, y: s.yM + s.depthM },
    { id: "sw", x: s.xM, y: s.yM + s.depthM },
    { id: "w", x: s.xM, y: s.yM + s.depthM / 2 },
  ];
}

function hitTestHandles(x, y) {
  const s = currentPlan.surface;
  const handles = getSurfaceHandles(s);
  const hitRadius = 0.3; // generous hit area
  for (const h of handles) {
    const dx = x - h.x;
    const dy = y - h.y;
    if (Math.sqrt(dx * dx + dy * dy) <= hitRadius) {
      return h.id;
    }
  }
  return null;
}

function hitTestFoliage(x, y) {
  for (let i = currentPlan.foliage.length - 1; i >= 0; i--) {
    const f = currentPlan.foliage[i];
    const r = f.type === "tree" ? 0.8 : 0.4;
    const dx = x - f.xM;
    const dy = y - f.yM;
    if (Math.sqrt(dx * dx + dy * dy) <= r) {
      return f;
    }
  }
  return null;
}

function placeFoliage(x, y, type) {
  let px = x;
  let py = y;
  if (DOM.toggleGrid && DOM.toggleGrid.checked) {
    px = Math.round(px * 10) / 10;
    py = Math.round(py * 10) / 10;
  }
  const newFoliage = {
    id: "foliage_" + Date.now() + Math.floor(Math.random() * 1000),
    type: type,
    xM: px,
    yM: py,
  };
  currentPlan.foliage.push(newFoliage);
  selectedFoliageId = newFoliage.id;
  selectedBinId = null;
  selectedDoorId = null;
  setActiveTool("select");
  updateSelectionPanel();
  saveCurrentPlan();
}

function hitTestDoors(x, y) {
  const s = currentPlan.surface;
  const t = s.wallThicknessM;

  for (let i = currentPlan.doors.length - 1; i >= 0; i--) {
    const d = currentPlan.doors[i];
    let dx, dy, dw, dh;
    if (d.edge === "n") {
      dx = s.xM + d.offsetM;
      dy = s.yM - t;
      dw = d.widthM;
      dh = t;
    } else if (d.edge === "s") {
      dx = s.xM + d.offsetM;
      dy = s.yM + s.depthM;
      dw = d.widthM;
      dh = t;
    } else if (d.edge === "w") {
      dx = s.xM - t;
      dy = s.yM + d.offsetM;
      dw = t;
      dh = d.widthM;
    } else if (d.edge === "e") {
      dx = s.xM + s.widthM;
      dy = s.yM + d.offsetM;
      dw = t;
      dh = d.widthM;
    }

    const pad = 0.2;
    if (
      x >= dx - pad &&
      x <= dx + dw + pad &&
      y >= dy - pad &&
      y <= dy + dh + pad
    ) {
      return d;
    }
  }
  return null;
}

function getClosestEdge(x, y) {
  const s = currentPlan.surface;
  const minX = s.xM;
  const maxX = s.xM + s.widthM;
  const minY = s.yM;
  const maxY = s.yM + s.depthM;

  const dN = Math.abs(y - minY);
  const dS = Math.abs(y - maxY);
  const dW = Math.abs(x - minX);
  const dE = Math.abs(x - maxX);

  const min = Math.min(dN, dS, dW, dE);
  if (min === dN) return { edge: "n", offset: x - minX };
  if (min === dS) return { edge: "s", offset: x - minX };
  if (min === dW) return { edge: "w", offset: y - minY };
  return { edge: "e", offset: y - minY };
}

function placeDoor(x, y) {
  const s = currentPlan.surface;
  const { edge, offset } = getClosestEdge(x, y);

  let offsetM = offset - 1.2 / 2;
  if (offsetM < 0) offsetM = 0;

  const maxOffset = (edge === "n" || edge === "s" ? s.widthM : s.depthM) - 1.2;
  if (offsetM > maxOffset) offsetM = maxOffset;

  const newDoor = {
    id: "door_" + Date.now() + Math.floor(Math.random() * 1000),
    edge: edge,
    offsetM: offsetM,
    widthM: 1.2,
  };
  currentPlan.doors.push(newDoor);
  selectedDoorId = newDoor.id;
  selectedBinId = null;
  setActiveTool("select");
  updateSelectionPanel();
  saveCurrentPlan();
}

function handlePointerDown(e) {
  if (!currentPlan || DOM.editorView.classList.contains("hidden")) return;

  // Middle click (1) or left click + space (0) or touch panning logic
  // e.pointerType === "touch" makes single-finger touch behave as pan when not dragging objects
  if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
    isPanning = true;
    panStartX = e.clientX - currentPlan.viewport.panX;
    panStartY = e.clientY - currentPlan.viewport.panY;
    DOM.canvas.classList.add("panning");
    e.preventDefault();
    // Capture pointer so panning works outside canvas
    DOM.canvas.setPointerCapture(e.pointerId);
    return;
  }

  // Left click (0) or touch (0)
  if (e.button === 0) {
    DOM.canvas.setPointerCapture(e.pointerId);
    const pos = getPointerWorldPos(e);

    if (activeTool === "surface") {
      const handle = hitTestHandles(pos.x, pos.y);
      if (handle) {
        draggedHandle = handle;
        surfaceStartBounds = {
          x: currentPlan.surface.xM,
          y: currentPlan.surface.yM,
          w: currentPlan.surface.widthM,
          h: currentPlan.surface.depthM,
          startX: pos.x,
          startY: pos.y,
        };
      }
    } else if (activeTool === "bin") {
      placeBin(pos.x, pos.y);
    } else if (activeTool === "door") {
      placeDoor(pos.x, pos.y);
    } else if (activeTool === "tree" || activeTool === "bush") {
      placeFoliage(pos.x, pos.y, activeTool);
    } else if (activeTool === "measure") {
      if (!measurePointA) {
        measurePointA = { x: pos.x, y: pos.y };
        measurePointB = null;
      } else if (!measurePointB) {
        measurePointB = { x: pos.x, y: pos.y };
      } else {
        measurePointA = null;
        measurePointB = null;
      }
      draw();
    } else if (activeTool === "select") {
      const hitBin = hitTestBins(pos.x, pos.y);
      const hitDoor = hitTestDoors(pos.x, pos.y);
      const hitFoliage = hitTestFoliage(pos.x, pos.y);

      if (hitBin) {
        selectedBinId = hitBin.id;
        selectedDoorId = null;
        selectedFoliageId = null;
        draggedBin = hitBin;
        dragOffsetX = pos.x - hitBin.xM;
        dragOffsetY = pos.y - hitBin.yM;
      } else if (hitDoor) {
        selectedDoorId = hitDoor.id;
        selectedBinId = null;
        selectedFoliageId = null;
        draggedDoor = hitDoor;
        if (hitDoor.edge === "n" || hitDoor.edge === "s") {
          dragOffsetX = pos.x - hitDoor.offsetM;
        } else {
          dragOffsetX = pos.y - hitDoor.offsetM;
        }
      } else if (hitFoliage) {
        selectedFoliageId = hitFoliage.id;
        selectedBinId = null;
        selectedDoorId = null;
        draggedFoliage = hitFoliage;
        dragOffsetX = pos.x - hitFoliage.xM;
        dragOffsetY = pos.y - hitFoliage.yM;
      } else {
        selectedBinId = null;
        selectedDoorId = null;
        selectedFoliageId = null;

        // If touch, fallback to panning if nothing selected
        if (e.pointerType === "touch") {
          isPanning = true;
          panStartX = e.clientX - currentPlan.viewport.panX;
          panStartY = e.clientY - currentPlan.viewport.panY;
          DOM.canvas.classList.add("panning");
        }
      }
      updateSelectionPanel();
      draw();
    }
  }
}

function handlePointerMove(e) {
  if (!currentPlan) return;
  currentMousePos = getPointerWorldPos(e);

  if (isPanning) {
    currentPlan.viewport.panX = e.clientX - panStartX;
    currentPlan.viewport.panY = e.clientY - panStartY;
    draw();
  } else if (draggedBin && activeTool === "select") {
    const pos = getPointerWorldPos(e);
    let newX = pos.x - dragOffsetX;
    let newY = pos.y - dragOffsetY;

    if (DOM.toggleGrid && DOM.toggleGrid.checked) {
      newX = Math.round(newX * 10) / 10;
      newY = Math.round(newY * 10) / 10;
    }

    draggedBin.xM = newX;
    draggedBin.yM = newY;
    draw();
  } else if (draggedDoor && activeTool === "select") {
    const s = currentPlan.surface;
    const pos = getPointerWorldPos(e);
    let newOffset =
      draggedDoor.edge === "n" || draggedDoor.edge === "s"
        ? pos.x - dragOffsetX
        : pos.y - dragOffsetX;

    if (DOM.toggleGrid && DOM.toggleGrid.checked) {
      newOffset = Math.round(newOffset * 10) / 10;
    }

    const maxOffset =
      (draggedDoor.edge === "n" || draggedDoor.edge === "s"
        ? s.widthM
        : s.depthM) - draggedDoor.widthM;
    if (newOffset < 0) newOffset = 0;
    if (newOffset > maxOffset) newOffset = maxOffset;

    draggedDoor.offsetM = newOffset;
    draw();
  } else if (draggedFoliage && activeTool === "select") {
    const pos = getPointerWorldPos(e);
    let newX = pos.x - dragOffsetX;
    let newY = pos.y - dragOffsetY;

    if (DOM.toggleGrid && DOM.toggleGrid.checked) {
      newX = Math.round(newX * 10) / 10;
      newY = Math.round(newY * 10) / 10;
    }

    draggedFoliage.xM = newX;
    draggedFoliage.yM = newY;
    draw();
  } else if (activeTool === "surface" && draggedHandle) {
    const pos = getPointerWorldPos(e);
    let dx = pos.x - surfaceStartBounds.startX;
    let dy = pos.y - surfaceStartBounds.startY;

    if (DOM.toggleGrid && DOM.toggleGrid.checked) {
      dx = Math.round(dx * 10) / 10;
      dy = Math.round(dy * 10) / 10;
    }

    const s = currentPlan.surface;
    const sb = surfaceStartBounds;

    if (draggedHandle.includes("n")) {
      s.yM = sb.y + dy;
      s.depthM = sb.h - dy;
    }
    if (draggedHandle.includes("s")) {
      s.depthM = sb.h + dy;
    }
    if (draggedHandle.includes("w")) {
      s.xM = sb.x + dx;
      s.widthM = sb.w - dx;
    }
    if (draggedHandle.includes("e")) {
      s.widthM = sb.w + dx;
    }

    // Minimum constraints
    if (s.widthM < 1) {
      if (draggedHandle.includes("w")) s.xM = sb.x + sb.w - 1;
      s.widthM = 1;
    }
    if (s.depthM < 1) {
      if (draggedHandle.includes("n")) s.yM = sb.y + sb.h - 1;
      s.depthM = 1;
    }

    draw();
  } else if (activeTool === "measure" && measurePointA && !measurePointB) {
    draw();
  }
}

function handlePointerUp(e) {
  DOM.canvas.releasePointerCapture(e.pointerId);

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
  if (draggedDoor) {
    draggedDoor = null;
    saveCurrentPlan();
  }
  if (draggedFoliage) {
    draggedFoliage = null;
    saveCurrentPlan();
  }
  if (draggedHandle) {
    draggedHandle = null;
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

  // 3. Doors
  drawDoors();

  // 4. Bins
  drawBins();
  // 5. Trees & Bushes
  drawFoliage();
  // 6. TODO: Overlays (grid, handles, measure line)
  drawGrid();
  drawDimensions();
  if (!isExporting) {
    drawHandles();
    drawMeasurement();
  }

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

    ctx.save();
    ctx.translate(type.widthM / 2, type.depthM / 2);
    ctx.rotate((-bin.rotation * Math.PI) / 180);

    ctx.fillStyle = "#000";
    ctx.font = "0.18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (
      bin.wasteType &&
      iconImages[bin.wasteType] &&
      iconImages[bin.wasteType].complete
    ) {
      ctx.fillText(type.label, 0, type.depthM * -0.15);
      const size = 0.25;
      ctx.drawImage(
        iconImages[bin.wasteType],
        -size / 2,
        type.depthM * 0.15 - size / 2,
        size,
        size,
      );
    } else {
      ctx.fillText(type.label, 0, 0);
    }

    ctx.restore();

    ctx.restore();

    if (bin.id === selectedBinId && !isExporting) {
      ctx.strokeStyle = "#1A73E8";
      ctx.lineWidth = 0.04;
      ctx.strokeRect(-0.02, -0.02, w + 0.04, h + 0.04);
    }

    if (isOOB) {
      ctx.save();
      ctx.translate(w, 0);
      ctx.fillStyle = "#D93025";
      ctx.beginPath();
      ctx.moveTo(0, -0.15);
      ctx.lineTo(0.13, 0.1);
      ctx.lineTo(-0.13, 0.1);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 0.18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", 0, 0.02);
      ctx.restore();
    }

    ctx.restore();
  });
}

function drawFoliage() {
  if (!currentPlan) return;
  currentPlan.foliage.forEach((f) => {
    const isTree = f.type === "tree";
    const r = isTree ? 0.8 : 0.4;

    ctx.save();
    ctx.translate(f.xM, f.yM);

    // Drop shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.beginPath();
    ctx.arc(0.1, 0.1, r, 0, Math.PI * 2);
    ctx.fill();

    // Fill
    ctx.fillStyle = isTree ? "#388E3C" : "#66BB6A";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Stroke
    ctx.strokeStyle = isTree ? "#1B5E20" : "#2E7D32";
    ctx.lineWidth = 0.05;
    ctx.stroke();

    if (f.id === selectedFoliageId && !isExporting) {
      ctx.strokeStyle = "#1A73E8";
      ctx.lineWidth = 0.04;
      ctx.beginPath();
      ctx.arc(0, 0, r + 0.1, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  });
}

function drawDoors() {
  if (!currentPlan) return;
  const s = currentPlan.surface;
  const t = s.wallThicknessM;

  currentPlan.doors.forEach((d) => {
    let dx, dy, dw, dh;
    if (d.edge === "n") {
      dx = s.xM + d.offsetM;
      dy = s.yM - t;
      dw = d.widthM;
      dh = t;
    } else if (d.edge === "s") {
      dx = s.xM + d.offsetM;
      dy = s.yM + s.depthM;
      dw = d.widthM;
      dh = t;
    } else if (d.edge === "w") {
      dx = s.xM - t;
      dy = s.yM + d.offsetM;
      dw = t;
      dh = d.widthM;
    } else if (d.edge === "e") {
      dx = s.xM + s.widthM;
      dy = s.yM + d.offsetM;
      dw = t;
      dh = d.widthM;
    }

    ctx.fillStyle =
      currentPlan.surface.texture === "concrete"
        ? "#EEEEEE"
        : currentPlan.surface.texture === "asphalt"
          ? "#757575"
          : currentPlan.surface.texture === "tiles"
            ? "#E0E0E0"
            : "#EEEEEE";
    ctx.fillRect(dx, dy, dw, dh);

    ctx.strokeStyle = "#A5D6A7";
    ctx.setLineDash([0.1, 0.1]);
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    if (d.edge === "n" || d.edge === "s") {
      ctx.moveTo(dx, dy + dh / 2);
      ctx.lineTo(dx + dw, dy + dh / 2);
    } else {
      ctx.moveTo(dx + dw / 2, dy);
      ctx.lineTo(dx + dw / 2, dy + dh);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    if (d.id === selectedDoorId && !isExporting) {
      ctx.strokeStyle = "#1A73E8";
      ctx.lineWidth = 0.04;
      ctx.strokeRect(dx - 0.02, dy - 0.02, dw + 0.04, dh + 0.04);
    }
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

function drawHandles() {
  if (activeTool !== "surface" || !currentPlan) return;

  const s = currentPlan.surface;
  const handles = getSurfaceHandles(s);

  ctx.save();
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#1A73E8";
  const scale = currentPlan.viewport.scale;
  ctx.lineWidth = 2 / scale;

  // Make handles fixed size regardless of zoom
  const size = 10 / scale;

  for (const h of handles) {
    ctx.beginPath();
    ctx.rect(h.x - size / 2, h.y - size / 2, size, size);
    ctx.fill();
    ctx.stroke();
  }

  // Draw an outer boundary highlight
  ctx.strokeStyle = "#1A73E8";
  ctx.lineWidth = 2 / scale;
  ctx.setLineDash([5 / scale, 5 / scale]);
  ctx.strokeRect(s.xM, s.yM, s.widthM, s.depthM);

  ctx.restore();
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

function drawMeasurement() {
  if (activeTool !== "measure") return;
  if (!measurePointA) return;

  const ptB = measurePointB || currentMousePos;
  if (!ptB) return;

  ctx.save();
  ctx.strokeStyle = "#1A73E8";

  // Use scale-relative values so line doesn't get thick when zoomed out
  const scale = currentPlan.viewport.scale;
  ctx.lineWidth = 2 / scale;
  ctx.setLineDash([5 / scale, 5 / scale]);

  ctx.beginPath();
  ctx.moveTo(measurePointA.x, measurePointA.y);
  ctx.lineTo(ptB.x, ptB.y);
  ctx.stroke();

  // Draw endpoints
  ctx.fillStyle = "#1A73E8";
  ctx.beginPath();
  ctx.arc(measurePointA.x, measurePointA.y, 4 / scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(ptB.x, ptB.y, 4 / scale, 0, Math.PI * 2);
  ctx.fill();

  // Draw distance text
  const dx = ptB.x - measurePointA.x;
  const dy = ptB.y - measurePointA.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const midX = measurePointA.x + dx / 2;
  const midY = measurePointA.y + dy / 2;

  const fontSize = 14 / scale;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.setLineDash([]); // reset dash for strokeText

  // Outline for text readability
  ctx.lineWidth = 3 / scale;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.strokeText(`${dist.toFixed(2)} m`, midX, midY - 5 / scale);

  ctx.fillStyle = "#1A73E8";
  ctx.fillText(`${dist.toFixed(2)} m`, midX, midY - 5 / scale);

  ctx.restore();
}

// Start application
document.addEventListener("DOMContentLoaded", init);
