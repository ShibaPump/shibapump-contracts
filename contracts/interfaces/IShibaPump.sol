// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

contract IShibaPump {
    event SwapAndLiquify(
        uint tokensSwapped,
        uint ethReceived,
        uint tokensIntoLiqudity,
        address indexed router
    );
}
