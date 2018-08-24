# Blockchain Data

Blockchain has the potential to change the way that the world approaches data. Develop Blockchain skills by understanding the data model behind Blockchain by developing your own simplified private blockchain.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Installing Node and NPM is pretty straightforward using the installer package available from the (Node.js® web site)[https://nodejs.org/en/].

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