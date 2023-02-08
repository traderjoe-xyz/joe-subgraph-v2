import { Address } from "@graphprotocol/graph-ts";
import {
  Deposited,
  StrategySet,
  Withdrawn,
} from "../generated/VaultFactory/Vault";
import { BIG_INT_ONE } from "./constants";
import { loadBundle, loadToken, loadVaultDayData } from "./entities";
import {
  createVaultDeposit,
  createVaultWithdraw,
  loadVault,
} from "./entities/vault";
import { loadVaultFactory } from "./entities/vaultFactory";
import { loadVaultStrategy } from "./entities/vaultStrategy";
import { formatTokenAmountByDecimals } from "./utils";
import { updateAvaxInUsdPricing } from "./utils/pricing";
import { Vault as VaultABI } from "../generated/VaultFactory/Vault";

export function handleDeposited(event: Deposited): void {
  const vault = loadVault(event.address);
  if (!vault) {
    return;
  }

  const vaultContract = VaultABI.bind(event.address);

  // reset tvl aggregates until new amounts calculated
  const factory = loadVaultFactory(Address.fromString(vault.factory));
  factory.totalValueLockedAVAX = factory.totalValueLockedAVAX.minus(
    vault.totalValueLockedAVAX
  );

  // load price bundle
  updateAvaxInUsdPricing();
  const bundle = loadBundle();

  // get tokens
  const tokenX = loadToken(Address.fromString(vault.tokenX));
  const tokenY = loadToken(Address.fromString(vault.tokenY));

  // get deposited amounts
  const amountX = formatTokenAmountByDecimals(
    event.params.amountX,
    tokenX.decimals
  );
  const amountY = formatTokenAmountByDecimals(
    event.params.amountY,
    tokenY.decimals
  );

  // update vault total balance
  const vaultBalances = vaultContract.try_getBalances().value;
  vault.totalBalanceX = vaultBalances.getAmountX().toBigDecimal();
  vault.totalBalanceY = vaultBalances.getAmountY().toBigDecimal();

  // update vault TVL
  vault.totalValueLockedAVAX = vault.totalBalanceX
    .times(tokenX.derivedAVAX)
    .plus(vault.totalBalanceY.times(tokenY.derivedAVAX));
  vault.totalValueLockedUSD = vault.totalValueLockedAVAX.times(
    bundle.avaxPriceUSD
  );

  // update factory
  factory.totalValueLockedAVAX = factory.totalValueLockedAVAX.plus(
    vault.totalValueLockedAVAX
  );
  factory.totalValueLockedUSD = factory.totalValueLockedAVAX.times(
    bundle.avaxPriceUSD
  );
  factory.txCount = factory.txCount.plus(BIG_INT_ONE);
  factory.save();

  loadVaultDayData(event.block.timestamp, vault, true);
  createVaultDeposit(
    event.address,
    event.params.user,
    event.block,
    amountX,
    amountY
  );

  vault.txCount = vault.txCount.plus(BIG_INT_ONE);
  vault.save();
}

export function handleWithdrawn(event: Withdrawn): void {
  const vault = loadVault(event.address);
  if (!vault) {
    return;
  }

  const vaultContract = VaultABI.bind(event.address);

  // reset tvl aggregates until new amounts calculated
  const factory = loadVaultFactory(Address.fromString(vault.factory));
  factory.totalValueLockedAVAX = factory.totalValueLockedAVAX.minus(
    vault.totalValueLockedAVAX
  );

  // load price bundle
  updateAvaxInUsdPricing();
  const bundle = loadBundle();

  // get tokens
  const tokenX = loadToken(Address.fromString(vault.tokenX));
  const tokenY = loadToken(Address.fromString(vault.tokenY));

  // get withdrawn amounts
  const amountX = formatTokenAmountByDecimals(
    event.params.amountX,
    tokenX.decimals
  );
  const amountY = formatTokenAmountByDecimals(
    event.params.amountY,
    tokenY.decimals
  );

  // update vault total balance
  const vaultBalances = vaultContract.try_getBalances().value;
  vault.totalBalanceX = vaultBalances.getAmountX().toBigDecimal();
  vault.totalBalanceY = vaultBalances.getAmountY().toBigDecimal();

  // update vault TVL
  vault.totalValueLockedAVAX = vault.totalBalanceX
    .times(tokenX.derivedAVAX)
    .plus(vault.totalBalanceY.times(tokenY.derivedAVAX));
  vault.totalValueLockedUSD = vault.totalValueLockedAVAX.times(
    bundle.avaxPriceUSD
  );

  // update factory
  factory.totalValueLockedAVAX = factory.totalValueLockedAVAX.plus(
    vault.totalValueLockedAVAX
  );
  factory.totalValueLockedUSD = factory.totalValueLockedAVAX.times(
    bundle.avaxPriceUSD
  );
  factory.txCount = factory.txCount.plus(BIG_INT_ONE);
  factory.save();

  loadVaultDayData(event.block.timestamp, vault, true);
  createVaultWithdraw(
    event.address,
    event.params.user,
    event.block,
    amountX,
    amountY
  );

  vault.txCount = vault.txCount.plus(BIG_INT_ONE);
  vault.save();
}

export function handleStrategySet(event: StrategySet): void {
  const vault = loadVault(event.address);
  if (!vault) {
    return;
  }
  const strategy = loadVaultStrategy(event.params.strategy);
  vault.strategy = strategy.id;
  vault.save();
}
