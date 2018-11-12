pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/token/ERC721/ERC721.sol';

contract StarNotary is ERC721 { 

    struct Star { 
        string name;
        StarCoordinates coordinates;
        string story; 
    }

    struct StarCoordinates {
        // only ra and dec are used for star identity
        string ra; // right ascension
        string dec; // declination
        string mag; // magnitude
        string con; // constellation name
    }

    mapping(uint256 => Star) public tokenIdToStarInfo; 
    mapping(uint256 => uint256) public starsForSale;
    mapping(string => mapping(string => uint256)) private coordinatesToTokenId;

    function createStar(string _name, string _ra, string _dec, string _mag, string _con, string _story, uint256 _tokenId) public { 
        require(!checkIfStarExist(_ra, _dec), "Star with these coordinates has a token id already");
        require(validateCoordinate(_ra), "Right ascension is invalid");
        require(validateCoordinate(_dec), "Declination is invalid");

        Star memory newStar = Star(_name, StarCoordinates(_ra,_dec,_mag,_con), _story);
        tokenIdToStarInfo[_tokenId] = newStar;
        coordinatesToTokenId[_ra][_dec] = _tokenId;

        mint(_tokenId);
    }

    function mint(uint256 _tokenId) public {
        _mint(msg.sender, _tokenId);
    }

    function checkIfStarExist(string _ra, string _dec) public view returns(bool) {
        return coordinatesToTokenId[_ra][_dec] != 0;
    }

    function putStarUpForSale(uint256 _tokenId, uint256 _price) public { 
        require(
                this.ownerOf(_tokenId) == msg.sender ||
                getApproved(_tokenId) == msg.sender
                );

        starsForSale[_tokenId] = _price;
    }

    function starsForSale(uint256 _tokenId) public view returns(uint256) {
        return starsForSale[_tokenId];
    }

    function buyStar(uint256 _tokenId) public payable { 
        require(starsForSale[_tokenId] > 0);
        uint256 starCost = starsForSale[_tokenId];
        require(msg.value >= starCost);

        address starOwner = this.ownerOf(_tokenId);

        _removeTokenFrom(starOwner, _tokenId);
        _addTokenTo(msg.sender, _tokenId);

        starOwner.transfer(starCost);

        if(msg.value > starCost) { 
            msg.sender.transfer(msg.value - starCost);
        }
    }

    function tokenIdToStarInfo(uint256 _tokenId) public view returns (string, string, string, string, string) {
        Star memory star = tokenIdToStarInfo[_tokenId];        
        require(keccak256(star.name) != keccak256(""), "No star found for token id");
        return (
                    star.name, 
                    star.story, 
                    join("ra_",star.coordinates.ra), 
                    join("dec_",star.coordinates.dec),
                    join("mag_",star.coordinates.mag)
                );
    }

    function token(string _ra, string _dec, string _mag, string _con) public pure returns (uint256) {
        return uint256(keccak256(_ra, _dec, _mag, _con));
    }

    function validateCoordinate(string str) internal pure returns (bool) {
        bytes memory b = bytes(str);
        if (b.length == 0) {
            return false;
        }
        return true;
    }

    function join(string a1, string a2) internal pure returns (string) {
        bytes memory ba1 = bytes(a1);
        bytes memory ba2 = bytes(a2);
        bytes memory temp = bytes(new string(ba1.length + ba2.length));
        uint i; uint k;
        for (i=0; i < ba1.length; i++) temp[k++] = ba1[i];
        for (i=0; i < ba2.length; i++) temp[k++] = ba2[i];
        return string(temp);
    }
}
