import { Address } from "@graphprotocol/graph-ts";
import { VaultFactory } from "../../generated/schema";
import {
  BIG_DECIMAL_ZERO,
  VAULT_FACTORY_ADDRESS,
  BIG_INT_ONE,
} from "../constants";
import { VaultFactory as VaultFactoryABI } from "../../generated/VaultFactory/VaultFactory";

export function loadVaultFactory(
  id: Address = VAULT_FACTORY_ADDRESS
): VaultFactory {
  let vaultFactory = VaultFactory.load(id.toHexString());
  const vaultFactoryContract = VaultFactoryABI.bind(id);

  if (!vaultFactory) {
    vaultFactory = new VaultFactory(id.toHexString());
    vaultFactory.feeRecipient = vaultFactoryContract
      .try_getFeeRecipient()
      .value.toHexString();
    vaultFactory.vaultCount = BIG_INT_ONE;
    vaultFactory.strategyCount = BIG_INT_ONE;
    vaultFactory.totalValueLockedUSD = BIG_DECIMAL_ZERO;
    vaultFactory.totalValueLockedAVAX = BIG_DECIMAL_ZERO;
    vaultFactory.txCount = BIG_INT_ONE;
    vaultFactory.save();
  }

  return vaultFactory as VaultFactory;
}
