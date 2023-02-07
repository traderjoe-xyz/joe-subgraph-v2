import { Address } from "@graphprotocol/graph-ts";
import { VaultFactory } from "../../generated/schema";
import { VAULT_FACTORY_ADDRESS } from "../constants";
import { BIG_INT_ONE } from "../constants/index.template";

export function loadVaultFactory(
  id: Address = VAULT_FACTORY_ADDRESS
): VaultFactory {
  let vaultFactory = VaultFactory.load(id.toHexString());

  if (!vaultFactory) {
    vaultFactory = new VaultFactory(id.toHexString());
    vaultFactory.vaultCount = BIG_INT_ONE;
    vaultFactory.strategyCount = BIG_INT_ONE;
    vaultFactory.save();
  }

  return vaultFactory as VaultFactory;
}
