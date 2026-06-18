import { expect } from "chai";
import { ethers } from "hardhat";

describe("AgentReceiptRegistry", function () {
  async function deployRegistry() {
    const [payer, recipient] = await ethers.getSigners();
    const registry = await ethers.deployContract("AgentReceiptRegistry");
    await registry.waitForDeployment();
    return { registry, payer, recipient };
  }

  it("storeReceipt stores a receipt and emits ReceiptStored", async function () {
    const { registry, payer, recipient } = await deployRegistry();
    const token = ethers.ZeroAddress;
    const amount = ethers.parseEther("0.01");
    const serviceId = "weather-api-v1";
    const requestHash = ethers.keccak256(ethers.toUtf8Bytes("request"));
    const paymentTxHash = ethers.keccak256(ethers.toUtf8Bytes("payment-tx"));

    await expect(
      registry.storeReceipt(
        recipient.address,
        token,
        amount,
        serviceId,
        requestHash,
        paymentTxHash
      )
    )
      .to.emit(registry, "ReceiptStored")
      .withArgs(
        1n,
        payer.address,
        recipient.address,
        token,
        amount,
        serviceId,
        requestHash,
        paymentTxHash
      );
  });

  it("getReceipt returns a stored receipt", async function () {
    const { registry, payer, recipient } = await deployRegistry();
    const token = ethers.ZeroAddress;
    const amount = ethers.parseEther("0.01");
    const serviceId = "weather-api-v1";
    const requestHash = ethers.keccak256(ethers.toUtf8Bytes("request"));
    const paymentTxHash = ethers.keccak256(ethers.toUtf8Bytes("payment-tx"));

    await registry.storeReceipt(recipient.address, token, amount, serviceId, requestHash, paymentTxHash);

    const receipt = await registry.getReceipt(1n);
    expect(receipt.id).to.equal(1n);
    expect(receipt.payer).to.equal(payer.address);
    expect(receipt.recipient).to.equal(recipient.address);
    expect(receipt.token).to.equal(token);
    expect(receipt.amount).to.equal(amount);
    expect(receipt.serviceId).to.equal(serviceId);
    expect(receipt.requestHash).to.equal(requestHash);
    expect(receipt.paymentTxHash).to.equal(paymentTxHash);
    expect(receipt.timestamp).to.be.greaterThan(0n);
  });

  it("verifyReceipt returns true for matching receipt details", async function () {
    const { registry, payer, recipient } = await deployRegistry();
    const amount = ethers.parseEther("0.01");
    const serviceId = "weather-api-v1";
    const requestHash = ethers.keccak256(ethers.toUtf8Bytes("request"));
    const paymentTxHash = ethers.keccak256(ethers.toUtf8Bytes("payment-tx"));

    await registry.storeReceipt(recipient.address, ethers.ZeroAddress, amount, serviceId, requestHash, paymentTxHash);

    expect(
      await registry.verifyReceipt(1n, payer.address, recipient.address, amount, serviceId)
    ).to.equal(true);
  });

  it("verifyReceipt returns false for non-matching receipt details", async function () {
    const { registry, payer, recipient } = await deployRegistry();
    const amount = ethers.parseEther("0.01");
    const serviceId = "weather-api-v1";
    const requestHash = ethers.keccak256(ethers.toUtf8Bytes("request"));
    const paymentTxHash = ethers.keccak256(ethers.toUtf8Bytes("payment-tx"));

    await registry.storeReceipt(recipient.address, ethers.ZeroAddress, amount, serviceId, requestHash, paymentTxHash);

    expect(
      await registry.verifyReceipt(1n, payer.address, recipient.address, amount, "different-service")
    ).to.equal(false);
  });

  it("rejects zero recipient", async function () {
    const { registry } = await deployRegistry();
    const requestHash = ethers.keccak256(ethers.toUtf8Bytes("request"));
    const paymentTxHash = ethers.keccak256(ethers.toUtf8Bytes("payment-tx"));

    await expect(
      registry.storeReceipt(ethers.ZeroAddress, ethers.ZeroAddress, 1n, "service", requestHash, paymentTxHash)
    ).to.be.revertedWithCustomError(registry, "InvalidRecipient");
  });

  it("rejects zero amount", async function () {
    const { registry, recipient } = await deployRegistry();
    const requestHash = ethers.keccak256(ethers.toUtf8Bytes("request"));
    const paymentTxHash = ethers.keccak256(ethers.toUtf8Bytes("payment-tx"));

    await expect(
      registry.storeReceipt(recipient.address, ethers.ZeroAddress, 0n, "service", requestHash, paymentTxHash)
    ).to.be.revertedWithCustomError(registry, "InvalidAmount");
  });
});
