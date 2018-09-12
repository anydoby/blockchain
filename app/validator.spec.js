const Validator = require('./validator.js')
const btc = require('bitcoinjs-lib')
const bitcoinMessage = require('bitcoinjs-message')
const fs = require('fs-extra')

var chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-match-pattern'), require('chai-as-promised'))

const createBtcWallet = function() {
	const rng = () => Buffer.from('zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz')
	const keyPair = btc.ECPair.makeRandom({
		rng: rng
	})
	const {
		address
	} = btc.payments.p2pkh({
		pubkey: keyPair.publicKey
	})
	return {
		address: address,
		keyPair: keyPair
	}
}

const {
	address,
	keyPair
} = createBtcWallet()

sleep = function(ms) {
	return new Promise(resolve => setTimeout(resolve, ms))
}

describe('Validator', function() {
	this.timeout(5000)
	let sut;
	beforeEach(() => {
		sut = new Validator()
		sut.cleanup = async function() {
			await sut.close().then(() => fs.removeSync('./validation-requests'))
		}
	})
	afterEach(() => sut.cleanup())

	it('should validate correct addresses', () => {
		expect(sut.validate('mgqs2pmefF6H7MeNXxC7E6FJC1dyodU8hM', btc.networks.testnet)).to.be.true;
		expect(sut.validate('1L7Xp9xyRYwxebtQUetzVM8wg3DekhCq3k', btc.networks.mainnet)).to.be.true;
	})

	it('should add valid address to the temp queue', async () => {
		const {
			requestTimeStamp
		} = await sut.startValidation(address)
		expect(requestTimeStamp).to.be.at.most(new Date().getTime())
	})

	it('should not add an invalid address', () => {
		return expect(sut.startValidation('somerubbish')).to.be.rejectedWith('not a valid bitcoin address')
	})

	it('should return message for signing after address validation', async () => {
		const response = await sut.startValidation(address)
		expect(response.address).to.be.equal(address)
		expect(response.message).to.be.equal(`${address}:${response.requestTimeStamp}:starRegistry`)
	})

	it('should not verify address if startValidation was not called', async () => {
		return expect(sut.verifySignature('1L7Xp9xyRYwxebtQUetzVM8wg3DekhCq3k', 'somesignature'))
			.to.be.rejectedWith('please initiate address validation first')
	})

	it('should return message for signing after address validation', async () => {
		const {
			message
		} = await sut.startValidation(address)
		return expect(sut.verifySignature(address, 'fakesignature' + message)).to.be.rejectedWith('Invalid signature length')
	})

	it('should accept a valid signature', async () => {
		const {
			message,
			requestTimeStamp
		} = await sut.startValidation(address)

		await sleep(3000)

		var signature = bitcoinMessage.sign(message, keyPair.privateKey, keyPair.compressed)
		return expect(sut.verifySignature(address, signature.toString('base64'))).to.eventually.
		matchPattern(`{
					registerStar: true,
					status: {
						address: '${address}',
						requestTimeStamp: ${requestTimeStamp},
						message: '${message}',
						validationWindow: 296,
						messageSignature: 'valid'
					}
				}`)
	})
})

module.exports = createBtcWallet