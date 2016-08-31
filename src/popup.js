// connect to background page
var port = chrome.runtime.connect({name: "get-login-status"});

// send message to get login status
port.postMessage({
	name: 'get-login-status'
});

// receive login status
port.onMessage.addListener(function (msg) {
	console.log(msg);
	if (msg.name === 'login-status'){
		if (msg.isLoggedIn == 1){
			// alert('ok');
			replaceLoginForm(msg.email);
		}
		else{
			if (!msg.email){
				ob('a-register').click();
			}
			if (msg.status.localeCompare('registered') === 0){
				ob('a-active').click();
				ob('active-email').value = msg.email;
			}
			else if (msg.status.localeCompare('activated') === 0){
				ob('a-login').click();
				ob('email').value = msg.email;
			}
		}
	}
});

ob('btnLogIn').addEventListener('click', BUTTON_LOADING);
$('#btnLogIn').on('click', function () {
	var email = $('#email').val();
	var password = $('#password').val();
	var hashedPassword = CryptoJS.MD5(password).toString(CryptoJS.enc.Base16);

	// connect to server to check infomation
	var data = {
		'email': email,
		'password': hashedPassword
	}
	$.ajax({ 
		url: SERVER + SERVER_PORT + '/E2EE/user/verify', 
		type: 'POST', 
		dataType: 'json', 
		data: JSON.stringify(data),
		beforeSend: function(xhr) {
			xhr.setRequestHeader("Accept", "application/json");
			xhr.setRequestHeader("Content-Type", "application/json");
			console.log(data);
			console.log(JSON.stringify(data));
		},
		success: function(data) { 
			// alert("success");
			console.log(data);
			// return;
			if (data.message.localeCompare('OK') != 0){
				console.log(data.message);
				alert(data.message);
				ob('btnLogIn').classList.remove('loading');
				ob('btnLogIn').removeAttribute('disabled');
				return;
			}
			// alert(JSON.stringify(data));

			// Generate key in background

			if (typeof(Worker) !== 'undefined'){
				// Generate but do not save :v
				var keyWorker = new Worker('key-worker.js');
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
					var dataToSave = {info: {email: email, isLoggedIn: 1}};
					STORAGE_AREA.set(dataToSave, function () {
						if (typeof(chrome.runtime.lastError) !== 'undefined'){
							// alert("Could not save login info to chrome.");
							return;
						}
						else{
							// alert("Save user info successfully.");
							return;
						}
					})
					replaceLoginForm(email);
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
				// alert("OK generate key directly")

				STORAGE_AREA.set({info: {email: email, isLoggedIn: 1}}, function () {
					if (typeof(chrome.runtime.lastError) !== 'undefined'){
						// alert("Could not save login info to chrome.");
						return;
					}
					else{
						// alert("Save user info successfully.");
						return;
					}
				})
				replaceLoginForm(email);
			}
		},
		error:function(data,status,er) { 
			alert("error");
			console.log(data);
			// user = {};
		}
	});
});

function replaceLoginForm (email) {
	ob('home').innerHTML = "<h2>" + email + "</h2>";
	var btn = document.createElement('button');
	$(btn).addClass('btn btn-primary');
	$(btn).text('Log out');
	$(btn).on('click', function () {
		STORAGE_AREA.set({info: {email: email, isLoggedIn: 0, status: 'activated'}}, function () {
			setTimeout(function () {
				window.close();
			}, 500)
		})
	});
	ob('home').appendChild(btn);
}

ob('btnReg').addEventListener('click', BUTTON_LOADING);
$('#btnReg').on('click', function () {

	// Email is used to seed random in cryptico library by this statement:
	// Math.seedrandom(sha256.hex(email));
	var email = ob('reg-email').value.trim();
	if (email.length < 1){
		alert('Email must not be null.');
		ob('btnReg').classList.remove('loading');
		ob('btnReg').removeAttribute('disabled');
		return;
	}

	// check if email is valid or not.
	var emailRegex = /.+@.+\..+/;
	if (emailRegex.test(email) == false){
		alert('Invalid email.');
		ob('btnReg').classList.remove('loading');
		ob('btnReg').removeAttribute('disabled');
		return;
	}

	var password = ob('reg-password').value;
	if ((password.length < 10) || (password.length > 16)){
		alert('Passphrase must be longer than 9 characters and shorter than 17 characters.');
		ob('btnReg').classList.remove('loading');
		ob('btnReg').removeAttribute('disabled');
		return;
	}

	if (password !== ob('reg-password-repeat').value){
		alert('Password not match.');
		ob('btnReg').classList.remove('loading');
		ob('btnReg').removeAttribute('disabled');
		return;
	}

	var hashedPassword = CryptoJS.MD5(password).toString(CryptoJS.enc.Base16);

	var data = {
		"email": email,
		"password": hashedPassword,
	}

	console.log(data);
	
	$.ajax({ 
		url: SERVER + SERVER_PORT + '/E2EE/user/register', 
		type: 'POST', 
		dataType: 'json', 
		data: JSON.stringify(data),
		beforeSend: function(xhr) {
			xhr.setRequestHeader("Accept", "application/json");
			xhr.setRequestHeader("Content-Type", "application/json");
			console.log(data);
			console.log(JSON.stringify(data));
		},
		success: function(data) {
			if (data.message.localeCompare('Congratulation, your registration is success') === 0){
				alert("Register Successfully. Check your inbox to get Active ID");
				STORAGE_AREA.set({info: {email: email, isLoggedIn: 0, status: 'registered'}}, function () {
					ob('a-active').click();
					ob('active-email').value = email;
				})
			}
			else {
				alert(data.message);
			}
			// alert("Register Successfully. Check your inbox to get Active ID");
			console.log(data);
			ob('btnReg').classList.remove('loading');
			ob('btnReg').removeAttribute('disabled');
			return false;
		},
		error:function(data,status,er) {
			console.log(data);
			alert("Something went wrong. Try again later.");
		}
	});
});

ob('btnActive').addEventListener('click', BUTTON_LOADING);
$('#btnActive').on('click', function () {
	var email = $('#active-email').val();
	var password = $('#active-password').val();
	var hashedPassword = CryptoJS.MD5(password).toString(CryptoJS.enc.Base16);
	var activeId = $('#active-id').val();
	var key = generateRSAKey(email, CryptoJS.MD5(email + password).toString(CryptoJS.enc.Base16), hashedPassword, 1024);
	var data = {
		email: email,
		password: hashedPassword,
		activeId: activeId,
		mainPublicKey: key.public
	}
	console.log(data);
	$.ajax({ 
		url: SERVER + SERVER_PORT + '/E2EE/user/active', 
		type: 'POST', 
		dataType: 'json', 
		data: JSON.stringify(data),
		beforeSend: function(xhr) {
			xhr.setRequestHeader("Accept", "application/json");
			xhr.setRequestHeader("Content-Type", "application/json");
		},
		success: function(data) {
			alert(data.message);
			console.log(data);
			console.log("success"); // Act here
			if (data.message.localeCompare('Congratulation, your account is activated') === 0) {
				STORAGE_AREA.set({info: {email: email, isLoggedIn: 0, status: 'activated'}}, function () {
					// don't care
				})
				ob('a-login').click();
				ob('email').value = email;
			}
			ob('btnActive').classList.remove('loading');
			ob('btnActive').removeAttribute('disabled');
			return false;
		},
		error:function(data,status,er) { 
			console.log(data);
			alert(JSON.stringify(data));
			console.log("error");
			ob('btnActive').classList.remove('loading');
			ob('btnActive').removeAttribute('disabled');
		}
	});
})