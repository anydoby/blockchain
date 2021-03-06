const Block = require('./block.js');
module.exports = class Blockchain {

	constructor(db) {
		this.db = db;
		this.genesis = new Promise((resolve, reject) => {
			return db.getBlock(0)
				.then(block => resolve(block))
				.catch((error) => {
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
		this.queue = this.queue.then(() => {
				return db.getBlockHeight()
			})
			.then((height) => {
				block.height = height + 1;
				return db.getBlock(height);
			})
			.then((lastBlock) => {
				block.previousBlockHash = lastBlock.hash;
				block.hash = block.sha();
				return db.addBlock(block);
			});
		return this.queue;
	}

	getBlock(height) {
		return this.db.getBlock(height);
	}

	getSize() {
		return this.db.getBlockHeight();
	}

	/**
	 * Validates the chain and fails on first invalid block. Gathering all errors may consume 
	 * all physical memory if the chain is big enough.
	 */
	validateChain() {
		let db = this.db;
		let queue = this.queue;
		return new Promise((resolve, reject) => {
			let previousBlockHash = '';
			queue.then(() => {
				let errors = [];
				db.forEachBlock((block) => {
					if (block.validate()) {
						// this thing is never reached since block's hash includes previousBlockHash anyway.
						if (previousBlockHash !== block.previousBlockHash) {
							errors.push(block.height);
						}
					} else {
						errors.push(block.height);
					}
					previousBlockHash = block.hash;
				}, () => {
					resolve(errors)
				});
			});
		});
	}

	filter(predicate) {
		const db = this.db
		const queue = this.queue
		return new Promise((resolve, reject) => {
			queue.then(() => {
				const results = [];
				db.forEachBlock((block) => {
					if (predicate(block)) {
						results.push(block)
					}
				}, () => {
					resolve(results)
				});
			})
		})
	}

	validateBlock(height) {
		let db = this.db;
		let queue = this.queue;
		return new Promise((resolve, reject) => {
			queue.then(() => {
				db.getBlock(height).then((block) => {
					if (block.validate()) {
						if (height > 0) {
							db.getBlock(height - 1).then((previousBlock) => {
								if (previousBlock.hash !== block.previousBlockHash) {
									reject(false);
								} else {
									resolve(true);
								}
							})
						} else {
							resolve(true);
						}
					} else {
						resolve(false);
					}
				}).catch(reject);
			});
		});
	}

}