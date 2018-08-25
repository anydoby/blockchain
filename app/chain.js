const Block = require('./block.js');
module.exports = class Blockchain {
	
	constructor(db) {
		this.db = db;
		this.genesis = new Promise((resolve, reject)=>{
			db.getBlock(0)
				.then(resolve)
				.catch((error)=>{
					console.log('did not find genesis block, generating one');
					let block = new Block('first block');
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
	validateChain() {
		let db = this.db;
		let queue = this.queue;
		return new Promise((resolve, reject)=> {
			let previousBlockHash='';
			queue.then(()=> {
				db.forEachBlock((block)=> {
					if (Blockchain.validateBlockImpl(block, reject)){
						// this thing is never reached since block's hash includes previousBlockHash anyway.
						if (previousBlockHash!==block.previousBlockHash) {
							reject('Previous hash is invalid: ' + block.height);
						}
						previousBlockHash = block.hash;					
					}
				}, ()=>{resolve(true)});
			});
		});
	}

	validateBlock(height) {
		let db = this.db;
		let queue = this.queue;
		return new Promise((resolve, reject)=> {
			queue.then(()=> {
				db.getBlock(height).then((block)=> {
					if (Blockchain.validateBlockImpl(block, reject)) {
						if (height>0) {
							db.getBlock(height-1).then((previousBlock)=>{
								if (previousBlock.hash !== block.previousBlockHash){
									reject('Previous hash is invalid: ' + height);
								} else {
									resolve(true);
								}
							})
						} else {
							resolve(true);
						}
					}
				}).catch(reject);
			});
		});
	}

	static validateBlockImpl(block, reject) {
		console.log('validating ' + JSON.stringify(block));
		if (!block.validate()) {
			reject('Block is invalid: ' + block.height);
		}
		return true;
	}

}