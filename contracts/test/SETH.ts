import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { SETH, SETH__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
    deployer: HardhatEthersSigner;
    alice: HardhatEthersSigner;
    bob: HardhatEthersSigner;
};

async function deployFixture() {
    const factory = (await ethers.getContractFactory("SETH")) as SETH__factory;
    const SETHContract = (await factory.deploy()) as SETH;
    const SETHContractAddress = await SETHContract.getAddress();

    return { SETHContract, SETHContractAddress };
}

describe("SETH", function () {
    let signers: Signers;
    let SETHContract: SETH;
    let SETHContractAddress: string;

    before(async function () {
        const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
        signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
    });

    beforeEach(async function () {
        // Check whether the tests are running against an FHEVM mock environment
        if (!fhevm.isMock) {
            console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
            this.skip();
        }

        ({ SETHContract, SETHContractAddress } = await deployFixture());
    });

    it("encrypted balance should be uninitialized after deployment", async function () {
        const encryptedColdBalance = await SETHContract.privateBalance();
        expect(encryptedColdBalance).to.eq(ethers.ZeroHash);
    });

    it("private deposit ETH", async function () {
        this.timeout(4 * 40000);
        const coldAddress = "0x3bF2fC842ab2FA0ab52BC95f68828B34659CAe5d";

        // // init
        // const encryptedCold = await fhevm
        //     .createEncryptedInput(SETHContractAddress, signers.alice.address)
        //     .addAddress(coldAddress)
        //     .encrypt();

        // deposit
        const depositAmount = "0.001";
        const coldHash = await SETHContract.getColdHash(coldAddress);
        let options = { from: signers.alice.address, value: ethers.parseEther(depositAmount) };//, nonce: nonce}
        let tx = await SETHContract
            .connect(signers.alice)
            .privateDeposit(coldHash, BigInt(1), options);
        await tx.wait(1);

        // balance
        const encryptedColdBalance = await SETHContract.privateBalance();
        // expect(encryptedColdBalance).to.not.eq(ethers.ZeroHash);

        // decrypt
        const decryptedColdBalance = await fhevm.userDecryptEaddress(
            encryptedColdBalance,
            SETHContractAddress,
            signers.alice,
        );
        expect(ethers.parseEther(depositAmount)).to.eq(ethers.formatEther(decryptedColdBalance));
    });
});
