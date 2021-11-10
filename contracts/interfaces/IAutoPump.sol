// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface IAutoPump {
    event Pancakeswap(bool status);
    event Biswap(bool status);
    event AmountToTriggerUpdated(uint _newAmountToTrigger);
    event BuyBackAndBurn(uint swappedEth, uint toBurn);

    function sellTokens(uint tokenAmount) external;

    function buyTokens(uint ethAmount) external;
}
