import { Address } from "@graphprotocol/graph-ts";
import {
  AumAnnualFeeSet,
  AumFeeCollected,
  OperatorSet,
} from "../generated/VaultFactory/VaultStrategy";
import {
  loadBundle,
  loadLbPair,
  loadToken,
  loadVaultDayData,
} from "./entities";
import { loadVault } from "./entities/vault";
import { loadVaultStrategy } from "./entities/vaultStrategy";
import {
  formatTokenAmountByDecimals,
  updateAvaxInUsdPricing,
  updateTokensDerivedAvax,
} from "./utils";

export function handleOperatorSet(event: OperatorSet): void {
  const vaultStrategy = loadVaultStrategy(event.address);
  if (!vaultStrategy) {
    return;
  }
  vaultStrategy.operator = event.params.operator.toHexString();
  vaultStrategy.save();
}

export function handleAumAnnualFeeSet(event: AumAnnualFeeSet): void {
  const vaultStrategy = loadVaultStrategy(event.address);
  if (!vaultStrategy) {
    return;
  }
  vaultStrategy.aumAnnualFee = event.params.fee;
  vaultStrategy.save();
}

export function handleAumFeeCollected(event: AumFeeCollected): void {
  const vaultStrategy = loadVaultStrategy(event.address);
  if (!vaultStrategy) {
    return;
  }

  const vault = loadVault(Address.fromString(vaultStrategy.vault));
  if (!vault) {
    return;
  }

  const lbPair = loadLbPair(Address.fromString(vault.lbPair));
  if (!lbPair) {
    return;
  }

  // update pricing
  updateAvaxInUsdPricing();
  updateTokensDerivedAvax(lbPair, null);

  // price bundle
  const bundle = loadBundle();

  // get tokens
  const tokenX = loadToken(Address.fromString(vault.tokenX));
  const tokenY = loadToken(Address.fromString(vault.tokenY));

  // get aum fee amounts
  const aumFeeAmountX = formatTokenAmountByDecimals(
    event.params.feeX,
    tokenX.decimals
  );
  const aumFeeAmountY = formatTokenAmountByDecimals(
    event.params.feeY,
    tokenY.decimals
  );

  // get aum fee amount USD
  const aumFeeAmountUSD = aumFeeAmountX
    .times(tokenX.derivedAVAX.times(bundle.avaxPriceUSD))
    .plus(aumFeeAmountY.times(tokenY.derivedAVAX.times(bundle.avaxPriceUSD)));

  // update day data
  const vaultDayData = loadVaultDayData(event.block.timestamp, vault, false);
  vaultDayData.aumFeesUSD = vaultDayData.aumFeesUSD.plus(aumFeeAmountUSD);
  vaultDayData.aumFeesTokenX = vaultDayData.aumFeesTokenX.plus(aumFeeAmountX);
  vaultDayData.aumFeesTokenY = vaultDayData.aumFeesTokenY.plus(aumFeeAmountY);

  vaultDayData.save();
}
