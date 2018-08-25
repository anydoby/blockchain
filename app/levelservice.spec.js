var chai = require('chai');
var expect = chai.expect;
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const Db = require('./levelservice.js');
const Block = require('./block.js');
const fs = require('fs-extra')

describe('Writing/reading to/from DB', ()=> {
	let sut = {};
	beforeEach(()=>{
		console.log('creating test db');
		sut = new Db('testchain');
		sut.close = function() {
			console.log('closing test db');
			this.store.close();
			fs.removeSync('testchain');		
		};
	});
	afterEach(()=>{sut.close()});
	after(()=>{sut.close()});

	let b = new Block('test data', 123);
	it('addBlock() should write a block by id', ()=>{
		return sut.addBlock(b).then(()=> {
			sut.getBlock(b.height).then((rs)=> {
				console.log('got result ' + JSON.stringify(rs));
			});
			return expect(sut.getBlock(123)).to.eventually.deep.equal(b);
		});
	});

	it('addBlock() should not overrwrite an existing block', ()=> {
		return sut.addBlock(b).then(()=>{
			return sut.addBlock(new Block('another data', 123));
		}).then(()=> {
			sut.getBlock(b.height).then((rs)=> {
				console.log('got result ' + JSON.stringify(rs));
			});
			return expect(sut.getBlock(123)).to.eventually.deep.equal(b);
		});
	});

	it('should get the top block', ()=> {
		return sut.addBlock(new Block('a', 1))
		.then(()=>{return sut.addBlock(new Block('b', 2));})
		.then(()=>{return sut.addBlock(new Block('c', 3));})
		.then(()=> {
			return expect(sut.getBlockHeight()).to.eventually.equal(2);
		});
	});

});