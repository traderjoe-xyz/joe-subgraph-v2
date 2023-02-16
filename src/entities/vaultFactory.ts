import { Address } from "@graphprotocol/graph-ts";
import { VaultFactory } from "../../generated/schema";
import {
  ADDRESS_ZERO,
  BIG_DECIMAL_ZERO,
  VAULT_FACTORY_ADDRESS,
  BIG_INT_ONE,
} from "../constants";
import { VaultFactory as VaultFactoryABI } from "../../generated/VaultFactory/VaultFactory";

export function loadVaultFactory(
  id: Address = VAULT_FACTORY_ADDRESS
): VaultFactory {
  let vaultFactory = VaultFactory.load(id.toHexString());

  if (!vaultFactory) {
    const vaultFactoryContract = VaultFactoryABI.bind(id);
    vaultFactory = new VaultFactory(id.toHexString());
    const feeRecipient = vaultFactoryContract.try_getFeeRecipient();
    if (feeRecipient.reverted) {
      vaultFactory.feeRecipient = ADDRESS_ZERO.toHexString();
    } else {
      vaultFactory.feeRecipient = feeRecipient.value.toHexString();
    }
    const defaultOperator = vaultFactoryContract.try_getDefaultOperator();
    if (defaultOperator.reverted) {
      vaultFactory.defaultOperator = ADDRESS_ZERO.toHexString();
    } else {
      vaultFactory.defaultOperator = defaultOperator.value.toHexString();
    }
    vaultFactory.vaultCount = BIG_INT_ONE;
    vaultFactory.strategyCount = BIG_INT_ONE;
    vaultFactory.totalValueLockedUSD = BIG_DECIMAL_ZERO;
    vaultFactory.totalValueLockedAVAX = BIG_DECIMAL_ZERO;
    vaultFactory.txCount = BIG_INT_ONE;
    vaultFactory.save();
  }

  return vaultFactory as VaultFactory;
}
