const Db = require('./levelservice.js');
const Blockchain = require('./chain.js');
const Block = require('./block.js');
const WebAPI = require('./webapi.js');
const fs = require('fs-extra');

var chai = require('chai'),
	matcher = require('chai-match-pattern'),
	promises = require('chai-as-promised'),
	http = require('chai-http');
var expect = chai.expect;
chai.use(http, promises, matcher);

let db = new Db('./apitestchain');
let blockchain = new Blockchain(db);
	
describe('WEB API', async () => {
	let server = new WebAPI(blockchain);
	const address = 'http://localhost:8888';
	before(async () => {
		server = await blockchain.genesis.then(async () => {
			let s = new WebAPI(blockchain);
			await s.start('localhost', 8888);
			return s;
		});
	});
	after(() => {
		server.close();
		db.close();
		fs.removeSync('./apitestchain');		
	});


	it('should return a block when it exsts', done => {
		chai.request(address).get('/block/0')
			.end((error, res) => {
				expect(error).to.be.null;
				console.log(res.text);
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
		chai.request(address).get('/block/100500')
			.end((error, res) => {
				expect(JSON.parse(res.text)).to.matchPattern(`{error:'enter the valid block height'}`)
				expect(res).to.have.status(404);
				done();
			});
	})
	
	it('should accept a new block', done => {
		chai.request(address).post('/block').send({body:'some new data block'})
			.end((error, res) => {
				expect(Block.of(res.text)).to.matchPattern(`{
					body: 'some new data block',
					previousBlockHash: /[a-z0-9]{64}/,
					height: 1,
					hash: /[a-z0-9]{64}/,
					time: /\\d+/
					}`);
				done()
			})
	})
	it('should not accept an empty block', done => {
		chai.request(address).post('/block').send({body:''})
			.end((error, res) => {
				expect(JSON.parse(res.text)).to.matchPattern(`{error:'please provide a body'}`);
				expect(res).to.have.status(500)
				done()
			})
	})
})