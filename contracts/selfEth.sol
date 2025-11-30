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
        bytes32 coldHash;
        euint128 balance;
        address hotWallet;
        uint256 operateNonce;
        uint256 hotWithdrawMax;
    }
    address[] public _privateAddressList;
    // mapping (eaddress => euint128)  public  _privateBalanceOf;
    // mapping (eaddress => PrivateData)  public  _privateDataOf;
    mapping (address => PrivateData)  public  _privateDataOf;
    // mapping (address => eaddress)  public  _privateDataOf;

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

    // @notice privateDeposit is used to deposit SETH to cold wallet, demo: wallet === send 1 SETH ===> cold wallet.
    function privateDeposit(bytes32 coldHash, uint256 hotWithdrawMax) public payable {
        // eaddress eto = FHE.fromExternal(to, inputProof);
        PrivateData memory privData = _privateDataOf[msg.sender];

        // bytes32[] memory cts1 = new bytes32[](1);
        // bytes32[] memory cts2 = new bytes32[](1);
        // cts1[0] = FHE.toBytes32(FHE.asEbool(true));
        // cts2[0] = FHE.toBytes32(FHE.eq(eto, privateAddress()));
        // require(cts1[0] != cts2[0], "Duplicate binding");

        // euint128 eamount = FHE.fromExternal(encryptedAmount, inputProof);
        euint128 eamount = FHE.asEuint128(uint128(msg.value));
        privData.balance = FHE.add(privData.balance, eamount);
        FHE.allowThis(privData.balance);
        FHE.allow(privData.balance, msg.sender);

        if (privData.coldHash == bytes32(0)) {
            privData.coldHash = coldHash;
            privData.hotWithdrawMax = hotWithdrawMax;
            _privateAddressList.push(msg.sender);
        }
        _privateDataOf[msg.sender] = privData;
        // _privateDataOf[msg.sender] = eto;
    }

    // @notice privateWithdraw is used to send ETH from hot wallet to cold wallet, demo: hot wallet === send 1 ETH ===> cold wallet.
    function privateWithdrawForCold(bytes memory signature, bytes memory message, uint128 amount, uint256 nonce) public {
        address cold = walletSignatureVerify(signature, message);
        bytes32 coldHash = getColdHash(cold);
        address hotWallet = privateAddress(coldHash);

        PrivateData memory privData = _privateDataOf[hotWallet];
        require(privData.operateNonce < nonce, "Invalid signature");
        require(privData.coldHash == coldHash, "Permission denied");

        // euint128 eamount = FHE.fromExternal(encryptedAmount, inputProof);
        euint128 eamount = FHE.asEuint128(amount);
        _withdraw(cold, amount);

        privData.balance = FHE.sub(privData.balance, eamount);
        FHE.allowThis(privData.balance);
        FHE.allow(privData.balance, msg.sender);

        privData.operateNonce = nonce;
        _privateDataOf[hotWallet] = privData;
    }

    function privateWithdraw(uint128 amount) public {
        PrivateData memory privData = _privateDataOf[msg.sender];

        require(address(this).balance * privData.hotWithdrawMax > amount, "Exceeding the maximum withdrawal limit");
        // euint128 eamount = FHE.fromExternal(encryptedAmount, inputProof);
        euint128 eamount = FHE.asEuint128(amount);
        _withdraw(msg.sender, amount);

        privData.balance = FHE.sub(privData.balance, eamount);
        FHE.allowThis(privData.balance);
        FHE.allow(privData.balance, msg.sender);

        _privateDataOf[msg.sender] = privData;
    }

    function _withdraw(address receiver, uint128 amount) private {
        // // require(address(this).balance > amount, "Insufficient balance");
        // // bytes32[] memory cts1 = new bytes32[](1);
        // // bytes32[] memory cts2 = new bytes32[](1);
        // // euint128 eamount = FHE.asEuint128(amount);
        // // eaddress eto = privateAddress();
        // bytes32[] memory cts1 = new bytes32[](1);
        // bytes32[] memory cts2 = new bytes32[](1);
        // cts2[0] = FHE.toBytes32(FHE.ge(privData.balance, eamount));
        // require(cts1[0] == cts2[0], "Insufficient balance of enctyptd amount");

        require(address(this).balance > amount, "Insufficient balance");
        payable(receiver).transfer(amount);
        emit Withdrawal(receiver, amount);
    }

    // @notice privateTransfer is used to transfer SETH to other cold wallet, demo: cold wallet1 === transfer 1 SETH ===> cold wallet2.
    function privateTransfer(bytes32 toColdHash, externalEuint128 encryptedAmount, bytes calldata inputProof) public returns (bool) {
        address toHotWallet = privateAddress(toColdHash);
        PrivateData memory privDataTo = _privateDataOf[toHotWallet];
        PrivateData memory privDataFrom = _privateDataOf[msg.sender];
        euint128 eamount = FHE.fromExternal(encryptedAmount, inputProof);

        require(privDataFrom.hotWallet == msg.sender, "Invalid sender");
        require(privDataTo.hotWallet != address(0), "Permission denied");

        // bytes32[] memory ctsFrom1 = new bytes32[](1);
        // bytes32[] memory ctsFrom2 = new bytes32[](1);
        // ctsFrom2[0] = FHE.toBytes32(FHE.ge(_privateBalanceOf[efrom].balance, eamount));
        // require(ctsFrom1[0] == ctsFrom2[0], "Insufficient balance of enctyptd amount");

        privDataTo.balance = FHE.add(privDataTo.balance, eamount);
        privDataFrom.balance = FHE.sub(privDataFrom.balance, eamount);
        FHE.allowThis(privDataFrom.balance);
        FHE.allow(privDataFrom.balance, msg.sender);
        FHE.allowThis(privDataTo.balance);
        FHE.allow(privDataTo.balance, msg.sender);

        _privateDataOf[toHotWallet] = privDataTo;
        _privateDataOf[msg.sender] = privDataFrom;

        return true;
    }

    // @notice privateBalance is used to get balance for the hot wallet.
    function privateBalance() view public returns (euint128) {
        return FHE.select(FHE.gt(_privateDataOf[msg.sender].balance, FHE.asEuint128(0)), _privateDataOf[msg.sender].balance, FHE.asEuint128(0));
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
        return FHE.select(balance, FHE.asEuint128(0)), balance, FHE.asEuint128(0);
    }

    function fundsProof(address wallet, externalEuint128 encryptedAmount, bytes calldata inputProof) public returns (ebool bok) {
        euint128 eamount = FHE.fromExternal(encryptedAmount, inputProof);
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

    // @notice privateAddress is used to get the cold wallet address encrypted by Zama protocol.
    function privateAddress(bytes32 coldHash) view public returns (address hotWallet) {
        for (uint i = 0; i < _privateAddressList.length; i++) {
            if (_privateDataOf[_privateAddressList[i]].coldHash == coldHash) {
                hotWallet = _privateAddressList[i];
                break;
            }
        }
        return hotWallet;
        // return _privateDataOf[msg.sender];
    }

    function getColdHash(address walletAddress) pure public returns (bytes32) {
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
}