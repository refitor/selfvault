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
        const depositAmount = "0.001";
        const coldAddress = "0x3bF2fC842ab2FA0ab52BC95f68828B34659CAe5d";

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

        this.timeout(4 * 40000);
        const depositAmount = "0.001";
        const coldAddress = "0x3bF2fC842ab2FA0ab52BC95f68828B34659CAe5d";

        // init
        progress("Encrypting '0'...");
        const encryptedZero = await fhevm
            .createEncryptedInput(selfEthContractAddress, signers.bob.address)
            .add128(0)
            .encrypt();

        // deposit
        const coldHash = await selfEthContract.getColdHash(coldAddress);
        progress(
            `Call privateDeposit SETH=${selfEthContractAddress} handle=${ethers.hexlify(encryptedZero.handles[0])} signer=${signers.bob.address}...`,
        );
        let options = { from: signers.bob.address, value: ethers.parseEther(depositAmount) };//, nonce: nonce}
        let tx = await selfEthContract
            .connect(signers.bob)
            .privateDeposit(coldHash, BigInt(1), options);
        await tx.wait(1);

        // transfer
        const remainAmount = "0.0009";
        const transferAmount = "0.0001";
        const coldHash1 = await selfEthContract.getColdHash(signers.alice.address);
        progress(
            `Call privateDeposit SETH=${selfEthContractAddress} handle=${ethers.hexlify(encryptedZero.handles[0])} signer=${signers.bob.address}...`,
        );
        let options1 = { from: signers.bob.address, value: ethers.parseEther(depositAmount) };//, nonce: nonce}
        let tx1 = await selfEthContract
            .connect(signers.bob)
            .privateDeposit(coldHash1, BigInt(1), options1);
        await tx1.wait(1);

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
            signers.bob,
        );
        progress(`Decrypting successed=${decryptedColdBalance}...`);
        expect(remainAmount).to.eq(`${ethers.formatEther(decryptedColdBalance)}`);
    });

    it("private withdraw ETH", async function () {
        steps = 10;

        this.timeout(4 * 40000);
        const coldAddress = "0x3bF2fC842ab2FA0ab52BC95f68828B34659CAe5d";

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
        progress(`publicDecrypt successed, decryptedResults=${JSON.stringify(decryptedResults)}...`);

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
        expect(ethers.parseEther("0.001")).to.eq(ethers.formatEther(decryptedColdBalance));

        // verify balance
        const withdrawBalance = await ethers.provider.getBalance(signers.alice.address);
        expect(withdrawAmount).to.eq(ethers.formatEther(withdrawBalance));
    });

    it("private offline withdraw ETH", async function () {
        steps = 10;

        this.timeout(4 * 40000);
        const coldAddress = "0x3bF2fC842ab2FA0ab52BC95f68828B34659CAe5d";

        // request withdraw
        const withdrawAmount = "0.002";
        const gasLimit0 = await selfEthContract.requestWithdraw.estimateGas(ethers.parseEther(withdrawAmount));
        let options0 = { from: signers.alice.address, gasLimit: BigInt(gasLimit0) };//, nonce: nonce}
        const sentTx0 = await selfEthContract.requestWithdraw(ethers.parseEther(withdrawAmount), options0);
        await sentTx0.wait(1);

        // publiuc decrypt
        const weamount = await selfEthContract.waitWithdrawAmount();
        progress(`waitWithdrawAmount successed, weamount=${weamount}...`);
        const decryptedResults = await fhevm.publicDecrypt([weamount]);
        progress(`publicDecrypt successed, decryptedResults=${JSON.stringify(decryptedResults)}...`);

        // offline sign
        const timestamp = Date.now();
        const domain = {
            name: "selfVault",
            version: "1",
            chainId: "11155111",
            verifyingContract: selfEthContractAddress
        };
        const signTypes = {
            Action: [
                { name: "Action", type: "string" }
            ]
        };
        let signValues = {Action: `${timestamp}`};
        const signResult = await signers.alice.signTypedData(domain, signTypes, signValues);

        // withdraw
        const coldHash = await selfEthContract.getColdHash(coldAddress);
        progress(
            `Call privateWithdraw SETH=${selfEthContractAddress} coldHash=${coldHash} signer=${signers.alice.address}...`,
        );
        const gasLimit = await selfEthContract.privateWithdrawForCold.estimateGas(signResult, ethers.toUtf8Bytes(`${timestamp}`), ethers.parseEther(withdrawAmount), BigInt(timestamp), decryptedResults.decryptionProof);
        let options = { from: signers.alice.address, gasLimit: gasLimit };//, nonce: nonce}
        let tx = await selfEthContract
            .connect(signers.alice)
            .privateWithdrawForCold(signResult, ethers.toUtf8Bytes(`${timestamp}`), ethers.parseEther(withdrawAmount), BigInt(timestamp), decryptedResults.decryptionProof, options);
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
        expect(ethers.parseEther("0.0009")).to.eq(ethers.formatEther(decryptedColdBalance));

        // verify balance
        const withdrawBalance = await ethers.provider.getBalance(signers.alice.address);
        expect(withdrawAmount).to.eq(ethers.formatEther(withdrawBalance));
    });
});
