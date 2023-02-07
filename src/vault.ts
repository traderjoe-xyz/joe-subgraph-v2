import { Address } from "@graphprotocol/graph-ts";
import { Deposited, Withdrawn } from "../generated/VaultFactory/Vault";
import { BIG_INT_ONE } from "./constants";
import { loadBundle, loadToken } from "./entities";
import { loadVault } from "./entities/vault";
import { formatTokenAmountByDecimals } from "./utils";
import { updateAvaxInUsdPricing } from "./utils/pricing";

export function handleDeposited(event: Deposited): void {
  const vault = loadVault(event.address);
  if (!vault) {
    return;
  }

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
  vault.txCount = vault.txCount.plus(BIG_INT_ONE);
  vault.totalBalanceX = vault.totalBalanceX.plus(amountX);
  vault.totalBalanceY = vault.totalBalanceY.plus(amountY);

  // update vault TVL
  vault.totalValueLockedAVAX = vault.totalBalanceX
    .times(tokenX.derivedAVAX)
    .plus(vault.totalBalanceY.times(tokenY.derivedAVAX));
  vault.totalValueLockedUSD = vault.totalValueLockedAVAX.times(
    bundle.avaxPriceUSD
  );

  vault.save();
}

export function handleWithdrawn(event: Withdrawn): void {
  const vault = loadVault(event.address);
  if (!vault) {
    return;
  }

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
  vault.txCount = vault.txCount.plus(BIG_INT_ONE);
  vault.totalBalanceX = vault.totalBalanceX.minus(amountX);
  vault.totalBalanceY = vault.totalBalanceY.minus(amountY);

  // update vault TVL
  vault.totalValueLockedAVAX = vault.totalBalanceX
    .times(tokenX.derivedAVAX)
    .plus(vault.totalBalanceY.times(tokenY.derivedAVAX));
  vault.totalValueLockedUSD = vault.totalValueLockedAVAX.times(
    bundle.avaxPriceUSD
  );

  vault.save();
}
