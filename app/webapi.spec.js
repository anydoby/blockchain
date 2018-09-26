const Db = require('./levelservice.js');
const Blockchain = require('./chain.js');
const Block = require('./block.js');
const WebAPI = require('./webapi.js');
const fs = require('fs-extra');
const {
	address,
	keyPair
} = require('./validator.spec.js')()
const bitcoinMessage = require('bitcoinjs-message')

var chai = require('chai'),
	matcher = require('chai-match-pattern'),
	promises = require('chai-as-promised'),
	http = require('chai-http');
var expect = chai.expect;
chai.use(http, promises, matcher);

let db = new Db('./apitestchain');
let blockchain = new Blockchain(db);
const service = 'http://localhost:8888';

login = function() {
	return chai.request(service).post('/requestValidation').send({
			address
		})
		.then(res => {
			const {
				message
			} = JSON.parse(res.text)
			const signature = bitcoinMessage.sign(`${message}`, keyPair.privateKey, keyPair.compressed)
			return chai.request(service).post('/message-signature/validate').send({
				address,
				signature
			})
		})
}

generateTestStar = async function() {
	return login()
		.then(res => {
			return chai.request(service).post('/block').send({
				address,
				star: {
					dec: "-27° 29' 24.9",
					ra: "17h 29m 1.0s",
					story: 'another star story'
				}
			})
		})
		.then(res => {
			let b = JSON.parse(res.text)
			b.body.star.storyDecoded = new Buffer(b.body.star.story, 'hex').toString()
			return b
		})
}

describe('WEB API', async () => {
	let server = {}
	before(async () => {
		server = await blockchain.genesis.then(async () => {
			let s = new WebAPI(blockchain)
			await s.start('localhost', 8888)
			return s
		})
	})
	after(async () => {
		await server.close()
		db.close()
		fs.removeSync('./apitestchain')
		fs.removeSync('./validation-requests')
	})


	it('should return a block when it exsts', done => {
		chai.request(service).get('/block/0')
			.end((error, res) => {
				expect(error).to.be.null;
				expect(Block.of(res.text)).to.matchPattern(`{
					body: 'first block',
					previousBlockHash: '',
					height: 0,
					hash: /[a-z0-9]{64}/,
					time: /\\d+/
					}`);
				done();
			});
	})

	it('should return an error if block is missing', done => {
		chai.request(service).get('/block/100500')
			.end((error, res) => {
				expect(JSON.parse(res.text)).to.matchPattern(`{
					message : 'enter a valid block height',
					statusCode : 400,
					error : 'Bad Request'
				}`)
				done();
			});
	})

	it('should not accept a new block without validation', done => {
		chai.request(service).post('/block').send({
				body: 'some new data block'
			})
			.end((error, res) => {
				expect(JSON.parse(res.text)).to.matchPattern(`{
					message : 'please specify address for validation',
					statusCode : 400,
					error : 'Bad Request'
				}`)
				done()
			})
	})
	it('should accept good address for requestValidation', done => {
		chai.request(service).post('/requestValidation').send({
				address: '142BDCeSGbXjWKaAnYXbMpZ6sbrSAo3DpZ'
			})
			.end((error, res) => {
				expect(JSON.parse(res.text)).to.matchPattern(`{
					address : '142BDCeSGbXjWKaAnYXbMpZ6sbrSAo3DpZ',
					requestTimeStamp : /\\d+/,
					message : /142BDCeSGbXjWKaAnYXbMpZ6sbrSAo3DpZ\\:\\d+\\:starRegistry/,
					validationWindow : 300
				}`)
				done()
			})
	})

	it('should return an error if address for requestValidation is wrong', done => {
		chai.request(service).post('/requestValidation').send({
				address: '142BDCeSGbXjWKaAnYXbMpZ6sbrSAo3Dp'
			})
			.end((error, res) => {
				expect(JSON.parse(res.text)).to.matchPattern(`{
					message : 'not a valid bitcoin address',
					statusCode : 400,
					error : 'Bad Request'
				}`)
				done()
			})

	})

	it('should not verify a signature without first calling requestValidation', done => {
		const signature = bitcoinMessage.sign(`${address}:${new Date().getTime()}:starRegistry`, keyPair.privateKey, keyPair.compressed)
		chai.request(service).post('/message-signature/validate').send({
				address,
				signature
			})
			.end((error, res) => {
				expect(JSON.parse(res.text)).to.matchPattern(`{
					message : 'please initiate address validation first',
					statusCode : 400,
					error : 'Bad Request'
				}`)
				done()
			})
	})


	it('should verify a proper signature', done => {
		chai.request(service).post('/requestValidation').send({
				address
			})
			.end((error, res) => {
				const {
					message
				} = JSON.parse(res.text)
				const signature = bitcoinMessage.sign(`${message}`, keyPair.privateKey, keyPair.compressed)
				chai.request(service).post('/message-signature/validate').send({
						address,
						signature
					})
					.end((error, res) => {
						expect(JSON.parse(res.text).status.messageSignature).to.equal('valid')
						done()
					})

			})
	})

	it('should not register a star unless address is verified', done => {
		chai.request(service).post('/requestValidation').send({
				address
			})
			.end((error, res) => {
				const {
					message
				} = JSON.parse(res.text)

				chai.request(service).post('/block').send({
					address,
					star: {
						dec: "-36° 29' 24.9",
						ra: "16h 29m 1.0s",
						story: 'some star story'
					}
				}).end((error, res) => {
					expect(res).to.have.status(400)
					done()
				})

			})

	})

	describe('after address verification', () => {
		let block = {};
		beforeEach(async () => {
			block = await generateTestStar()
		})

		it('star should be registered ok', done => {
			login().then(() => {
				chai.request(service).post('/block').send({
					address,
					star: {
						dec: "-26° 29' 24.9",
						ra: "16h 29m 1.0s",
						story: 'some star story'
					}
				}).end((error, res) => {
					expect(res).to.have.status(200)
					const block = JSON.parse(res.text)
					expect(block.height).to.be.at.least(2)
					expect(block.body.address).to.equal(address)
					expect(block.body.star.ra).to.equal("16h 29m 1.0s")
					expect(block.body.star.dec).to.equal("-26° 29' 24.9")
					expect(new Buffer(block.body.star.story, 'hex').toString()).to.equal("some star story")
					done()
				})
			})
		})

		it('and star addition you must verify address again', done => {
			// register a star
			login().then(() => {
				chai.request(service).post('/block').send({
					address,
					star: {
						dec: "-46° 29' 24.9",
						ra: "16h 29m 1.0s",
						story: 'some star story'
					}
				}).end((error, res) => {
					expect(res).to.have.status(200)
					chai.request(service).post('/block').send({
						address,
						star: {
							dec: "-56° 29' 24.9",
							ra: "16h 29m 1.0s",
							story: 'some other star story'
						}
					}).end((error, res) => {
						expect(JSON.parse(res.text)).to.matchPattern(`{
								message : 'please initiate address validation first',
								statusCode : 400,
								error : 'Bad Request'
							}`)
						done()
					})
				})
			})
		})

		it('invalid star should not be registered', done => {
			chai.request(service).post('/block').send({
				address,
				star: {
					dec: "-26 29' 24.9",
					ra: "16h 29m 1.0s",
					story: 'some star story'
				}
			}).end((error, res) => {
				expect(res).to.have.status(400)
				done()
			})
		})
	})

	describe('search', async () => {
		let block = {};
		beforeEach(async () => {
			block = await generateTestStar()
		})

		it('should find block by wallet address', done => {
			chai.request(service).get(`/stars/address:${address}`).end((error, res) => {
				expect(JSON.parse(res.text).length).to.be.above(2)
				expect(JSON.parse(res.text).find(b => b.hash == block.hash)).to.matchPattern(block)
				done()
			})
		})

		it('should not find anything for non-existing address', done => {
			chai.request(service).get(`/stars/address:${address}hello`).end((error, res) => {
				expect(JSON.parse(res.text)).to.have.length(0)
				done()
			})
		})

		it('should find block by hash', done => {
			chai.request(service).get(`/stars/hash:${block.hash}`).end((error, res) => {
				expect(JSON.parse(res.text)).to.matchPattern(block)
				done()
			})
		})

		it('should return block by height', done => {
			chai.request(service).get(`/block/${block.height}`).end((error, res) => {
				expect(JSON.parse(res.text)).to.matchPattern(block)
				done()
			})
		})

		it('should not find anything for non-existing hash', done => {
			chai.request(service).get(`/stars/hash:${block.hash.replace(/\d/g, 'd')}`).end((error, res) => {
				expect(res).to.have.status(404)
				done()
			})
		})
	})
})