import { Address } from "@graphprotocol/graph-ts";
import { Vault } from "../../generated/schema";
import { Vault as VaultABI } from "../../generated/VaultFactory/Vault";
import { BIG_DECIMAL_ZERO, VAULT_FACTORY_ADDRESS } from "../constants";
import { loadToken } from "./token";

export function createVault(vaultAddress: Address): Vault | null {
  const vault = new Vault(vaultAddress.toHexString());
  const vaultContract = VaultABI.bind(vaultAddress);

  const tokenXCall = vaultContract.try_getTokenX();
  const tokenYCall = vaultContract.try_getTokenY();
  const tokenX = loadToken(tokenXCall.value);
  const tokenY = loadToken(tokenYCall.value);

  vault.factory = VAULT_FACTORY_ADDRESS.toHexString();
  vault.pair = vaultContract.try_getPair().value.toHexString();
  vault.tokenX = tokenX.id;
  vault.tokenY = tokenY.id;

  vault.totalBalanceX = BIG_DECIMAL_ZERO;
  vault.totalBalanceY = BIG_DECIMAL_ZERO;
  vault.totalValueLockedUSD = BIG_DECIMAL_ZERO;
  vault.totalValueLockedAVAX = BIG_DECIMAL_ZERO;

  vault.save();
  return vault;
}
