importScripts("/cryptico/jsbn.js");
importScripts("/cryptico/random.js");
importScripts("/cryptico/hash.js");
importScripts("/cryptico/rsa.js");
importScripts("/cryptico/aes.js");
importScripts("/cryptico/api.js");

importScripts("/crypto-js/build/rollups/md5.js");
importScripts('/crypto-js/build/rollups/aes.js');
importScripts('/crypto-js/build/components/enc-base64-min.js');

importScripts('/src/consts-and-funcs.js');

onmessage = function (msg) {
	var key = generateRSAKey(msg.data.main.email, msg.data.main.seed, msg.data.main.passphrase, msg.data.main.bitLen);

	var info = {
		isLoggedIn: 1,
		email: msg.data.main.email,
		publicKey: key.public,
		encryptedPrivateKey: key.private
	}

	if (typeof(msg.data.tmp) == 'object'){

		// server generates RSA key with 2048 bitlen.
		// regenerate it here.
		var initRSAKey = generateRSAKey(msg.data.tmp.email, msg.data.tmp.seed, msg.data.tmp.passphrase, msg.data.tmp.bitLen);
		info.tmpPublicKey = initRSAKey.public;
		info.encryptedTmpPrivateKey = initRSAKey.private;
	}

	console.log(info);
	postMessage(info)
}