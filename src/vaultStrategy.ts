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

  // get vault fee amounts
  const vaultFeeAmountX = formatTokenAmountByDecimals(
    event.params.vaultX,
    tokenX.decimals
  );
  const vaultFeeAmountY = formatTokenAmountByDecimals(
    event.params.vaultY,
    tokenY.decimals
  );

  // get strategist fee amounts
  const strategistFeeAmountX = formatTokenAmountByDecimals(
    event.params.feeX,
    tokenX.decimals
  );
  const strategistFeeAmountY = formatTokenAmountByDecimals(
    event.params.feeY,
    tokenY.decimals
  );

  // get vault fee amount USD
  const vaultFeeAmountUSD = vaultFeeAmountX
    .times(tokenX.derivedAVAX.times(bundle.avaxPriceUSD))
    .plus(vaultFeeAmountY.times(tokenY.derivedAVAX.times(bundle.avaxPriceUSD)));

  // get strategist fee amount USD
  const strategistFeeAmountUSD = strategistFeeAmountX
    .times(tokenX.derivedAVAX.times(bundle.avaxPriceUSD))
    .plus(
      strategistFeeAmountY.times(tokenY.derivedAVAX.times(bundle.avaxPriceUSD))
    );

  // update day data
  const vaultDayData = loadVaultDayData(event.block.timestamp, vault, false);
  vaultDayData.vaultFeesUSD = vaultDayData.vaultFeesUSD.plus(vaultFeeAmountUSD);
  vaultDayData.vaultFeesTokenX = vaultDayData.vaultFeesTokenX.plus(
    vaultFeeAmountX
  );
  vaultDayData.vaultFeesTokenY = vaultDayData.vaultFeesTokenY.plus(
    vaultFeeAmountY
  );
  vaultDayData.strategistFeesUSD = vaultDayData.strategistFeesUSD.plus(
    strategistFeeAmountUSD
  );
  vaultDayData.strategistFeesTokenX = vaultDayData.strategistFeesTokenX.plus(
    strategistFeeAmountX
  );
  vaultDayData.strategistFeesTokenY = vaultDayData.strategistFeesTokenY.plus(
    strategistFeeAmountY
  );

  vaultDayData.save();
}
