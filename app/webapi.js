const Hapi = require('hapi');
const Boom = require('boom')
const Block = require('./block.js');
const Validator = require('./validator.js')

checkNotNull = function(argument, property) {
	if (typeof(argument) == "undefined" || argument == null) {
		throw `${property} cannot be null`
	}
}

checkMatches = function(argument, regex) {
	if (!regex.test(argument)) {
		throw `${argument} does not match ${regex}`
	}
}

module.exports = class WebAPI {

	constructor(chain) {
		this.chain = chain;
		this.validator = new Validator()
	}

	async start(host, port) {
		let chain = this.chain;
		// Create a server with a host and port
		this.server = Hapi.server({
			host,
			port
		});
		let server = this.server;
		let validator = this.validator

		const init = async () => {
			await server.start();
			// get block route
			server.route({
				method: 'GET',
				path: '/block/{id}',
				handler: async (request, h) => {
					return chain.getBlock(request.params.id)
						.then(block => h.response(WebAPI.decodeStory(block)))
						.catch(err => h.response({}).code(404));
				}
			});

			// post block route
			server.route({
				method: 'POST',
				path: '/block',
				handler: async (request, h) => {
					const address = request.payload.address
					return validator.checkAddressVerified(address)
						.then(verified => {
							if (verified) {
								const {
									ra,
									dec,
									mag,
									cen,
									story
								} = request.payload.star
								checkNotNull(ra, 'ra')
								checkNotNull(dec, 'dec')
								checkNotNull(story, 'story')
								checkMatches(dec, /[\-\+]?\d+° \d+\' \d(\.\d)?/)
								checkMatches(ra, /\d{1,2}h \d{1,2}m \d(\.\d)?s/)

								const block = new Block({
									address,
									star: {
										ra,
										dec,
										mag,
										cen,
										story: Buffer.from(story, 'utf-8').toString('hex')
									}
								});
								return chain.addBlock(block).then(block => h.response(block));
							} else {
								throw 'your address has not been verified'
							}
						})
						.catch(Boom.badRequest)
				}
			});

			server.route({
				method: 'POST',
				path: '/requestValidation',
				handler: (request, h) => validator.startValidation(request.payload.address).catch(Boom.badRequest)
			})

			server.route({
				method: 'POST',
				path: '/message-signature/validate',
				handler: (request, h) => validator.verifySignature(request.payload.address, request.payload.signature).catch(Boom.badRequest)
			});

			server.route({
				method: 'GET',
				path: '/stars/address:{address}',
				handler: (request, h) => {
					const address = request.params.address
					return chain.filter(block => address == block.body.address).then(blocks => blocks.map(WebAPI.decodeStory))
				}
			})

			server.route({
				method: 'GET',
				path: '/stars/hash:{hash}',
				handler: (request, h) => {
					const hash = request.params.hash
					return chain.filter(block => hash == block.hash).then(blocks => {
						if (blocks.length == 0) {
							return h.response({}).code(404);
						}
						return WebAPI.decodeStory(blocks[0])
					})
				}
			})

			console.log(`server started on ${host}:${port}`);
		};
		return init();
	}

	async close() {
		this.validator.close()
		return this.server.stop({
			timeout: 10000
		});
	}

	static decodeStory(block) {
		if (block.body.star && block.body.star.story) {
			block.body.star.storyDecoded = new Buffer(block.body.star.story, 'hex').toString()
		}
		return block
	}

}