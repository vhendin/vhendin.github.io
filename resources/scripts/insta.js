document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIG & STATE ---
    const CANVAS_WIDTH = 1080;
    const CANVAS_HEIGHT = 1080;

    const state = {
        image: null,
        headingText: 'Heading',
        bodyText: 'This is where the body should be.',
        font: 'Stockholm Type',
        textAlign: 'left',
        textColor: '#FFFFFF',
        logoColor: '#FFFFFF',
        textPos: {
            x: 100,
            y: 350
        },
        logoPos: {
            x: CANVAS_WIDTH - 220,
            y: CANVAS_HEIGHT - 140
        },
        logoSize: 140,
        isDraggingText: false,
        isDraggingLogo: false,
        dragStart: {
            x: 0,
            y: 0
        },
        logoWhite: new Image(),
        logoBlack: new Image(),
        logosLoaded: false
    };

    const DEFAULT_LOGO_STATE = {
        pos: {
            x: CANVAS_WIDTH - 220,
            y: CANVAS_HEIGHT - 140
        },
        size: 140
    };

    // --- DOM ELEMENTS ---
    const canvas = document.getElementById('editor-canvas');
    const ctx = canvas.getContext('2d');
    const imageUpload = document.getElementById('image-upload');
    const headingInput = document.getElementById('heading-text');
    const bodyInput = document.getElementById('body-text');
    const fontSelect = document.getElementById('font-select');
    const alignLeftBtn = document.getElementById('align-left-btn');
    const alignCenterBtn = document.getElementById('align-center-btn');
    const alignRightBtn = document.getElementById('align-right-btn');
    const centerTextBtn = document.getElementById('center-text-btn');
    const textWhiteBtn = document.getElementById('text-white-btn');
    const textBlackBtn = document.getElementById('text-black-btn');
    const logoWhiteBtn = document.getElementById('logo-white-btn');
    const logoBlackBtn = document.getElementById('logo-black-btn');
    const exportBtn = document.getElementById('export-btn');
    const fontLoader = document.getElementById('font-loader');
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const clearImageBtn = document.getElementById('clear-image-btn');
    const logoSizeSlider = document.getElementById('logo-size-slider');
    const resetLogoBtn = document.getElementById('reset-logo-btn');

    // --- INITIALIZATION ---
    async function init() {
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;

        // Set canvas display size to fit its container
        const setCanvasSize = () => {
            const { width } = canvasWrapper.getBoundingClientRect();
            canvas.style.width = `${width}px`;
            canvas.style.height = `${width}px`;
        };
        setCanvasSize();
        window.addEventListener('resize', setCanvasSize);

        loadAssets();
        updateUI();
        setupEventListeners();

        // Load the initial default font before the first draw
        fontLoader.style.display = 'flex';
        try {
            // Load both regular and bold weights since we use both
            await document
                .fonts
                .load(`1em "${state.font}"`);
            await document
                .fonts
                .load(`bold 1em "${state.font}"`);
        } catch (err) {
            console.error('Failed to load initial font:', err);
        } finally {
            fontLoader.style.display = 'none';
        }

        redrawCanvas();
    }

    // --- ASSET LOADING ---
    function loadAssets() {
        // Raw SVG source for both logos. Using template literals to handle multi-line strings.
        // Non-breaking spaces ( ) have been replaced with regular spaces for compatibility.
        const logoWhiteSvg = './resources/images/white_logo.svg';

        const logoBlackSvg = './resources/images/black_logo.svg';

        // Helper function to load an SVG string into an Image object
        const loadLogo = (url, imageElement) => {
            return new Promise((resolve, reject) => {
                imageElement.onload = () => resolve();
                imageElement.onerror = (err) => {
                    console.error("Failed to load logo from URL.", err);
                    reject(err);
                };

                // Just point directly to the SVG file path
                imageElement.src = url;
            });
        };

        // Load both logos concurrently
        Promise
            .all([
                loadLogo(logoWhiteSvg, state.logoWhite),
                loadLogo(logoBlackSvg, state.logoBlack)
            ])
            .then(() => {
                state.logosLoaded = true;
                requestRedraw(); // Redraw canvas once logos are ready
            })
            .catch(error => {
                console.error("Error loading one or more logos from SVG source.", error);
            });
    }

    // --- CORE DRAWING FUNCTIONS ---

    // Debounce redraw for performance
    let redrawTimeout;
    function requestRedraw() {
        if (redrawTimeout)
            cancelAnimationFrame(redrawTimeout);
        redrawTimeout = requestAnimationFrame(redrawCanvas);
    }

    function redrawCanvas() {
        // Clear canvas
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw image or background color
        if (state.image) {
            drawCroppedImage(state.image);
        } else {
            ctx.fillStyle = 'rgb(233 80 12)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        // Draw Text
        drawText();

        // Draw Logo
        drawLogo();
    }

    function drawCroppedImage(img) {
        const imgAspectRatio = img.width / img.height;
        const canvasAspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

        let sx,
            sy,
            sWidth,
            sHeight;

        if (imgAspectRatio > canvasAspectRatio) { // Image is wider than canvas
            sHeight = img.height;
            sWidth = sHeight * canvasAspectRatio;
            sx = (img.width - sWidth) / 2;
            sy = 0;
        } else { // Image is taller or square
            sWidth = img.width;
            sHeight = sWidth / canvasAspectRatio;
            sx = 0;
            sy = (img.height - sHeight) / 2;
        }
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    function drawText() {
        if (!state.headingText && !state.bodyText)
            return;

        const PADDING = 60;
        const HEADING_SIZE = 120;
        const BODY_SIZE = 60;
        const LINE_HEIGHT_MULTIPLIER = 1.4;

        ctx.fillStyle = state.textColor;
        ctx.textAlign = state.textAlign;
        ctx.textBaseline = 'middle';

        // Heading
        ctx.font = `bold ${HEADING_SIZE}px "${state.font}"`;
        const headingLines = wrapText(state.headingText, CANVAS_WIDTH - PADDING * 2);

        // Body
        ctx.font = `${BODY_SIZE}px "${state.font}"`;
        const bodyLines = wrapText(state.bodyText, CANVAS_WIDTH - PADDING * 2);

        const totalLines = headingLines.length + bodyLines.length;
        const totalTextHeight = (headingLines.length * HEADING_SIZE * LINE_HEIGHT_MULTIPLIER) + (bodyLines.length * BODY_SIZE * LINE_HEIGHT_MULTIPLIER);

        let currentY = state.textPos.y - totalTextHeight / 2;

        // Draw heading lines
        ctx.font = `bold ${HEADING_SIZE}px "${state.font}"`;
        headingLines.forEach(line => {
            ctx.fillText(line, state.textPos.x, currentY + HEADING_SIZE / 2);
            currentY += HEADING_SIZE * LINE_HEIGHT_MULTIPLIER;
        });

        // Add a small gap between heading and body
        if (headingLines.length > 0 && bodyLines.length > 0) {
            currentY += BODY_SIZE * 0.5;
        }

        // Draw body lines
        ctx.font = `${BODY_SIZE}px "${state.font}"`;
        bodyLines.forEach(line => {
            ctx.fillText(line, state.textPos.x, currentY + BODY_SIZE / 2);
            currentY += BODY_SIZE * LINE_HEIGHT_MULTIPLIER;
        });
    }

    function drawLogo() {
        if (!state.logosLoaded)
            return; // Don't draw if logos haven't loaded

        const LOGO_HEIGHT = state.logoSize;

        const selectedLogo = state.logoColor === '#FFFFFF'
            ? state.logoWhite
            : state.logoBlack;

        // Maintain aspect ratio
        const aspectRatio = selectedLogo.width / selectedLogo.height;
        const logoWidth = LOGO_HEIGHT * aspectRatio;

        const x = state.logoPos.x - logoWidth / 2;
        const y = state.logoPos.y - LOGO_HEIGHT / 2;

        ctx.drawImage(selectedLogo, x, y, logoWidth, LOGO_HEIGHT);
    }

    // --- EVENT HANDLERS ---
    function setupEventListeners() {
        imageUpload.addEventListener('change', handleImageUpload);
        clearImageBtn.addEventListener('click', handleClearImage);
        resetLogoBtn.addEventListener('click', handleResetLogo);

        headingInput.addEventListener('input', (e) => {
            state.headingText = e.target.value;
            requestRedraw();
        });
        bodyInput.addEventListener('input', (e) => {
            state.bodyText = e.target.value;
            requestRedraw();
        });
        fontSelect.addEventListener('change', handleFontChange);

        logoSizeSlider.addEventListener('input', (e) => {
            state.logoSize = parseInt(e.target.value, 10);
            requestRedraw();
        });

        alignLeftBtn.addEventListener('click', () => updateAlignment('left'));
        alignCenterBtn.addEventListener('click', () => updateAlignment('center'));
        alignRightBtn.addEventListener('click', () => updateAlignment('right'));

        centerTextBtn.addEventListener('click', () => {
            state.textPos = {
                x: CANVAS_WIDTH / 2,
                y: CANVAS_HEIGHT / 2
            };
            requestRedraw();
        });

        // Color toggles
        textWhiteBtn.addEventListener('click', () => updateColor('text', '#FFFFFF'));
        textBlackBtn.addEventListener('click', () => updateColor('text', '#000000'));
        logoWhiteBtn.addEventListener('click', () => updateColor('logo', '#FFFFFF'));
        logoBlackBtn.addEventListener('click', () => updateColor('logo', '#000000'));

        exportBtn.addEventListener('click', exportImage);

        // Canvas dragging events
        canvas.addEventListener('mousedown', handleDragStart);
        canvas.addEventListener('mousemove', (e) => {
            handleDragMove(e);
            handleCursorChange(e);
        });
        canvas.addEventListener('mouseup', handleDragEnd);
        canvas.addEventListener('mouseleave', (e) => {
            handleDragEnd(e);
            canvas.style.cursor = 'default'; // Reset cursor when mouse leaves
        });

        // Touch events for mobile
        canvas.addEventListener('touchstart', handleDragStart);
        canvas.addEventListener('touchmove', handleDragMove);
        canvas.addEventListener('touchend', handleDragEnd);
    }

    function handleImageUpload(e) {
        const file = e
            .target
            .files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    state.image = img;
                    requestRedraw();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    function handleClearImage() {
        state.image = null;
        imageUpload.value = ''; // Reset the file input
        requestRedraw();
    }

    function handleResetLogo() {
        state.logoPos = {
            ...DEFAULT_LOGO_STATE.pos
        };
        state.logoSize = DEFAULT_LOGO_STATE.size;
        logoSizeSlider.value = state.logoSize; // Update the slider UI
        requestRedraw();
    }

    async function handleFontChange(e) {
        const newFont = e.target.value;
        fontLoader.style.display = 'flex';
        try {
            // This uses the Font Loading API to ensure the font is ready
            await document
                .fonts
                .load(`1em "${newFont}"`);
            state.font = newFont;
        } catch (err) {
            console.error('Failed to load font:', err);
            // Fallback or notify user
        } finally {
            fontLoader.style.display = 'none';
            requestRedraw();
        }
    }

    function updateAlignment(alignment) {
        state.textAlign = alignment;

        alignLeftBtn.style.backgroundColor = alignment === 'left'
            ? '#e5e7eb'
            : 'white';
        alignCenterBtn.style.backgroundColor = alignment === 'center'
            ? '#e5e7eb'
            : 'white';
        alignRightBtn.style.backgroundColor = alignment === 'right'
            ? '#e5e7eb'
            : 'white';

        requestRedraw();
    }

    function updateColor(type, color) {
        if (type === 'text') {
            state.textColor = color;
            textWhiteBtn.style.backgroundColor = color === '#FFFFFF'
                ? '#e5e7eb'
                : 'white';
            textBlackBtn.style.backgroundColor = color === '#000000'
                ? '#1f2937'
                : '#374151';
        } else if (type === 'logo') {
            state.logoColor = color;
            logoWhiteBtn.style.backgroundColor = color === '#FFFFFF'
                ? '#e5e7eb'
                : 'white';
            logoBlackBtn.style.backgroundColor = color === '#000000'
                ? '#1f2937'
                : '#374151';
        }
        requestRedraw();
    }

    function exportImage() {
        const link = document.createElement('a');
        link.download = 'instagram-post.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    // Drag and Drop Logic
    function getMousePos(evt) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = evt.touches
            ? evt
                .touches[0]
                .clientX
            : evt.clientX;
        const clientY = evt.touches
            ? evt
                .touches[0]
                .clientY
            : evt.clientY;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    function handleCursorChange(e) {
        if (state.isDraggingText || state.isDraggingLogo) {
            canvas.style.cursor = 'grabbing';
            return;
        }
        const pos = getMousePos(e);
        const textBounds = getTextBoundingBox();
        const logoBounds = getLogoBoundingBox();

        if (isPointInRect(pos, textBounds) || isPointInRect(pos, logoBounds)) {
            canvas.style.cursor = 'grab';
        } else {
            canvas.style.cursor = 'default';
        }
    }

    function handleDragStart(e) {
        e.preventDefault();
        const pos = getMousePos(e);
        const textBounds = getTextBoundingBox();
        const logoBounds = getLogoBoundingBox();

        if (isPointInRect(pos, textBounds)) {
            state.isDraggingText = true;
            state.dragStart = {
                x: pos.x - state.textPos.x,
                y: pos.y - state.textPos.y
            };
        } else if (isPointInRect(pos, logoBounds)) {
            state.isDraggingLogo = true;
            state.dragStart = {
                x: pos.x - state.logoPos.x,
                y: pos.y - state.logoPos.y
            };
        }
    }

    function handleDragMove(e) {
        if (!state.isDraggingText && !state.isDraggingLogo)
            return;

        e.preventDefault();
        const pos = getMousePos(e);

        if (state.isDraggingText) {
            state.textPos = {
                x: pos.x - state.dragStart.x,
                y: pos.y - state.dragStart.y
            };
        } else if (state.isDraggingLogo) {
            state.logoPos = {
                x: pos.x - state.dragStart.x,
                y: pos.y - state.dragStart.y
            };
        }
        requestRedraw();
    }

    function handleDragEnd(e) {
        e.preventDefault();
        state.isDraggingText = false;
        state.isDraggingLogo = false;
        handleCursorChange(e); // Update cursor to 'grab' if still hovering
    }

    // --- UTILITY FUNCTIONS ---
    function updateUI() {
        headingInput.value = state.headingText;
        bodyInput.value = state.bodyText;
        fontSelect.value = state.font;
        logoSizeSlider.value = state.logoSize;
        updateAlignment(state.textAlign);
        updateColor('text', state.textColor);
        updateColor('logo', state.logoColor);
    }

    function wrapText(text, maxWidth) {
        if (!text)
            return [];
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx
                .measureText(currentLine + " " + word)
                .width;
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    }

    function getTextBoundingBox() {
        const PADDING = 60;
        const HEADING_SIZE = 120;
        const BODY_SIZE = 60;
        const LINE_HEIGHT_MULTIPLIER = 1.4;

        ctx.font = `bold ${HEADING_SIZE}px "${state.font}"`;
        const headingLines = wrapText(state.headingText, CANVAS_WIDTH - PADDING * 2);

        ctx.font = `${BODY_SIZE}px "${state.font}"`;
        const bodyLines = wrapText(state.bodyText, CANVAS_WIDTH - PADDING * 2);

        if (headingLines.length === 0 && bodyLines.length === 0) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        let maxWidth = 0;
        ctx.font = `bold ${HEADING_SIZE}px "${state.font}"`;
        headingLines.forEach(line => {
            const metrics = ctx.measureText(line);
            if (metrics.width > maxWidth)
                maxWidth = metrics.width;
        }
        );

        ctx.font = `${BODY_SIZE}px "${state.font}"`;
        bodyLines.forEach(line => {
            const metrics = ctx.measureText(line);
            if (metrics.width > maxWidth)
                maxWidth = metrics.width;
        }
        );

        const totalTextHeight = (headingLines.length * HEADING_SIZE * LINE_HEIGHT_MULTIPLIER) + (bodyLines.length * BODY_SIZE * LINE_HEIGHT_MULTIPLIER);

        let x;
        if (state.textAlign === 'left') {
            x = state.textPos.x;
        } else if (state.textAlign === 'center') {
            x = state.textPos.x - maxWidth / 2;
        } else { // right
            x = state.textPos.x - maxWidth;
        }

        const y = state.textPos.y - totalTextHeight / 2;

        return { x, y, width: maxWidth, height: totalTextHeight };
    }

    function getLogoBoundingBox() {
        const LOGO_HEIGHT = state.logoSize;
        const selectedLogo = state.logoColor === '#FFFFFF'
            ? state.logoWhite
            : state.logoBlack;
        if (!selectedLogo.width || !selectedLogo.height)
            return { x: 0, y: 0, width: 0, height: 0 };
        const aspectRatio = selectedLogo.width / selectedLogo.height;
        const logoWidth = LOGO_HEIGHT * aspectRatio;

        const x = state.logoPos.x - logoWidth / 2;
        const y = state.logoPos.y - LOGO_HEIGHT / 2;

        return { x, y, width: logoWidth, height: LOGO_HEIGHT };
    }

    function isPointInRect(point, rect) {
        return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
    }

    // --- START THE APP ---
    init();
});