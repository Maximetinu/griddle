let selectedElement = null;
let gridOptions = {
  lineWidth: 3,
  lineColor: "#ff0000",
  lineAlpha: 1,
  columns: 3,
  rows: 3,
  showBorder: false,
};

function addGridToElement(element, options) {
  if (!element) return;

  // Convert line color and alpha to rgba
  const { lineColor = "#ff0000", lineAlpha = 1, lineWidth = 3 } = options;
  const borderColor = hexToRGBA(lineColor, lineAlpha);

  // Add or remove border based on options.showBorder
  if (options.showBorder) {
    element.style.outline = `${lineWidth}px solid ${borderColor}`;
  } else {
    element.style.outline = "";
  }

  addGridLines(element, options.rows, options.columns, options);
}

function removeGridFromElement(element) {
  if (!element) return;
  const existingGrid = element.querySelector(".grid-overlay");
  if (existingGrid) {
    existingGrid.remove();
  }
  element.style.outline = "";
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "start-selection") {
    startElementSelection().then((element) => {
      if (element) {
        selectedElement = element;
        // Load stored grid options
        chrome.storage.local.get(["gridOptions"], (result) => {
          gridOptions = result.gridOptions || {
            lineWidth: 3,
            lineColor: "#ff0000",
            lineAlpha: 1,
            columns: 3,
            rows: 3,
            showBorder: false,
          };
          addGridToElement(selectedElement, gridOptions);
        });
        sendResponse({ selected: true });
      } else {
        sendResponse({ selected: false });
      }
    });
    return true; // Keep the messaging channel open for sendResponse
  } else if (message.action === "deselect-element") {
    if (selectedElement) {
      removeGridFromElement(selectedElement);
      selectedElement = null;
      gridOptions = null;
    }
  } else if (message.action === "update-grid-lines") {
    if (selectedElement) {
      removeGridFromElement(selectedElement);
      gridOptions = message.options;
      addGridToElement(selectedElement, gridOptions);

      // Save grid options
      chrome.storage.local.set({ gridOptions: gridOptions });
    }
  } else if (message.action === "get-selection-status") {
    if (selectedElement && document.contains(selectedElement)) {
      sendResponse({
        selected: true,
        gridOptions: gridOptions,
      });
    } else {
      // Element no longer exists
      selectedElement = null;
      gridOptions = null;
      sendResponse({ selected: false });
    }
    // No need to return true here as sendResponse is called synchronously
  }
});

// Include the addGridLines function here
function addGridLines(element, rows, columns, options = {}) {
  const { lineWidth = 3, lineColor = "#ff0000", lineAlpha = 1 } = options;

  // Convert hex color to rgba
  const lineColorRGBA = hexToRGBA(lineColor, lineAlpha);

  // Ensure the element has a relative position for absolute positioning of grid lines
  if (getComputedStyle(element).position === "static") {
    element.style.position = "relative";
  }

  // Remove any existing grid container to prevent duplication
  const existingGrid = element.querySelector(".grid-overlay");
  if (existingGrid) {
    existingGrid.remove();
  }

  // Create a container for the grid lines
  const gridContainer = document.createElement("div");
  gridContainer.classList.add("grid-overlay");
  gridContainer.style.position = "absolute";
  gridContainer.style.top = "0";
  gridContainer.style.left = "0";
  gridContainer.style.width = "100%";
  gridContainer.style.height = "100%";
  gridContainer.style.pointerEvents = "none"; // So it doesn't block interactions
  gridContainer.style.zIndex = "9999";
  element.appendChild(gridContainer);

  // Create horizontal grid lines
  for (let i = 1; i < rows; i++) {
    const topPercent = (100 * i) / rows;
    const line = document.createElement("div");
    line.classList.add("grid-line");
    line.style.position = "absolute";
    line.style.top = `${topPercent}%`;
    line.style.left = "0";
    line.style.width = "100%";
    line.style.height = `${lineWidth}px`;
    line.style.backgroundColor = lineColorRGBA;
    line.style.transform = "translateY(-50%)";
    gridContainer.appendChild(line);
  }

  // Create vertical grid lines
  for (let i = 1; i < columns; i++) {
    const leftPercent = (100 * i) / columns;
    const line = document.createElement("div");
    line.classList.add("grid-line");
    line.style.position = "absolute";
    line.style.top = "0";
    line.style.left = `${leftPercent}%`;
    line.style.width = `${lineWidth}px`;
    line.style.height = "100%";
    line.style.backgroundColor = lineColorRGBA;
    line.style.transform = "translateX(-50%)";
    gridContainer.appendChild(line);
  }
}

// Function to convert hex color to rgba
function hexToRGBA(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Element selection logic
function startElementSelection() {
  return new Promise((resolve) => {
    const selectionOverlay = document.createElement("div");
    selectionOverlay.style.position = "fixed";
    selectionOverlay.style.top = "0";
    selectionOverlay.style.left = "0";
    selectionOverlay.style.width = "100%";
    selectionOverlay.style.height = "100%";
    selectionOverlay.style.zIndex = "9999";
    selectionOverlay.style.cursor = "crosshair";
    selectionOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.1)";
    selectionOverlay.style.pointerEvents = "none";

    document.body.appendChild(selectionOverlay);

    function onMouseOver(event) {
      event.stopPropagation();
      event.preventDefault();
      highlightElement(event.target);
    }

    function onClick(event) {
      event.stopPropagation();
      event.preventDefault();

      cleanup();
      resolve(event.target);
    }

    function highlightElement(element) {
      removeHighlight();
      element.classList.add("grid-selector-highlight");
    }

    function removeHighlight() {
      const highlighted = document.querySelector(".grid-selector-highlight");
      if (highlighted) {
        highlighted.classList.remove("grid-selector-highlight");
      }
    }

    function cleanup() {
      removeHighlight();
      document.removeEventListener("mouseover", onMouseOver, true);
      document.removeEventListener("click", onClick, true);
      selectionOverlay.remove();
      const style = document.getElementById("grid-selector-style");
      if (style) {
        style.remove();
      }
    }

    // Add CSS for highlighted element
    const style = document.createElement("style");
    style.id = "grid-selector-style";
    style.innerHTML = `
      .grid-selector-highlight {
        outline: 2px solid #00f !important;
      }
    `;
    document.head.appendChild(style);

    document.addEventListener("mouseover", onMouseOver, true);
    document.addEventListener("click", onClick, true);
  });
}