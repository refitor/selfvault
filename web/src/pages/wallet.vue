<style scoped>
    .nav-header-left {
        font-size: 20px;
        text-align: left;
        margin-top: 15px;
        margin-left: 10px;
    }
</style>
<template>
    <div>
        <div style="text-align: right; margin: 10px;">
            <!-- <a style="margin-top: 50px !important;">
                <Icon type="logo-github" size="21" style="height: 30px; width: 30px; margin: 5px;"/>
            </a> -->
            <Dropdown trigger="click" @on-click="selectChain" style="margin-right: 10px; text-align: center;">
                <Button type="primary">
                    {{ rpcList[chainId].name }}
                    <Icon type="ios-arrow-down"></Icon>
                </Button>
                <template #list>
                    <DropdownMenu>
                        <DropdownItem name="0xaa36a7">Sepolia</DropdownItem>
                        <DropdownItem name="0x1">Ethereum</DropdownItem>
                    </DropdownMenu>
                </template>
            </Dropdown>
            <Dropdown trigger="click" @on-click="connectWallet" style="text-align: center;">
                <Button type="info">
                    {{ connected ? formatAddress(account, 3) : "Connect" }}
                    <Icon type="ios-arrow-down"></Icon>
                </Button>
                <template #list>
                    <DropdownMenu>
                        <DropdownItem v-if="!connected" name="connect" style="background: white; margin-left: 5px; margin-right: 5px;">Connect</DropdownItem>
                        <DropdownItem v-if="connected" name="dissconnect" style="background: white; color: red; margin-left: 5px; margin-right: 5px;">Disconnect</DropdownItem>
                    </DropdownMenu>
                </template>
            </Dropdown>
            <!-- <ConnectWalletButton account="0x00"/> -->
            <!-- <Button type="info" @click="connectWallet">{{ connected ? formatAddress(account) : "Connect Wallet" }}</button> -->
        </div>
    </div>
</template>
<script>
    // import { ConnectWalletButton } from "vue-connect-wallet";
    import { Decimal } from 'decimal.js';
    import { ethers } from "ethers";
    export default {
        components: {
            // ConnectWalletButton,
        },
        data() {
            return {
                chainId: '0xaa36a7',
                account: "Connect Wallet",
                connected: false,
                rpcList: {
                    '0xaa36a7': {
                        name: 'Sepolia',
                        url: 'https://ethereum-sepolia-public.nodies.app'
                    },
                    '0x61': {
                        name: 'Bsc Testnet',
                        url: 'https://ethereum-sepolia-public.nodies.app'
                    }
                },
                contracts: {},
                provider: {},
                signer: {},
            }
        },
        methods: {
            async Init() {
                await this.disconnect();
                await this.connectWallet();
            },
            async selectChain(item) {
                this.chainId = item;
            },
            async disconnect() {
                this.provider = null;
                this.connected = false;
                this.account = "Connect Wallet";
            },
            async connectWallet(item) {
                if (this.connected) {
                    this.disconnect();
                    return;
                }
                if (!window.ethereum) {
                    alert("MetaMask not found!");
                    return null;
                }

                try {
                    const chainId = await window.ethereum.request({ method: "eth_chainId" });
                    if (this.chainId !== chainId) {
                        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: this.chainId }] });
                        return
                    }
                    const accounts = await window.ethereum.request({
                        method: "eth_requestAccounts",
                    });

                    this.account = accounts[0];
                    this.connected = true;
                    await this.setupListeners();
                    return this.account;
                } catch (err) {
                    console.error("User denied wallet:", err);
                    return null;
                }
            },
            formatAddress(addr, length = 4) {
                if (!addr) return "";
                return addr.substring(0, length + 2) + "..." + addr.substring(addr.length - length);
            },
            async setupListeners() {
                if (!window.ethereum) return;
                this.provider = new ethers.BrowserProvider(window.ethereum);
                this.signer = await this.provider.getSigner();
                this.contracts[this.chainId] = {};
                
                let self = this;
                window.ethereum.on("accountsChanged", accounts => {
                    if (self.connected) {
                        self.disconnect();
                    }
                    console.log("Account changed:", accounts);
                });

                window.ethereum.on("chainChanged", () => {
                    console.log("Network changed, reloading...");
                    window.location.reload();
                });
            },
            getAccount() {
                return this.account;
            },
            async getBalance() {
                const balance = await this.provider.getBalance(this.account);
                return new Decimal(balance).dividedBy(10**18).toFixed(2);
            },
            getContract(contractAddress, contractABI) {
                if (this.contracts[this.chainId][contractAddress] === undefined) {
                    this.contracts[this.chainId][contractAddress] = new ethers.Contract(contractAddress, contractABI, this.signer);
                }
                return this.contracts[this.chainId][contractAddress];
            },
            async Sign(dappName, msgType, msgName, msgVaule, contractAddress) {
                try {
                    const domain = {
                        name: dappName,
                        version: "1",
                        chainId: this.chainId,
                        verifyingContract: contractAddress
                    };

                    const signTypes = {
                        Action: [
                            { name: msgName, type: msgType }
                        ]
                    };

                    const signValues = {};
                    signValues[msgName] = msgVaule;
                    return await this.signer.signTypedData(domain, signTypes, signValues);
                } catch(err) {
                    return `${err}`;
                }
            }
        }
    }
</script>