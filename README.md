# **SelfVault**

### [Website](https://refitor.github.io/selfvault)

### [Dapp](https://refitor.github.io/selfvault/dapp)

### **Safe Features**
#### 1. Cold wallets do not require exporting private keys or mnemonic phrases, the on-chain address is hidden, offline signature withdrawals are supported.
#### 2. Only one hot wallet can be bound to a cold wallet, privacy-protected assets cannot be transferred to it if it is not bound.
#### 3. Deposits from any wallet to the cold wallet are supported, the cold wallet address is encrypted and hidden on the blockchain.
#### 4. Transfers of privacy-protected assets from cold wallet to other cold wallet addresses are supported, the transfer address and deposit amount are encrypted and hidden on the blockchain.
#### 5. Hot wallets can perform withdrawals with offline signatures from the cold wallet, and withdrawals are only supported to cold wallets.

### **Notice: By providing a cold wallet address and a dedicated wallet for offline signing, the cold wallet address can be completely hidden. The coldHash transmitted during the deposit process is one-way encrypted, and no plaintext information related to the cold wallet address will appear on the blockchain**

### **Contract**

#### Sepolia: [0xdf8d741789eF65aC60d9440bF53c5BeA42CbbAD2](https://sepolia.etherscan.io/address/0xdf8d741789eF65aC60d9440bF53c5BeA42CbbAD2)

### **Transaction**

#### hotWallet1 ---> deposit ---: https://sepolia.etherscan.io/tx/0x8df1983f1fb36b290c62b1be7c39c37143e6db5fde995581f1844671e80054d7

#### hotWallet2 ---> deposit ---: https://sepolia.etherscan.io/tx/0x7e86fd42231fb40e025ea7a5b1031cc1fb31f7e31e8900762aa53536ac81e971

#### hotWallet1 ---> transfer ---> hotWallet2: https://sepolia.etherscan.io/tx/0x71de4cb1dfad420d3542db1232838aeeef79e745219ee66487076cba466bf77c

#### hotWallet1 ---> withdraw ---: https://sepolia.etherscan.io/tx/0xdf7a5845df326488f76e1ce01d585dbeeefc360fdd002133159e776f8b7bde50

#### hotWallet3 ---> deposit ---: https://sepolia.etherscan.io/tx/0x74249c1d73e95b470d52f20dbfe429dea938e8163deab93120e933f590c425ba

#### hotWallet3 ---> offline sign and withdraw ---> coldWallet3 : https://sepolia.etherscan.io/tx/0x6a0a6d75237a55b4421a580b81afc7fc0f641387fb9b8bb89f4b42b60212919a

### **ColdHash**

#### ColdHash as the encrypted address of hotWallet3.coldWallet:
![coldhash-account](https://refitor.github.io/selfvault/imgs/coldhash_account.png)

#### ColdHash as the deposit params: 
![coldhash-deposit](https://refitor.github.io/selfvault/imgs/coldhash_deposit.png)

#### ColdHash with online verify 
![coldhash-verify](https://refitor.github.io/selfvault/imgs/coldhash_verify.png)
