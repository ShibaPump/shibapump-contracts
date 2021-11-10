// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./interfaces/IERC20.sol";
import "./interfaces/IUniswap.sol";
import "./interfaces/IAutoPump.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AutoPump is Ownable, IAutoPump {
    uint public amountToTrigger;

    IERC20 public token;

    bool public onlyPancake = false;
    bool public onlyBiswap = false;

    address public constant WETH = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;

    IUniswapV2Router02 public constant PANCAKE_ROUTER =
        IUniswapV2Router02(0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F);
    IUniswapV2Router02 public constant BISWAP_ROUTER =
        IUniswapV2Router02(0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8);

    constructor() {
        amountToTrigger = 40 ether;
    }

    modifier onlyOwners() {
        require(
            msg.sender == address(token) || msg.sender == owner(),
            "Only owners"
        );
        _;
    }

    receive() external payable {
        if (payable(address(this)).balance >= amountToTrigger) {
            uint initialBalance = token.balanceOf(address(this));

            _buyTokens(amountToTrigger);

            uint toBurn = token.balanceOf(address(this)) - initialBalance;
            token.burn(toBurn);
            emit BuyBackAndBurn(amountToTrigger, toBurn);
        }
    }

    function setToken(address _token) external onlyOwner {
        token = IERC20(_token);
    }

    function setAmountToTrigger(uint _newAmountToTrigger) external onlyOwner {
        amountToTrigger = _newAmountToTrigger;
        emit AmountToTriggerUpdated(_newAmountToTrigger);
    }

    function setPancakeswap(bool status) external onlyOwner {
        onlyPancake = status;
        emit Pancakeswap(status);
    }

    function setBiswap(bool status) external onlyOwner {
        onlyBiswap = status;
        emit Biswap(status);
    }

    function sellTokens(uint tokenAmount) external override onlyOwners {
        if (_pseudoRandom() == 0) {
            _swapForETH(PANCAKE_ROUTER, tokenAmount);
        } else {
            _swapForETH(BISWAP_ROUTER, tokenAmount);
        }
    }

    function buyTokens(uint ethAmount) external override onlyOwners {
        if (_pseudoRandom() == 0) {
            _swapForTokens(PANCAKE_ROUTER, ethAmount);
        } else {
            _swapForTokens(BISWAP_ROUTER, ethAmount);
        }
    }

    function burnTokens() external onlyOwners {
        uint toBurn = token.balanceOf(address(this));
        token.burn(toBurn);
    }

    function _buyTokens(uint ethAmount) private {
        if (_pseudoRandom() == 0) {
            _swapForTokens(PANCAKE_ROUTER, ethAmount);
        } else {
            _swapForTokens(BISWAP_ROUTER, ethAmount);
        }
    }

    function _swapForETH(IUniswapV2Router02 router, uint tokenAmount) private {
        address[] memory path = new address[](2);
        path[0] = address(token);
        path[1] = WETH;

        token.approve(address(router), tokenAmount);

        router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0, // accept any amount of ETH
            path,
            address(this),
            block.timestamp
        );
    }

    function _swapForTokens(IUniswapV2Router02 router, uint ethAmount) private {
        address[] memory path = new address[](2);
        path[0] = address(WETH);
        path[1] = address(token);

        router.swapExactETHForTokensSupportingFeeOnTransferTokens{
            value: ethAmount
        }(
            0, // accept any amount of tokens
            path,
            address(this),
            block.timestamp
        );
    }

    function _pseudoRandom() private view returns (uint) {
        if (onlyPancake) return 0;
        if (onlyBiswap) return 1;
        return (uint(
            keccak256(
                abi.encodePacked(
                    block.difficulty,
                    block.timestamp,
                    token.totalSupply()
                )
            )
        ) % 2);
    }
}
