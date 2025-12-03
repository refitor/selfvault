const { Wallet, toBeArray } = require("ethers");

async function main() {
    const messageHash = process.argv[process.argv.length - 1];
    const signWallet = new Wallet(process.argv[process.argv.length - 2]);
    const signature = await signWallet.signMessage(toBeArray(messageHash));

    console.log(`\nSignature: ${signature}\n`);
}

main();