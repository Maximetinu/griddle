document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("status");
  const selectBtn = document.getElementById("select-element");
  const deselectBtn = document.getElementById("deselect-element");
  const controlsEl = document.getElementById("controls");
  const lineColorInput = document.getElementById("line-color");
  const lineWidthInput = document.getElementById("line-width");
  const columnsInput = document.getElementById("columns");
  const rowsInput = document.getElementById("rows");

  let selected = false;

  // Update UI based on selection status
  function updateUI() {
    if (selected) {
      statusEl.textContent = "Element selected.";
      controlsEl.style.display = "block";
      selectBtn.style.display = "none";
    } else {
      statusEl.textContent = "No element selected.";
      controlsEl.style.display = "none";
      selectBtn.style.display = "block";
    }
  }

  // Send message to content script to start element selection
  selectBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "start-selection" },
        (response) => {
          if (response && response.selected) {
            selected = true;
            updateUI();
          }
        }
      );
    });
  });

  // Send message to content script to deselect element
  deselectBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "deselect-element" },
        () => {
          selected = false;
          updateUI();
        }
      );
    });
  });

  // Handle changes to grid options
  function updateGridLines() {
    const lineColor = lineColorInput.value;
    const lineWidth = parseInt(lineWidthInput.value, 10);
    const columns = parseInt(columnsInput.value, 10);
    const rows = parseInt(rowsInput.value, 10);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "update-grid-lines",
        options: { lineColor, lineWidth, columns, rows },
      });
    });
  }

  lineColorInput.addEventListener("input", updateGridLines);
  lineWidthInput.addEventListener("input", updateGridLines);
  columnsInput.addEventListener("input", updateGridLines);
  rowsInput.addEventListener("input", updateGridLines);

  // On load, check if an element is already selected
  function checkSelectionStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "get-selection-status" },
        (response) => {
          if (response && response.selected) {
            selected = true;
            updateUI();

            // Populate the controls with current grid options
            lineColorInput.value = response.gridOptions.lineColor || "#ff0000";
            lineWidthInput.value = response.gridOptions.lineWidth || 3;
            columnsInput.value = response.gridOptions.columns || 3;
            rowsInput.value = response.gridOptions.rows || 3;
          } else {
            selected = false;
            updateUI();
          }
        }
      );
    });
  }

  // Initialize UI
  checkSelectionStatus();
});
