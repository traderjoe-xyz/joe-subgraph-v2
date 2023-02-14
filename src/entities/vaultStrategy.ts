import { Address } from "@graphprotocol/graph-ts";
import { VaultStrategy } from "../../generated/schema";
import { VaultStrategy as VaultStrategyABI } from "../../generated/VaultFactory/VaultStrategy";
import { VAULT_FACTORY_ADDRESS } from "../constants";

export function createVaultStrategy(
  vaultStrategyAddress: Address
): VaultStrategy {
  const vaultStrategy = new VaultStrategy(vaultStrategyAddress.toHexString());
  const vaultContract = VaultStrategyABI.bind(vaultStrategyAddress);

  vaultStrategy.factory = VAULT_FACTORY_ADDRESS.toHexString();
  vaultStrategy.vault = vaultContract.try_getVault().value.toHexString();
  vaultStrategy.lbPair = vaultContract.try_getPair().value.toHexString();
  vaultStrategy.operator = vaultContract.try_getOperator().value.toHexString();
  vaultStrategy.strategistFee = vaultContract.try_getStrategistFee().value;

  vaultStrategy.save();
  return vaultStrategy;
}

export function loadVaultStrategy(id: Address): VaultStrategy {
  const vaultStrategy = VaultStrategy.load(id.toHexString());
  if (!vaultStrategy) {
    return createVaultStrategy(id);
  }
  return vaultStrategy as VaultStrategy;
}
