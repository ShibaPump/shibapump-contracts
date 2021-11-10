// import { expect } from "chai";
// import { ethers } from "hardhat";
// import { increaseTime, n18 } from "./helpers";
// import { IUniswapV2Pair, IUniswapV2Router02, Token } from "../typechain";
// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
// import { formatEther } from "ethers/lib/utils";
//
// describe("Token", function () {
//   let token: Token;
//   let WETH: Token;
//   let pancakeRouter: IUniswapV2Router02;
//   let biswapRouter: IUniswapV2Router02;
//   let accounts: SignerWithAddress[];
//   let addresses: string[];
//   let timestamp: number;
//   let pancakePair: IUniswapV2Pair;
//   let biswapPair: IUniswapV2Pair;
//   const extraTime: number = 60 * 60 * 24;
//   this.timeout(300000);
//
//   before(async () => {
//     accounts = await ethers.getSigners();
//     addresses = accounts.map((account) => account.address);
//   });
//
//   beforeEach(async () => {
//     timestamp = (await ethers.provider.getBlock(ethers.provider.blockNumber))
//       .timestamp;
//     console.log(timestamp);
//     if (token) {
//       const totalSupply = await token.totalSupply();
//       const pumperBalance = await token.balanceOf(await token.pumper());
//       const tokenBalance = await token.balanceOf(token.address);
//
//       console.log("pumperBalance:", formatEther(pumperBalance.toString()));
//       console.log("tokenBalance:", formatEther(tokenBalance.toString()));
//       console.log("totalSupply", formatEther(totalSupply.toString()));
//     }
//   });
//
//   it("Should return the new token once deployed", async function () {
//     const Token = await ethers.getContractFactory("Token");
//     token = await Token.connect(accounts[10]).deploy(
//       "Test",
//       "TST",
//       n18("100000000000")
//     );
//     await token.deployed();
//   });
//
//   it("Should instantiate pancakeRouter and pancakePair", async () => {
//     pancakeRouter = await ethers.getContractAt(
//       "IUniswapV2Router02",
//       await token.pancakeRouter(),
//       accounts[10]
//     );
//
//     pancakePair = await ethers.getContractAt(
//       "IUniswapV2Pair",
//       await token.pancakeV2Pair(),
//       accounts[10]
//     );
//   });
//
//   it("Should add liquidity on Pancake", async () => {
//     await token.approve(pancakeRouter.address, n18("15000000000"));
//     await pancakeRouter.addLiquidityETH(
//       token.address,
//       n18("15000000000"),
//       n18("0"),
//       n18("50000"),
//       accounts[10].address,
//       timestamp + extraTime,
//       { value: n18("50000") }
//     );
//   });
//
//   it("Should instantiate biswapRouter and biswapPair", async () => {
//     biswapRouter = await ethers.getContractAt(
//       "IUniswapV2Router02",
//       await token.biswapRouter(),
//       accounts[10]
//     );
//
//     biswapPair = await ethers.getContractAt(
//       "IUniswapV2Pair",
//       await token.biswapV2Pair(),
//       accounts[10]
//     );
//   });
//
//   it("Should add liquidity on Biswap", async () => {
//     await token.approve(biswapRouter.address, n18("15000000000"));
//     await biswapRouter.addLiquidityETH(
//       token.address,
//       n18("15000000000"),
//       n18("0"),
//       n18("50000"),
//       accounts[10].address,
//       timestamp + extraTime,
//       { value: n18("50000") }
//     );
//   });
//
//   it("Initiate WETH", async () => {
//     const weth = await biswapRouter.WETH();
//     WETH = await ethers.getContractAt("ERC20", weth, accounts[10]);
//   });
//
//   it("Should display balance on LPTokens Pair on Biswap", async () => {
//     const LPBiswapTokenAddress = await biswapPair.balanceOf(token.address);
//     const LPBiswapUser = await biswapPair.balanceOf(addresses[10]);
//     console.log("TokenBalance BiswapLP:", LPBiswapTokenAddress.toString());
//     console.log("UserBalance: BiswapLP", LPBiswapUser.toString());
//   });
//
//   it("Should display balance on LPTokens Pair on Pancake", async () => {
//     const LPPancakeTokenAddress = await pancakePair.balanceOf(token.address);
//     const LPPancakeUser = await pancakePair.balanceOf(addresses[10]);
//     console.log("TokenBalance PancakeLP:", LPPancakeTokenAddress.toString());
//     console.log("UserBalance: PancakeLP", LPPancakeUser.toString());
//   });
//
//   it("Should transfer user10 whole balances to a no-whitelisted address (user0)", async () => {
//     await token.transfer(addresses[0], await token.balanceOf(addresses[10]));
//     token = await ethers.getContractAt("Token", token.address, accounts[0]);
//   });
//
//   it("Should return the amount transferred with 0% fees", async () => {
//     const balanceUser1Before = await token.balanceOf(addresses[1]);
//     expect(balanceUser1Before).to.equal(n18("0"));
//
//     await token.transfer(addresses[1], n18("100000000"));
//
//     const balanceUser1After = await token.balanceOf(addresses[1]);
//     expect(balanceUser1After).to.equal(n18("100000000"));
//   });
//
//   it("Should set burn Fee to 5%", async () => {
//     await token.setBurnFee(5);
//   });
//
//   it("Should return the amount transferred with 5% fees", async () => {
//     const balanceUser2Before = await token.balanceOf(addresses[2]);
//     expect(balanceUser2Before).to.equal(n18("0"));
//
//     await token.transfer(addresses[2], n18("100000000"));
//
//     const balanceUser2After = await token.balanceOf(addresses[2]);
//     expect(balanceUser2After).to.equal(n18("95000000"));
//   });
//
//   it("Should returns totalSupply after burn", async () => {
//     const totalSupply = await token.totalSupply();
//     expect(totalSupply).to.equal(n18("99995000000"));
//   });
//
//   it("Should set liquidity Fee to 2%", async () => {
//     await token.setLiquidityFee(2);
//   });
//
//   it("Should return the amount transferred with 5% burn fees and 2% liquidity fees", async () => {
//     const balanceUser3Before = await token.balanceOf(addresses[3]);
//     expect(balanceUser3Before).to.equal(n18("0"));
//
//     await token.transfer(addresses[3], n18("100000000"));
//
//     const balanceUser3After = await token.balanceOf(addresses[3]);
//     expect(balanceUser3After).to.equal(n18("93000000"));
//   });
//
//   it("Should returns totalSupply after burn", async () => {
//     const totalSupply = await token.totalSupply();
//     expect(totalSupply).to.equal(n18("99990000000"));
//   });
//
//   it("Should set pump fee to 3%", async () => {
//     await token.setPumpFee(3);
//   });
//
//   it("Should return the amount transferred with 5% burn fees, 2% liquidity fees and 3% pump fees", async () => {
//     const balanceUser4Before = await token.balanceOf(addresses[4]);
//     expect(balanceUser4Before).to.equal(n18("0"));
//
//     await token.transfer(addresses[4], n18("100000000"));
//
//     const balanceUser4After = await token.balanceOf(addresses[4]);
//     expect(balanceUser4After).to.equal(n18("90000000"));
//   });
//
//   it("Should returns totalSupply after burn", async () => {
//     const totalSupply = await token.totalSupply();
//     expect(totalSupply).to.equal(n18("99985000000"));
//   });
//
//   it("Should return the amount transferred with 5% burn fees, 2% liquidity fees and 3% pump fees", async () => {
//     let contractBalance = await token.balanceOf(token.address);
//     const feeBalance = await token.balanceOf(await token.pumper());
//     let totalSupply = await token.totalSupply();
//
//     // console.log(
//     //   "TOKEN:",
//     //   (await token.balanceOf(await token.pumper())).toString()
//     // );
//
//     let LPBiswapTokenAddress = await biswapPair.balanceOf(token.address);
//     let LPBiswapUser = await biswapPair.balanceOf(addresses[10]);
//     // console.log("TokenBalance BiswapLP:", LPBiswapTokenAddress.toString());
//     // console.log("UserBalance: BiswapLP", LPBiswapUser.toString());
//
//     let LPPancakeTokenAddress = await pancakePair.balanceOf(token.address);
//     let LPPancakeUser = await pancakePair.balanceOf(addresses[10]);
//     // console.log("TokenBalance PancakeLP:", LPPancakeTokenAddress.toString());
//     // console.log("UserBalance: PancakeLP", LPPancakeUser.toString());
//
//     // console.log(
//     //   contractBalance.toString(),
//     //   feeBalance.toString(),
//     //   totalSupply.toString()
//     // );
//
//     const balanceUser5Before = await token.balanceOf(addresses[5]);
//     expect(balanceUser5Before).to.equal(n18("0"));
//
//     await token.transfer(addresses[5], n18("50000"));
//
//     const balanceUser5After = await token.balanceOf(addresses[5]);
//     expect(balanceUser5After).to.equal(n18("45000"));
//   });
//
//   it("Should set new Max amount", async () => {
//     await token.setMaxTxAmount(n18("500000000"));
//   });
//
//   it("Should swap 10 ETH for Token using Biswap with user3", async (user: number = 3) => {
//     const path = [WETH.address, token.address];
//     await biswapRouter
//       .connect(accounts[user])
//       .swapExactETHForTokensSupportingFeeOnTransferTokens(
//         0,
//         path,
//         addresses[user],
//         timestamp + extraTime,
//         {
//           value: n18("10"),
//         }
//       );
//   });
//
//   it("Should swap 50 ETH for Token using Biswap with user4", async (user: number = 4) => {
//     const path = [WETH.address, token.address];
//     await biswapRouter
//       .connect(accounts[user])
//       .swapExactETHForTokensSupportingFeeOnTransferTokens(
//         0,
//         path,
//         addresses[user],
//         timestamp + extraTime,
//         {
//           value: n18("50"),
//         }
//       );
//   });
//
//   it("Should swap 100 ETH for Token using Biswap with user5", async (user: number = 5) => {
//     const path = [WETH.address, token.address];
//     await biswapRouter
//       .connect(accounts[user])
//       .swapExactETHForTokensSupportingFeeOnTransferTokens(
//         0,
//         path,
//         addresses[user],
//         timestamp + extraTime,
//         {
//           value: n18("100"),
//         }
//       );
//   });
//
//   it("Should swap 1000 ETH for Token using Biswap with user6", async (user: number = 6) => {
//     const path = [WETH.address, token.address];
//     await biswapRouter
//       .connect(accounts[user])
//       .swapExactETHForTokensSupportingFeeOnTransferTokens(
//         0,
//         path,
//         addresses[user],
//         timestamp + extraTime,
//         {
//           value: n18("1000"),
//         }
//       );
//   });
//
//   // it.skip("Should Fail swap on biswap 10000 ETH (exceed maxTxAmount)", async (user: number = 7) => {
//   //   const path = [WETH.address, token.address];
//   //   await expect(
//   //     biswapRouter
//   //       .connect(accounts[user])
//   //       .swapExactETHForTokensSupportingFeeOnTransferTokens(
//   //         0,
//   //         path,
//   //         addresses[user],
//   //         timestamp + extraTime,
//   //         {
//   //           value: n18("10000"),
//   //         }
//   //       )
//   //   ).reverted;
//   // });
//
//   it("Should swap 10 ETH for Token using PancakeSwap with user3", async (user: number = 3) => {
//     const path = [WETH.address, token.address];
//     await pancakeRouter
//       .connect(accounts[user])
//       .swapExactETHForTokensSupportingFeeOnTransferTokens(
//         0,
//         path,
//         addresses[user],
//         timestamp + extraTime,
//         {
//           value: n18("10"),
//         }
//       );
//   });
//
//   it("Should swap 50 ETH for Token using PancakeSwap with user4", async (user: number = 4) => {
//     const path = [WETH.address, token.address];
//     await pancakeRouter
//       .connect(accounts[user])
//       .swapExactETHForTokensSupportingFeeOnTransferTokens(
//         0,
//         path,
//         addresses[user],
//         timestamp + extraTime,
//         {
//           value: n18("50"),
//         }
//       );
//   });
//
//   it("Should swap 100 ETH for Token using PancakeSwap with user5", async (user: number = 5) => {
//     const path = [WETH.address, token.address];
//     await pancakeRouter
//       .connect(accounts[user])
//       .swapExactETHForTokensSupportingFeeOnTransferTokens(
//         0,
//         path,
//         addresses[user],
//         timestamp + extraTime,
//         {
//           value: n18("100"),
//         }
//       );
//   });
//
//   it("Should swap 1000 ETH for Token using PancakeSwap with user6", async (user: number = 6) => {
//     const path = [WETH.address, token.address];
//     await pancakeRouter
//       .connect(accounts[user])
//       .swapExactETHForTokensSupportingFeeOnTransferTokens(
//         0,
//         path,
//         addresses[user],
//         timestamp + extraTime,
//         {
//           value: n18("1000"),
//         }
//       );
//   });
//
//   // it.skip("Should Fail swap on pancakeswap 10000 ETH (exceed maxTxAmount)", async (user: number = 7) => {
//   //   const path = [WETH.address, token.address];
//   //   await expect(
//   //     pancakeRouter
//   //       .connect(accounts[user])
//   //       .swapExactETHForTokensSupportingFeeOnTransferTokens(
//   //         0,
//   //         path,
//   //         addresses[user],
//   //         timestamp + extraTime,
//   //         {
//   //           value: n18("10000"),
//   //         }
//   //       )
//   //   ).reverted;
//   // });
//
//   // it("Should swap Token for ETH using Biswap with user3", async (user: number = 3) => {
//   //   await increaseTime(60 * 60);
//   //   const balance = await token.balanceOf(addresses[user]);
//   //   console.log(balance.toString());
//   //   await token.connect(accounts[user]).approve(biswapRouter.address, balance);
//   //   const path = [token.address, WETH.address];
//   //   await biswapRouter
//   //     .connect(accounts[user])
//   //     .swapExactTokensForETHSupportingFeeOnTransferTokens(
//   //       balance,
//   //       0,
//   //       path,
//   //       addresses[user],
//   //       timestamp + extraTime
//   //     );
//   // });
//
//   // it("Should swap Token for ETH using Biswap with user4", async (user: number = 4) => {
//   //   const balance = await token.balanceOf(addresses[user]);
//   //   console.log(balance.toString());
//   //   await token.connect(accounts[user]).approve(biswapRouter.address, balance);
//   //   const path = [token.address, WETH.address];
//   //   await biswapRouter
//   //     .connect(accounts[user])
//   //     .swapExactTokensForETHSupportingFeeOnTransferTokens(
//   //       balance,
//   //       0,
//   //       path,
//   //       addresses[user],
//   //       timestamp + extraTime
//   //     );
//   // });
//   //
//   // // it("Should swap Token for ETH using Biswap with user5", async (user: number = 5) => {
//   // //   const balance = await token.balanceOf(addresses[user]);
//   // //   console.log(balance.toString());
//   // //   await token.connect(accounts[user]).approve(biswapRouter.address, balance);
//   // //   const path = [token.address, WETH.address];
//   // //   await biswapRouter
//   // //     .connect(accounts[user])
//   // //     .swapExactTokensForETHSupportingFeeOnTransferTokens(
//   // //       balance,
//   // //       0,
//   // //       path,
//   // //       addresses[user],
//   // //       timestamp + extraTime
//   // //     );
//   // // });
//   // //
//   // // it("Should swap Token for ETH using Biswap with user6", async (user: number = 6) => {
//   // //   const balance = await token.balanceOf(addresses[user]);
//   // //   console.log(balance.toString());
//   // //   await token.connect(accounts[user]).approve(biswapRouter.address, balance);
//   // //   const path = [token.address, WETH.address];
//   // //   await biswapRouter
//   // //     .connect(accounts[user])
//   // //     .swapExactTokensForETHSupportingFeeOnTransferTokens(
//   // //       balance,
//   // //       0,
//   // //       path,
//   // //       addresses[user],
//   // //       timestamp + extraTime
//   // //     );
//   // // });
//   //
//   // // it("Should swap Token for ETH using Pancake with user3", async (user: number = 3) => {
//   // //   const balance = await token.balanceOf(addresses[user]);
//   // //   console.log(balance.toString());
//   // //   await token.connect(accounts[user]).approve(biswapRouter.address, balance);
//   // //   const path = [token.address, WETH.address];
//   // //   await pancakeRouter
//   // //     .connect(accounts[user])
//   // //     .swapExactTokensForETHSupportingFeeOnTransferTokens(
//   // //       balance,
//   // //       0,
//   // //       path,
//   // //       addresses[user],
//   // //       timestamp + extraTime
//   // //     );
//   // // });
//   // //
//   // // it("Should swap Token for ETH using Pancake with user4", async (user: number = 4) => {
//   // //   const balance = await token.balanceOf(addresses[user]);
//   // //   console.log(balance.toString());
//   // //   await token.connect(accounts[user]).approve(pancakeRouter.address, balance);
//   // //   const path = [token.address, WETH.address];
//   // //   await pancakeRouter
//   // //     .connect(accounts[user])
//   // //     .swapExactTokensForETHSupportingFeeOnTransferTokens(
//   // //       balance,
//   // //       0,
//   // //       path,
//   // //       addresses[user],
//   // //       timestamp + extraTime
//   // //     );
//   // // });
//   //
//   // it("Should swap Token for ETH using Pancake with user5", async (user: number = 5) => {
//   //   const balance = await token.balanceOf(addresses[user]);
//   //   console.log(balance.toString());
//   //   await token.connect(accounts[user]).approve(pancakeRouter.address, balance);
//   //   const path = [token.address, WETH.address];
//   //   await pancakeRouter
//   //     .connect(accounts[user])
//   //     .swapExactTokensForETHSupportingFeeOnTransferTokens(
//   //       balance,
//   //       0,
//   //       path,
//   //       addresses[user],
//   //       timestamp + extraTime
//   //     );
//   // });
//   //
//   // it("Should swap Token for ETH using Pancake with user6", async (user: number = 6) => {
//   //   const balance = await token.balanceOf(addresses[user]);
//   //   console.log(balance.toString());
//   //   await token.connect(accounts[user]).approve(pancakeRouter.address, balance);
//   //   const path = [token.address, WETH.address];
//   //   await pancakeRouter
//   //     .connect(accounts[user])
//   //     .swapExactTokensForETHSupportingFeeOnTransferTokens(
//   //       balance,
//   //       0,
//   //       path,
//   //       addresses[user],
//   //       timestamp + extraTime
//   //     );
//   // });
// });
