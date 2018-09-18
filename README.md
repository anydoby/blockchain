# Blockchain Data

Blockchain has the potential to change the way that the world approaches data. Develop Blockchain skills by understanding the data model behind Blockchain by developing your own simplified private blockchain.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Installing Node and NPM is pretty straightforward using the installer package available from the (Node.js® web site)[https://nodejs.org/en/].

The version used in the project is 8.11.4

### Configuring your project

- Use NPM to initialize your project and create package.json to store project dependencies.
```
npm init
```
- Install crypto-js with --save flag to save dependency to our package.json file
```
npm install crypto-js --save
```
- Install level with --save flag
```
npm install level --save
```

## Testing

Run 
```
npm test
```

to execute unit tests. These are fat unit tests which actually use real leveldb, since a mock behaves really different from the real thing.

## Running
```
npm start
```

it execute the application. It basically does what is asked in the original readme: creates a chain and validates it. Validation of the modified chain is tested separately in `app/chain.spec.js`.

## Web API

RESTful API is implemented using Hapi js framework. 

When the project is started a port 8000 on localhost is opened with a web service. This service allows getting blocks by their height and adding new blocks to the chain via the following methods:

### getting blocks

GET /block/{height} gets the block content
```
	curl "http://localhost:8000/block/0" 
```

returns the genesis block.

### inserting blocks

POST /block puts the 'body' of data to the new block returning the new block's contents


```
curl -X "POST" "http://localhost:8000/block" \
     -H 'Content-Type: application/json' \
     -d $'{
  "body": "Testing block with test string data"
}'
```

adds a new block to the end of the chain.