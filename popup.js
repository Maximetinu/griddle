document.addEventListener("DOMContentLoaded", async () => {
  await injectContentScript();
  const statusEl = document.getElementById("status");
  const selectBtn = document.getElementById("select-element");
  const deselectBtn = document.getElementById("deselect-element");
  const controlsEl = document.getElementById("controls");
  const lineColorInput = document.getElementById("line-color");
  const lineAlphaInput = document.getElementById("line-alpha");
  const lineWidthInput = document.getElementById("line-width");
  const columnsInput = document.getElementById("columns");
  const rowsInput = document.getElementById("rows");
  const showBorderInput = document.getElementById("show-border");

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

  // Save grid options to chrome.storage.local
  function saveGridOptions(options) {
    chrome.storage.local.set({ gridOptions: options });
  }

  // Load grid options from chrome.storage.local
  function loadGridOptions(callback) {
    chrome.storage.local.get(["gridOptions"], (result) => {
      callback(result.gridOptions);
    });
  }

  // Send message to content script to start element selection
  selectBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "start-selection" }
        // (response) => {
        //   if (response && response.selected) {
        //     selected = true;
        //     updateUI();
        //   }
        // }
      );

      // Close the popup immediately after sending the message
      window.close();
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
    const lineAlpha = parseFloat(lineAlphaInput.value);
    const lineWidth = parseFloat(lineWidthInput.value);
    const columns = parseInt(columnsInput.value, 10);
    const rows = parseInt(rowsInput.value, 10);
    const showBorder = showBorderInput.checked;

    const options = {
      lineColor,
      lineAlpha,
      lineWidth,
      columns,
      rows,
      showBorder,
    };
    saveGridOptions(options);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "update-grid-lines",
        options: options,
      });
    });
  }

  lineColorInput.addEventListener("input", updateGridLines);
  lineAlphaInput.addEventListener("input", updateGridLines);
  lineWidthInput.addEventListener("input", updateGridLines);
  columnsInput.addEventListener("input", updateGridLines);
  rowsInput.addEventListener("input", updateGridLines);
  showBorderInput.addEventListener("change", updateGridLines);

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

            // Use stored grid options if available
            loadGridOptions((storedOptions) => {
              const options = storedOptions || response.gridOptions;
              lineColorInput.value = options.lineColor || "#ff0000";
              lineAlphaInput.value =
                options.lineAlpha !== undefined ? options.lineAlpha : 1;
              lineWidthInput.value = options.lineWidth || 3;
              columnsInput.value = options.columns || 3;
              rowsInput.value = options.rows || 3;
              showBorderInput.checked = options.showBorder || false;
            });
          } else {
            selected = false;
            updateUI();

            // Load stored grid options even if no element is selected
            loadGridOptions((storedOptions) => {
              if (storedOptions) {
                lineColorInput.value = storedOptions.lineColor || "#ff0000";
                lineAlphaInput.value =
                  storedOptions.lineAlpha !== undefined
                    ? storedOptions.lineAlpha
                    : 1;
                lineWidthInput.value = storedOptions.lineWidth || 3;
                columnsInput.value = storedOptions.columns || 3;
                rowsInput.value = storedOptions.rows || 3;
                showBorderInput.checked = storedOptions.showBorder || false;
              } else {
                // Set defaults
                lineColorInput.value = "#ff0000";
                lineAlphaInput.value = 1;
                lineWidthInput.value = 3;
                columnsInput.value = 3;
                rowsInput.value = 3;
                showBorderInput.checked = false;
              }
            });
          }
        }
      );
    });
  }

  // Initialize UI
  checkSelectionStatus();
});

function injectContentScript() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "ping" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          // Content script not injected yet, so inject it
          chrome.scripting.executeScript(
            {
              target: { tabId: tabs[0].id },
              files: ["content.js"],
            },
            () => {
              resolve();
            }
          );
        } else {
          // Content script already injected
          resolve();
        }
      });
    });
  });
}
