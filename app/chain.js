const Block = require('./block.js');
module.exports = class Blockchain {
	
	constructor(db) {
		this.db = db;
		this.genesis = new Promise((resolve, reject)=>{
			db.getBlock(1)
				.then(resolve)
				.catch((error)=>{
					console.log('did not find genesis block, generating one');
					let block = new Block('first block', 1);
					block.time = block.now();
					block.hash = block.sha();
					db.addBlock(block).then(resolve).catch(reject);
				});
		});
		this.queue = this.genesis;
	}

	addBlock(block) {
		let db = this.db;
		block.time = block.now();
		this.queue = this.queue.then(()=>{return db.getBlockHeight()})
			.then((height)=> {
				console.log('current highest block ' + height);
				block.height = height+1;
				return db.getBlock(height);
			})
			.then((lastBlock)=> {
				block.previousBlockHash = lastBlock.hash;
				block.hash = block.sha();
				return db.addBlock(block);
			});
		return this.queue;
	}

	/**
	* Validates the chain and fails on first invalid block. Gathering all errors may consume 
	* all physical memory if the chain is big enough.
	*/
	validate() {
		let db = this.db;
		return new Promise((resolve, reject)=> {
			let previousBlockHash='';
			db.forEachBlock((blockData)=> {
				let b = new Block();
				Object.assign(b, blockData);
				console.log('validating ' + JSON.stringify(b));
				if (!b.validate()) {
					reject('Block is invalid: ' + b.height);
				}
				// this thing is never reached since block's hash includes previousBlockHash anyway.
				if (previousBlockHash!==b.previousBlockHash) {
					reject('Previous hash is invalid: ' + b.height);
				}
				previousBlockHash = b.hash;
			}, ()=>{resolve(true)});
		});
	}

}