const btc = require('bitcoinjs-lib')
const bitcoinMessage = require('bitcoinjs-message')
const Cache = require('map-expire')
const EXPIRATION_TIME = 300 * 1000

module.exports = class Validator {

	constructor() {
		this.pendingRequests = new Cache()
	}

	startValidation(address) {
		let valid = this.validate(address, btc.networks.mainnet) || this.validate(address, btc.networks.testnet);
		if (valid) {
			let now = new Date();
			this.pendingRequests.set(address, {timestamp: now}, EXPIRATION_TIME)
			return {
				address: address,
				requestTimeStamp: now.getTime(),
				message: Validator.message(address, now),
				validationWindow: (EXPIRATION_TIME / 1000) | 0
			}
		}
		throw 'not a valid bitcoin address'
	}

	verifySignature(address, signature) {
		const theprocess = this.pendingRequests.get(address)
		if (theprocess) {
			const timestamp = theprocess.timestamp
			const themessage = (Validator.message(address, timestamp))
			if (bitcoinMessage.verify(themessage, address, signature)) {
				const timeleft = EXPIRATION_TIME - (new Date().getTime() - timestamp.getTime())
				this.pendingRequests.set(address, {timestamp:timestamp, verified: true}, timeleft)
				return {
					registerStar : true,
					status : {
						address : address,
						requestTimeStamp : timestamp.getTime(),
						message : themessage,
						validationWindow : (timeleft / 1000) | 0,
						messageSignature : 'valid'
					}
				}
			}
			throw 'signature is invalid'
		}
		throw 'please initate address validation first'
	}

	checkAddressVerified(address) {
		const theprocess = this.pendingRequests.get(address)
		if (theprocess && theprocess.verified){
			return true
		}
		throw 'please initate address validation first'
	}

	static message(address, timestamp) {
		return `${address}:${timestamp.getTime()}:starRegistry`
	}

	validate(address, network) {
		try {
			btc.address.toOutputScript(address, network)
			return true
		} catch (e) {
			return false
		}
	}

}