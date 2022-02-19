//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockERC721 is ERC721 {
    constructor() ERC721("Mock ERC721", "MOCK") {}

    function mint() public {
        for (uint256 i = 1; i < 21; i++) {
            _safeMint(msg.sender, i);
        }
    }
}
