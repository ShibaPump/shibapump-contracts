import { expect } from "chai";
import { ethers } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { increaseTime, n18 } from "./helpers";
// eslint-disable-next-line node/no-missing-import
import { IUniswapV2Router02, ShibaPump } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { formatEther } from "ethers/lib/utils";
import { constants, Contract } from "ethers";

describe("Token", function () {
  let token: ShibaPump;
  let WETH: Contract;
  let pancakeRouter: IUniswapV2Router02;
  let biswapRouter: IUniswapV2Router02;
  let accounts: SignerWithAddress[];
  let addresses: string[];
  let timestamp: number;
  const extraTime: number = 60 * 60 * 24;
  this.timeout(300000);

  before(async () => {
    accounts = await ethers.getSigners();
    addresses = accounts.map((account) => account.address);
  });

  beforeEach(async () => {
    timestamp = (await ethers.provider.getBlock(ethers.provider.blockNumber))
      .timestamp;
  });

  it("Should return the new token once deployed", async function () {
    const Token = await ethers.getContractFactory("ShibaPump");
    token = await Token.connect(accounts[10]).deploy(
      "Test",
      "TST",
      n18("100000000000")
    );
    await token.deployed();
  });

  it("Should return name", async () => {
    expect(await token.name()).to.equal("Test");
  });

  it("Should return symbol", async () => {
    expect(await token.symbol()).to.equal("TST");
  });

  it("Should return decimals", async () => {
    expect(await token.decimals()).to.equal(18);
  });

  it("Should instantiate pancakeRouter and pancakePair", async () => {
    pancakeRouter = await ethers.getContractAt(
      "IUniswapV2Router02",
      await token.PANCAKE_ROUTER(),
      accounts[10]
    );
  });

  it("Should fail approving address(0)", async () => {
    await expect(token.approve(constants.AddressZero, 100)).to.revertedWith(
      "approve to the zero address"
    );
  });

  it("Should fail transferFrom if not enough balance", async () => {
    await expect(
      token.transferFrom(addresses[1], addresses[2], 100)
    ).to.revertedWith("transfer amount > balance");
  });

  it("Should fail transferFrom if not enough allowance", async () => {
    await expect(
      token.transferFrom(addresses[10], addresses[2], 100)
    ).to.revertedWith("transfer amount > allowance");
  });

  it("Should fail transferFrom from address(0)", async () => {
    await expect(
      token.transferFrom(constants.AddressZero, addresses[2], 100)
    ).to.revertedWith("transfer from the zero address");
  });

  it("Should fail transferFrom to address(0)", async () => {
    await expect(
      token.transferFrom(addresses[10], constants.AddressZero, 100)
    ).to.revertedWith("transfer to the zero address");
  });

  it("Should increase allowance", async () => {
    await token.increaseAllowance(addresses[1], 100);
    expect(await token.allowance(addresses[10], addresses[1])).to.equal(100);
  });

  it("Should fail decreasing allowance below 0", async () => {
    await expect(token.decreaseAllowance(addresses[1], 1000)).to.revertedWith(
      "decreased allowance below zero"
    );
  });

  it("Should decrease allowance to 0", async () => {
    await token.decreaseAllowance(addresses[1], 100);
    expect(await token.allowance(addresses[10], addresses[1])).to.equal(0);
  });

  it("Should approve pancakeRouter", async () => {
    await token.approve(pancakeRouter.address, n18("15000000000"));
    expect(
      await token.allowance(addresses[10], pancakeRouter.address)
    ).to.equal(n18("15000000000"));
  });

  it("Should add liquidity on Pancake", async () => {
    await pancakeRouter.addLiquidityETH(
      token.address,
      n18("15000000000"),
      n18("0"),
      n18("50000"),
      accounts[10].address,
      timestamp + extraTime,
      { value: n18("50000") }
    );
  });

  it("Should instantiate biswapRouter and biswapPair", async () => {
    biswapRouter = await ethers.getContractAt(
      "IUniswapV2Router02",
      await token.BISWAP_ROUTER(),
      accounts[10]
    );
  });

  it("Should approve Biswap", async () => {
    await token.approve(biswapRouter.address, n18("15000000000"));
    expect(await token.allowance(addresses[10], biswapRouter.address)).to.equal(
      n18("15000000000")
    );
  });

  it("Should add liquidity on Biswap", async () => {
    await biswapRouter.addLiquidityETH(
      token.address,
      n18("15000000000"),
      n18("0"),
      n18("50000"),
      accounts[10].address,
      timestamp + extraTime,
      { value: n18("50000") }
    );
  });

  it("Instantiate WETH", async () => {
    const weth = await biswapRouter.WETH();
    WETH = await ethers.getContractAt("IERC20", weth, accounts[10]);
  });

  it("Should set burn Fee to 5%", async () => {
    await token.setFees(5, 2, 3, 1);
  });

  it("Should set new Max amount", async () => {
    await token.setMaxTxAmount(n18("500000000"));
  });

  it("Should fail transfer more than maxTxAmount", async () => {
    const userBalance = await token.balanceOf(addresses[0]);
    await token.approve(addresses[9], userBalance);
    await token.transferFrom(addresses[0], addresses[9], userBalance);
  });

  it("Should fail sellTokens on Pumper", async () => {
    const autoPump = await ethers.getContractAt(
      "AutoPump",
      await token.autoPump(),
      accounts[9]
    );
    await expect(autoPump.sellTokens(1)).to.revertedWith("Only owners");
  });

  describe("Swap - Scenarios", () => {
    describe("Scenario1", () => {
      describe("Buy tokens User 1,2,3,4", () => {
        describe("Biswap", () => {
          it("Should swap 10 ETH for Token using Biswap with user1", async (user: number = 1) => {
            const balanceBefore = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`before: user${user}: ${balanceBefore}`);
            const path = [WETH.address, token.address];
            await biswapRouter
              .connect(accounts[user])
              .swapExactETHForTokensSupportingFeeOnTransferTokens(
                0,
                path,
                addresses[user],
                timestamp + extraTime,
                {
                  value: n18("10"),
                }
              );

            const balanceAfter = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`after: user${user}: ${balanceAfter}`);
          });

          it("Should swap 100 ETH for Token using Biswap with user2", async (user: number = 2) => {
            const balanceBefore = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`before: user${user}: ${balanceBefore}`);
            const path = [WETH.address, token.address];
            await biswapRouter
              .connect(accounts[user])
              .swapExactETHForTokensSupportingFeeOnTransferTokens(
                0,
                path,
                addresses[user],
                timestamp + extraTime,
                {
                  value: n18("100"),
                }
              );

            const balanceAfter = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`after: user${user}: ${balanceAfter}`);
          });

          it("Should swap 200 ETH for Token using Biswap with user3", async (user: number = 3) => {
            const balanceBefore = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`before: user${user}: ${balanceBefore}`);
            const path = [WETH.address, token.address];
            await biswapRouter
              .connect(accounts[user])
              .swapExactETHForTokensSupportingFeeOnTransferTokens(
                0,
                path,
                addresses[user],
                timestamp + extraTime,
                {
                  value: n18("200"),
                }
              );

            const balanceAfter = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`after: user${user}: ${balanceAfter}`);
          });
          it("Should swap 300 ETH for Token using Biswap with user4", async (user: number = 4) => {
            const balanceBefore = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`before: user${user}: ${balanceBefore}`);
            const path = [WETH.address, token.address];
            await biswapRouter
              .connect(accounts[user])
              .swapExactETHForTokensSupportingFeeOnTransferTokens(
                0,
                path,
                addresses[user],
                timestamp + extraTime,
                {
                  value: n18("300"),
                }
              );

            const balanceAfter = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`after: user${user}: ${balanceAfter}`);
          });
        });

        describe("Pancakeswap", () => {
          it("Should swap 10 ETH for Token using Pancakeswap with user1", async (user: number = 1) => {
            const balanceBefore = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`before: user${user}: ${balanceBefore}`);
            const path = [WETH.address, token.address];
            await pancakeRouter
              .connect(accounts[user])
              .swapExactETHForTokensSupportingFeeOnTransferTokens(
                0,
                path,
                addresses[user],
                timestamp + extraTime,
                {
                  value: n18("10"),
                }
              );

            const balanceAfter = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`after: user${user}: ${balanceAfter}`);
          });
          it("Should swap 100 ETH for Token using Pancakeswap with user2", async (user: number = 2) => {
            const balanceBefore = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`before: user${user}: ${balanceBefore}`);
            const path = [WETH.address, token.address];
            await pancakeRouter
              .connect(accounts[user])
              .swapExactETHForTokensSupportingFeeOnTransferTokens(
                0,
                path,
                addresses[user],
                timestamp + extraTime,
                {
                  value: n18("100"),
                }
              );

            const balanceAfter = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`after: user${user}: ${balanceAfter}`);
          });
          it("Should swap 200 ETH for Token using Pancakeswap with user3", async (user: number = 3) => {
            const balanceBefore = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`before: user${user}: ${balanceBefore}`);
            const path = [WETH.address, token.address];
            await pancakeRouter
              .connect(accounts[user])
              .swapExactETHForTokensSupportingFeeOnTransferTokens(
                0,
                path,
                addresses[user],
                timestamp + extraTime,
                {
                  value: n18("200"),
                }
              );

            const balanceAfter = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`after: user${user}: ${balanceAfter}`);
          });
          it("Should swap 300 ETH for Token using Pancakeswap with user4", async (user: number = 4) => {
            const balanceBefore = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`before: user${user}: ${balanceBefore}`);
            const path = [WETH.address, token.address];
            await pancakeRouter
              .connect(accounts[user])
              .swapExactETHForTokensSupportingFeeOnTransferTokens(
                0,
                path,
                addresses[user],
                timestamp + extraTime,
                {
                  value: n18("300"),
                }
              );

            const balanceAfter = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`after: user${user}: ${balanceAfter}`);
          });
        });
      });
      describe("Sell tokens User 1,2,3,4", () => {
        describe("Biswap 1,3", () => {
          it("Should swap Token for ETH using Biswap with user1", async (user: number = 1) => {
            await increaseTime(60 * 60);
            const ethBalanceBefore = await accounts[user].getBalance();
            console.log(
              `beforeEthBalance: user${user} ${formatEther(ethBalanceBefore)}`
            );
            const balanceBefore = await token.balanceOf(addresses[user]);
            console.log(`before: user${user}: ${formatEther(balanceBefore)}`);
            await token
              .connect(accounts[user])
              .approve(biswapRouter.address, balanceBefore);
            const path = [token.address, WETH.address];
            await biswapRouter
              .connect(accounts[user])
              .swapExactTokensForETHSupportingFeeOnTransferTokens(
                balanceBefore,
                0,
                path,
                addresses[user],
                timestamp + extraTime
              );
            const balanceAfter = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`after: user${user}: ${balanceAfter}`);
            console.log(
              `afterEthBalance: user${user} ${formatEther(
                (await accounts[user].getBalance()).sub(ethBalanceBefore)
              )}`
            );
          });

          it("Should swap Token for ETH using Biswap with user3", async (user: number = 3) => {
            await increaseTime(60 * 60);
            const ethBalanceBefore = await accounts[user].getBalance();
            console.log(
              `beforeEthBalance: user${user} ${formatEther(ethBalanceBefore)}`
            );
            const balanceBefore = await token.balanceOf(addresses[user]);
            console.log(`before: user${user}: ${formatEther(balanceBefore)}`);
            await token
              .connect(accounts[user])
              .approve(biswapRouter.address, balanceBefore);
            const path = [token.address, WETH.address];
            await biswapRouter
              .connect(accounts[user])
              .swapExactTokensForETHSupportingFeeOnTransferTokens(
                balanceBefore,
                0,
                path,
                addresses[user],
                timestamp + extraTime
              );
            const balanceAfter = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`after: user${user}: ${balanceAfter}`);
            console.log(
              `afterEthBalance: user${user} ${formatEther(
                (await accounts[user].getBalance()).sub(ethBalanceBefore)
              )}`
            );
          });
        });

        describe("PancakeSwap 2,4", () => {
          it("Should swap Token for ETH using PancakeSwap with user2", async (user: number = 2) => {
            await increaseTime(60 * 60);
            const ethBalanceBefore = await accounts[user].getBalance();
            console.log(
              `beforeEthBalance: user${user} ${formatEther(ethBalanceBefore)}`
            );
            const balanceBefore = await token.balanceOf(addresses[user]);
            console.log(`before: user${user}: ${formatEther(balanceBefore)}`);
            await token
              .connect(accounts[user])
              .approve(pancakeRouter.address, balanceBefore);
            const path = [token.address, WETH.address];
            await pancakeRouter
              .connect(accounts[user])
              .swapExactTokensForETHSupportingFeeOnTransferTokens(
                balanceBefore,
                0,
                path,
                addresses[user],
                timestamp + extraTime
              );
            const balanceAfter = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`after: user${user}: ${balanceAfter}`);
            console.log(
              `afterEthBalance: user${user} ${formatEther(
                (await accounts[user].getBalance()).sub(ethBalanceBefore)
              )}`
            );
          });

          it("Should swap Token for ETH using PancakeSwap with user4", async (user: number = 4) => {
            await increaseTime(60 * 60);
            const ethBalanceBefore = await accounts[user].getBalance();
            console.log(
              `beforeEthBalance: user${user} ${formatEther(ethBalanceBefore)}`
            );
            const balanceBefore = await token.balanceOf(addresses[user]);
            console.log(`before: user${user}: ${formatEther(balanceBefore)}`);
            await token
              .connect(accounts[user])
              .approve(pancakeRouter.address, balanceBefore);
            const path = [token.address, WETH.address];
            await pancakeRouter
              .connect(accounts[user])
              .swapExactTokensForETHSupportingFeeOnTransferTokens(
                balanceBefore,
                0,
                path,
                addresses[user],
                timestamp + extraTime
              );
            const balanceAfter = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`after: user${user}: ${balanceAfter}`);
            console.log(
              `afterEthBalance: user${user} ${formatEther(
                (await accounts[user].getBalance()).sub(ethBalanceBefore)
              )}`
            );
          });
        });
      });
    });
    describe("Scenario2", () => {
      describe("Buy tokens user 5,6,7,8", () => {
        describe("Biswap", () => {
          it("Should swap 100 ETH for Token using Biswap with user5", async (user: number = 5) => {
            const balanceBefore = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`before: user${user}: ${balanceBefore}`);
            const path = [WETH.address, token.address];
            await biswapRouter
              .connect(accounts[user])
              .swapExactETHForTokensSupportingFeeOnTransferTokens(
                0,
                path,
                addresses[user],
                timestamp + extraTime,
                {
                  value: n18("100"),
                }
              );

            const balanceAfter = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`after: user${user}: ${balanceAfter}`);
          });

          it("Should swap 100 ETH for Token using Biswap with user6", async (user: number = 6) => {
            const balanceBefore = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`before: user${user}: ${balanceBefore}`);
            const path = [WETH.address, token.address];
            await biswapRouter
              .connect(accounts[user])
              .swapExactETHForTokensSupportingFeeOnTransferTokens(
                0,
                path,
                addresses[user],
                timestamp + extraTime,
                {
                  value: n18("100"),
                }
              );

            const balanceAfter = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`after: user${user}: ${balanceAfter}`);
          });

          it("Should swap 100 ETH for Token using Biswap with user7", async (user: number = 7) => {
            const balanceBefore = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`before: user${user}: ${balanceBefore}`);
            const path = [WETH.address, token.address];
            await biswapRouter
              .connect(accounts[user])
              .swapExactETHForTokensSupportingFeeOnTransferTokens(
                0,
                path,
                addresses[user],
                timestamp + extraTime,
                {
                  value: n18("100"),
                }
              );

            const balanceAfter = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`after: user${user}: ${balanceAfter}`);
          });
          it("Should swap 100 ETH for Token using Biswap with user8", async (user: number = 8) => {
            const balanceBefore = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`before: user${user}: ${balanceBefore}`);
            const path = [WETH.address, token.address];
            await biswapRouter
              .connect(accounts[user])
              .swapExactETHForTokensSupportingFeeOnTransferTokens(
                0,
                path,
                addresses[user],
                timestamp + extraTime,
                {
                  value: n18("100"),
                }
              );

            const balanceAfter = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`after: user${user}: ${balanceAfter}`);
          });
        });

        describe("Pancakeswap", () => {
          it("Should swap 100 ETH for Token using Pancakeswap with user5", async (user: number = 5) => {
            const balanceBefore = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`before: user${user}: ${balanceBefore}`);
            const path = [WETH.address, token.address];
            await pancakeRouter
              .connect(accounts[user])
              .swapExactETHForTokensSupportingFeeOnTransferTokens(
                0,
                path,
                addresses[user],
                timestamp + extraTime,
                {
                  value: n18("100"),
                }
              );

            const balanceAfter = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`after: user${user}: ${balanceAfter}`);
          });
          it("Should swap 100 ETH for Token using Pancakeswap with user6", async (user: number = 6) => {
            const balanceBefore = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`before: user${user}: ${balanceBefore}`);
            const path = [WETH.address, token.address];
            await pancakeRouter
              .connect(accounts[user])
              .swapExactETHForTokensSupportingFeeOnTransferTokens(
                0,
                path,
                addresses[user],
                timestamp + extraTime,
                {
                  value: n18("100"),
                }
              );

            const balanceAfter = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`after: user${user}: ${balanceAfter}`);
          });
          it("Should swap 100 ETH for Token using Pancakeswap with user7", async (user: number = 7) => {
            const balanceBefore = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`before: user${user}: ${balanceBefore}`);
            const path = [WETH.address, token.address];
            await pancakeRouter
              .connect(accounts[user])
              .swapExactETHForTokensSupportingFeeOnTransferTokens(
                0,
                path,
                addresses[user],
                timestamp + extraTime,
                {
                  value: n18("100"),
                }
              );

            const balanceAfter = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`after: user${user}: ${balanceAfter}`);
          });
          it("Should swap 100 ETH for Token using Pancakeswap with user8", async (user: number = 8) => {
            const balanceBefore = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`before: user${user}: ${balanceBefore}`);
            const path = [WETH.address, token.address];
            await pancakeRouter
              .connect(accounts[user])
              .swapExactETHForTokensSupportingFeeOnTransferTokens(
                0,
                path,
                addresses[user],
                timestamp + extraTime,
                {
                  value: n18("100"),
                }
              );

            const balanceAfter = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`after: user${user}: ${balanceAfter}`);
          });
        });
      });
      describe("Sell tokens User 5,6,7,8", () => {
        describe("Biswap 5,7", () => {
          it("Should swap Token for ETH using Biswap with user5", async (user: number = 5) => {
            await increaseTime(60 * 60);
            const ethBalanceBefore = await accounts[user].getBalance();
            console.log(
              `beforeEthBalance: user${user} ${formatEther(ethBalanceBefore)}`
            );
            const balanceBefore = await token.balanceOf(addresses[user]);
            console.log(`before: user${user}: ${formatEther(balanceBefore)}`);
            await token
              .connect(accounts[user])
              .approve(biswapRouter.address, balanceBefore);
            const path = [token.address, WETH.address];
            await biswapRouter
              .connect(accounts[user])
              .swapExactTokensForETHSupportingFeeOnTransferTokens(
                balanceBefore,
                0,
                path,
                addresses[user],
                timestamp + extraTime
              );
            const balanceAfter = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`after: user${user}: ${balanceAfter}`);
            console.log(
              `afterEthBalance: user${user} ${formatEther(
                (await accounts[user].getBalance()).sub(ethBalanceBefore)
              )}`
            );
          });

          it("Should swap Token for ETH using Biswap with user7", async (user: number = 7) => {
            await increaseTime(60 * 60);
            const ethBalanceBefore = await accounts[user].getBalance();
            console.log(
              `beforeEthBalance: user${user} ${formatEther(ethBalanceBefore)}`
            );
            const balanceBefore = await token.balanceOf(addresses[user]);
            console.log(`before: user${user}: ${formatEther(balanceBefore)}`);
            await token
              .connect(accounts[user])
              .approve(biswapRouter.address, balanceBefore);
            const path = [token.address, WETH.address];
            await biswapRouter
              .connect(accounts[user])
              .swapExactTokensForETHSupportingFeeOnTransferTokens(
                balanceBefore,
                0,
                path,
                addresses[user],
                timestamp + extraTime
              );
            const balanceAfter = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`after: user${user}: ${balanceAfter}`);
            console.log(
              `afterEthBalance: user${user} ${formatEther(
                (await accounts[user].getBalance()).sub(ethBalanceBefore)
              )}`
            );
          });
        });

        describe("PancakeSwap 6,8", () => {
          it("Should swap Token for ETH using PancakeSwap with user6", async (user: number = 6) => {
            await increaseTime(60 * 60);
            const ethBalanceBefore = await accounts[user].getBalance();
            console.log(
              `beforeEthBalance: user${user} ${formatEther(ethBalanceBefore)}`
            );
            const balanceBefore = await token.balanceOf(addresses[user]);
            console.log(`before: user${user}: ${formatEther(balanceBefore)}`);
            await token
              .connect(accounts[user])
              .approve(pancakeRouter.address, balanceBefore);
            const path = [token.address, WETH.address];
            await pancakeRouter
              .connect(accounts[user])
              .swapExactTokensForETHSupportingFeeOnTransferTokens(
                balanceBefore,
                0,
                path,
                addresses[user],
                timestamp + extraTime
              );
            const balanceAfter = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`after: user${user}: ${balanceAfter}`);
            console.log(
              `afterEthBalance: user${user} ${formatEther(
                (await accounts[user].getBalance()).sub(ethBalanceBefore)
              )}`
            );
          });

          it("Should swap Token for ETH using PancakeSwap with user8", async (user: number = 8) => {
            await increaseTime(60 * 60);
            const ethBalanceBefore = await accounts[user].getBalance();
            console.log(
              `beforeEthBalance: user${user} ${formatEther(ethBalanceBefore)}`
            );
            const balanceBefore = await token.balanceOf(addresses[user]);
            console.log(`before: user${user}: ${formatEther(balanceBefore)}`);
            await token
              .connect(accounts[user])
              .approve(pancakeRouter.address, balanceBefore);
            const path = [token.address, WETH.address];
            await pancakeRouter
              .connect(accounts[user])
              .swapExactTokensForETHSupportingFeeOnTransferTokens(
                balanceBefore,
                0,
                path,
                addresses[user],
                timestamp + extraTime
              );
            const balanceAfter = formatEther(
              await token.balanceOf(addresses[user])
            );
            console.log(`after: user${user}: ${balanceAfter}`);
            console.log(
              `afterEthBalance: user${user} ${formatEther(
                (await accounts[user].getBalance()).sub(ethBalanceBefore)
              )}`
            );
          });
        });
      });
    });
  });
});
