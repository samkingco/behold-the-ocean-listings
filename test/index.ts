import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { ERC721Listings } from "../typechain";

enum ListingStatus {
  ACTIVE = 0,
  INACTIVE = 1,
  EXECUTED = 2,
}

function getBatchListingArgs() {
  const tokenIds = Array.from({ length: 20 }, (_, i) => i + 1);
  const prices = tokenIds.map((i) => ethers.utils.parseEther(i.toString()));
  return [tokenIds, prices];
}

describe("ERC721Listings", function () {
  let mockERC721: Contract;
  let testContract: ERC721Listings;
  let deployer: SignerWithAddress;
  let minter: SignerWithAddress;
  let altPayout: SignerWithAddress;
  let customer: SignerWithAddress;

  beforeEach(async () => {
    [deployer, minter, altPayout, customer] = await ethers.getSigners();

    const MockERC721 = await ethers.getContractFactory("MockERC721");
    mockERC721 = await MockERC721.deploy();
    await mockERC721.deployed();

    const ERC721Listings = await ethers.getContractFactory("ERC721Listings");
    testContract = await ERC721Listings.deploy(
      mockERC721.address,
      minter.address
    );
    await testContract.deployed();

    // mint tokens in the mock contract
    await mockERC721.connect(minter).mint();
    await mockERC721
      .connect(minter)
      .setApprovalForAll(testContract.address, true);
  });

  describe("admin functionality", () => {
    it("should initialize correctly", async () => {
      expect(await testContract.owner()).to.equal(deployer.address);
      expect(await testContract.tokenAddress()).to.equal(mockERC721.address);
      expect(await testContract.tokenOwnerAddress()).to.equal(minter.address);
      expect(await testContract.payoutAddress()).to.equal(minter.address);
    });

    it("should update the token owner address", async () => {
      expect(await testContract.tokenOwnerAddress()).to.equal(minter.address);
      await testContract.setTokenOwnerAddress(deployer.address);
      expect(await testContract.tokenOwnerAddress()).to.equal(deployer.address);
    });

    it("should update the payout address", async () => {
      expect(await testContract.payoutAddress()).to.equal(minter.address);
      await testContract.setPayoutAddress(altPayout.address);
      expect(await testContract.payoutAddress()).to.equal(altPayout.address);
    });

    it("should withdraw the balance to the contract address", async () => {
      const startingPayoutBalance = await testContract.provider.getBalance(
        altPayout.address
      );
      await testContract.setPayoutAddress(altPayout.address);
      expect(
        await testContract.provider.getBalance(testContract.address)
      ).to.equal(ethers.utils.parseEther("0"));
      await testContract.setListing(1, ethers.utils.parseEther("10"), true);
      await testContract
        .connect(customer)
        .purchase(1, { value: ethers.utils.parseEther("10") });
      expect(
        await testContract.provider.getBalance(testContract.address)
      ).to.equal(ethers.utils.parseEther("10"));
      await testContract.withdraw();
      expect(
        await testContract.provider.getBalance(testContract.address)
      ).to.equal(ethers.utils.parseEther("0"));
      expect(
        await testContract.provider.getBalance(altPayout.address)
      ).to.equal(startingPayoutBalance.add(ethers.utils.parseEther("10")));
    });

    it("should be transferrable to another address", async () => {
      expect(await testContract.owner()).to.equal(deployer.address);
      await testContract.transferOwnership(minter.address);
      expect(await testContract.owner()).to.equal(minter.address);
    });
  });

  describe("creating listings", () => {
    it("should add a single listing", async () => {
      await testContract.setListing(1, ethers.utils.parseEther("10"), true);
      expect(await testContract.getListing(1)).to.eql([
        ethers.utils.parseEther("10"),
        ListingStatus.ACTIVE,
      ]);
    });

    it("should add multiple listings", async () => {
      const [tokenIds, prices] = getBatchListingArgs();
      await testContract.setListingBatch(tokenIds, prices, true);
      for (const tokenId of tokenIds) {
        expect(await testContract.getListing(tokenId)).to.eql([
          ethers.utils.parseEther(tokenId.toString()),
          ListingStatus.ACTIVE,
        ]);
      }
    });

    it("should let the minter add listings", async () => {
      await testContract
        .connect(minter)
        .setListing(1, ethers.utils.parseEther("10"), true);
      expect(await testContract.getListing(1)).to.eql([
        ethers.utils.parseEther("10"),
        ListingStatus.ACTIVE,
      ]);

      const [tokenIds, prices] = getBatchListingArgs();
      await testContract
        .connect(minter)
        .setListingBatch(tokenIds, prices, true);
      for (const tokenId of tokenIds) {
        expect(await testContract.getListing(tokenId)).to.eql([
          ethers.utils.parseEther(tokenId.toString()),
          ListingStatus.ACTIVE,
        ]);
      }
    });

    it("should not let the public add listings", async () => {
      await expect(
        testContract
          .connect(customer)
          .setListing(1, ethers.utils.parseEther("10"), true)
      ).to.revertedWith("NotAuthorized()");

      const [tokenIds, prices] = getBatchListingArgs();
      await expect(
        testContract.connect(customer).setListingBatch(tokenIds, prices, true)
      ).to.revertedWith("NotAuthorized()");
    });

    it("should list a token with inactive status", async () => {
      await testContract.setListing(1, ethers.utils.parseEther("10"), false);
      expect(await testContract.getListing(1)).to.eql([
        ethers.utils.parseEther("10"),
        ListingStatus.INACTIVE,
      ]);
    });

    it("should revert if batch listing with the wrong config", async () => {
      const tokenIds = Array.from({ length: 20 }, (_, i) => i + 1);
      const prices = tokenIds
        .map((i) => ethers.utils.parseEther(i.toString()))
        .slice(0, 10);

      await expect(
        testContract.setListingBatch(tokenIds, prices, true)
      ).to.revertedWith("IncorrectConfiguration()");
    });

    it("should revert adding an already executed listing", async () => {
      await testContract.setListing(1, ethers.utils.parseEther("10"), true);
      await testContract
        .connect(customer)
        .purchase(1, { value: ethers.utils.parseEther("10") });

      await expect(
        testContract.setListing(1, ethers.utils.parseEther("5"), true)
      ).to.revertedWith("ListingExecuted()");
    });
  });

  describe("updating listings", () => {
    beforeEach(async () => {
      const [tokenIds, prices] = getBatchListingArgs();
      await testContract.setListingBatch(tokenIds, prices, true);
    });

    it("should update a listings price", async () => {
      expect(await testContract.getListingPrice(1)).to.equal(
        ethers.utils.parseEther("1")
      );
      await testContract.setListingPrice(1, ethers.utils.parseEther("10"));
      expect(await testContract.getListingPrice(1)).to.equal(
        ethers.utils.parseEther("10")
      );
    });

    it("should not update an executed listings price", async () => {
      expect(await testContract.getListingPrice(1)).to.equal(
        ethers.utils.parseEther("1")
      );
      await testContract
        .connect(customer)
        .purchase(1, { value: ethers.utils.parseEther("1") });
      await expect(
        testContract.setListingPrice(1, ethers.utils.parseEther("10"))
      ).to.revertedWith("ListingExecuted()");
      expect(await testContract.getListingPrice(1)).to.equal(
        ethers.utils.parseEther("1")
      );
    });

    it("should flip a listings status", async () => {
      expect(await testContract.getListingStatus(1)).to.equal(
        ListingStatus.ACTIVE
      );
      await testContract.toggleListingStatus(1);
      expect(await testContract.getListingStatus(1)).to.equal(
        ListingStatus.INACTIVE
      );
      await testContract.toggleListingStatus(1);
      expect(await testContract.getListingStatus(1)).to.equal(
        ListingStatus.ACTIVE
      );
    });

    it("should not update an executed listings status", async () => {
      expect(await testContract.getListingStatus(1)).to.equal(
        ListingStatus.ACTIVE
      );
      await testContract
        .connect(customer)
        .purchase(1, { value: ethers.utils.parseEther("1") });
      expect(await testContract.getListingStatus(1)).to.equal(
        ListingStatus.EXECUTED
      );
      await expect(testContract.toggleListingStatus(1)).to.revertedWith(
        "ListingExecuted()"
      );
      expect(await testContract.getListingStatus(1)).to.equal(
        ListingStatus.EXECUTED
      );
    });
  });

  describe("purchasing", () => {
    beforeEach(async () => {
      const [tokenIds, prices] = getBatchListingArgs();
      await testContract.setListingBatch(tokenIds, prices, true);
    });

    it("should allow customers to purchase tokens", async () => {
      expect(await mockERC721.balanceOf(customer.address)).to.equal(0);
      await testContract
        .connect(customer)
        .purchase(1, { value: ethers.utils.parseEther("1") });
      expect(await testContract.getListingStatus(1)).to.equal(
        ListingStatus.EXECUTED
      );
      expect(
        await testContract.provider.getBalance(testContract.address)
      ).to.equal(ethers.utils.parseEther("1"));
      expect(await mockERC721.balanceOf(customer.address)).to.equal(1);
    });

    it("should not allow purchasing of executed listings", async () => {
      await testContract
        .connect(customer)
        .purchase(1, { value: ethers.utils.parseEther("1") });

      await expect(
        testContract
          .connect(customer)
          .purchase(1, { value: ethers.utils.parseEther("1") })
      ).to.revertedWith("ListingExecuted()");
    });

    it("should not allow purchasing of inactive listings", async () => {
      await testContract.toggleListingStatus(1);
      await expect(
        testContract
          .connect(customer)
          .purchase(1, { value: ethers.utils.parseEther("1") })
      ).to.revertedWith("ListingInactive()");
    });

    it("should not allow purchasing with the incorrect amount", async () => {
      const expected = ethers.utils.parseEther("1");
      const value = ethers.utils.parseEther("10");
      await expect(
        testContract.connect(customer).purchase(1, { value })
      ).to.revertedWith(`IncorrectPaymentAmount(${expected}, ${value})`);
    });
  });
});
