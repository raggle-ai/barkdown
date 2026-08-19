chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message?.type !== "open-folder" || typeof message.url !== "string")
    return false;

  chrome.runtime.sendNativeMessage(
    "com.raggle.kennel",
    { url: message.url },
    (response) => {
      const error = chrome.runtime.lastError;
      respond(error ? { error: error.message } : response);
    },
  );
  return true;
});
