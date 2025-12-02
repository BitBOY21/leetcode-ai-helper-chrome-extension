// ===================================================================
// AI Code Assistant – Background Service Worker
// ===================================================================

// =======================================
// Backend URL configuration
// Replace with your production backend URL
// =======================================
const BACKEND_URL = "http://127.0.0.1:8000"; // default for local dev
// Example:
// const BACKEND_URL = "https://your-backend-service.onrender.com";


chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "ai_explain",
    title: "Explain with AI",
    contexts: ["selection"]
  });
});

let lastRequestData = null;


chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "ai_explain") {
    chrome.tabs.sendMessage(tab.id, {
      action: "show_sidebar",
      text: info.selectionText
    });
  }
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // ===============================
  // FIRST REQUEST
  // ===============================
  if (message.action === "call_backend") {

    lastRequestData = {
      text: message.text,
      language: message.language || "English",
      mode: message.mode || "explain",
      codeLanguage: message.codeLanguage || "Python"
    };

    console.log("[AI] First request:", lastRequestData);

    fetch(`${BACKEND_URL}/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lastRequestData)
    })
      .then(res => res.json())
      .then(data => {
        sendResponse({
          success: true,
          answer: data.answer
        });
      })
      .catch(err => {
        console.error("[AI] Backend error:", err);

        sendResponse({
          success: false,
          answer: "AI server unavailable. Please verify backend URL."
        });
      });

    return true;
  }


  // ===============================
  // APPLY / CHANGE SETTINGS
  // ===============================
  if (message.action === "call_backend_again") {

    lastRequestData.language = message.language || lastRequestData.language;
    lastRequestData.mode = message.mode || lastRequestData.mode;
    lastRequestData.codeLanguage = message.codeLanguage || lastRequestData.codeLanguage;

    console.log("[AI] Updated request:", lastRequestData);

    fetch(`${BACKEND_URL}/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lastRequestData)
    })
      .then(res => res.json())
      .then(data => {
        sendResponse({ success: true, answer: data.answer });
      })
      .catch(err => {
        console.error("[AI] Backend error:", err);

        sendResponse({
          success: false,
          answer: "AI server unavailable. Please verify backend URL."
        });
      });

    return true;
  }
});
