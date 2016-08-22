// constants
var GMAIL = 0;
var HUST_MAIL = 1;
var MAIL_SERVICE = getMailService();

// variables and functions

// user info
var user = {};

// save editor frame of Gmail.
var element = '';
var editable = '';

// Number of recipients
var noOfRecipients = 0;

// email of recipients
var recipients = [];

// email content
var emailContent = '';

// encrypted email content
var encryptedEmailContent = '';

// Number of encrypted email for recipients
var encryptedEmail = 0;

// use this key to encrypt attachments.
var aesKeyFile = '';

// public key of recipients
var publicKeys = {};

/**
 *	Detect current Email Service
 *
 * @return GMAIL or HUST_MAIL
 */
function getMailService () {
	var gmail = ["mail.google.com"];
	var hustMail = ["mail.hust.vn", "mail.hust.edu.vn"];
	var hostname = window.location.hostname;
	if (gmail.indexOf(hostname) >= 0){
		return GMAIL;
	}
	if (hustMail.indexOf(hostname) >= 0){
		return HUST_MAIL;
	}
	return -1;
}

/**
 * jQuery load script
 */
jQuery.loadScript = function (url, callback) {
	jQuery.ajax({
		url: url,
		dataType: 'script',
		success: callback,
		async: true
	});
}

// button to render extension frame
var e = document.createElement('button');
e.innerHTML = 'Encrypt';
e.setAttribute('data-label', "Encrypt");
e.id = 'eframe-cryptojs';
e.class = 'btn-crypto';
e.addEventListener('click', BUTTON_LOADING);
e.addEventListener('click', clickHandler);

// check login status
chrome.runtime.sendMessage({
		actionType: 'get-login-status',
	},
	function (response) {
		if (response.isLoggedIn == 1){
			user = response;
			// console.log(user);
		}
	}
);

if (MAIL_SERVICE == GMAIL){
	/**
	 * Detect when inbox is about to loaded.
	 *
	 */
	setInterval(function () {
		if (/\#inbox\/.+$/.test(window.location.href)){
			// console.log('run direct');
			emailRowClickHandler();
		}
		else{
			emailRowClickHandlerFlag = false;
		}
	}, 1000);
}
else if (MAIL_SERVICE == HUST_MAIL){
	setInterval(function () {
		var div = top.frames["Main"].document.getElementsByClassName('Fixed');
		// console.log(div);
		if (div.length > 0){
			div = div[0];
			// console.log(div);
			// div.ltr
			if (div.children.length > 0){
				div = div.children[0];
				// console.log(div);
				// console.log(div.nodeName.toLowerCase());
				// console.log(div.getAttribute('dir').toLowerCase());
				if ((div.nodeName.toLowerCase() == 'div') && (div.getAttribute('dir').toLowerCase() == 'ltr')){
					var canAdd = true;
					for (var i = 0; i < div.children.length; i++) {
						var e = div.children[i];
						try{
							if ((e.nodeName.toLowerCase() == 'input') && (e.getAttribute('btnClass').localeCompare('btnDecrypt') == 0)){
								canAdd = false;
							}
						}
						catch(err){
							canAdd = false;
						}
					}
					if (canAdd){
						var pre = div.children[0];
						// console.log(pre);
						var btn = document.createElement('input');
						btn.setAttribute('type', 'button');
						btn.setAttribute('value', 'Decrypt this email');
						btn.setAttribute('class', 'contentBtnDecrypt');
						var cipher = pre.innerHTML.replace(/[<][^>]*[>]/g, '')
						btn.setAttribute('cipher', cipher);
						btn.addEventListener('click', sendCipherToDecryptFrame.bind(this, cipher));
						// console.log(cipher);
						div.appendChild(btn);
						console.log('added');
						// var frameDecrypt = `<div class="container">
						// 	<div class="form-group">
						// 		<textarea type="text" id="text" class="form-control" placeholder="Text"></textarea>
						// 	</div>
						// 	<div class="form-group">
						// 		<label for="attach">Choose *.encrypted file to decrypt</label>
						// 		<input type="file" name="attach" id="attach">
						// 	</div>
						// 	<div class="form-group hidden">
						// 		<label for="slRecipients">Decrypt email with account: </label>
						// 		<select name="slRecipients" id="slRecipients"></select>
						// 	</div>
						// 	<div class="form-group">
						// 		<button data-label="Decrypt" id="btnDecrypt" class="btn-crypto">Decrypt</button>
						// 	</div>
						// 	<div class="form-group">
						// 		<div contenteditable="true" id="decrypted" style="display: none"></div>
						// 	</div>
						// 	<script src="decrypt-email.js"></script>
						// </div>`;
						// console.log(frameDecrypt);
						// frameDecrypt = document.createElement(frameDecrypt);
						// div.appendChild(frameDecrypt);
						// console.log('done added');
					}
				}
			}
		}
	}, 1000);
}

/**
 * Because the above interval will run permanently,
 * many click handlers will be added to one email row.
 * So, each time user click in one email row, emailRowClickHandler will be invoked many times.
 * Because of that, we need a flag to make sure that emailRowClickHandler will run exactly one single time.
 */
var emailRowClickHandlerFlag = false;

// If user paste a email url directly in address bar,
// we need to run emailRowClickHandler directly instead of listening a click event from clicking email row.


/**
 * email row click handler
 *
 */
function emailRowClickHandler () {
	// console.log(emailRowClickHandlerFlag);
	if (emailRowClickHandlerFlag){
		return;
	}
	emailRowClickHandlerFlag = true;
	// To make sure email is loaded, delay 2s before doing anything.
	setTimeout(function () {
		// Maybe user click on a discussion, not a single email.
		// so we have to run the following code many time.
		setInterval(function () {
			var divs = document.getElementsByClassName('adP adO');
			for (var i = 0; i < divs.length; i++) {
				// check if button exist
				var canAdd = true;
				try{
					var btn = divs[i];
					if (btn.children.length > 0){
						btn = btn.children[0];
					}
					else{
						throw new Error();
					}
					if (btn.children.length > 0){
						btn = btn.children[0];
					}
					else{
						throw new Error();
					}
					// if (btn.children.length > 1){
					// 	btn = btn.children[1];
					// 	if (btn.getAttribute('btnClass').localeCompare('btnDecrypt') == 0){
					// 		canAdd = false;
					// 	}
					// }
					// else{
					// 	if ((btn.children.length > 0) && (btn.children[0].nodeName.localeCompare('pre'))){
					// 		canAdd = true;
					// 	}
					// 	else{
					// 		canAdd = false;
					// 	}
					// 	throw new Error();
					// }
					for (var j = 0; j < btn.children.length; j++) {
						var e = btn.children[j];
						try{
							if ((e.nodeName.toLowerCase() == 'input') && (e.getAttribute('btnClass').localeCompare('btnDecrypt') == 0)){
								canAdd = false;
							}
						}
						catch(err){
							canAdd = false;
						}
					}

				}
				catch(e){
					canAdd = false;
				}
				finally{
					if (canAdd){
						var extraId = Math.floor(Math.random() * 1000000);
						var btn = document.createElement('input');
						btn.setAttribute('type', 'button');
						btn.setAttribute('value', 'Decrypt this email');
						btn.setAttribute('btnClass', 'btnDecrypt');
						btn.setAttribute('class', 'contentBtnDecrypt btn btn-primary');
						var cipher = findPre(divs[i]).innerHTML.replace(/[<][^>]*[>]/g, '')
						// btn.setAttribute('cipher', cipher);
						btn.addEventListener('click', function () {
							jQuery('#wrapper-' + extraId).show('normal');
						});
						// console.log(cipher);
						divs[i].children[0].children[0].appendChild(btn);
						console.log('added');
						var frameDecrypt = `
							<div class="form-group">
								<label for="attach-` + extraId + `">Choose *.encrypted file to decrypt</label><br />
								<input type="file" class="attach" name="attach" id="attach-` + extraId + `">
							</div>
							<div class="form-group">
								<button position="` + i + `" data-label="Decrypt" id="btnDecrypt-` + extraId + `" class="btn-crypto">Decrypt</button>
							</div>
							<div class="form-group">
								<button  id="btnHide-` + extraId + `" class="btn-waring btn-hide">Hide</button>
							</div>`;
						// console.log(frameDecrypt);
						var wrapper = document.createElement('div');
						wrapper.setAttribute('class', 'container decrypt-wrapper');
						wrapper.setAttribute('id', 'wrapper-' + extraId);
						wrapper.setAttribute('style', 'display: none');
						wrapper.innerHTML = frameDecrypt;
						divs[i].children[0].children[0].appendChild(wrapper);
						ob('btnDecrypt-' + extraId).addEventListener('click', BUTTON_LOADING);
						ob('btnDecrypt-' + extraId).addEventListener('click', sendCipherToDecryptFrame.bind(this, cipher, extraId, i));
						ob('btnHide-' + extraId).addEventListener('click', function () {
							jQuery('#wrapper-' + extraId).hide('normal');
						});
						// jQuery.loadScript('chrome-extension://pfhpflblmdndjhbkegdhdapdlcnfihie/src/consts-and-funcs.js', function () {
						// 	jQuery.loadScript('chrome-extension://pfhpflblmdndjhbkegdhdapdlcnfihie/src/decrypt-email.js', function () {
						// 		console.log('all done');
						// 	})
						// })
						console.log('done added');
					}
					else{
						// console.log('exist, d\' add');
					}
				}
			}
		}, 1000)
	}, 2000)
}

var btnDecryptClickHandler = function (cipher, extraId, position) {

	singleEmails = {};
	
	var d = cipher;
	$('#text').text(deAlignEmail(d));
	$('#text').val(deAlignEmail(d));

	console.log('clicked decrypt button');

	// insert data to select#slRecipients
	// var contents = ob('text').value.split(STR_SEPERATOR);
	var contents = deAlignEmail(d).split(STR_SEPERATOR);
	contents.forEach(function (content) {
		var c = '';
		try{
			c = preDecrypt(content);
		}
		catch (e){
			console.log('1 single email corrupted.');
			// window.close();
			return;
		}

		// each element of contents is a email for 1 recipient.
		// in format:
		// cipher|recipient.
		// Example: CtnIuSOas...QkK240ieyL8/VHE|ngocdon127@gmail.com
		var data = c.split('|');
		if (data.length < 2){
			console.log('1 single email content corrupted.');
			// window.close();
			return;
		}
		var emailContent = data[0]; // what???
		var recipient = data[1];

		// fill data to singleEmails object
		singleEmails[recipient] = content;
	});

	if (!user.hasOwnProperty("email") || (typeof(user.email) == 'undefined')){
		alert("Login first.");
		removeAnimation(500, extraId);
		return;
	}

	if (singleEmails.hasOwnProperty(user.email)){
		decryptEmail(singleEmails[user.email], extraId, position);
	}
	else {
		alert("This email wasn't encrypted for " + user.email);
		removeAnimation(500, extraId);
	}

}

/**
 * Send cipher to decrypt-frame
 */
function sendCipherToDecryptFrame (cipher, extraId, position) {

	/**
	 * Decrypt email in another window.
	 * We need to pass message to background.
	 */

	// console.log(cipher);
	// chrome.runtime.sendMessage({actionType: 'decrypt-email', cipher: cipher}, function (response) {
	// 	// console.log(response);
	// })

	/**
	 * Because at this version, we decrypt email directly from Gmail tab,
	 * so we don't need to send cipher to background.
	 * All we have to do now is just pass inputs to btnDecryptClickHandler.
	 */

	btnDecryptClickHandler(cipher, extraId, position);
}

/**
 * Get all recipients
 *
 * @return {array} all recipents' email
 */
function getRecipients(){
	if (window.location.hostname === "mail.google.com"){
		var divRecipients = document.getElementsByClassName('vR');
		var result = [];
		for (var i = 0; i < divRecipients.length; i++){
			result.push(divRecipients[i].children[0].getAttribute('email'));
		}
		return result;
	}
	else if (window.location.hostname === "mail.hust.vn"){
		var to = ob('To').value.match(/([\w\.0-9_]*@[\w\.0-9]*)/g);
		var cc = ob('CC').value.match(/([\w\.0-9_]*@[\w\.0-9]*)/g);
		var result = [];
		if (to){
			result = result.concat(to);
		}
		if (cc){
			result = result.concat(cc);
		}
		return result;
	}
}

/**
 * Render button
 */
function clickHandler() {
	console.log('clicked');
	// return;

	// check login status
	chrome.runtime.sendMessage({
			actionType: 'get-login-status',
		},
		function (response) {
			if (response.isLoggedIn == 1){
				user = response;
			}
		}
	)
	noOfRecipients = 0;
	recipients = [];
	encryptedEmail = 0;
	encryptedEmailContent = '';

	var isGmail = 0;
	var isHustMail = 1;
	var myEmail;

	var divRecipients = getRecipients();
	for(var i = 0; i < divRecipients.length; i++){
		var e = divRecipients[i];
		if ((recipients.indexOf(e) < 0) && (typeof(e) != 'undefined'))
			recipients.push(e);
	}

	myEmail = getEmailAddress();
	if (myEmail){
		if (recipients.indexOf(myEmail) < 0){
			recipients.push(myEmail);
		}
	}
	else if (user.isLoggedIn == 1){
		myEmail = user.email;
		if (myEmail && (recipients.indexOf(myEmail) < 0)){
			recipients.push(myEmail);
		}
	}
	else{
		myEmail = prompt('Could not detect your email address. You need to enter your email address in order to be able to read this email in the future.');
		if (myEmail && (recipients.indexOf(myEmail) < 0)){
			recipients.push(myEmail);
		}
	}
	noOfRecipients = recipients.length;
	if (MAIL_SERVICE === GMAIL){
		emailContent = document.getElementsByClassName('Am Al editable LW-avf')[0].innerHTML;
	}
	else if (MAIL_SERVICE == HUST_MAIL){
		emailContent = document.getElementsByTagName("iframe")[0].contentWindow.document.body.innerHTML;
	}
	
	// request public key

	// need to check if recipient has E2EE account or not
	// var data = {};
	var data = [];
	if (!user.hasOwnProperty('email')){
		alert("login first.");
		return;
	}
	// data['requestUser'] = {
	// 	userId: user.userId,
	// 	password: user.hashedPassword
	// };
	var users = [];
	for (var i = 0; i < recipients.length; i++) {
		// users.push({'email': recipients[i]});
		data.push(recipients[i]);
	}

	chrome.runtime.sendMessage({
			actionType: 'request-public-key',
			// requestUser: data['requestUser'],
			requestedUsers: data,
		},
		function (response) {
			if (response.name !== 'requested-public-keys'){
				return;
			}
			console.log(response);
			// save to global variable.
			publicKeys = response.data;
		}
	)

	// ========== old way ==========

	// data['requestedUsers'] = users;
	/*
	chrome.runtime.sendMessage(
		{
			actionType: 'check-recipients-exist',
			requestUser: data['requestUser'],
			requestedUsers: users
		},
		function (response) {
			if (response.name !== 'recipients-status'){
				return;
			}
			var exist = [];
			var notExist = [];
			var d = response.data;

			// optimize later.
			// Using data['requestedUsers'].filter
			for (var i in d){
				if (d[i] === 'Exist'){
					exist.push({'email': i});
				}
				else if (d[i] === 'Not Exist'){
					notExist.push({'email': i});
				}
			}
			// request public key for user in exist[]
			chrome.runtime.sendMessage({
					actionType: 'request-public-key',
					requestUser: data['requestUser'],
					requestedUsers: exist,
				},
				function (response) {
					if (response.name !== 'requested-public-keys'){
						return;
					}
					// save to global variable.
					publicKeys = response.data;
				}
			)
			// register account for user in notExist[]
			chrome.runtime.sendMessage({
					actionType: 'register-multiple-users',
					requestUser: data['requestUser'],
					requestedUsers: notExist,
				},
				function (response) {
					if (response.name !== 'send-registered-users'){
						return;
					}
					// save to global variable.
					for(var i = 0; i < response.data.length; i++){
						publicKeys[response.data[i].email] = response.data[i].publicKey;
					}
				}
			)
		}
	);
	*/

	// ========== end of old way ==========

	var intervalEncrypt = setInterval(function () {
		console.log(Object.keys(publicKeys).length + " : " + noOfRecipients);
		if (Object.keys(publicKeys).length >= noOfRecipients){
			clearInterval(intervalEncrypt);

			// Now extension can start encrypting email.
			console.log('start encrypting');
			// console.log(recipients);
			chrome.runtime.sendMessage({actionType: "get-aes-key-file"}, function (response) {
				aesKeyFile = response.aesKeyFile;
				console.log('aesKeyFile get from background');
				console.log(aesKeyFile);
				encryptEmail();
			});
			console.log('done');
		}
	}, 1000);

}

var interval;
if (MAIL_SERVICE === GMAIL){
	fRender = function () {
		try{
			// try to bind Gmail editor
			editable = document.getElementsByClassName('Am Al editable LW-avf')[0];
			// toolbar in Gmail editor.
			var tr = document.getElementsByClassName('n1tfz')[0];
			var div = null;
			element = editable.parentElement;

			// if Gmail editor is opening
			if (tr != null){
				var check = 0;
				var td = tr.children[3];
				div = td.children[0];
				for (var i = 0; i < div.children.length; i++) {
					child = div.children[i];
					if (child.id == 'eframe-cryptojs'){
						check = 1;
						break;
					}
				}
				if (check != 1){
					// element.appendChild(e);
					e.setAttribute('class', 'wG J-Z-I btn-encrypt-email btn-crypto');
					div.appendChild(e);
					var atms = document.getElementsByClassName('wG J-Z-I')[0];
					atms = $(atms).clone();
					$(atms).prop('id', 'e2eesa');
					$(atms).appendTo(div);

					// handle click event for Encrypted Attachment Button
					$(atms).on('click', function () {
						console.log('clicked attachments');
						chrome.runtime.sendMessage(
							{
								actionType: 'open-add-attachments-frame',
							}, 
							function (response) {
								console.log(response);
						});
					})
				}
				else{
				}
			}
		}
		catch (e){

		}
	}
}

else if (MAIL_SERVICE === HUST_MAIL){
	fRender = function () { 
		try{
			// try to bind HustMail editor
			// editable = document.getElementsByClassName('cke_show_borders')[0];
			editable = document.getElementsByTagName("iframe")[0].contentWindow.document.body;

			// toolbar in HustMail editor.
			var table = document.getElementsByClassName('Header')[1];

			var img = $(".HeaderImg").detach();
			table.children[0].children[0].appendChild(e);
			var atms = document.createElement("td");
			atms.innerHTML = "attach";
			$(atms).appendTo($(table.children[0].children[0]));
			$(img[1]).appendTo($(table.children[0].children[0]));

			// handle click event for Encrypted Attachment Button
			$(atms).on('click', function () {
				chrome.runtime.sendMessage(
					{
						actionType: 'open-add-attachments-frame',
					}, 
					function (response) {
						console.log(response);
				});
			})
		}
		catch (err){
			console.log(err);
		}
	}
}

// render extension button after DOM loaded 5s.
setTimeout(function () {
	if (MAIL_SERVICE === GMAIL){
		// Try to render every 1000
		interval = setInterval(fRender, 1000);
	}
	else if (MAIL_SERVICE === HUST_MAIL){
		fRender();
	}
}, 5000);
var fRender;

// receive encrypted email
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request.encryptedData != null){
		editable.value = request.encryptedData;
		editable.innerHTML = request.encryptedData;
	}
	else if (request.actionType === 'send-aes-key-file-to-content-script'){
		aesKeyFile = request.aesKeyFile;
		// console.log('aesKeyFile: ' + aesKeyFile);
	}
});

/**
 * Encrypt the whole email
 */
function encryptEmail () {

	//add aesKeyFile to the original email.
	//send it to recipient.
	//so that recipient can decrypt attachments.
	var plainText = emailContent + '|' + aesKeyFile;
	// console.log(plainText);
	// var plainText = emailContent;
	var flags = {
		ef: 0
	}

	if (noOfRecipients < 1){
		alert('Select at least 1 recipient.');
		// ob('btnEncrypt').classList.remove('loading');
		// ob('btnEncrypt').removeAttribute('disabled');
		return;
	}

	// Encrypt email for recipients.
	for (var i = 0; i < recipients.length; i++) {
		var recipient = recipients[i];
		log('start encrypting email for ' + recipient);
		try {
			var data = preDecrypt(publicKeys[recipient]);
		}
		catch (e){
			console.log('=== encrypt with initial key will throw an error ===');
			console.log(e);
			console.log('=== but it doesn\'t matter ===');
			publicKeys[recipient] = preEncrypt(publicKeys[recipient] + '|' + recipient);
		}
		finally {
			ee(recipient, plainText, flags);
		}
	}
	var interval = setInterval(function () {
		log(encryptedEmail + ' / ' + noOfRecipients + ' done.');
		// finish encrypting
		if (encryptedEmail >= noOfRecipients){
			// remove the last STR_SEPERATOR
			encryptedEmailContent = encryptedEmailContent.substring(0, encryptedEmailContent.length - STR_SEPERATOR.length);
			// align email
			encryptedEmailContent = alignEmail(encryptedEmailContent);
			if (MAIL_SERVICE === GMAIL){
				document.getElementsByClassName('Am Al editable LW-avf')[0].innerHTML = encryptedEmailContent;
				try {
					document.getElementsByClassName('n1tfz')[0].children[0].children[0].children[1].click();
				}
				catch (e){
					console.log(e);
					alert('Something went wrong. You might need to click "Send" button yourself to send this message');
				}
			}
			else if (MAIL_SERVICE === HUST_MAIL){
				document.getElementsByTagName("iframe")[0].contentWindow.document.body.innerHTML = encryptedEmailContent;
			}
			clearInterval(interval);
			log('done');
		}
	}, 1);
}

/**
 * Encrypt 1 single email for 1 recipient.
 *
 * @param {string} recipient Email address of recipient
 * @param {string} plainText The original email that will be encrypt
 * @param {object} obj Flags
 */
function ee (recipient, plainText, obj) {

	var data = preDecrypt(publicKeys[recipient]);
	data = data.split('|');
	console.log(data[1]);
	console.log(recipient);
	if (data[1] != recipient){
		alert('Email is not matched.');
		return;
	}
	var publicKey = data[0];
	var cipher = cryptico.encrypt(unescape(encodeURIComponent(plainText)), publicKey);
	encryptedEmailContent += preEncrypt(cipher.cipher + '|' + recipient) + STR_SEPERATOR;
	encryptedEmail++;
}

function findPre (element) {
	if (element.nodeName.toLowerCase().localeCompare('pre') == 0){
		return element;
	}
	if (element.children.length < 1){
		return false;
	}
	for (var i = 0; i < element.children.length; i++) {
		var result = findPre(element.children[i])
		if (result){
			return result;
		}
	}
}

// from decrypt-email.js
'use strict';

// user info
// var user = {};

// storage single email for 1 recipient
// structure:
// singleEmails = {
// 	'e1@ex.com': 'CtnIuSOas...QkK240ieyL8/VHE',
// 	'e2@ex.net': 'tnIsdfexi...jde25s0ie/tiAcs'
// }
// will be filled right after the time popup windows is created.
var singleEmails = {};

// chrome.runtime.sendMessage({
// 		actionType: 'get-login-status',
// 	},
// 	function (response) {
// 		if (response.isLoggedIn == 1){
// 			user = response;
// 			console.log(user);
// 		}
// 	}
// )

// Log data to console when user choose files.
function handleFileSelect (event) {
	var files = event.target.files;
	for (var i = 0; i < files.length; i++) {
		var file = files[i];
		console.log(file);
	};

}

// add event listener for choosing-files event.
// ob('attach').addEventListener('change', handleFileSelect, false);


// use this key to decrypt attachments.
var aesKeyFile = '';

// user's email
var myEmail = getEmailAddress();

// decrypt worker.
var dw = undefined;

/** 
 * Decrypt attachments.
 */
function decryptFile (extraId) {
	if (ob('attach-' + extraId).files.length < 1){
		return;
	}

	// check file name.
	if (ob('attach-' + extraId).files[0].name.indexOf('.encrypted') < 0){
		alert('Choose *.encrypted file to decrypt.');
		return;
	}

	if (typeof(Worker) !== 'undefined'){
		if (typeof(dw) == 'undefined'){

			// From content-script, we cannot construct Worker like this.
			// dw = new Worker('file-worker.js');

			// We can add file-worker.js to web_accessible_resources in manifest.json,
			// So that, we can construct Worker like this.
			// dw = new Worker('chrome-extension://pfhpflblmdndjhbkegdhdapdlcnfihie/src/file-worker.js');

			// But browser does not understand what FileReader is, 
			// because it thinks file-worker.js is just a normal JavaScript file, not a Worker.

			// So we need to inject Worker's source code direct into Gmail Tab 's source
			// After that, we can construct worker from injected code, 
			// and tell the browser that code is javascript/worker
			var blob = new Blob([
				document.querySelector('#inlineWorker').textContent
			], { type: "text/javascript" })

			// Note: window.webkitURL.createObjectURL() in Chrome 10+.
			// var worker = new Worker(window.URL.createObjectURL(blob));
			dw = new Worker(window.URL.createObjectURL(blob));
			dw.postMessage({
				type: 'decrypt',
				file: ob('attach-' + extraId).files[0],
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
					removeAnimation(0, extraId);
				}
				catch (e){
					alert('Invalid key.');
					removeAnimation(0, extraId);
				}
			}
			dw.terminate();
			dw = undefined;
			removeAnimation(0, extraId);
		}
	}
}

// connect to background page
// var port = chrome.extension.connect({name: "Retrieve decrypted email"});
// port.onMessage.addListener(function(msg) {

// 	// reset
// 	singleEmails = {};
	
// 	if (!msg.hasOwnProperty('data')){
// 		return;
// 	}
// 	if (msg.data.length < 1){
// 		return;
// 	}
// 	var d = msg.data;
// 	$('#text').text(deAlignEmail(d));
// 	$('#text').val(deAlignEmail(d));

// });

/**
 * Decrypt encrypted email
 *
 * @param {string} data Encrypted email
 */
function decryptEmail(data, extraId, position) {
	data = preDecrypt(data);

	// data must be in this format:
	// U2FsdGVkX1/YoCfyJ...IatQmW5q4jfSewveW37HbgA6pGgPuap9mKM=|user@gmail.com
	data = data.split('|');
	console.log(data);

	if (data.length < 2){
		alert('Data is corrupted.');
		console.log('Data is corrupted.');
		return;
	}
	
	// start decrypting
	if (!user.hasOwnProperty('email')){
		alert("You have to log in first.");
		return;
	}

	// Chrome has already saved key pair of this email before.
	try {

		// use main key
		var privateKey = user.encryptedPrivateKey;
		// console.log(privateKey);
		var passphrase = prompt('Enter passphrase of ' + data[1] + ':', '');
		passphrase = CryptoJS.MD5(passphrase).toString(CryptoJS.enc.Base16);
		privateKey = CryptoJS.AES.decrypt(privateKey, passphrase).toString(CryptoJS.enc.Utf8);
		privateKey = preDecrypt(privateKey);
		// console.log('done privateKey');
		var decryptResult = cryptico.decrypt(data[0], cryptico.RSAKeyFromString(privateKey));
		console.log(decryptResult);
		if (decryptResult.status.localeCompare('success') != 0){
			// if fail, use temp key.
			if (!('encryptedTmpPrivateKey' in user)){
				alert("Could not decrypt message with your Private Key");
				return;
			}
			privateKey = user.encryptedTmpPrivateKey;
			// console.log(privateKey);
			privateKey = CryptoJS.AES.decrypt(privateKey, passphrase).toString(CryptoJS.enc.Utf8);
			privateKey = preDecrypt(privateKey);
			// console.log('done privateKey');
			decryptResult = cryptico.decrypt(data[0], cryptico.RSAKeyFromString(privateKey));
			if (decryptResult.status.localeCompare('success') != 0){
				alert("Cannot decrypt message with your Private Key");
				removeAnimation(500, extraId);
				return;
			}
			console.log('using tmp key');
		}
		else {
			console.log('using main key');
		}
		var plainText = decodeURIComponent(escape(decryptResult.plaintext)).split('|');
		console.log(plainText);

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
		if (ob('attach-' + extraId).files.length < 1){

			// without decrypting files, extension can decrypt email very fast.
			// => let the button animate in a short time before reverting it to the original state.
			
			removeAnimation(500, extraId);
			// console.log('remove loading UI effect');
		}
		else{
			aesKeyFile = plainText[1];
			console.log(aesKeyFile);
			decryptFile(extraId);
		}

		// replace encrypted email with the decrypted email
		$(findPre(document.getElementsByClassName('adP adO')[position])).parent().html(function () {
			return plainText[0];
		});
	}
	catch (e){
		console.log(e);
		alert('Email is corrupted or invalid passphrase.');
		removeAnimation(0, extraId);
	}
}

// ob('btnDecrypt').addEventListener('click', btnDecryptClickHandler);

// Add loading effect
// ob('btnDecrypt').addEventListener('click', BUTTON_LOADING);

// remove animation of button decrypt

function removeAnimation (time, extraId) {
	var time = parseInt(time);
	(time < 0) ? (time = 0) : 0;
	setTimeout(function () {
		try {
			ob('btnDecrypt-' + extraId).classList.remove('loading');
			ob('btnDecrypt-' + extraId).removeAttribute('disabled');
		}
		catch (err){
			console.log(err);
		}
	}, time);
}

// ======================== CryptoJS - AES =====================
// cannot seperate in another file.
// So we need to copy and paste it here.

// ========== Start of workerString ==========
// inline worker source. We save it in a multiple-line-string - workerString
var workerString = `
	// importScripts('/crypto-js/build/rollups/aes.js');
	// importScripts('/crypto-js/build/components/enc-base64-min.js');

	/*
	CryptoJS v3.1.2
	code.google.com/p/crypto-js
	(c) 2009-2013 by Jeff Mott. All rights reserved.
	code.google.com/p/crypto-js/wiki/License
	*/
	var CryptoJS=CryptoJS||function(u,p){var d={},l=d.lib={},s=function(){},t=l.Base={extend:function(a){s.prototype=this;var c=new s;a&&c.mixIn(a);c.hasOwnProperty("init")||(c.init=function(){c.$super.init.apply(this,arguments)});c.init.prototype=c;c.$super=this;return c},create:function(){var a=this.extend();a.init.apply(a,arguments);return a},init:function(){},mixIn:function(a){for(var c in a)a.hasOwnProperty(c)&&(this[c]=a[c]);a.hasOwnProperty("toString")&&(this.toString=a.toString)},clone:function(){return this.init.prototype.extend(this)}},
	r=l.WordArray=t.extend({init:function(a,c){a=this.words=a||[];this.sigBytes=c!=p?c:4*a.length},toString:function(a){return(a||v).stringify(this)},concat:function(a){var c=this.words,e=a.words,j=this.sigBytes;a=a.sigBytes;this.clamp();if(j%4)for(var k=0;k<a;k++)c[j+k>>>2]|=(e[k>>>2]>>>24-8*(k%4)&255)<<24-8*((j+k)%4);else if(65535<e.length)for(k=0;k<a;k+=4)c[j+k>>>2]=e[k>>>2];else c.push.apply(c,e);this.sigBytes+=a;return this},clamp:function(){var a=this.words,c=this.sigBytes;a[c>>>2]&=4294967295<<
	32-8*(c%4);a.length=u.ceil(c/4)},clone:function(){var a=t.clone.call(this);a.words=this.words.slice(0);return a},random:function(a){for(var c=[],e=0;e<a;e+=4)c.push(4294967296*u.random()|0);return new r.init(c,a)}}),w=d.enc={},v=w.Hex={stringify:function(a){var c=a.words;a=a.sigBytes;for(var e=[],j=0;j<a;j++){var k=c[j>>>2]>>>24-8*(j%4)&255;e.push((k>>>4).toString(16));e.push((k&15).toString(16))}return e.join("")},parse:function(a){for(var c=a.length,e=[],j=0;j<c;j+=2)e[j>>>3]|=parseInt(a.substr(j,
	2),16)<<24-4*(j%8);return new r.init(e,c/2)}},b=w.Latin1={stringify:function(a){var c=a.words;a=a.sigBytes;for(var e=[],j=0;j<a;j++)e.push(String.fromCharCode(c[j>>>2]>>>24-8*(j%4)&255));return e.join("")},parse:function(a){for(var c=a.length,e=[],j=0;j<c;j++)e[j>>>2]|=(a.charCodeAt(j)&255)<<24-8*(j%4);return new r.init(e,c)}},x=w.Utf8={stringify:function(a){try{return decodeURIComponent(escape(b.stringify(a)))}catch(c){throw Error("Malformed UTF-8 data");}},parse:function(a){return b.parse(unescape(encodeURIComponent(a)))}},
	q=l.BufferedBlockAlgorithm=t.extend({reset:function(){this._data=new r.init;this._nDataBytes=0},_append:function(a){"string"==typeof a&&(a=x.parse(a));this._data.concat(a);this._nDataBytes+=a.sigBytes},_process:function(a){var c=this._data,e=c.words,j=c.sigBytes,k=this.blockSize,b=j/(4*k),b=a?u.ceil(b):u.max((b|0)-this._minBufferSize,0);a=b*k;j=u.min(4*a,j);if(a){for(var q=0;q<a;q+=k)this._doProcessBlock(e,q);q=e.splice(0,a);c.sigBytes-=j}return new r.init(q,j)},clone:function(){var a=t.clone.call(this);
	a._data=this._data.clone();return a},_minBufferSize:0});l.Hasher=q.extend({cfg:t.extend(),init:function(a){this.cfg=this.cfg.extend(a);this.reset()},reset:function(){q.reset.call(this);this._doReset()},update:function(a){this._append(a);this._process();return this},finalize:function(a){a&&this._append(a);return this._doFinalize()},blockSize:16,_createHelper:function(a){return function(b,e){return(new a.init(e)).finalize(b)}},_createHmacHelper:function(a){return function(b,e){return(new n.HMAC.init(a,
	e)).finalize(b)}}});var n=d.algo={};return d}(Math);
	(function(){var u=CryptoJS,p=u.lib.WordArray;u.enc.Base64={stringify:function(d){var l=d.words,p=d.sigBytes,t=this._map;d.clamp();d=[];for(var r=0;r<p;r+=3)for(var w=(l[r>>>2]>>>24-8*(r%4)&255)<<16|(l[r+1>>>2]>>>24-8*((r+1)%4)&255)<<8|l[r+2>>>2]>>>24-8*((r+2)%4)&255,v=0;4>v&&r+0.75*v<p;v++)d.push(t.charAt(w>>>6*(3-v)&63));if(l=t.charAt(64))for(;d.length%4;)d.push(l);return d.join("")},parse:function(d){var l=d.length,s=this._map,t=s.charAt(64);t&&(t=d.indexOf(t),-1!=t&&(l=t));for(var t=[],r=0,w=0;w<
	l;w++)if(w%4){var v=s.indexOf(d.charAt(w-1))<<2*(w%4),b=s.indexOf(d.charAt(w))>>>6-2*(w%4);t[r>>>2]|=(v|b)<<24-8*(r%4);r++}return p.create(t,r)},_map:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="}})();
	(function(u){function p(b,n,a,c,e,j,k){b=b+(n&a|~n&c)+e+k;return(b<<j|b>>>32-j)+n}function d(b,n,a,c,e,j,k){b=b+(n&c|a&~c)+e+k;return(b<<j|b>>>32-j)+n}function l(b,n,a,c,e,j,k){b=b+(n^a^c)+e+k;return(b<<j|b>>>32-j)+n}function s(b,n,a,c,e,j,k){b=b+(a^(n|~c))+e+k;return(b<<j|b>>>32-j)+n}for(var t=CryptoJS,r=t.lib,w=r.WordArray,v=r.Hasher,r=t.algo,b=[],x=0;64>x;x++)b[x]=4294967296*u.abs(u.sin(x+1))|0;r=r.MD5=v.extend({_doReset:function(){this._hash=new w.init([1732584193,4023233417,2562383102,271733878])},
	_doProcessBlock:function(q,n){for(var a=0;16>a;a++){var c=n+a,e=q[c];q[c]=(e<<8|e>>>24)&16711935|(e<<24|e>>>8)&4278255360}var a=this._hash.words,c=q[n+0],e=q[n+1],j=q[n+2],k=q[n+3],z=q[n+4],r=q[n+5],t=q[n+6],w=q[n+7],v=q[n+8],A=q[n+9],B=q[n+10],C=q[n+11],u=q[n+12],D=q[n+13],E=q[n+14],x=q[n+15],f=a[0],m=a[1],g=a[2],h=a[3],f=p(f,m,g,h,c,7,b[0]),h=p(h,f,m,g,e,12,b[1]),g=p(g,h,f,m,j,17,b[2]),m=p(m,g,h,f,k,22,b[3]),f=p(f,m,g,h,z,7,b[4]),h=p(h,f,m,g,r,12,b[5]),g=p(g,h,f,m,t,17,b[6]),m=p(m,g,h,f,w,22,b[7]),
	f=p(f,m,g,h,v,7,b[8]),h=p(h,f,m,g,A,12,b[9]),g=p(g,h,f,m,B,17,b[10]),m=p(m,g,h,f,C,22,b[11]),f=p(f,m,g,h,u,7,b[12]),h=p(h,f,m,g,D,12,b[13]),g=p(g,h,f,m,E,17,b[14]),m=p(m,g,h,f,x,22,b[15]),f=d(f,m,g,h,e,5,b[16]),h=d(h,f,m,g,t,9,b[17]),g=d(g,h,f,m,C,14,b[18]),m=d(m,g,h,f,c,20,b[19]),f=d(f,m,g,h,r,5,b[20]),h=d(h,f,m,g,B,9,b[21]),g=d(g,h,f,m,x,14,b[22]),m=d(m,g,h,f,z,20,b[23]),f=d(f,m,g,h,A,5,b[24]),h=d(h,f,m,g,E,9,b[25]),g=d(g,h,f,m,k,14,b[26]),m=d(m,g,h,f,v,20,b[27]),f=d(f,m,g,h,D,5,b[28]),h=d(h,f,
	m,g,j,9,b[29]),g=d(g,h,f,m,w,14,b[30]),m=d(m,g,h,f,u,20,b[31]),f=l(f,m,g,h,r,4,b[32]),h=l(h,f,m,g,v,11,b[33]),g=l(g,h,f,m,C,16,b[34]),m=l(m,g,h,f,E,23,b[35]),f=l(f,m,g,h,e,4,b[36]),h=l(h,f,m,g,z,11,b[37]),g=l(g,h,f,m,w,16,b[38]),m=l(m,g,h,f,B,23,b[39]),f=l(f,m,g,h,D,4,b[40]),h=l(h,f,m,g,c,11,b[41]),g=l(g,h,f,m,k,16,b[42]),m=l(m,g,h,f,t,23,b[43]),f=l(f,m,g,h,A,4,b[44]),h=l(h,f,m,g,u,11,b[45]),g=l(g,h,f,m,x,16,b[46]),m=l(m,g,h,f,j,23,b[47]),f=s(f,m,g,h,c,6,b[48]),h=s(h,f,m,g,w,10,b[49]),g=s(g,h,f,m,
	E,15,b[50]),m=s(m,g,h,f,r,21,b[51]),f=s(f,m,g,h,u,6,b[52]),h=s(h,f,m,g,k,10,b[53]),g=s(g,h,f,m,B,15,b[54]),m=s(m,g,h,f,e,21,b[55]),f=s(f,m,g,h,v,6,b[56]),h=s(h,f,m,g,x,10,b[57]),g=s(g,h,f,m,t,15,b[58]),m=s(m,g,h,f,D,21,b[59]),f=s(f,m,g,h,z,6,b[60]),h=s(h,f,m,g,C,10,b[61]),g=s(g,h,f,m,j,15,b[62]),m=s(m,g,h,f,A,21,b[63]);a[0]=a[0]+f|0;a[1]=a[1]+m|0;a[2]=a[2]+g|0;a[3]=a[3]+h|0},_doFinalize:function(){var b=this._data,n=b.words,a=8*this._nDataBytes,c=8*b.sigBytes;n[c>>>5]|=128<<24-c%32;var e=u.floor(a/
	4294967296);n[(c+64>>>9<<4)+15]=(e<<8|e>>>24)&16711935|(e<<24|e>>>8)&4278255360;n[(c+64>>>9<<4)+14]=(a<<8|a>>>24)&16711935|(a<<24|a>>>8)&4278255360;b.sigBytes=4*(n.length+1);this._process();b=this._hash;n=b.words;for(a=0;4>a;a++)c=n[a],n[a]=(c<<8|c>>>24)&16711935|(c<<24|c>>>8)&4278255360;return b},clone:function(){var b=v.clone.call(this);b._hash=this._hash.clone();return b}});t.MD5=v._createHelper(r);t.HmacMD5=v._createHmacHelper(r)})(Math);
	(function(){var u=CryptoJS,p=u.lib,d=p.Base,l=p.WordArray,p=u.algo,s=p.EvpKDF=d.extend({cfg:d.extend({keySize:4,hasher:p.MD5,iterations:1}),init:function(d){this.cfg=this.cfg.extend(d)},compute:function(d,r){for(var p=this.cfg,s=p.hasher.create(),b=l.create(),u=b.words,q=p.keySize,p=p.iterations;u.length<q;){n&&s.update(n);var n=s.update(d).finalize(r);s.reset();for(var a=1;a<p;a++)n=s.finalize(n),s.reset();b.concat(n)}b.sigBytes=4*q;return b}});u.EvpKDF=function(d,l,p){return s.create(p).compute(d,
	l)}})();
	CryptoJS.lib.Cipher||function(u){var p=CryptoJS,d=p.lib,l=d.Base,s=d.WordArray,t=d.BufferedBlockAlgorithm,r=p.enc.Base64,w=p.algo.EvpKDF,v=d.Cipher=t.extend({cfg:l.extend(),createEncryptor:function(e,a){return this.create(this._ENC_XFORM_MODE,e,a)},createDecryptor:function(e,a){return this.create(this._DEC_XFORM_MODE,e,a)},init:function(e,a,b){this.cfg=this.cfg.extend(b);this._xformMode=e;this._key=a;this.reset()},reset:function(){t.reset.call(this);this._doReset()},process:function(e){this._append(e);return this._process()},
	finalize:function(e){e&&this._append(e);return this._doFinalize()},keySize:4,ivSize:4,_ENC_XFORM_MODE:1,_DEC_XFORM_MODE:2,_createHelper:function(e){return{encrypt:function(b,k,d){return("string"==typeof k?c:a).encrypt(e,b,k,d)},decrypt:function(b,k,d){return("string"==typeof k?c:a).decrypt(e,b,k,d)}}}});d.StreamCipher=v.extend({_doFinalize:function(){return this._process(!0)},blockSize:1});var b=p.mode={},x=function(e,a,b){var c=this._iv;c?this._iv=u:c=this._prevBlock;for(var d=0;d<b;d++)e[a+d]^=
	c[d]},q=(d.BlockCipherMode=l.extend({createEncryptor:function(e,a){return this.Encryptor.create(e,a)},createDecryptor:function(e,a){return this.Decryptor.create(e,a)},init:function(e,a){this._cipher=e;this._iv=a}})).extend();q.Encryptor=q.extend({processBlock:function(e,a){var b=this._cipher,c=b.blockSize;x.call(this,e,a,c);b.encryptBlock(e,a);this._prevBlock=e.slice(a,a+c)}});q.Decryptor=q.extend({processBlock:function(e,a){var b=this._cipher,c=b.blockSize,d=e.slice(a,a+c);b.decryptBlock(e,a);x.call(this,
	e,a,c);this._prevBlock=d}});b=b.CBC=q;q=(p.pad={}).Pkcs7={pad:function(a,b){for(var c=4*b,c=c-a.sigBytes%c,d=c<<24|c<<16|c<<8|c,l=[],n=0;n<c;n+=4)l.push(d);c=s.create(l,c);a.concat(c)},unpad:function(a){a.sigBytes-=a.words[a.sigBytes-1>>>2]&255}};d.BlockCipher=v.extend({cfg:v.cfg.extend({mode:b,padding:q}),reset:function(){v.reset.call(this);var a=this.cfg,b=a.iv,a=a.mode;if(this._xformMode==this._ENC_XFORM_MODE)var c=a.createEncryptor;else c=a.createDecryptor,this._minBufferSize=1;this._mode=c.call(a,
	this,b&&b.words)},_doProcessBlock:function(a,b){this._mode.processBlock(a,b)},_doFinalize:function(){var a=this.cfg.padding;if(this._xformMode==this._ENC_XFORM_MODE){a.pad(this._data,this.blockSize);var b=this._process(!0)}else b=this._process(!0),a.unpad(b);return b},blockSize:4});var n=d.CipherParams=l.extend({init:function(a){this.mixIn(a)},toString:function(a){return(a||this.formatter).stringify(this)}}),b=(p.format={}).OpenSSL={stringify:function(a){var b=a.ciphertext;a=a.salt;return(a?s.create([1398893684,
	1701076831]).concat(a).concat(b):b).toString(r)},parse:function(a){a=r.parse(a);var b=a.words;if(1398893684==b[0]&&1701076831==b[1]){var c=s.create(b.slice(2,4));b.splice(0,4);a.sigBytes-=16}return n.create({ciphertext:a,salt:c})}},a=d.SerializableCipher=l.extend({cfg:l.extend({format:b}),encrypt:function(a,b,c,d){d=this.cfg.extend(d);var l=a.createEncryptor(c,d);b=l.finalize(b);l=l.cfg;return n.create({ciphertext:b,key:c,iv:l.iv,algorithm:a,mode:l.mode,padding:l.padding,blockSize:a.blockSize,formatter:d.format})},
	decrypt:function(a,b,c,d){d=this.cfg.extend(d);b=this._parse(b,d.format);return a.createDecryptor(c,d).finalize(b.ciphertext)},_parse:function(a,b){return"string"==typeof a?b.parse(a,this):a}}),p=(p.kdf={}).OpenSSL={execute:function(a,b,c,d){d||(d=s.random(8));a=w.create({keySize:b+c}).compute(a,d);c=s.create(a.words.slice(b),4*c);a.sigBytes=4*b;return n.create({key:a,iv:c,salt:d})}},c=d.PasswordBasedCipher=a.extend({cfg:a.cfg.extend({kdf:p}),encrypt:function(b,c,d,l){l=this.cfg.extend(l);d=l.kdf.execute(d,
	b.keySize,b.ivSize);l.iv=d.iv;b=a.encrypt.call(this,b,c,d.key,l);b.mixIn(d);return b},decrypt:function(b,c,d,l){l=this.cfg.extend(l);c=this._parse(c,l.format);d=l.kdf.execute(d,b.keySize,b.ivSize,c.salt);l.iv=d.iv;return a.decrypt.call(this,b,c,d.key,l)}})}();
	(function(){for(var u=CryptoJS,p=u.lib.BlockCipher,d=u.algo,l=[],s=[],t=[],r=[],w=[],v=[],b=[],x=[],q=[],n=[],a=[],c=0;256>c;c++)a[c]=128>c?c<<1:c<<1^283;for(var e=0,j=0,c=0;256>c;c++){var k=j^j<<1^j<<2^j<<3^j<<4,k=k>>>8^k&255^99;l[e]=k;s[k]=e;var z=a[e],F=a[z],G=a[F],y=257*a[k]^16843008*k;t[e]=y<<24|y>>>8;r[e]=y<<16|y>>>16;w[e]=y<<8|y>>>24;v[e]=y;y=16843009*G^65537*F^257*z^16843008*e;b[k]=y<<24|y>>>8;x[k]=y<<16|y>>>16;q[k]=y<<8|y>>>24;n[k]=y;e?(e=z^a[a[a[G^z]]],j^=a[a[j]]):e=j=1}var H=[0,1,2,4,8,
	16,32,64,128,27,54],d=d.AES=p.extend({_doReset:function(){for(var a=this._key,c=a.words,d=a.sigBytes/4,a=4*((this._nRounds=d+6)+1),e=this._keySchedule=[],j=0;j<a;j++)if(j<d)e[j]=c[j];else{var k=e[j-1];j%d?6<d&&4==j%d&&(k=l[k>>>24]<<24|l[k>>>16&255]<<16|l[k>>>8&255]<<8|l[k&255]):(k=k<<8|k>>>24,k=l[k>>>24]<<24|l[k>>>16&255]<<16|l[k>>>8&255]<<8|l[k&255],k^=H[j/d|0]<<24);e[j]=e[j-d]^k}c=this._invKeySchedule=[];for(d=0;d<a;d++)j=a-d,k=d%4?e[j]:e[j-4],c[d]=4>d||4>=j?k:b[l[k>>>24]]^x[l[k>>>16&255]]^q[l[k>>>
	8&255]]^n[l[k&255]]},encryptBlock:function(a,b){this._doCryptBlock(a,b,this._keySchedule,t,r,w,v,l)},decryptBlock:function(a,c){var d=a[c+1];a[c+1]=a[c+3];a[c+3]=d;this._doCryptBlock(a,c,this._invKeySchedule,b,x,q,n,s);d=a[c+1];a[c+1]=a[c+3];a[c+3]=d},_doCryptBlock:function(a,b,c,d,e,j,l,f){for(var m=this._nRounds,g=a[b]^c[0],h=a[b+1]^c[1],k=a[b+2]^c[2],n=a[b+3]^c[3],p=4,r=1;r<m;r++)var q=d[g>>>24]^e[h>>>16&255]^j[k>>>8&255]^l[n&255]^c[p++],s=d[h>>>24]^e[k>>>16&255]^j[n>>>8&255]^l[g&255]^c[p++],t=
	d[k>>>24]^e[n>>>16&255]^j[g>>>8&255]^l[h&255]^c[p++],n=d[n>>>24]^e[g>>>16&255]^j[h>>>8&255]^l[k&255]^c[p++],g=q,h=s,k=t;q=(f[g>>>24]<<24|f[h>>>16&255]<<16|f[k>>>8&255]<<8|f[n&255])^c[p++];s=(f[h>>>24]<<24|f[k>>>16&255]<<16|f[n>>>8&255]<<8|f[g&255])^c[p++];t=(f[k>>>24]<<24|f[n>>>16&255]<<16|f[g>>>8&255]<<8|f[h&255])^c[p++];n=(f[n>>>24]<<24|f[g>>>16&255]<<16|f[h>>>8&255]<<8|f[k&255])^c[p++];a[b]=q;a[b+1]=s;a[b+2]=t;a[b+3]=n},keySize:8});u.AES=p._createHelper(d)})();


	/*
	CryptoJS v3.1.2
	code.google.com/p/crypto-js
	(c) 2009-2013 by Jeff Mott. All rights reserved.
	code.google.com/p/crypto-js/wiki/License
	*/
	(function(){var h=CryptoJS,j=h.lib.WordArray;h.enc.Base64={stringify:function(b){var e=b.words,f=b.sigBytes,c=this._map;b.clamp();b=[];for(var a=0;a<f;a+=3)for(var d=(e[a>>>2]>>>24-8*(a%4)&255)<<16|(e[a+1>>>2]>>>24-8*((a+1)%4)&255)<<8|e[a+2>>>2]>>>24-8*((a+2)%4)&255,g=0;4>g&&a+0.75*g<f;g++)b.push(c.charAt(d>>>6*(3-g)&63));if(e=c.charAt(64))for(;b.length%4;)b.push(e);return b.join("")},parse:function(b){var e=b.length,f=this._map,c=f.charAt(64);c&&(c=b.indexOf(c),-1!=c&&(e=c));for(var c=[],a=0,d=0;d<
	e;d++)if(d%4){var g=f.indexOf(b.charAt(d-1))<<2*(d%4),h=f.indexOf(b.charAt(d))>>>6-2*(d%4);c[a>>>2]|=(g|h)<<24-8*(a%4);a++}return j.create(c,a)},_map:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="}})();

	// ====================== End of CryptoJS - AES component ==========================
	// Our own worker

	// seperator file dataURL with this string. Need to be long and semantic enough.
	// Or, this can be some character which is not included in Base64 index table. 
	// Such as '?', '!', ....
	// Must be synchronized with the same variable in consts-and-funcs.js
	var STR_SEPERATOR = 'ngocdon';

	onmessage = function (msg) {
		if (msg.data.type == 'encrypt'){
			var files = msg.data.files;
			var encrypted = '';
			var noOfEncryptedFiles = 0;
			var filenames = '';

			// FireFox does not support FileReader in Web Worker.
			// Btw, Encrypting multiple files using Async is too complicated. => use FileReaderSync.

			// if (typeof(FileReader) !== 'undefined'){
			// 	// var encrypted = '';
			// 	var reader = [];
			// 	for (var i = 0; i < files.length; i++) {
			// 		file = files[i];
			// 		reader.push(new FileReader());
			// 		reader[i].onload = function (evt) {
			// 			if (i < files.length - 1){
			// 				// encrypted += CryptoJS.AES.encrypt(evt.target.result, msg.data.key).toString() + STR_SEPERATOR;
							
			// 			}
			// 			else{
			// 				// encrypted += CryptoJS.AES.encrypt(evt.target.result, msg.data.key).toString();
			// 				encrypted += i;
			// 				noOfEncryptedFiles++;
			// 				if (noOfEncryptedFiles == files.length){
			// 					postMessage({
			// 						cipher: encrypted,
			// 						browser: 'Async'
			// 					});
			// 				}
			// 			}
			// 		}
			// 		reader[i].readAsDataURL(file);
			// 	}
			// }
			// else{
				// var encrypted = '';
				for (var i = 0; i < files.length; i++) {
					file = files[i];
					var reader = new FileReaderSync();
					var dataURL = reader.readAsDataURL(file);
					if (i < files.length - 1){
						// encrypted += i + STR_SEPERATOR;
						encrypted += CryptoJS.AES.encrypt(dataURL, msg.data.key).toString() + STR_SEPERATOR;
						filenames += file.name + STR_SEPERATOR;
					}
					else{
						encrypted += CryptoJS.AES.encrypt(dataURL, msg.data.key).toString();
						filenames += file.name;
					}
					// noOfEncryptedFiles++;
				}
				var data = filenames + '?' + encrypted;
				postMessage({
					cipher: encrypted,
					filenames: filenames,
					data: data,
					browser: 'Sync'
				});
			// }
		}
		else if (msg.data.type = 'decrypt'){
			var key = msg.data.key;
			var file = msg.data.file;
			var reader = new FileReaderSync();
			var data = reader.readAsText(file);
			var ciphers = data.split('?')[1];
			var filenames = data.split('?')[0];
			var arrCipher = ciphers.split(STR_SEPERATOR);
			var dataURL = [];
			for (var i = 0; i < arrCipher.length; i++) {
				cipher = arrCipher[i];
				var decrypted = CryptoJS.AES.decrypt(cipher, key).toString(CryptoJS.enc.Utf8);
				dataURL.push(decrypted);
			}
			postMessage({
				dataURL: dataURL,
				filenames: filenames
			});
		}
	}
`;

// ========== End of workerString ==========

// Inject worker to Gmail source.
var workerTag = document.createElement('script');
workerTag.id = 'inlineWorker';
workerTag.setAttribute('type', 'javascript/worker');

workerTag.innerHTML = workerString;
document.getElementsByTagName('head')[0].appendChild(workerTag);