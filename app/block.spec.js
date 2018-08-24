const expect = require('chai').expect;
const Block = require('./block.js');
const sha256 = require('crypto-js/sha256');

describe('Block', ()=> {
	it('should be valid for the same object', ()=> {
		let b = new Block('test data');
		let hash = sha256(JSON.stringify(b)).toString();
		b.hash = hash;

		expect(b.validate()).to.be.true;
	})

	it('should be different if object is modified', ()=> {
		let b = new Block('test data');
		b.hash = sha256(JSON.stringify(b)).toString();

		b.previousBlockHash = "somerandomhash";

		expect(b.validate()).to.be.false;
	})

	it('should convert numbers to left 0 padded strings', ()=> {
		expect(Block.leftPad(12)).to.equal('0000000000000012');
	})

});