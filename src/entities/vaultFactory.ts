import { Address } from "@graphprotocol/graph-ts";
import { VaultFactory } from "../../generated/schema";
import {
  BIG_DECIMAL_ZERO,
  VAULT_FACTORY_ADDRESS,
  BIG_INT_ONE,
} from "../constants";

export function loadVaultFactory(
  id: Address = VAULT_FACTORY_ADDRESS
): VaultFactory {
  let vaultFactory = VaultFactory.load(id.toHexString());

  if (!vaultFactory) {
    vaultFactory = new VaultFactory(id.toHexString());
    vaultFactory.vaultCount = BIG_INT_ONE;
    vaultFactory.strategyCount = BIG_INT_ONE;
    vaultFactory.totalValueLockedUSD = BIG_DECIMAL_ZERO;
    vaultFactory.totalValueLockedAVAX = BIG_DECIMAL_ZERO;
    vaultFactory.save();
  }

  return vaultFactory as VaultFactory;
}
