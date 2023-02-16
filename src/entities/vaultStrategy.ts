import { Address } from "@graphprotocol/graph-ts";
import { VaultStrategy } from "../../generated/schema";
import { VaultStrategy as VaultStrategyABI } from "../../generated/VaultFactory/VaultStrategy";
import { VAULT_FACTORY_ADDRESS } from "../constants";

export function createVaultStrategy(
  vaultStrategyAddress: Address
): VaultStrategy | null {
  const vaultStrategy = new VaultStrategy(vaultStrategyAddress.toHexString());
  const vaultStrategyContract = VaultStrategyABI.bind(vaultStrategyAddress);

  const vault = vaultStrategyContract.try_getVault();
  if (vault.reverted) {
    return null;
  }

  const lbPair = vaultStrategyContract.try_getPair();
  if (lbPair.reverted) {
    return null;
  }

  const operator = vaultStrategyContract.try_getOperator();
  if (operator.reverted) {
    return null;
  }

  const strategistFee = vaultStrategyContract.try_getStrategistFee();
  if (strategistFee.reverted) {
    return null;
  }

  vaultStrategy.factory = VAULT_FACTORY_ADDRESS.toHexString();
  vaultStrategy.vault = vault.value.toHexString();
  vaultStrategy.lbPair = lbPair.value.toHexString();
  vaultStrategy.operator = operator.value.toHexString();
  vaultStrategy.strategistFee = strategistFee.value;

  vaultStrategy.save();
  return vaultStrategy;
}

export function loadVaultStrategy(id: Address): VaultStrategy | null {
  return VaultStrategy.load(id.toHexString());
}
