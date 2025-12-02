/**
 *Submitted for verification at Etherscan.io on 2017-12-12
*/

// Copyright (C) 2015, 2016, 2017 Dapphub

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

pragma solidity ^0.8.0;

import { FHE, eaddress, externalEaddress, euint128, euint128, externalEuint128, ebool} from "./node_modules/@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "./node_modules/@fhevm/solidity/config/ZamaConfig.sol";
import './node_modules/@openzeppelin/contracts/utils/cryptography/ECDSA.sol';

contract SETH is ZamaEthereumConfig {
    using ECDSA for bytes32;
    string public name     = "Self Ether";
    string public symbol   = "SETH";
    uint8  public decimals = 18;

    event  Approval(address indexed src, address indexed guy, uint wad);
    event  Transfer(address indexed src, address indexed dst, uint wad);
    event  Deposit(address indexed dst, uint wad);
    event  Withdrawal(address indexed src, uint wad);

    mapping (address => uint)                       public  balanceOf;
    mapping (address => mapping (address => uint))  public  allowance;

    struct PrivateData {
        bool initialized;
        bytes32 coldHash;
        euint128 balance;
        uint256 operateNonce;
        uint256 hotWithdrawMax;
        euint128 waitWithdrawAmount;
    }
    address[] private _privateAddressList;
    mapping (address => PrivateData)  private  _privateDataOf;

    receive() external payable {
        deposit();
    }

    function deposit() public payable {
        balanceOf[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint wad) public {
        require(balanceOf[msg.sender] >= wad);
        balanceOf[msg.sender] -= wad;
        payable(msg.sender).transfer(wad);
        emit Withdrawal(msg.sender, wad);
    }

    function totalSupply() public view returns (uint256) {
        return address(this).balance;
    }

    function approve(address guy, uint wad) public returns (bool) {
        allowance[msg.sender][guy] = wad;
        emit Approval(msg.sender, guy, wad);
        return true;
    }

    function transfer(address dst, uint wad) public returns (bool) {
        return transferFrom(msg.sender, dst, wad);
    }

    function transferFrom(address src, address dst, uint wad) public returns (bool) {
        require(balanceOf[src] >= wad);

        if (src != msg.sender && allowance[src][msg.sender] > 0) {
            require(allowance[src][msg.sender] >= wad);
            allowance[src][msg.sender] -= wad;
        }

        balanceOf[src] -= wad;
        balanceOf[dst] += wad;
        emit Transfer(src, dst, wad);

        return true;
    }

    // @notice privateDeposit is used to deposit SETH to the cold wallet, demo: wallet === send 1 SETH ===> cold wallet.
    function privateDeposit(bytes32 coldHash, uint256 hotWithdrawMax) public payable {
        // eaddress eto = FHE.fromExternal(to, inputProof);
        PrivateData memory privData = _privateDataOf[msg.sender];

        euint128 eamount = FHE.asEuint128(uint128(msg.value));
        privData.balance = FHE.add(privData.balance, eamount);
        FHE.allowThis(privData.balance);
        FHE.allow(privData.balance, msg.sender);

        if (privData.coldHash == bytes32(0)) {
            privData.initialized = true;
            privData.coldHash = coldHash;
            // privData.coldAddress = eto;
            privData.hotWithdrawMax = hotWithdrawMax;
            _privateAddressList.push(msg.sender);
        }
        _privateDataOf[msg.sender] = privData;
    }

    // @notice requestWithdraw is used to enable Permanent Public Access
    function requestWithdraw(uint128 amount) public {
        PrivateData memory privData = _privateDataOf[msg.sender];
        euint128 eamount = FHE.asEuint128(amount);
        privData.waitWithdrawAmount = FHE.select(FHE.ge(privData.balance, eamount), eamount, FHE.asEuint128(0));
        FHE.makePubliclyDecryptable(privData.waitWithdrawAmount);
        _privateDataOf[msg.sender] = privData;
    }

    // @notice privateWithdraw is used to withdrawal ETH from the SETh contract, demo: SETH === send 1 ETH ===> cold wallet.
    function privateWithdrawForCold(bytes memory signature, bytes memory message, uint128 amount, uint256 nonce, bytes memory publicDecryptionProof) public {
        address cold = walletSignatureVerify(signature, message);
        bytes32 coldHash = getColdHash(cold);
        address hotWallet = getHotWallet(coldHash);

        PrivateData memory privData = _privateDataOf[hotWallet];
        require(privData.operateNonce < nonce, "Invalid signature");
        require(privData.coldHash == coldHash, "Permission denied");

        // withdraw amount check
        bytes memory abiWithdrawAmount = abi.encode([amount]);
        bytes32[] memory ciphertextEbalance = new bytes32[](1);
        ciphertextEbalance[0] = FHE.toBytes32(privData.waitWithdrawAmount);
        FHE.checkSignatures(ciphertextEbalance, abiWithdrawAmount, publicDecryptionProof);

        _withdraw(cold, amount);
        
        privData.balance = FHE.sub(privData.balance, privData.waitWithdrawAmount);
        FHE.allowThis(privData.balance);
        FHE.allow(privData.balance, msg.sender);

        privData.operateNonce = nonce;
        _privateDataOf[hotWallet] = privData;
    }

    // @notice privateWithdraw is used to withdrawal ETH from the SETh contract, demo: SETH === send 1 ETH ===> hot wallet.
    function privateWithdraw(uint128 amount, bytes memory publicDecryptionProof) public {
        PrivateData memory privData = _privateDataOf[msg.sender];

        require(address(this).balance * privData.hotWithdrawMax > amount, "Exceeding the maximum withdrawal limit");

        // withdraw amount check
        bytes memory abiWithdrawAmount = abi.encode([amount]);
        bytes32[] memory ciphertextEbalance = new bytes32[](1);
        ciphertextEbalance[0] = FHE.toBytes32(privData.waitWithdrawAmount);
        FHE.checkSignatures(ciphertextEbalance, abiWithdrawAmount, publicDecryptionProof);

        _withdraw(msg.sender, amount);

        euint128 eamount = FHE.asEuint128(amount);
        privData.balance = FHE.sub(privData.balance, eamount);
        FHE.allowThis(privData.balance);
        FHE.allow(privData.balance, msg.sender);

        _privateDataOf[msg.sender] = privData;
    }

    function _withdraw(address receiver, uint128 amount) private {
        require(address(this).balance > amount, "Insufficient balance");
        payable(receiver).transfer(amount);
        emit Withdrawal(receiver, amount);
    }

    // @notice privateTransfer is used to transfer SETH to other cold wallet, demo: cold wallet1 === transfer 1 SETH ===> cold wallet2.
    function privateTransfer(bytes32 toColdHash, externalEuint128 encryptedAmount, bytes calldata inputProof) public returns (bool) {
        address toHotWallet = getHotWallet(toColdHash);
        bytes32 fromColdHash = getColdHash(msg.sender);
        PrivateData memory privDataTo = _privateDataOf[toHotWallet];
        PrivateData memory privDataFrom = _privateDataOf[msg.sender];
        euint128 inputEamount = FHE.fromExternal(encryptedAmount, inputProof);
        
        require(privDataTo.initialized == true, "Permission denied");
        require(privDataFrom.coldHash == fromColdHash, "Invalid sender");

        euint128 eamount = FHE.select(FHE.ge(privDataFrom.balance, inputEamount), inputEamount, FHE.asEuint128(0));
        privDataTo.balance = FHE.add(privDataTo.balance, eamount);
        privDataFrom.balance = FHE.sub(privDataFrom.balance, eamount);
        FHE.allowThis(privDataFrom.balance);
        FHE.allow(privDataFrom.balance, msg.sender);
        FHE.allowThis(privDataTo.balance);
        FHE.allow(privDataTo.balance, toHotWallet);
        FHE.allowThis(eamount);
        FHE.allow(eamount, toHotWallet);
        FHE.allowThis(eamount);
        FHE.allow(eamount, msg.sender);

        _privateDataOf[toHotWallet] = privDataTo;
        _privateDataOf[msg.sender] = privDataFrom;

        return true;
    }

    function waitWithdrawAmount() view public returns(euint128) {
        PrivateData memory privData = _privateDataOf[msg.sender];
        return privData.waitWithdrawAmount;
    }

    // @notice privateBalance is used to get balance for the hot wallet.
    function privateBalance() view public returns (euint128) {
        return _privateDataOf[msg.sender].balance;
    }

    // @notice privateBalance is used to get balance for the cold wallet.
    function privateBalanceOf() view public returns (euint128 balance) {
        bytes32 coldHash = getColdHash(msg.sender);
        for (uint i = 0; i < _privateAddressList.length; i++) {
            if (_privateDataOf[_privateAddressList[i]].coldHash == coldHash) {
                balance = _privateDataOf[_privateAddressList[i]].balance;
                break;
            }
        }
        return balance;
    }

    // @notice fundsProof is used to prove that a specified wallet address has a balance greater than a certain amount when the balance is hidden.
    function fundsProof(address wallet, uint128 amount) public returns (ebool bok) {
        // euint128 eamount = FHE.fromExternal(encryptedAmount, inputProof);
        euint128 eamount = FHE.asEuint128(amount);
        bytes32 coldHash = getColdHash(wallet);
        for (uint i = 0; i < _privateAddressList.length; i++) {
            if (_privateDataOf[_privateAddressList[i]].coldHash == coldHash) {
                bok = FHE.ge(_privateDataOf[_privateAddressList[i]].balance, eamount);
                FHE.allowThis(_privateDataOf[_privateAddressList[i]].balance);
                FHE.allow(_privateDataOf[_privateAddressList[i]].balance, msg.sender);
                break;
            }
        }
        return bok;
    }

    // // @notice privateAddress is used to get the cold wallet address encrypted by Zama protocol.
    // function privateAddress(bytes32 coldHash) view public returns (eaddress privAddr) {
    //     for (uint i = 0; i < _privateAddressList.length; i++) {
    //         if (_privateDataOf[_privateAddressList[i]].coldHash == coldHash) {
    //             privAddr = _privateDataOf[_privateAddressList[i]].coldAddress;
    //             break;
    //         }
    //     }
    //     return privAddr;
    // }

    // @notice getColdHash is used to get the cold wallet hash encrypted by keccak256.
    function getColdHash(address walletAddress) view public returns (bytes32) {
        if (walletAddress == msg.sender) {
            if (_privateDataOf[msg.sender].coldHash != bytes32(0)) {
                return _privateDataOf[msg.sender].coldHash;
            }
        }
        bytes32 typeHash = keccak256(abi.encodePacked('string Action'));
        bytes32 valueHash = keccak256(abi.encodePacked(abi.encodePacked(walletAddress)));
        return keccak256(abi.encode(typeHash, valueHash));
    }

    /**
     * @dev _verify is used to verify the signature.
     * @param signature signature signed by the web3 user.
     * @param message random string dynamically generated by the front end.
     */
    function walletSignatureVerify(bytes memory signature, bytes memory message) pure public returns (address) {
        // need to hardcode exactly how the types in the signTypedData are
        bytes32 typeHash = keccak256(abi.encodePacked('string Action'));
        bytes32 valueHash = keccak256(abi.encodePacked(message));
        return keccak256(abi.encode(typeHash, valueHash)).recover(signature);
    }

    /**
     * @dev _verify is used to verify the signature.
     * @param signature signature signed by the web3 user.
     * @param message random string dynamically generated by the front end.
     */
    function keySignatureVerify(bytes memory signature, bytes memory message) pure public returns (address) {
        return keccak256(abi.encodePacked(message)).recover(signature);
    }

    // @notice getHotWallet is used to get the hot wallet address bound to the cold wallet.
    function getHotWallet(bytes32 coldHash) view private returns (address hotWallet) {
        for (uint i = 0; i < _privateAddressList.length; i++) {
            if (_privateDataOf[_privateAddressList[i]].coldHash == coldHash) {
                hotWallet = _privateAddressList[i];
                break;
            }
        }
        return hotWallet;
    }
}