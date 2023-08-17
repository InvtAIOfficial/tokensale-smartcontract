import { parseUnits, parseEther } from "ethers/lib/utils";
import { artifacts, contract } from "hardhat";

import { assert } from "chai";
import { BN, expectEvent, expectRevert, time, ether } from "@openzeppelin/test-helpers";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000"

const FaucetToken = artifacts.require("./FaucetToken.sol");
const MockChainlinkAggregator = artifacts.require("./MockChainlinkAggregator.sol");
const IvstSale = artifacts.require("./IvstSale.sol");

contract("Sale", ([admin, alice, bob, carol, david]) => {
  // IFO block times
  let _startTime;
  let _endTime;

  // IFO Pool 0
  let offeringAmountPool0 = parseEther("10000");
  let raisingAmountPool0 = parseEther("1000");
  let limitPerUserInLp = parseEther("500");

  // VARIABLES

  // Contracts
  let usdc,
    ethPriceFeed,
    mockIFO,
    mockOC,
    mockLP;

  // Generic result variable
  let result;

  before(async () => {
    // Deploy MockLP
    mockLP = await FaucetToken.new("Mock LP", "LP", 18, "0", {
      from: alice,
    });

    // Deploy MockOfferingCoin (100M initial supply)
    mockOC = await FaucetToken.new("Sale Token", "SALETOKEN", 18, "0");

    // Deploy IFOPool
    usdc = await FaucetToken.new("USDC Token", "USDC", 6, "0");
    ethPriceFeed = await MockChainlinkAggregator.new(8, "200000000000", {
      from: admin,
    });
    mockIFO  = await IvstSale.new(ethPriceFeed.address, {
      from: admin,
    });

    // Set offering token
    await mockIFO.setOfferingToken(mockOC.address, {
      from: admin,
    });

    // Transfer offering token to pool
    await mockOC.faucet(mockIFO.address, offeringAmountPool0);
  });

  describe("Initial contract parameters for all contracts", async () => {
    it("Pools are set", async () => {
      _startTime = new BN(await time.latest()).add(new BN("50"));
      _endTime = new BN(await time.latest()).add(new BN("3650"));

      result = await mockIFO.setPool(
        _startTime,
        _endTime,
        offeringAmountPool0,
        raisingAmountPool0,
        limitPerUserInLp,
        "0",
        "0",
        "0",
        "1",
        "1",
        { from: admin }
      );

      expectEvent(result, "PoolParametersSet", {
        offeringAmountPool: String(offeringAmountPool0),
        raisingAmountPool: String(raisingAmountPool0),
        pid: String(0),
      });

      assert.equal(String(await mockIFO.totalTokensOffered()), String(offeringAmountPool0));
    });
  });

  describe("IFO #1 - OVERFLOW FOR BOTH POOLS", async () => {
    it("User cannot deposit if tokens not deposited", async () => {
      await mockLP.approve(mockIFO.address, parseEther("100000"), {
        from: bob,
      });

      const currentTimestamp = (await time.latest()).toNumber() + 300
      await expectRevert(mockIFO.depositPool("0", mockLP.address, parseEther("0"), "0", currentTimestamp, { from: bob }), "Deposit: Too early");

      await time.increaseTo(_startTime);
    });

    it("User cannot deposit in pools if amount is 0", async () => {
      const currentTimestamp = (await time.latest()).toNumber() + 300
      await expectRevert(mockIFO.depositPool("0", mockLP.address, parseEther("0"), "0", currentTimestamp, { from: bob }), "Deposit: Amount must be > 0");
    });

    it("User cannot deposit in pools that don't exist", async () => {
      const currentTimestamp = (await time.latest()).toNumber() + 300
      await expectRevert(mockIFO.depositPool("3", mockLP.address, parseEther("0"), "0", currentTimestamp, { from: bob }), "Deposit: Pool not set");
    });

    it("User cannot deposit tokens that are not allowed", async () => {
      // Mint and approve
      for (let thisUser of [bob]) {
        await mockLP.faucet(thisUser, parseEther("1000"), {
          from: thisUser,
        });
        await mockLP.approve(mockIFO.address, parseEther("1000"), {
          from: thisUser,
        });
      }
      const currentTimestamp = (await time.latest()).toNumber() + 300
      await expectRevert(mockIFO.depositPool("0", mockLP.address, parseEther("1"), parseEther("1"), currentTimestamp, { from: bob }), "invalid token");
    });

    it("User (Bob) can deposit in pool0", async () => {
      // Add stable token
      await expectRevert(mockIFO.addStableToken(usdc.address, 6, { from: bob }), "Ownable: caller is not the owner")

      result = await mockIFO.addStableToken(usdc.address, 6, { from: admin });

      expectEvent(result, "StableTokenAdded", {
        token: usdc.address,
        decimal: String(6),
      });

      // USDC mint and approve
      for (let thisUser of [bob]) {
        await usdc.faucet(thisUser, parseUnits("1000", 6), {
          from: thisUser,
        });
        await usdc.approve(mockIFO.address, parseUnits("1000", 6), {
          from: thisUser,
        });
      }

      const currentTimestamp = (await time.latest()).toNumber() + 300
      result = await mockIFO.depositPool("0", usdc.address, parseUnits("500", 6), parseEther("500"), currentTimestamp, { from: bob });

      expectEvent(result, "Deposit", {
        user: bob,
        token: usdc.address,
        amount: String(parseUnits("500", 6)),
        usdAmount: String(parseEther("500")),
        pid: String(0),
      });

      result = await mockIFO.viewUserAllocationPools(bob, [0]);
      assert.equal(result[0].toString(), "1000000000000");

      const expectedResult = parseEther("500").mul(offeringAmountPool0).div(raisingAmountPool0);

      result = await mockIFO.viewUserOfferingAmountsForPools(bob, [0]);
      assert.equal(result[0].toString(), expectedResult.toString());

      result = await mockIFO.viewUserInfo(bob, ["0"]);
      assert.equal(result[0][0].toString(), String(parseEther("500")));
    });

    it("User cannot deposit more in pool0 if new amount + amount > limit", async () => {
      const currentTimestamp = (await time.latest()).toNumber() + 300
      await expectRevert(
        mockIFO.depositPool("0", usdc.address, parseUnits("1", 6), parseEther("1"), currentTimestamp, { from: bob }),
        "Deposit: New amount above user limit"
      );
    });

    it("User (Carol) deposits in pool0", async () => {
      // USDC mint and approve
      for (let thisUser of [carol]) {
        await usdc.faucet(thisUser, parseUnits("1000", 6), {
          from: thisUser,
        });
        await usdc.approve(mockIFO.address, parseUnits("1000", 6), {
          from: thisUser,
        });
      }

      const currentTimestamp = (await time.latest()).toNumber() + 300
      result = await mockIFO.depositPool("0", usdc.address, parseUnits("300", 6), parseEther("300"), currentTimestamp, { from: carol });

      expectEvent(result, "Deposit", {
        user: carol,
        token: usdc.address,
        amount: String(parseUnits("300", 6)),
        usdAmount: String(parseEther("300")),
        pid: String(0),
      });

      result = await mockIFO.viewUserAllocationPools(carol, [0]);
      assert.equal(result[0].toString(), "375000000000");

      const expectedResult = parseEther("300").mul(offeringAmountPool0).div(raisingAmountPool0);

      result = await mockIFO.viewUserOfferingAmountsForPools(carol, [0]);
      assert.equal(result[0].toString(), expectedResult.toString());

      result = await mockIFO.viewUserInfo(carol, ["0"]);
      assert.equal(result[0][0].toString(), String(parseEther("300")));
    });

    it("User (David) deposits ether in pool0", async () => {
      const currentTimestamp = (await time.latest()).toNumber() + 300
      result = await mockIFO.depositPool(
        "0", ZERO_ADDR, parseUnits("0"), parseEther("195"), currentTimestamp,
        {
          from: david,
          value: String(parseUnits("1", 17)) // 0.1 ETH
        }
      );

      expectEvent(result, "Deposit", {
        user: david,
        token: ZERO_ADDR,
        amount: String(parseUnits("1", 17)),
        usdAmount: String(parseEther("200")),
        pid: String(0),
      });

      result = await mockIFO.viewUserAllocationPools(david, [0]);
      assert.equal(result[0].toString(), "200000000000"); // 20%

      const expectedResult = parseEther("200").mul(offeringAmountPool0).div(raisingAmountPool0);

      result = await mockIFO.viewUserOfferingAmountsForPools(david, [0]);
      assert.equal(result[0].toString(), expectedResult.toString());

      result = await mockIFO.viewUserInfo(david, ["0"]);
      assert.equal(result[0][0].toString(), String(parseEther("200")));
    });

    it("Bob harvests for pool0", async () => {
      // Go to end time
      await time.increaseTo(_endTime);

      // Allow harvest
      result = await mockIFO.flipHarvestAllowedStatus({ from: admin });

      expectEvent(result, "HarvestAllowedFlipped", {
        current: true,
      });


      const previousOCBalance = new BN(await mockOC.balanceOf(bob));

      result = await mockIFO.harvestPool("0", { from: bob });

      // Bob contributed $500 out of total $1,000 deposited
      // 5000 tokens should be received

      expectEvent(result, "Harvest", {
        user: bob,
        offeringAmount: String(parseEther("5000")),
        pid: "0",
      });

      const newOCBalance = new BN(await mockOC.balanceOf(bob));
      const changeOCBalance = newOCBalance.sub(previousOCBalance);

      assert.equal(String(changeOCBalance), String(parseEther("5000")));

      // Verify user has claimed
      result = await mockIFO.viewUserInfo(bob, ["0"]);
      assert.equal(result[1][0], true);
    });

    it("Carol harvests for pool0", async () => {
      const previousOCBalance = new BN(await mockOC.balanceOf(carol));

      result = await mockIFO.harvestPool("0", { from: carol });

      // Carol contributed $300 out of total $1,000 deposited
      // 3000 tokens should be received

      expectEvent(result, "Harvest", {
        user: carol,
        offeringAmount: String(parseEther("3000")),
        pid: "0",
      });

      const newOCBalance = new BN(await mockOC.balanceOf(carol));
      const changeOCBalance = newOCBalance.sub(previousOCBalance);

      assert.equal(String(changeOCBalance), String(parseEther("3000")));

      // Verify user has claimed
      result = await mockIFO.viewUserInfo(carol, ["0"]);
      assert.equal(result[1][0], true);
    });

    it("David harvests for pool0", async () => {
      const previousOCBalance = new BN(await mockOC.balanceOf(david));

      result = await mockIFO.harvestPool("0", { from: david });

      // David contributed $200 out of total $1,000 deposited
      // 3000 tokens should be received

      expectEvent(result, "Harvest", {
        user: david,
        offeringAmount: String(parseEther("2000")),
        pid: "0",
      });

      const newOCBalance = new BN(await mockOC.balanceOf(david));
      const changeOCBalance = newOCBalance.sub(previousOCBalance);

      assert.equal(String(changeOCBalance), String(parseEther("2000")));

      // Verify user has claimed
      result = await mockIFO.viewUserInfo(david, ["0"]);
      assert.equal(result[1][0], true);
    });
  });

  describe("IFO - ADMIN FUNCTIONS", async () => {
    it("Admin can withdraw funds", async () => {
      result = await mockIFO.finalWithdraw([usdc.address], "0", { from: admin });

      // expectEvent(result, "AdminWithdraw",
      //   {
      //     amountOfferingToken: "0",
      //     ethAmount: String(parseUnits("1", 17)),
      //     tokens: [usdc.address],
      //     amounts: [String(parseUnits("800", 6))],
      //   }
      // );

      expectEvent.inTransaction(result.receipt.transactionHash, usdc, "Transfer", {
        from: mockIFO.address,
        to: admin,
        value: String(parseUnits("800", 6)),
      });
    });

    it("Owner can recover funds if wrong token", async () => {
      // Deploy Wrong LP
      const wrongLP = await FaucetToken.new("Wrong LP", "LP", 18, "100", {
        from: alice,
      });

      // Transfer wrong LP by "accident"
      await wrongLP.transfer(mockIFO.address, "1", { from: alice });

      result = await mockIFO.recoverWrongTokens(wrongLP.address, "1", { from: admin });

      expectEvent(result, "AdminTokenRecovery", { tokenAddress: wrongLP.address, amountTokens: "1" });

      await expectRevert(
        mockIFO.recoverWrongTokens(mockOC.address, "1", { from: admin }),
        "Recover: Cannot be offering token"
      );
      await expectRevert(
        mockIFO.recoverWrongTokens(usdc.address, "1", { from: admin }),
        "Recover: Cannot be payment token"
      );
    });

    it("Only owner can call functions for admin", async () => {
      await expectRevert(mockIFO.finalWithdraw([usdc.address], "0", { from: alice }), "Ownable: caller is not the owner");
      await expectRevert(
        mockIFO.setPool(
          _startTime,
          _endTime,
          offeringAmountPool0,
          raisingAmountPool0,
          limitPerUserInLp,
          "0",
          "0",
          "0",
          "1",
          "1",
          { from: alice }
        ),
        "Ownable: caller is not the owner"
      );
      await expectRevert(
        mockIFO.recoverWrongTokens(mockOC.address, "1", { from: carol }),
        "Ownable: caller is not the owner"
      );
    });
  });
});
