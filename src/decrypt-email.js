'use strict';

// Log data to console when user choose files.
function handleFileSelect (event) {
	var files = event.target.files;
	for (var i = 0; i < files.length; i++) {
		var file = files[i];
		console.log(file);
	};

}

// add event listener for choosing-files event.
ob('attach').addEventListener('change', handleFileSelect, false);


// use this key to decrypt attachments.
var aesKeyFile = '';

// storage single email for 1 recipient
// structure:
// singleEmails = {
// 	'e1@ex.com': 'CtnIuSOas...QkK240ieyL8/VHE',
// 	'e2@ex.net': 'tnIsdfexi...jde25s0ie/tiAcs'
// }
// will be filled right after the time popup windows is created.
var singleEmails = {};

// decrypt worker.
var dw = undefined;

/** 
 * Decrypt attachments.
 */
function decryptFile () {
	if (ob('attach').files.length < 1){
		return;
	}

	// check file name.
	if (ob('attach').files[0].name.indexOf('.encrypted') < 0){
		alert('Choose *.encrypted file to decrypt.');
		return;
	}

	if (typeof(Worker) !== 'undefined'){
		if (typeof(dw) == 'undefined'){
			dw = new Worker('file-worker.js');
			dw.postMessage({
				type: 'decrypt',
				file: ob('attach').files[0],
				key: aesKeyFile
			});
		}
		dw.onmessage = function (event) {
			var blob = undefined;
			var dataURL = event.data.dataURL;
			var filenames = event.data.filenames.split(STR_SEPERATOR);
			for (var i = 0; i < dataURL.length; i++) {
				var data = dataURL[i];
				var filename = filenames[i];
				try{
					blob = dataURLToBlob(data);
					saveAs(blob, filename);
					ob('btnDecrypt').classList.remove('loading');
					ob('btnDecrypt').removeAttribute('disabled');
				}
				catch (e){
					alert('Invalid key.');
					ob('btnDecrypt').classList.remove('loading');
					ob('btnDecrypt').removeAttribute('disabled');
				}
			}
			dw.terminate();
			dw = undefined;
			ob('btnDecrypt').classList.remove('loading');
			ob('btnDecrypt').removeAttribute('disabled');
		}
	}
}

// connect to background page
var port = chrome.extension.connect({name: "Retrieve decrypted email"});
port.onMessage.addListener(function(msg) {
	
	if (!msg.hasOwnProperty('data')){
		return;
	}
	if (msg.data.length < 1){
		return;
	}
	var d = msg.data;
	$('#text').text(deAlignEmail(d));
	$('#text').val(deAlignEmail(d));

	// insert data to select#slRecipients
	var contents = ob('text').value.split(STR_SEPERATOR);
	console.log(contents);
	contents.forEach(function (content) {
		var c = '';
		try{
			c = preDecrypt(content);
		}
		catch (e){
			alert('Email is corrupted.');
			window.close();
			return;
		}

		// each element of contents is a email for 1 recipient.
		// in format:
		// cipher|recipient.
		// Example: CtnIuSOas...QkK240ieyL8/VHE|ngocdon127@gmail.com
		var data = c.split('|');
		console.log(data);
		if (data.length < 2){
			alert('Email content is corrupted.');
			// window.close();
			return;
		}
		var emailContent = data[0];
		var recipient = data[1];
		log('recipient');
		log(recipient);
		var e = document.createElement('option');
		e.value = recipient;
		e.innerHTML = recipient;
		ob('slRecipients').appendChild(e);

		// fill data to singleEmails object
		singleEmails[recipient] = content;
	})
});

/**
 * Decrypt encrypted email
 *
 * @param {string} data Encrypted email
 */
function decryptEmail(data) {
	data = preDecrypt(data);

	// data must be in this format:
	// U2FsdGVkX1/YoCfyJ...IatQmW5q4jfSewveW37HbgA6pGgPuap9mKM=|user@gmail.com
	data = data.split('|');

	if (data.length < 2){
		alert('Data is corrupted.');
		console.log('Data is corrupted.');
		return;
	}
	STORAGE_AREA.get(data[1], function (items) {

		// Chrome doesn't have private key of this email address.
		if (jQuery.isEmptyObject(items)){
			alert('Could not find private key of ' + data[1]);
			return;
		}

		// Chrome has already storaged key pair of this email before.
		if (items[data[1]].isPairKey == 1){
			try {
				var privateKey = items[data[1]].private;
				var passphrase = prompt('Enter passphrase of ' + data[1] + ':', '');
				privateKey = CryptoJS.AES.decrypt(privateKey, passphrase).toString(CryptoJS.enc.Utf8);
				privateKey = preDecrypt(privateKey);
				var plainText = cryptico.decrypt(data[0], cryptico.RSAKeyFromString(privateKey));
				plainText = decodeURIComponent(escape(plainText.plaintext)).split('|');

				// plainText should consist of 1 or 2 parts.
				// The first part is the original email Alice sends to Bob.
				// The second part (if exist) is the AES secret key used to encrypt attachments.
				// These two parts is seperated by '|'

				// Ex:
				// This is an encrypted email without any attachments.
				// This is an encrypted email with attachments|somekey.
				$('#decrypted').html(function () {
					return plainText[0];
				});
				$('#decrypted').fadeIn();
				if (ob('attach').files.length < 1){
					ob('btnDecrypt').classList.remove('loading');
					ob('btnDecrypt').removeAttribute('disabled');
				}
				else{
					aesKeyFile = plainText[1];
					decryptFile();
				}
			}
			catch (e){
				alert('Email is corrupted or invalid passphrase.');
				ob('btnDecrypt').classList.remove('loading');
				ob('btnDecrypt').removeAttribute('disabled');
			}
		}

		// Chrome has public key of this email only.
		else{
			alert('Private key of ' + data[1] + ' is not exist.');
		}
	})
}

ob('btnDecrypt').addEventListener('click', function () {
	decryptEmail(singleEmails[ob('slRecipients').value]);
});

// Add loading effect
ob('btnDecrypt').addEventListener('click', BUTTON_LOADING);