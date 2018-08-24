const Blockchain = require('./chain.js');
var chai = require('chai');
const expect = chai.expect;
matcher = require('chai-match-pattern');
chai.use(matcher, require('chai-as-promised'));
var _ = matcher.getLodashModule();
const Db = require('./levelservice.js');
const Block = require('./block.js');
const fs = require('fs-extra');

describe('Blockchain', ()=> {
	let sut = {};
	beforeEach(()=> {
		console.log('creating test blockchain');
		sut = new Blockchain(new Db('testchain'));
		sut.close = function() {
			console.log('closing test blockchain');
			this.db.close();
			fs.removeSync('testchain');		
		}
	});
	afterEach(()=> {sut.close()});
	after(()=> {sut.close()});


	it('should create a genesis block on creation', ()=> {
		return expect(sut.genesis).to.eventually.matchPattern(`{
			body: 'first block',
			previousBlockHash: '',
			height: 1,
			hash: /[a-z0-9]{64}/,
			time: /\\d+/
			}`
		);
	})

	it('should set previousBlockHash to new block', async ()=> {
		let genesisBlock = await sut.genesis;
		let nextBlock1 = new Block('next block');
		
		let result = sut.addBlock(nextBlock1);

		return expect(result).to.eventually.matchPattern(`{
			body: 'next block',
			previousBlockHash: '`+genesisBlock.hash+`',
			height: 2,
			hash: /[a-z0-9]{64}/,
			time: _.isBetween|`+(genesisBlock.time-1)+`|9999999999,
			}`
		);
	})

	it('should be valid after inserting several blocks', ()=> {
		let validation = sut.addBlock(new Block('second block')).then(()=>{
			return sut.addBlock(new Block('third block'));
		}).then(()=>{
			return sut.addBlock(new Block('fourth block'));
		}).then(()=> {
			return sut.validate();
		});

		return expect(validation).to.eventually.be.true;
	});

	it('should not be valid if previousBlockHash was tampered with', ()=> {
		let validation = sut.addBlock(new Block('second block')).then((storedBlock)=>{
			storedBlock.previousBlockHash = '39c5e5cd5a04274c56e3773d1cf316157bf1bbdff43390c03410e3295541f248';
			return sut.db.store.put(Block.leftPad(storedBlock.height), JSON.stringify(storedBlock));
		}).then(()=>{
			return sut.validate()
		});

		return expect(validation).to.eventually.be.rejectedWith('Block is invalid: 2');
	});

	it('should not be valid if data was tampered with', ()=> {
		let validation = sut.addBlock(new Block('second block')).then((storedBlock)=>{
			storedBlock.body = 'slightly different second block';
			return sut.db.store.put(Block.leftPad(storedBlock.height), JSON.stringify(storedBlock));
		}).then(()=>{
			return sut.validate()
		});

		return expect(validation).to.eventually.be.rejectedWith('Block is invalid: 2');
	});

	it('should validate values in alphabetic order', ()=> {
		let lastBlock = {};
		for (i = 0; i < 20; i++) {
			lastBlock = sut.addBlock(new Block('block ' + i));
		}
		let validation = lastBlock.then(()=>{return sut.validate()});
		return expect(validation).to.eventually.be.true;
	});
});