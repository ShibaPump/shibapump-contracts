// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

contract IAutoPump {
    event Pancakeswap(bool status);
    event Biswap(bool status);
    event AmountToTriggerUpdated(uint _newAmountToTrigger);
    event BuyBackAndBurn(uint swappedEth, uint toBurn);
}
