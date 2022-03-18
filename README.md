# Behold The Ocean listings contract

At a high level, `ERC721Listings` is a simple "marketplace" contract that allows listing of ERC721 tokens. The owner can list tokens from a contract, and a customer can purchase them. Each token can be sold by the lister only once. This is useful when the token is minted to an artist, and the artist then wants to sell that token at a specific price for the first time.

## Simplifications

We've made some assumptions and simplified things for the Behold The Ocean use case. There is a single minter (Ava), and minting happens on a different contract (Manifold). The minter can then create listings for tokens they've minted and now own. Listings use a fixed price (no auctions), and can be the status: inactive, active, or executed.

Payment for purchases go directly to the contract, and can be withdrawn later to a payout address. This is just a gas optimization so buyers don't pay extra gas for transferring ETH to the payout address.

This contract is also less restrictive in an effort to save gas when listing. If this was a marketplace with many listers, we would likely check ownership of the token they are listing, and prevent listing tokens you don't own. Since there's a single owner, and we can assume that they likely own the token because they've minted it elsewhere, we can save gas by not checking ownership. This does mean however, that if a token is listed that the minter no longer owns and someone tries to buy it, their transaction will fail.

### Limitations

Here's some of the more technical limitations:

- One `tokenAddress` at a time. This is the address where tokens are minted. In the case of Behold The Ocean, this is the Manifold contract. This address is used when transferring ERC721 tokens to the buyer.
- One `tokenOwnerAddress` at a time. This is the address of the minter, and can be updated after deployment. This address is used when transferring ERC721 tokens to the buyer.
- One `payoutAddress` at a time. By default this is the same as the `tokenOwnerAddress` but can be updated after deployment. This is the address that will receive funds when calling `withdraw()`. This could be set to a [splitter address](https://www.0xsplits.xyz/) if proceeds should be split between multiple parties.
- Listings can only be purchased once. This prevents two people paying for the same token, but only one of them receiving it. This is because tokens are transferred from the minter to the buyer. After the first sale, the minter will no longer own the token, so subsequent sales would fail as the minter no longer owns the token. _This doesn't affect the ability for the token to be listed on other marketplaces like OpenSea or Zora_.

## Artist workflow

### Set up

Before adding any listings, you need to approve the `ERC721Listings.sol` contract to transfer your tokens. Head to your token contract page on Etherscan, click on "Write contract", and connect to your wallet that mints tokens. Look for the function called `setApprovalForAll()`. It takes two parameters. The first is the address you want to approve, usually called `operator`. Paste in the address of the deployed `ERC721Listings` contract. In the `approved` field, type in `true`. Press the "Write" button and confirm in your wallet. This allows the listings contract to transfer the tokens you've minted to buyers.

### Create a listing

This assumes the listing contract is deployed and verified on Etherscan. All actions can be performed from the "Write contract" tab on Etherscan.

1. Mint a token on your token contract e.g. Manifold. You should now own that token.
2. Go to the listing contract on Etherscan and navigate to the "Write contract" tab.
3. Find the `createListing` function and expand it. There should be 3 fields.
   1. `tokenId` is the token number from your token contract e.g. `1` for token 1.
   2. `price` is the price to list the token at in Wei. To get the Wei amount, use [this converter](https://etherscan.io/unitconverter).
   3. `setActive` set this to `true` if you want the listing to be immediately purchasable, or set it to `false` if you want to activate it at a later date. Most of the time you want to set this to `true`. Customers won't be able to buy until the listing is active.
4. Once you've entered those details, hit "Write" and confirm in your wallet.

You can also `createListingBatch` to create multiple listings, but this is more tricky through the Etherscan UI.

### Setting a listing to active/inactive

There's a function called `toggleListingStatus` which flips a listing state to active if it's inactive, or inactive if it's active. You must specify the `tokenId` for the listing.

### Update a listing's price

You can update the price of an active/inactive listing by using `updateListingPrice`. You must specify the `tokenId` for the listing, and the `newPrice` in Wei.

### Withdrawing funds

Anyone can call `withdraw` which will trigger a transfer of the contracts balance to the payout address (defaults to the minters address). It's ok that anyone can call this because funds are only ever sent to a specific address, not the person who calls it.

## Deployment

You can deploy the contract with hardhat, but it requires some environment set up first. Alternatively you can [open `ERC712Listings.sol` in Remix](https://remix.ethereum.org/#url=https://github.com/samkingco/behold-the-ocean-listings/blob/master/contracts/ERC721Listings.sol) and deploy from there.

If you want to deploy with hardhat, make sure you copy `.env.example` into a new file called `.env`. Replace `XXX` with the correct values. Private keys are only used by hardhat to deploy contracts. You'll need an [Infura](https://infura.io/) app ID. The other values are optional.

```
# Used to deploy contracts
DEPLOY_PRIVATE_KEY_MAINNET=XXX
DEPLOY_PRIVATE_KEY_RINKEBY=XXX
DEPLOY_PRIVATE_KEY_ROPSTEN=XXX
INFURA_ID=XXX

# Used for gas reporting in tests (optional)
ETHERSCAN_API_KEY=XXX
CMC_API_KEY=XXX
```

With that set up, edit `scripts/deploy.ts` to add the token address and token owner address. You can then deploy with the following command:

```shell
hardhat run --network mainnet scripts/deploy.ts
```

If you want to verify the contract on etherscan, copy the deployment address and paste it in to replace `DEPLOYED_CONTRACT_ADDRESS` in the following command. Note, you'll need to set `ETHERSCAN_API_KEY` in your `.env` file.

```shell
npx hardhat verify --network mainnet DEPLOYED_CONTRACT_ADDRESS "Hello, Hardhat!"
```
