const btc = require('bitcoinjs-lib')
const bitcoinMessage = require('bitcoinjs-message')
const level = require('level');
const EXPIRATION_TIME = 300 * 1000

module.exports = class Validator {

	constructor(validatorfile) {
		this.pendingRequests = level(validatorfile || 'validation-requests')
	}

	async close() {
		await this.pendingRequests.close()
	}

	removeVerification(address) {
		return this.pendingRequests.del(address)
	}

	startValidation(address) {
		return new Promise((resolve, reject) => {
			let valid = this.validate(address, btc.networks.mainnet) || this.validate(address, btc.networks.testnet);
			if (valid) {
				let now = new Date();
				resolve(this.pendingRequests.put(address, new AddressRegistration(now, false).json())
					.then(result => {
						return {
							address: address,
							requestTimeStamp: now.getTime(),
							message: Validator.message(address, now),
							validationWindow: (EXPIRATION_TIME / 1000) | 0
						}
					}))
			} else {
				reject('not a valid bitcoin address')
			}
		})
	}

	verifySignature(address, signature) {
		return this.pendingRequests.get(address).then(theprocess => {
			theprocess = AddressRegistration.of(theprocess)
			const timestamp = theprocess.timestamp
			const timeleft = EXPIRATION_TIME - (new Date().getTime() - timestamp.getTime())
			if (timeleft <= 0) {
				throw 'your registration request has expired'
			}
			const themessage = (Validator.message(address, timestamp))
			if (bitcoinMessage.verify(themessage, address, signature)) {
				return this.pendingRequests.put(address, new AddressRegistration(timestamp, true).json()).then(() => {
					return {
						registerStar: true,
						status: {
							address: address,
							requestTimeStamp: timestamp.getTime(),
							message: themessage,
							validationWindow: (timeleft / 1000) | 0,
							messageSignature: 'valid'
						}
					}
				})
			}
			throw 'signature is invalid'
		}, error => {
			throw 'please initiate address validation first'
		})
	}

	checkAddressVerified(address) {
		return new Promise((resolve, reject) => {
			if (address) {
				resolve(this.pendingRequests.get(address).then(theprocess => {
					return AddressRegistration.of(theprocess).verified
				}, error => {
					throw 'please initiate address validation first'
				}))
			} else {
				reject('please specify address for validation')
			}
		})
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

class AddressRegistration {

	constructor(timestamp, verified) {
		this.timestamp = timestamp
		this.verified = verified
	}

	static of (json) {
		const {
			timestamp,
			verified
		} = JSON.parse(json)
		return new AddressRegistration(new Date(timestamp), verified)
	}

	json() {
		return JSON.stringify(this)
	}

}