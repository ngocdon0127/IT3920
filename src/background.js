// Extension saves data to this StorageArea
var STORAGE_AREA = chrome.storage.local;

// id of Gmail tab.
var sourceTabId = '';

// use this key to encrypt and decrypt attachment.
var aesKeyFile = '';

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
			else if (msg.actionType === 'send-aes-key-file-to-background'){
				aesKeyFile = msg.aesKeyFile;
				chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
					chrome.tabs.sendMessage(sourceTabId, {actionType: 'send-aes-key-file-to-content-script', aesKeyFile: aesKeyFile}, function (response) {
						
					})
				})
			}
		})
	});
});

chrome.extension.onConnect.addListener(function (port){
	port.onMessage.addListener(function (msg) {

		// check login
		if (msg.name == "get-login-status"){
			STORAGE_AREA.get("info", function (items) {
				console.log(items);
				if (('info' in items) && ('isLoggedIn' in items.info) && (items.info.isLoggedIn == 1)){
					port.postMessage({
						name: 'login-status',
						isLoggedIn: 1,
						email: items.info.email
					});
				}
				else{
					port.postMessage({
						name: 'login-status',
						isLoggedIn: 0,
						status: items.info ? items.info.status : '',
						email: items.info ? items.info.email : ''
					})
				}
			})
		}

		// login
		else if (msg.name == 'login'){
			var username = msg.username;
			var password = msg.password;

		}
	})
});

// handle message from content script
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request.actionType === 'get-login-status'){
		STORAGE_AREA.get("info", function (items) {
			console.log(items);
			if (('info' in items) && ('isLoggedIn' in items.info) && (items.info.isLoggedIn == 1)){
				var result = items.info;
				result.name = 'login-status';
				result.isLoggedIn = 1;
				sendResponse(result);
			}
			else{
				sendResponse({
					name: 'login-status',
					isLoggedIn: 0
				})
			}
		})
	}
	else if (request.actionType === 'request-public-key'){
		console.log('receive request-public-key request');
		var data = request;
		$.ajax({ 
			url: SERVER + SERVER_PORT + '/E2EE/key/getPublicKeys', 
			type: 'POST', 
			dataType: 'json', 
			data: JSON.stringify(data.requestedUsers),
			beforeSend: function(xhr) {
				xhr.setRequestHeader("Accept", "application/json");
				xhr.setRequestHeader("Content-Type", "application/json");
				// console.log(data);
				// console.log(JSON.stringify(data));
			},
			success: function(data) { 
				// alert("success");
				console.log('server response');
				console.log(data);
				sendResponse({
					name: 'requested-public-keys',
					data: data,
				});
				return false;
			},
			error:function(data,status,er) { 
				alert("error");
			}
		});
	}
	else if (request.actionType === 'open-add-attachments-frame'){
		// Save Mail tab id.
		chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
			sourceTabId = tabs[0].id;
		});
		// open email editor.
		chrome.windows.create({
			url: '/src/add-attachments.html',
			type: 'panel'
		});
	}
	else if (request.actionType === 'get-aes-key-file'){
		sendResponse({
			aesKeyFile: aesKeyFile
		});
	}
	else if (request.actionType === 'verify'){
		console.log('verify request');
		var email = request.email;
		var password = request.password;
		var hashedPassword = request.hashedPassword;
		$.ajax({ 
			url: SERVER + SERVER_PORT + '/E2EE/user/verify', 
			type: 'POST', 
			dataType: 'json', 
			data: JSON.stringify({email: email, password: hashedPassword}),
			beforeSend: function(xhr) {
				xhr.setRequestHeader("Accept", "application/json");
				xhr.setRequestHeader("Content-Type", "application/json");
				// console.log(data);
				// console.log(JSON.stringify(data));
			},
			success: function(data) { 
				// alert("success");
				// console.log(data);
				// return;
				if (data.message.localeCompare('OK') != 0){
					console.log(data.message);
					sendResponse({
						status: 'error',
						error: data.message
					})
					return;
				}
				// alert(JSON.stringify(data));

				// Generate key in background

				if (typeof(Worker) !== 'undefined'){
					var keyWorker = new Worker('/src/key-worker.js');
					keyWorker.postMessage({
						main: {
							email: email,
							seed: CryptoJS.MD5(email + password).toString(CryptoJS.enc.Base16),
							passphrase: hashedPassword,
							bitLen: 1024,
						},
						tmp: data.initialKey ? {
							email: email,
							seed: data.initialKey,
							passphrase: hashedPassword,
							bitLen: 1024
						} : 0

					})

					keyWorker.onmessage = function (event) {
						// console.log(event.data);
						// alert('Received Key from worker');
						event.data.status = 'success';
						sendResponse(event.data);
					}
				}
				else {
					var key = generateRSAKey(email, CryptoJS.MD5(email + password).toString(CryptoJS.enc.Base16), hashedPassword, 1024);

					var info = {
						isLoggedIn: 1,
						email: email,
						publicKey: key.public,
						encryptedPrivateKey: key.private
					}

					if (data.initialKey){

						// server generates RSA key with 1024 bitlen.
						// regenerate it here.
						var initRSAKey = generateRSAKey(email, data.initialKey, hashedPassword, 1024);
						info.tmpPublicKey = initRSAKey.public;
						info.encryptedTmpPrivateKey = initRSAKey.private;
					}

					console.log(info);
					info.status = 'success';
					sendResponse(info);
					// alert("OK generate key directly")

				}
			},
			error:function(data,status,er) { 
				sendResponse({status: 'error', error: 'Cannot verify your account'});
				console.log(data);
				// user = {};
			}
		});
	}
	return true;  // call sendResponse async - very important
})