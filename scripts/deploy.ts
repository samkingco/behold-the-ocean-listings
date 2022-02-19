import { ethers } from "hardhat";

async function main() {
  // Manifold contract for Behold The Ocean
  const TOKEN_ADDRESS = "0x76501fde1ccb70b2cf4bc25209562b6e4373abb2";

  // Ava's address used to mint tokens
  const TOKEN_OWNER_ADDRESS = "0xa1DB2d6A01890723119af089da69106675285379";

  const ERC721Listings = await ethers.getContractFactory("ERC721Listings");
  const contract = await ERC721Listings.deploy(
    TOKEN_ADDRESS,
    TOKEN_OWNER_ADDRESS,
    { gasLimit: ethers.BigNumber.from(918000) }
  );
  await contract.deployed();

  console.log("Contract deployed to:", contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
