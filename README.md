# **SelfVault**

### [Website](https://refitor.github.io/selfvault)

### [Dapp](https://refitor.github.io/selfvault/dapp)

### **Safe Features**
#### 1. Cold wallets do not require exporting private keys or mnemonic phrases, the on-chain address is hidden, offline signature withdrawals are supported.
#### 2. Only one hot wallet can be bound to a cold wallet, privacy-protected assets cannot be transferred to it if it is not bound.
#### 3. Deposits from any wallet to the cold wallet are supported, the cold wallet address is encrypted and hidden on the blockchain.
#### 4. Transfers of privacy-protected assets from cold wallet to other cold wallet addresses are supported, the transfer address and deposit amount are encrypted and hidden on the blockchain.
#### 5. Hot wallets can perform withdrawals with offline signatures from the cold wallet, and it serves as the entry point for cold wallet operations.

## **Notice: By providing a cold wallet address and a dedicated wallet for offline signing, the cold wallet address can be completely hidden. The coldHash transmitted during the deposit process is one-way encrypted, and no plaintext information related to the cold wallet address will appear on the blockchain**

### **Contract**

#### Sepolia: [0x54c0D3A5D8c6eeE41B2a17247Aaaba97f79d4306](https://sepolia.etherscan.io/address/0x54c0D3A5D8c6eeE41B2a17247Aaaba97f79d4306)

### TODO

- [x] Support wrapping ETH in SETH format and depositing it from a hot wallet to an on-chain encrypted cold wallet address
- [x] Support SETH transfers, transfer addresses and amounts are encrypted and hidden on-chain
- [x] Support hot wallet withdrawals of ETH, with withdrawal limits
- [x] Support offline signature withdrawal of ETH from cold wallets, with no limit on withdrawal amount
- [ ] Support any wallet to send funds to an encrypted cold wallet via the function transfer and transferFrom
- [ ] Support multi-party real-time verification to protect on-chain encrypted cold wallet assets, including hot wallet signing and transactions, on-chain TOTP verification, and on-chain WebAuthn verification (on-chain TOTP and WebAuthn verification require decentralized network support, pending......)

### **Transaction**

#### hotWallet1 ---> deposit --->: https://sepolia.etherscan.io/tx/0x1e184b10f30592b7f8fc7b737d625e919d60bdffb3fab722079995cef506e7f9

#### hotWallet2 ---> deposit --->: https://sepolia.etherscan.io/tx/0xba124c2f6c8a55e759632bb6e9706841d548cf9d602301e7a0bdb5d177466347

#### hotWallet2 ---> transfer ---> hotWallet1: https://sepolia.etherscan.io/tx/0x27534c113d43f16671b726a9d8a736382b1cca57118aab06cf23f7b32f3b34d6

#### hotWallet1 ---> withdraw --->: https://sepolia.etherscan.io/tx/0x3c58fb23f718e42e9c9dadb4e8320d3b00cc045e8c51f6620a88718e04a9c419

#### hotWallet3 ---> deposit --->: https://sepolia.etherscan.io/tx/0xb0b862371aee86bfd5f5ae4dc1cf2952a00e8c4f420d1d8f306e271cd055602a

#### hotWallet3 ---> offline sign and withdraw ---> : https://sepolia.etherscan.io/tx/0xc33b74efe2ed22e94be1773d2b4b3a9c5dbbd16cc38f46f04cd7add3e2b74253

### **ColdHash**

#### ColdHash as the encrypted address of hotWallet3.coldWallet:
![coldhash-account](https://refitor.github.io/selfvault/imgs/coldhash_account.png)

#### ColdHash as the deposit params: 
![coldhash-deposit](https://refitor.github.io/selfvault/imgs/coldhash_deposit.png)

#### ColdHash with online verify 
![coldhash-verify](https://refitor.github.io/selfvault/imgs/coldhash_verify.png)

### ColdWallet receive ETH
![coldwallet-received](https://refitor.github.io/selfvault/imgs/coldwallet_received.png)

### **Offline sign**

#### **open source tools**: https://github.com/refitor/selfvault/tree/main/offline_sign

