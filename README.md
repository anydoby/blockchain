# Blockchain Data

Blockchain has the potential to change the way that the world approaches data. Develop Blockchain skills by understanding the data model behind Blockchain by developing your own simplified private blockchain.

### Configuring your project

```
npm install
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

## Web API

When the project is started a port 8000 on localhost is opened with a web service. This service allows claiming stars as belonging to a certain bitcoin address.

### Adding new stars

It order to claim a star one has to first verify that the address that he uses is posessed by him. This is achieved by following the flow:

```
curl -X "POST" "http://localhost:8000/requestValidation" \
 -H 'Content-Type: application/json; charset=utf-8' \
 -d $'{"address": "1MMEKYph2KrEG89cLMrRRq4GqihxFn4efF"}'
```

If address is a valid bitcoin address the validation time window in seconds is returned followed by the message that has to be signed using address' private key.

```
	{
	  "address": "1MMEKYph2KrEG89cLMrRRq4GqihxFn4efF",
	  "requestTimeStamp": "1532296090",
	  "message": "1MMEKYph2KrEG89cLMrRRq4GqihxFn4efF:1532296090:starRegistry",
	  "validationWindow": 300
	}
```

Next request must contain the address and signed message:


```
curl -X "POST" "http://localhost:8000/message-signature/validate" \
     -H 'Content-Type: application/json; charset=utf-8' \
     -d $'{
  "address": "1MMEKYph2KrEG89cLMrRRq4GqihxFn4efF",
  "signature": "H+YY8sOVnIeXMswfh/OKhdtAiaSNzkwo2LBuU467JGfUP3Yy8mcD9EbqAM/k/hQ7Mq/EHkzpZXrQIe1I2C1qJ7c="
}'
```

After the address was verified it is possible to register new stars:

```
curl -X "POST" "http://localhost:8000/block" \
     -H 'Content-Type: application/json; charset=utf-8' \
     -d $'{"address": "1MMEKYph2KrEG89cLMrRRq4GqihxFn4efF","star": {
    "dec": "-26° 29'\'' 24.9",
    "ra": "16h 29m 1.0s",
    "story": "Found star using https://www.google.com/sky/"
  }
}'
```

The response will contain the block information about the star that was had just been added:

```
{
  "hash": "b033de6d3c6db490e63297b3c181cc67260bede20da5d827907af6f75819872a",
  "height": 13,
  "body": {
    "address": "1MMEKYph2KrEG89cLMrRRq4GqihxFn4efF",
    "star": {
      "ra": "16h 29m 1.0s",
      "dec": "-26° 29' 24.9",
      "story": "466f756e642073746172207573696e672068747470733a2f2f7777772e676f6f676c652e636f6d2f736b792f"
    }
  },
  "time": 1536691477,
  "previousBlockHash": "b99cf24294626ec8db437cb090d66eb017465d73c366a96fef10f2278a53ca96"
}
```

NOTE: there is no validation on uniqueness of star registrations (it is not required), however it can be easily implemented on top of the blockchain since the data is immutable and it is straightforward to implement a check of which address registered the star first.

### Querying for stars

You can get the stars by address, by hash of the block or the block height:

```
curl http://localhost:8000/block/13
curl http://localhost:8000/stars/address:1MMEKYph2KrEG89cLMrRRq4GqihxFn4efF
curl http://localhost:8000/stars/hash:b033de6d3c6db490e63297b3c181cc67260bede20da5d827907af6f75819872a
```

The response in the first case will contain one star, in the latter 2 cases it will contain an array of stars or an empty array.