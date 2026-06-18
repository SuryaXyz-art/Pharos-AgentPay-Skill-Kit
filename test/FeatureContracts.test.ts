import { expect } from "chai";
import { ethers } from "hardhat";

const hash = (value: string) => ethers.keccak256(ethers.toUtf8Bytes(value));

describe("Feature contracts", function () {
  it("Crowdfund accepts contributions and lets creator claim after goal is met", async function () {
    const [creator, backer] = await ethers.getSigners();
    const crowdfund: any = await ethers.deployContract("Crowdfund");
    const goal = ethers.parseEther("1");

    await crowdfund.createCampaign("Agent data fund", goal, 60);
    await crowdfund.connect(backer).contribute(1n, { value: goal });

    await ethers.provider.send("evm_increaseTime", [61]);
    await ethers.provider.send("evm_mine", []);

    await expect(crowdfund.connect(creator).claim(1n))
      .to.emit(crowdfund, "Claimed")
      .withArgs(1n, creator.address, goal);
  });

  it("EscrowPay holds native PHRS until payer releases it", async function () {
    const [payer, payee] = await ethers.getSigners();
    const escrow: any = await ethers.deployContract("EscrowPay");
    const amount = ethers.parseEther("0.2");

    await escrow.connect(payer).createEscrow(payee.address, "premium-report", { value: amount });

    await expect(escrow.connect(payer).release(1n))
      .to.emit(escrow, "EscrowReleased")
      .withArgs(1n, payee.address, amount);

    const stored = await escrow.getEscrow(1n);
    expect(stored.released).to.equal(true);
  });

  it("PaymentRequestRegistry lets a requester create and receive an exact payment", async function () {
    const [requester, payer] = await ethers.getSigners();
    const requests: any = await ethers.deployContract("PaymentRequestRegistry");
    const amount = ethers.parseEther("0.03");

    await requests.connect(requester).createRequest(payer.address, amount, "premium-report", "API unlock");

    await expect(requests.connect(payer).payRequest(1n, { value: amount }))
      .to.emit(requests, "PaymentRequestPaid")
      .withArgs(1n, payer.address, amount);

    const stored = await requests.getRequest(1n);
    expect(stored.paid).to.equal(true);
    expect(stored.payer).to.equal(payer.address);
  });

  it("Payroll can be funded and pay a worker once per interval", async function () {
    const [employer, worker] = await ethers.getSigners();
    const payroll: any = await ethers.deployContract("Payroll");
    const amount = ethers.parseEther("0.05");

    await payroll.connect(employer).createPayroll(worker.address, amount, 60, "research-agent", {
      value: amount
    });

    await expect(payroll.pay(1n))
      .to.emit(payroll, "PayrollPaid")
      .withArgs(1n, worker.address, amount);

    await expect(payroll.pay(1n)).to.be.revertedWithCustomError(payroll, "TooEarly");
  });

  it("WalletIntelligence records the latest wallet risk signal", async function () {
    const [reporter, wallet] = await ethers.getSigners();
    const intelligence: any = await ethers.deployContract("WalletIntelligence");

    await expect(intelligence.submitWalletSignal(wallet.address, 42, "normal", hash("metadata")))
      .to.emit(intelligence, "WalletSignalSubmitted")
      .withArgs(1n, wallet.address, reporter.address, 42, "normal", hash("metadata"));

    const latest = await intelligence.getLatestSignal(wallet.address);
    expect(latest.riskScore).to.equal(42);
    expect(latest.label).to.equal("normal");
  });

  it("AgentMarketplace lists an agent and sells access for exact PHRS price", async function () {
    const [owner, buyer] = await ethers.getSigners();
    const marketplace: any = await ethers.deployContract("AgentMarketplace");
    const price = ethers.parseEther("0.01");

    await marketplace.listAgent("Market Analyst Agent", "https://agent.example/api", price, hash("agent"));

    await expect(marketplace.connect(buyer).purchaseAccess(1n, { value: price }))
      .to.emit(marketplace, "AgentAccessPurchased")
      .withArgs(1n, buyer.address, owner.address, price);
  });

  it("TradingSignalGenerator publishes a readable agent trading signal", async function () {
    const [publisher] = await ethers.getSigners();
    const generator: any = await ethers.deployContract("TradingSignalGenerator");

    await expect(generator.publishSignal("PHRS/USD", "BUY", 88, 12345n, hash("signal")))
      .to.emit(generator, "TradingSignalPublished")
      .withArgs(1n, publisher.address, "PHRS/USD", "BUY", 88, 12345n, hash("signal"));

    const signal = await generator.getSignal(1n);
    expect(signal.symbol).to.equal("PHRS/USD");
    expect(signal.direction).to.equal("BUY");
    expect(signal.confidence).to.equal(88);
  });
});
