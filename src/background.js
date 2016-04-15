// id of Gmail tab.
var sourceTabId = '';

chrome.browserAction.onClicked.addListener(function (tab) {
	chrome.tabs.create({url: '/src/key-list.html'}, function (tab) {
		// body...
	});
})

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request.actionType == 'open-encrypt-frame'){
		// Save Gmail tab id.
		chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
			sourceTabId = tabs[0].id;
		});
		// open email editor.
		chrome.windows.create({
			url: '/src/email-editor.html',
			type: 'panel'
		});
	}

	// email editor window establishes a port to request email content from Gmail tab.
	chrome.extension.onConnect.addListener(function (port) {
		// Send email content to email editor window.
		port.postMessage({
			emailContent: request.emailContent
		});
		// receive encrypted email content.
		port.onMessage.addListener(function (msg) {
			if (msg.encryptedData != null){
				// send encrypted email to Gmail tab.
				chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
					chrome.tabs.sendMessage(sourceTabId, {encryptedData: msg.encryptedData}, function (response) {
						
					});
				});
			}
		})
	});
});

// add context menu
chrome.contextMenus.create({
	title: "Decrypt this message.",
	contexts: ["selection"],
	onclick: clickHandler
});

// Context Menu click handler
function clickHandler (data, tab) {
	chrome.windows.create({
		url: "/src/decrypt-email.html",
		// type: "panel"
	});
	chrome.extension.onConnect.addListener(function(port) {
		port.postMessage({

			/**
			 * Character ZERO WIDTH SPACE (unicode u200B - 8203) 
			 * sometimes appears in selectionText when user double click.
			 * remove it and trim() string before sending to decrypt-email.html
			 */
			data: data.selectionText.replace(/\u200B/g, '').trim()
		});
	});
}

// // Get Gmail address
// function getCurrentGmailAddr () {
// 	alert('start hehe');
// 	var e = document.getElementsByName('tôi');
// 	alert(e.length);
// 	if (e.length < 1){
// 		e = document.getElementsByName('me');
// 	}
// 	alert(e[0].getAttribute('email'));
// }