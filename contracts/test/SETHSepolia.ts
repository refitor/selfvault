import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { SETH } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
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
        signers = { alice: ethSigners[0] };
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
        expect(ethers.parseEther(depositAmount)).to.eq(ethers.formatEther(decryptedColdBalance));
    });

    // it("private withdraw ETH", async function () {
    //     steps = 10;

    //     this.timeout(4 * 40000);
    //     const coldAddress = "0x3bF2fC842ab2FA0ab52BC95f68828B34659CAe5d";

    //     // withdraw
    //     const withdrawAmount = "0.0001";
    //     const coldHash = await selfEthContract.getColdHash(signers.alice.address);
    //     progress(
    //         `Call privateDeposit SETH=${selfEthContractAddress} coldHash=${coldHash} signer=${signers.alice.address}...`,
    //     );
    //     let options = { from: signers.alice.address };//, nonce: nonce}
    //     let tx = await selfEthContract
    //         .connect(signers.alice)
    //         .privateWithdraw(ethers.parseEther(withdrawAmount), options);
    //     await tx.wait(1);

    //     // balance
    //     progress(`Call SETH.privateBalance()...`);
    //     const encryptedColdBalance = await selfEthContract.privateBalance();
    //     expect(encryptedColdBalance).to.not.eq(ethers.ZeroHash);

    //     // decrypt
    //     progress(`Decrypting SETH.privateBalance()=${encryptedColdBalance}...`);
    //     const decryptedColdBalance = await fhevm.userDecryptEaddress(
    //         encryptedColdBalance,
    //         selfEthContractAddress,
    //         signers.alice,
    //     );
    //     expect(ethers.parseEther(depositAmount)).to.eq(ethers.formatEther(decryptedColdBalance));
    // });
});
