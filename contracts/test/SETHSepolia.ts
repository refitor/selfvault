import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { SETH } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
    bob: HardhatEthersSigner;
    alice: HardhatEthersSigner;
};

describe("SETH", function () {
    let signers: Signers;
    let selfEthContract: SETH;
    let selfEthContractAddress: string;
    let step: number;
    let steps: number;

    function progress(message: string) {
        console.log(`${++step}/${steps} ${message}`);
    }

    before(async function () {
        if (fhevm.isMock) {
            console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
            this.skip();
        }

        try {
            const SETHDeployement = await deployments.get("SETH");
            selfEthContractAddress = SETHDeployement.address;
            selfEthContract = await ethers.getContractAt("SETH", SETHDeployement.address);
        } catch (e) {
            (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
            throw e;
        }

        const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
        signers = { alice: ethSigners[0], bob: ethSigners[1] };
    });

    beforeEach(async () => {
        step = 0;
        steps = 0;
    });

    it("private deposit ETH", async function () {
        steps = 10;

        this.timeout(4 * 40000);
        const depositAmount = "0.0011";
        const coldAddress = signers.bob.address;

        // init
        progress("Encrypting '0'...");
        const encryptedZero = await fhevm
            .createEncryptedInput(selfEthContractAddress, signers.alice.address)
            .add128(0)
            .encrypt();

        // deposit
        const coldHash = await selfEthContract.getColdHash(coldAddress);
        progress(
            `Call privateDeposit SETH=${selfEthContractAddress} handle=${ethers.hexlify(encryptedZero.handles[0])} signer=${signers.alice.address}...`,
        );
        let options = { from: signers.alice.address, value: ethers.parseEther(depositAmount) };//, nonce: nonce}
        let tx = await selfEthContract
            .connect(signers.alice)
            .privateDeposit(coldHash, BigInt(1), options);
        await tx.wait(1);

        // balance
        progress(`Call SETH.privateBalance()...`);
        const encryptedColdBalance = await selfEthContract.privateBalance();
        expect(encryptedColdBalance).to.not.eq(ethers.ZeroHash);

        // decrypt
        progress(`Decrypting SETH.privateBalance()=${encryptedColdBalance}...`);
        const decryptedColdBalance = await fhevm.userDecryptEuint(
            FhevmType.euint128,
            encryptedColdBalance,
            selfEthContractAddress,
            signers.alice,
        );
        progress(`Decrypting successed=${decryptedColdBalance}...`);
        expect(depositAmount).to.eq(`${ethers.formatEther(decryptedColdBalance)}`);
    });

    it("private transfer ETH", async function () {
        steps = 10;

        // setup wallet2
        const SETHDeployement = await deployments.get("SETH");
        selfEthContractAddress = SETHDeployement.address;
        const selfEthContract2 = await ethers.getContractAt("SETH", SETHDeployement.address, signers.bob);

        this.timeout(4 * 40000);
        const depositAmount = "0.001";
        const coldAddress = signers.alice.address;

        // init
        progress("Encrypting '0'...");
        const encryptedZero = await fhevm
            .createEncryptedInput(selfEthContractAddress, signers.bob.address)
            .add128(0)
            .encrypt();

        // deposit
        const coldHash = await selfEthContract2.getColdHash(coldAddress);
        progress(
            `Call privateDeposit SETH=${selfEthContractAddress} handle=${ethers.hexlify(encryptedZero.handles[0])} signer=${signers.bob.address}...`,
        );
        let options = { from: signers.alice.address, value: ethers.parseEther(depositAmount) };//, nonce: nonce}
        let tx = await selfEthContract2
            .connect(signers.bob)
            .privateDeposit(coldHash, BigInt(1), options);
        await tx.wait(1);

        // transfer encrypt
        const remainAmount = "0.0009";
        const transferAmount = "0.0001";
        progress("Encrypting '0'...");
        const encryptedTransfer = await fhevm
            .createEncryptedInput(selfEthContractAddress, signers.bob.address)
            .add128(ethers.parseEther(transferAmount))
            .encrypt();

        // transfer
        const coldHash1 = await selfEthContract2.getColdHash(signers.alice.address);
        progress(
            `Call privateDeposit SETH=${selfEthContractAddress} handle=${ethers.hexlify(encryptedTransfer.handles[0])} signer=${signers.bob.address}...`,
        );
        let options1 = { from: signers.bob.address };//, nonce: nonce}
        let tx1 = await selfEthContract2
            .connect(signers.bob)
            .privateTransfer(coldHash1, encryptedTransfer.handles[0], encryptedTransfer.inputProof, options1);
        await tx1.wait(1);

        // alice.balance
        progress(`Call SETH.privateBalance()...`);
        const encryptedAliceBalance = await selfEthContract.privateBalance();
        expect(encryptedAliceBalance).to.not.eq(ethers.ZeroHash);

        // decrypt alice.balance
        progress(`Decrypting SETH.privateBalance()=${encryptedAliceBalance}...`);
        const decryptedAliceBalance = await fhevm.userDecryptEuint(
            FhevmType.euint128,
            encryptedAliceBalance,
            selfEthContractAddress,
            signers.alice,
        );
        progress(`Decrypting alice.balance successed=${decryptedAliceBalance}...`);
        expect("0.0011").to.eq(`${ethers.formatEther(decryptedAliceBalance)}`);

        // bob.balance
        progress(`Call SETH.privateBalance()...`);
        const encryptedBobBalance = await selfEthContract2.privateBalance();
        expect(encryptedBobBalance).to.not.eq(ethers.ZeroHash);

        // decrypt
        progress(`Decrypting SETH.privateBalance()=${encryptedBobBalance}...`);
        const decryptedBlbBalance = await fhevm.userDecryptEuint(
            FhevmType.euint128,
            encryptedBobBalance,
            selfEthContractAddress,
            signers.bob,
        );
        progress(`Decrypting successed=${decryptedBlbBalance}...`);
        expect(remainAmount).to.eq(`${ethers.formatEther(decryptedBlbBalance)}`);
    });

    it("private withdraw ETH", async function () {
        steps = 10;

        this.timeout(4 * 40000);
        const coldAddress = signers.bob.address;
        let beforeWithdrawBalance = await ethers.provider.getBalance(signers.alice.address);
        progress(`start privateWithdraw, alice.address: ${signers.alice.address}, alice.balance: ${ethers.formatEther(beforeWithdrawBalance)}`);

        // request withdraw
        const withdrawAmount = "0.0001";
        const gasLimit0 = await selfEthContract.requestWithdraw.estimateGas(ethers.parseEther(withdrawAmount));
        let options0 = { from: signers.alice.address, gasLimit: BigInt(gasLimit0) };//, nonce: nonce}
        const sentTx0 = await selfEthContract.requestWithdraw(ethers.parseEther(withdrawAmount), options0);
        await sentTx0.wait(1);

        // publiuc decrypt
        const weamount = await selfEthContract.waitWithdrawAmount();
        progress(`waitWithdrawAmount successed, weamount=${weamount}...`);
        const decryptedResults = await fhevm.publicDecrypt([weamount]);
        progress(`publicDecrypt successed, decryptedResults=${decryptedResults.decryptionProof}...`);

        // withdraw
        const coldHash = await selfEthContract.getColdHash(coldAddress);
        progress(
            `Call privateWithdraw SETH=${selfEthContractAddress} coldHash=${coldHash} signer=${signers.alice.address}...`,
        );
        const gasLimit = await selfEthContract.privateWithdraw.estimateGas(ethers.parseEther(withdrawAmount), decryptedResults.decryptionProof);
        let options = { from: signers.alice.address, gasLimit: gasLimit };//, nonce: nonce}
        let tx = await selfEthContract
            .connect(signers.alice)
            .privateWithdraw(ethers.parseEther(withdrawAmount), decryptedResults.decryptionProof, options);
        await tx.wait(1);

        // // balance
        // progress(`Call SETH.privateBalance()...`);
        // const encryptedColdBalance = await selfEthContract.privateBalance();
        // expect(encryptedColdBalance).to.not.eq(ethers.ZeroHash);

        // // decrypt
        // progress(`Decrypting SETH.privateBalance()=${encryptedColdBalance}...`);
        // const decryptedColdBalance = await fhevm.userDecryptEuint(
        //     FhevmType.euint128,
        //     encryptedColdBalance,
        //     selfEthContractAddress,
        //     signers.alice,
        // );
        // expect("0.001").to.eq(ethers.formatEther(decryptedColdBalance));

        // verify balance
        const afterWithdrawBalance = await ethers.provider.getBalance(signers.alice.address);
        progress(`after offline withdraw, afterWithdrawBalance=${ethers.formatEther(afterWithdrawBalance)}, offlineWithdrawAmount=${ethers.formatEther(offlineWithdrawAmount)}...`);
        const hotWithdrawAmount = afterWithdrawBalance - beforeWithdrawBalance;
        expect(hotWithdrawAmount).to.lt(ethers.parseEther(withdrawAmount));
        expect(hotWithdrawAmount).to.gt(0);
    });

    it("private offline withdraw ETH", async function () {
        steps = 10;

        this.timeout(4 * 40000);
        const coldAddress = signers.bob.address;
        let beforeWithdrawBalance = await ethers.provider.getBalance(signers.bob.address);
        progress(`start privateWithdrawForCold, bob.address: ${signers.bob.address}, bob.balance: ${ethers.formatEther(beforeWithdrawBalance)}`);

        // request withdraw
        const withdrawAmount = "0.0001";
        const gasLimit0 = await selfEthContract.requestWithdraw.estimateGas(ethers.parseEther(withdrawAmount));
        let options0 = { from: signers.alice.address, gasLimit: BigInt(gasLimit0) };//, nonce: nonce}
        const sentTx0 = await selfEthContract.requestWithdraw(ethers.parseEther(withdrawAmount), options0);
        await sentTx0.wait(1);

        // publiuc decrypt
        const weamount = await selfEthContract.waitWithdrawAmount();
        progress(`waitWithdrawAmount successed, weamount=${weamount}...`);
        const decryptedResults = await fhevm.publicDecrypt([weamount]);
        progress(`publicDecrypt successed, decryptedResults=${decryptedResults.decryptionProof}...`);

        // offline sign
        const timestamp = Date.now();
        const strMessage = `${timestamp}`;
        const messageHash = await selfEthContract.getMessageHash(strMessage);
        const signature = await signers.bob.signMessage(ethers.toBeArray(messageHash));

        // withdraw
        const coldHash = await selfEthContract.getColdHash(coldAddress);
        progress(
            `Call privateWithdrawForCold SETH=${selfEthContractAddress} coldHash=${coldHash} signer=${signers.alice.address}...`,
        );
        const gasLimit = await selfEthContract.privateWithdrawForCold.estimateGas(signature, messageHash, ethers.parseEther(withdrawAmount), BigInt(timestamp), decryptedResults.decryptionProof);
        let options = { from: signers.alice.address, gasLimit: gasLimit };//, nonce: nonce}
        let tx = await selfEthContract
            .connect(signers.alice)
            .privateWithdrawForCold(signature, messageHash, ethers.parseEther(withdrawAmount), BigInt(timestamp), decryptedResults.decryptionProof, options);
        await tx.wait(1);

        // // balance
        // progress(`Call SETH.privateBalance()...`);
        // const encryptedColdBalance = await selfEthContract.privateBalance();
        // expect(encryptedColdBalance).to.not.eq(ethers.ZeroHash);

        // // decrypt
        // progress(`Decrypting SETH.privateBalance()=${encryptedColdBalance}...`);
        // const decryptedColdBalance = await fhevm.userDecryptEuint(
        //     FhevmType.euint128,
        //     encryptedColdBalance,
        //     selfEthContractAddress,
        //     signers.alice,
        // );
        // expect("0.0009").to.eq(ethers.formatEther(decryptedColdBalance));

        // verify balance
        const afterWithdrawBalance = await ethers.provider.getBalance(signers.bob.address);
        const offlineWithdrawAmount = afterWithdrawBalance - beforeWithdrawBalance;
        progress(`after offline withdraw, afterWithdrawBalance=${ethers.formatEther(afterWithdrawBalance)}, offlineWithdrawAmount=${ethers.formatEther(offlineWithdrawAmount)}...`);
        expect(offlineWithdrawAmount).to.lte(ethers.parseEther(withdrawAmount));
        expect(offlineWithdrawAmount).to.gt(0);
    });
});
