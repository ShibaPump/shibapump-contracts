// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./AutoPump.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IUniswap.sol";
import "./interfaces/IShibaPump.sol";
import "./interfaces/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev Implementation of the {IERC20} interface.
 *
 * This implementation is agnostic to the way tokens are created. This means
 * that a supply mechanism has to be added in a derived contract using {_mint}.
 * For a generic mechanism see {ERC20PresetMinterPauser}.
 *
 * TIP: For a detailed writeup see our guide
 * https://forum.zeppelin.solutions/t/how-to-implement-erc20-supply-mechanisms/226[How
 * to implement supply mechanisms].
 *
 * We have followed general OpenZeppelin Contracts guidelines: functions revert
 * instead returning `false` on failure. This behavior is nonetheless
 * conventional and does not conflict with the expectations of ERC20
 * applications.
 *
 * Additionally, an {Approval} event is emitted on calls to {transferFrom}.
 * This allows applications to reconstruct the allowance for all accounts just
 * by listening to said events. Other implementations of the EIP may not emit
 * these events, as it isn't required by the specification.
 *
 * Finally, the non-standard {decreaseAllowance} and {increaseAllowance}
 * functions have been added to mitigate the well-known issues around setting
 * allowances. See {IERC20-approve}.
 */
contract ShibaPump is Ownable, IShibaPump, IERC20, IERC20Metadata {
    mapping(address => uint) private _balances;

    mapping(address => mapping(address => uint)) private _allowances;

    mapping(address => bool) private _isExcludedFromFee;

    uint private _totalSupply;

    string private _name;
    string private _symbol;

    uint8 public burnFee;
    uint8 public liquidityFee;
    uint8 public pumpFee;
    uint8 public marketingFee;

    uint public maxTxAmount = ~(uint(0));
    uint public minAmountToSwap = 10_000_000 * 1E18;

    bool public onlyPancake = false;
    bool public onlyBiswap = false;

    IUniswapV2Router02 public constant PANCAKE_ROUTER =
        IUniswapV2Router02(0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F);
    IUniswapV2Router02 public constant BISWAP_ROUTER =
        IUniswapV2Router02(0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8);

    AutoPump public autoPump;

    address public immutable pancakeV2Pair;
    address public immutable biswapV2Pair;

    /**
     * @dev Sets the values for {name} and {symbol}.
     *
     * The default value of {decimals} is 18. To select a different value for
     * {decimals} you should overload it.
     *
     * All two of these values are immutable: they can only be set once during
     * construction.
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint totalSupply_
    ) {
        _name = name_;
        _symbol = symbol_;
        _mint(_msgSender(), totalSupply_);

        /// Create a pancakeSwap pair for this new token
        pancakeV2Pair = IUniswapV2Factory(PANCAKE_ROUTER.factory()).createPair(
            address(this),
            PANCAKE_ROUTER.WETH()
        );

        /// Create a biSwap pair for this new token
        biswapV2Pair = IUniswapV2Factory(BISWAP_ROUTER.factory()).createPair(
            address(this),
            BISWAP_ROUTER.WETH()
        );

        autoPump = new AutoPump(address(this));
        autoPump.transferOwnership(owner());

        //exclude owner and this contract from fee
        _isExcludedFromFee[_msgSender()] = true;
        _isExcludedFromFee[address(this)] = true;
        _isExcludedFromFee[address(autoPump)] = true;
    }

    //to receive ETH from Pancake & Biswap when swapping
    receive() external payable {}

    function setRouterStatus(bool _pancakeStatus, bool _biswapStatus)
        external
        onlyOwner
    {
        onlyPancake = _pancakeStatus;
        onlyBiswap = _biswapStatus;
    }

    function setFees(
        uint8 _newBurnFee,
        uint8 _newLiquidityFee,
        uint8 _newPumpFee,
        uint8 _newMarketingFee
    ) external onlyOwner {
        burnFee = _newBurnFee;
        liquidityFee = _newLiquidityFee;
        pumpFee = _newPumpFee;
        marketingFee = _newMarketingFee;
    }

    function setMaxTxAmount(uint _newMaxTxAmount) external onlyOwner {
        maxTxAmount = _newMaxTxAmount;
    }

    function setMinimumTokenToSwap(uint _minAmountToSwap) external onlyOwner {
        minAmountToSwap = _minAmountToSwap;
    }

    function setAutoPumpContract(address _newAutoPumpContract)
        external
        onlyOwner
    {
        autoPump = AutoPump(payable(_newAutoPumpContract));
    }

    /**
     * @dev Returns the name of the token.
     */
    function name() public view virtual override returns (string memory) {
        return _name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5.05` (`505 / 10 ** 2`).
     *
     * Tokens usually opt for a value of 18, imitating the relationship between
     * Ether and Wei. This is the value {ERC20} uses, unless this function is
     * overridden;
     *
     * NOTE: This information is only used for _display_ purposes: it in
     * no way affects any of the arithmetic of the contract, including
     * {IERC20-balanceOf} and {IERC20-transfer}.
     */
    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

    /**
     * @dev See {IERC20-totalSupply}.
     */
    function totalSupply() public view virtual override returns (uint) {
        return _totalSupply;
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(address account)
        public
        view
        virtual
        override
        returns (uint)
    {
        return _balances[account];
    }

    /**
     * @dev See {IERC20-transfer}.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    function transfer(address recipient, uint amount)
        public
        virtual
        override
        returns (bool)
    {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address owner, address spender)
        public
        view
        virtual
        override
        returns (uint)
    {
        return _allowances[owner][spender];
    }

    /**
     * @dev See {IERC20-approve}.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function approve(address spender, uint amount)
        public
        virtual
        override
        returns (bool)
    {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    /**
     * @dev See {IERC20-transferFrom}.
     *
     * Emits an {Approval} event indicating the updated allowance. This is not
     * required by the EIP. See the note at the beginning of {ERC20}.
     *
     * Requirements:
     *
     * - `sender` and `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     * - the caller must have allowance for ``sender``'s tokens of at least
     * `amount`.
     */
    function transferFrom(
        address sender,
        address recipient,
        uint amount
    ) public virtual override returns (bool) {
        _transfer(sender, recipient, amount);

        uint currentAllowance = _allowances[sender][_msgSender()];
        require(currentAllowance >= amount, "transfer amount > allowance");
        unchecked {
            _approve(sender, _msgSender(), currentAllowance - amount);
        }

        return true;
    }

    /**
     * @dev Atomically increases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function increaseAllowance(address spender, uint addedValue)
        public
        virtual
        returns (bool)
    {
        _approve(
            _msgSender(),
            spender,
            _allowances[_msgSender()][spender] + addedValue
        );
        return true;
    }

    /**
     * @dev Atomically decreases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     * - `spender` must have allowance for the caller of at least
     * `subtractedValue`.
     */
    function decreaseAllowance(address spender, uint subtractedValue)
        public
        virtual
        returns (bool)
    {
        uint currentAllowance = _allowances[_msgSender()][spender];
        require(
            currentAllowance >= subtractedValue,
            "decreased allowance below zero"
        );
        unchecked {
            _approve(_msgSender(), spender, currentAllowance - subtractedValue);
        }

        return true;
    }

    /**
     * @dev Destroys `amount` tokens from the caller.
     *
     * See {ERC20-_burn}.
     */
    function burn(uint amount) public virtual {
        _burn(_msgSender(), amount);
    }

    /**
     * @dev Sets `amount` as the allowance of `spender` over the `owner` s tokens.
     *
     * This internal function is equivalent to `approve`, and can be used to
     * e.g. set automatic allowances for certain subsystems, etc.
     *
     * Emits an {Approval} event.
     *
     * Requirements:
     *
     * - `owner` cannot be the zero address.
     * - `spender` cannot be the zero address.
     */
    function _approve(
        address owner,
        address spender,
        uint amount
    ) internal virtual {
        require(owner != address(0), "approve from the zero address");
        require(spender != address(0), "approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /**
     * @dev Moves `amount` of tokens from `sender` to `recipient`.
     *
     * This internal function is equivalent to {transfer}, and can be used to
     * e.g. implement automatic token fees, slashing mechanisms, etc.
     *
     * Emits a {Transfer} event.
     *
     * Requirements:
     *
     * - `sender` cannot be the zero address.
     * - `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     */
    function _transfer(
        address sender,
        address recipient,
        uint amount
    ) internal virtual {
        require(sender != address(0), "transfer from the zero address");
        require(recipient != address(0), "transfer to the zero address");

        require(amount <= maxTxAmount, "Transfer amount > maxTxAmount");

        uint senderBalance = _balances[sender];
        require(senderBalance >= amount, "transfer amount > balance");
        unchecked {
            _balances[sender] = senderBalance - amount;
        }

        if (_balances[address(this)] >= minAmountToSwap) {
            _swapAndLiquify(_balances[address(this)]);
        } else if (_balances[address(autoPump)] >= minAmountToSwap) {
            autoPump.sellTokens(_balances[address(autoPump)]);
        }

        _balances[recipient] += amount;
        emit Transfer(sender, recipient, amount);

        _payFees(recipient, amount);
    }

    function _payFees(address walletAddress, uint amount) private {
        if (burnFee > 0) {
            uint amountBurn = (amount * burnFee) / 100;
            _burn(walletAddress, amountBurn);
        }

        if (liquidityFee > 0) {
            uint amountLiquidity = (amount * liquidityFee) / 100;
            _balances[address(this)] += amountLiquidity;
            _balances[walletAddress] -= amountLiquidity;
            emit Transfer(walletAddress, address(this), amountLiquidity);
        }

        if (pumpFee > 0) {
            uint amountPump = (amount * pumpFee) / 100;
            _balances[address(autoPump)] += amountPump;
            _balances[walletAddress] -= amountPump;
            emit Transfer(walletAddress, address(autoPump), amountPump);
        }

        if (marketingFee > 0) {
            uint amountMarketing = (amount * marketingFee) / 100;
            _balances[owner()] += amountMarketing;
            _balances[walletAddress] -= amountMarketing;
            emit Transfer(walletAddress, address(autoPump), amountMarketing);
        }
    }

    /** @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     */
    function _mint(address account, uint amount) internal virtual {
        require(account != address(0), "mint to the zero address");

        _totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }

    /**
     * @dev Destroys `amount` tokens from `account`, reducing the
     * total supply.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     * - `account` must have at least `amount` tokens.
     */
    function _burn(address account, uint amount) internal virtual {
        require(account != address(0), "burn from the zero address");

        uint accountBalance = _balances[account];
        require(accountBalance >= amount, "burn amount exceeds balance");
        unchecked {
            _balances[account] = accountBalance - amount;
        }
        _totalSupply -= amount;

        emit Transfer(account, address(0), amount);
    }

    function _swapAndLiquify(uint amount) private {
        // split the contract balance into halves

        uint half = amount / 2;
        uint otherHalf = amount - half;

        // capture the contract's current ETH balance.
        // this is so that we can capture exactly the amount of ETH that the
        // swap creates, and not make the liquidity event include any ETH that
        // has been manually sent to the contract
        uint initialBalance = address(this).balance;

        address router;
        if (_pseudoRandom() == 0) {
            router = address(PANCAKE_ROUTER);
        } else {
            router = address(BISWAP_ROUTER);
        }

        // swap tokens for ETH
        _swapTokensForEth(router, half); // <- this breaks the ETH -> HATE swap when swap+liquify is triggered

        // amount ETH swapped
        uint newBalance = address(this).balance - initialBalance;

        // add liquidity to Pancake or Biswap
        _addLiquidity(router, otherHalf, newBalance);
        emit SwapAndLiquify(half, newBalance, otherHalf, router);
    }

    function _swapTokensForEth(address router, uint amountToSwap) private {
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = IUniswapV2Router02(router).WETH();

        _approve(address(this), router, amountToSwap);

        // make the swap
        IUniswapV2Router02(router)
            .swapExactTokensForETHSupportingFeeOnTransferTokens(
                amountToSwap,
                0, // accept any amount of ETH
                path,
                address(this),
                block.timestamp
            );
    }

    function _addLiquidity(
        address router,
        uint tokenAmount,
        uint ethAmount
    ) private {
        // approve token transfer to cover all possible scenarios
        _approve(address(this), address(router), tokenAmount);

        // add the liquidity
        IUniswapV2Router02(router).addLiquidityETH{ value: ethAmount }(
            address(this),
            tokenAmount,
            0, // slippage is unavoidable
            0, // slippage is unavoidable
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
                    totalSupply()
                )
            )
        ) % 2);
    }
}
