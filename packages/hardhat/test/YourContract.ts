import { expect } from "chai";
import { ethers } from "hardhat";
import { YourContract } from "../typechain-types";

describe("YourContract", function () {
  let YourContract: YourContract;
  const initialPriceFeedAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Замените на реальный адрес, если требуется

  before(async () => {
    const YourContractFactory = await ethers.getContractFactory("YourContract");
    YourContract = (await YourContractFactory.deploy(initialPriceFeedAddress)) as YourContract;
    await YourContract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should initialize correctly", async function () {
      const bettingDeadline = await YourContract.bettingDeadline();
      const resultTime = await YourContract.resultTime();
      expect(bettingDeadline).to.equal(0);
      expect(resultTime).to.equal(0);
    });
  });

  describe("Betting", function () {
    it("Should allow placing the first bet", async function () {
      const [player1] = await ethers.getSigners();
      const predictedRate = 1100; // Example predicted rate
      const betAmount = ethers.parseEther("1");

      const tx = await YourContract.connect(player1).placeBet(predictedRate, { value: betAmount });
      await tx.wait();

      const contractState = await YourContract.getContractState();
      expect(contractState.player1).to.equal(player1.address);
      expect(contractState.amount1).to.equal(betAmount);
      expect(contractState.predictedRate1).to.equal(predictedRate);
    });

    it("Should allow placing the second bet", async function () {
      const players = await ethers.getSigners();
      const player2 = players[1];
      const predictedRate = 1200; // Example predicted rate
      const betAmount = ethers.parseEther("1");

      const tx = await YourContract.connect(player2).placeBet(predictedRate, { value: betAmount });
      await tx.wait();

      const contractState = await YourContract.getContractState();
      expect(contractState.player2).to.equal(player2.address);
      expect(contractState.amount2).to.equal(betAmount);
      expect(contractState.predictedRate2).to.equal(predictedRate);
    });

    it("Should clear bets if a new round starts", async function () {
      const [player1] = await ethers.getSigners();
      const predictedRate = 1150; // New predicted rate
      const betAmount = ethers.parseEther("1");

      // Move time forward to simulate a new betting round
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]); // 24 hours
      await ethers.provider.send("evm_mine", []);

      const tx = await YourContract.connect(player1).placeBet(predictedRate, { value: betAmount });
      await tx.wait();

      const contractState = await YourContract.getContractState();
      expect(contractState.player1).to.equal(player1.address);
      expect(contractState.amount1).to.equal(betAmount);
      expect(contractState.predictedRate1).to.equal(predictedRate);
      expect(contractState.player2).to.equal(ethers.ZeroAddress); // Second bet should be cleared
    });
  });
});
