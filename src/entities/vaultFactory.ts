import { Address } from "@graphprotocol/graph-ts";
import { VaultFactory } from "../../generated/schema";
import { VaultFactory as VaultFactoryABI } from "../../generated/VaultFactory/VaultFactory";
import { VAULT_FACTORY_ADDRESS } from "../constants";

export function loadVaultFactory(
  id: Address = VAULT_FACTORY_ADDRESS
): VaultFactory {
  let vaultFactory = VaultFactory.load(id.toHexString());
  const contract = VaultFactoryABI.bind(id);

  if (!vaultFactory) {
    vaultFactory = new VaultFactory(id.toHexString());
    vaultFactory.save();
  }

  return vaultFactory as VaultFactory;
}
