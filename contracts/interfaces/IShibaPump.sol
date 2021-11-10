// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface IShibaPump {
    event SwapAndLiquify(
        uint tokensSwapped,
        uint ethReceived,
        uint tokensIntoLiqudity,
        address indexed router
    );
}
