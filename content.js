(function () {
  let selectedElement = null;
  let gridOptions = null;
  let elementSelector = null;

  // Function to restore grid state
  function restoreGridState() {
    return new Promise((resolve) => {
      // Retrieve grid options and element selector from storage
      chrome.storage.local.get(["gridOptions", "elementSelector"], (result) => {
        gridOptions = result.gridOptions || {
          lineWidth: 3,
          lineColor: "#ff0000",
          lineAlpha: 1,
          columns: 3,
          rows: 3,
          showBorder: false,
        };

        if (result.elementSelector) {
          const element = document.querySelector(result.elementSelector);
          if (element) {
            selectedElement = element;
            addGridToElement(selectedElement, gridOptions);
            updateBadge(true);
          } else {
            selectedElement = null;
            updateBadge(false);
          }
        } else {
          selectedElement = null;
          updateBadge(false);
        }
        resolve();
      });
    });
  }

  // Call restoreGridState when the content script loads
  restoreGridState();

  function addGridToElement(element, options) {
    if (!element) return;

    // Wrap <img> elements
    if (element.tagName.toLowerCase() === "img") {
      // Check if already wrapped
      if (!element.parentElement.classList.contains("grid-image-wrapper")) {
        const wrapper = document.createElement("div");
        wrapper.style.position = "relative";
        wrapper.style.display = "inline-block";
        wrapper.classList.add("grid-image-wrapper");

        // Insert the wrapper before the image and move the image inside it
        element.parentElement.insertBefore(wrapper, element);
        wrapper.appendChild(element);

        // Update the element reference to the wrapper
        element = wrapper;

        // Update selectedElement to the wrapper
        selectedElement = wrapper;
      } else {
        element = element.parentElement;

        // Update selectedElement to the wrapper
        selectedElement = element;
      }
    }

    // Mark the element with a data attribute
    element.setAttribute("data-grid-overlay", "true");

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
    updateBadge(true);

    // Generate and store the unique selector
    elementSelector = getCssPath(element);
    // Save element selector (gridOptions are already saved elsewhere)
    chrome.storage.local.set({
      elementSelector: elementSelector,
    });
  }

  function removeGridFromElement(element) {
    if (!element) return;
    const existingGrid = element.querySelector(".grid-overlay");
    if (existingGrid) {
      existingGrid.remove();
    }
    element.style.outline = "";
    element.removeAttribute("data-grid-overlay");

    // If we wrapped an <img>, unwrap it
    if (element.classList.contains("grid-image-wrapper")) {
      const img = element.querySelector("img");
      if (img) {
        element.parentElement.insertBefore(img, element);
        element.remove();

        // Update selectedElement to the img
        selectedElement = img;
      }
    }
    updateBadge(false);
    // Remove element selector from storage, but keep gridOptions
    chrome.storage.local.remove(["elementSelector"]);
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "ping") {
      sendResponse({ status: "alive" });
    } else if (message.action === "start-selection") {
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
        // Do not clear gridOptions here
        // Update the badge to clear it
        updateBadge(false);
      }
    } else if (message.action === "update-grid-lines") {
      if (selectedElement) {
        removeGridFromElement(selectedElement);
        gridOptions = message.options;
        addGridToElement(selectedElement, gridOptions);

        // Save grid options
        chrome.storage.local.set({
          gridOptions: gridOptions,
          elementSelector: elementSelector,
        });
      } else {
        // Update gridOptions even if no element is selected
        gridOptions = message.options;
        chrome.storage.local.set({ gridOptions: gridOptions });
      }
    } else if (message.action === "get-selection-status") {
      // Restore grid state before responding
      restoreGridState().then(() => {
        if (selectedElement && document.contains(selectedElement)) {
          sendResponse({
            selected: true,
            gridOptions: gridOptions,
          });
        } else {
          selectedElement = null;
          sendResponse({ selected: false, gridOptions: gridOptions });
        }
      });
      return true; // Keep the messaging channel open for sendResponse
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
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        cleanup();
        resolve(event.target);

        // Send message to background script to open the popup
        chrome.runtime.sendMessage({ action: "open-popup" });

        // Update the badge to "ON"
        updateBadge(true);
      }

      function onMouseDown(event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }

      function onMouseUp(event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
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
        document.removeEventListener("mousedown", onMouseDown, true);
        document.removeEventListener("mouseup", onMouseUp, true);
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
      document.addEventListener("mousedown", onMouseDown, true);
      document.addEventListener("mouseup", onMouseUp, true);
    });
  }

  function updateBadge(isSelected) {
    if (isSelected) {
      // Notify background script to set the badge
      chrome.runtime.sendMessage({ action: "set-badge", text: "ON" });
    } else {
      // Notify background script to clear the badge
      chrome.runtime.sendMessage({ action: "clear-badge" });
    }
  }

  // Function to generate a unique CSS selector for an element
  function getCssPath(element) {
    if (!(element instanceof Element)) return;
    const path = [];
    while (element.nodeType === Node.ELEMENT_NODE) {
      let selector = element.nodeName.toLowerCase();
      if (element.id) {
        selector += "#" + element.id;
        path.unshift(selector);
        break;
      } else {
        let sib = element,
          nth = 1;
        while ((sib = sib.previousElementSibling)) {
          if (sib.nodeName.toLowerCase() == selector) nth++;
        }
        if (nth != 1) selector += ":nth-of-type(" + nth + ")";
      }
      path.unshift(selector);
      element = element.parentNode;
    }
    return path.join(" > ");
  }
})();
