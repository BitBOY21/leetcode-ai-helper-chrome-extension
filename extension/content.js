// ===================================================================
// AI Code Assistant – Content Script
// ===================================================================

// Store last selected text
let lastSelectedText = "";


// =========================================
// Normalize detected language to canonical format
// =========================================
function normalizeLang(lang) {
  lang = lang.toLowerCase();

  if (lang === "c") return "C";
  if (lang.includes("java")) return "Java";
  if (lang.includes("python")) return "Python";
  if (lang.includes("cpp") || lang.includes("c++")) return "C++";
  if (lang.includes("c#")) return "C#";
  if (lang.includes("typescript")) return "TypeScript";
  if (lang.includes("javascript")) return "JavaScript";
  if (lang.includes("go")) return "Go";
  if (lang.includes("html")) return "HTML";
  if (lang.includes("css")) return "CSS";
  if (lang.includes("php")) return "PHP";
  if (lang.includes("sql")) return "SQL";

  return "Python";  // default
}


// =========================================
// Detect current language in LeetCode UI
// =========================================
function detectCodeLanguage() {

  let btn = document.querySelector('[data-cy="language-menu"]');
  if (btn && btn.innerText.trim() !== "") return btn.innerText.trim();

  let oldStyle = document.querySelector(".ant-select-selection-item");
  if (oldStyle && oldStyle.innerText.trim() !== "") return oldStyle.innerText.trim();

  let block = document.querySelector("code[class^='language-']");
  if (block) return block.className.replace("language-", "").trim();

  return "Python";
}


// =========================================
// Create sidebar panel (only once)
// =========================================
function createPanelIfNotExists() {

  let existingPanel = document.getElementById("ai-panel");
  if (existingPanel) return;

  let panel = document.createElement("div");
  panel.id = "ai-panel";

  panel.innerHTML = `
      <div id="ai-resize-handle"></div>

      <div id="ai-header">
          <span>AI Assistant</span>
          <button id="ai-close">✖</button>
      </div>

      <div id="ai-controls">
        <label>
          Language:
          <select id="ai-language">
            <option value="English" selected>English</option>
            <option value="Hebrew">עברית</option>
          </select>
        </label>

        <label>
          Mode:
          <select id="ai-mode">
            <option value="explain" selected>Explain + hints</option>
            <option value="solution">Full solution</option>
          </select>
        </label>

        <button id="ai-apply">Apply</button>
      </div>

      <div id="ai-output">Select text → Right click → Explain with AI</div>
  `;

  document.body.appendChild(panel);


  // ====================
  // close panel
  // ====================
  document.getElementById("ai-close").onclick = () => {
    panel.remove();
  };


  // ====================
  // apply changes
  // ====================
  document.getElementById("ai-apply").onclick = () => {
    applySettings();
  };
}


// =========================================
// Apply UI settings
// =========================================
function applySettings() {

  const selectedLanguage = document.getElementById("ai-language").value;
  const selectedMode = document.getElementById("ai-mode").value;
  const detectedCodeLanguage = detectCodeLanguage();

  document.getElementById("ai-output").innerText = "Updating…";

  chrome.runtime.sendMessage(
    {
      action: "call_backend_again",
      language: selectedLanguage,
      mode: selectedMode,
      codeLanguage: normalizeLang(detectedCodeLanguage)
    },
    (response) => {

      if (!response || !response.answer) {
        document.getElementById("ai-output").innerText = "No response from backend";
        return;
      }

      let html = response.answer;

      if (selectedLanguage === "Hebrew") {
        html = `<div dir="rtl" style="text-align:right;">${html}</div>`;
      }

      document.getElementById("ai-output").innerHTML = html;
    }
  );
}


// =========================================
// Handle message from background
// =========================================
chrome.runtime.onMessage.addListener((request) => {

  if (request.action !== "show_sidebar") return;

  createPanelIfNotExists();

  lastSelectedText = request.text;

  const outputEl = document.getElementById("ai-output");
  outputEl.innerText = "Thinking…";

  const selectedLanguage = document.getElementById("ai-language").value;
  const selectedMode = document.getElementById("ai-mode").value;
  const detectedCodeLanguage = detectCodeLanguage();

  chrome.runtime.sendMessage(
    {
      action: "call_backend",
      text: lastSelectedText,
      language: selectedLanguage,
      mode: selectedMode,
      codeLanguage: normalizeLang(detectedCodeLanguage)
    },
    (response) => {

      if (!response || !response.answer) {
        outputEl.innerText = "No response from backend";
        return;
      }

      let html = response.answer;

      if (selectedLanguage === "Hebrew") {
        html = `<div dir="rtl" style="text-align:right;">${html}</div>`;
      }

      outputEl.innerHTML = html;
    }
  );
});


// =========================================
// Sidebar resizing
// =========================================
let isResizing = false;

document.addEventListener("mousedown", function(e) {
  if (e.target.id === "ai-resize-handle") isResizing = true;
});

document.addEventListener("mousemove", function(e) {
  if (!isResizing) return;
  let newWidth = window.innerWidth - e.clientX;
  const panel = document.getElementById("ai-panel");
  if (panel) panel.style.width = newWidth + "px";
});

document.addEventListener("mouseup", function() {
  isResizing = false;
});
