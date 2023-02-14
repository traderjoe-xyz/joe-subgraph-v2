import { Address } from "@graphprotocol/graph-ts";
import {
  FeesCollected,
  OperatorSet,
  StrategistFeeSet,
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
  vaultStrategy.operator = event.params.operator.toHexString();
  vaultStrategy.save();
}

export function handleStrategistFeeSet(event: StrategistFeeSet): void {
  const vaultStrategy = loadVaultStrategy(event.address);
  vaultStrategy.strategistFee = event.params.fee;
  vaultStrategy.save();
}

export function handleFeesCollected(event: FeesCollected): void {
  const vaultStrategy = loadVaultStrategy(event.address);
  const vault = loadVault(Address.fromString(vaultStrategy.vault));
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

  // get fee amounts
  const feeAmountX = formatTokenAmountByDecimals(
    event.params.feeX,
    tokenX.decimals
  );
  const feeAmountY = formatTokenAmountByDecimals(
    event.params.feeY,
    tokenY.decimals
  );

  // get fee amount USD
  const feeAmountUSD = feeAmountX
    .times(tokenX.derivedAVAX.times(bundle.avaxPriceUSD))
    .plus(feeAmountY.times(tokenY.derivedAVAX.times(bundle.avaxPriceUSD)));

  // update day data
  const vaultDayData = loadVaultDayData(event.block.timestamp, vault, false);
  vaultDayData.collectedFeesUSD = vaultDayData.collectedFeesUSD.plus(
    feeAmountUSD
  );
  vaultDayData.collectedFeesTokenX = vaultDayData.collectedFeesTokenX.plus(
    feeAmountX
  );
  vaultDayData.collectedFeesTokenY = vaultDayData.collectedFeesTokenY.plus(
    feeAmountY
  );

  vaultDayData.save();
}
