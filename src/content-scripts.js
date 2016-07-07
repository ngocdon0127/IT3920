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

// button to render extension frame
var e = document.createElement('div');
e.innerHTML = 'Encrypt';
e.id = 'eframe-cryptojs';
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
						var btn = document.createElement('input');
						btn.setAttribute('type', 'button');
						btn.setAttribute('value', 'Decrypt this email');
						btn.setAttribute('btnClass', 'btnDecrypt');
						btn.setAttribute('class', 'contentBtnDecrypt');
						var cipher = findPre(divs[i]).innerHTML.replace(/[<][^>]*[>]/g, '')
						btn.setAttribute('cipher', cipher);
						btn.addEventListener('click', sendCipherToDecryptFrame.bind(this, cipher));
						// console.log(cipher);
						divs[i].children[0].children[0].appendChild(btn);
						// console.log('added');
					}
					else{
						// console.log('exist, d\' add');
					}
				}
			}
		}, 1000)
	}, 2000)
}

/**
 * Send cipher to decrypt-frame
 */
function sendCipherToDecryptFrame (cipher) {
	// console.log(cipher);
	chrome.runtime.sendMessage({actionType: 'decrypt-email', cipher: cipher}, function (response) {
		// console.log(response);
	})
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
	var data = {};
	if (!user.hasOwnProperty('userId')){
		alert("login first.");
		return;
	}
	data['requestUser'] = {
		userId: user.userId,
		password: user.hashedPassword
	};
	var users = [];
	for (var i = 0; i < recipients.length; i++) {
		users.push({'email': recipients[i]});
	}
	data['requestedUsers'] = users;
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
					e.setAttribute('class', 'wG J-Z-I btn btn-primary');
					div.appendChild(e);
					var atms = document.getElementsByClassName('wG J-Z-I')[0];
					atms = $(atms).clone();
					$(atms).prop('id', 'e2eesa');
					$(atms).appendTo(div);

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
		ee(recipient, plainText, flags);
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