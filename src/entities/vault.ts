import { Address, BigDecimal, ethereum } from "@graphprotocol/graph-ts";
import { Vault, VaultDeposit, VaultWithdraw } from "../../generated/schema";
import { Vault as VaultABI } from "../../generated/VaultFactory/Vault";
import {
  BIG_DECIMAL_ZERO,
  BIG_INT_ZERO,
  VAULT_FACTORY_ADDRESS,
} from "../constants";
import { loadToken } from "./token";
import { loadVaultStrategy } from "./vaultStrategy";

export function createVault(vaultAddress: Address): Vault | null {
  const vault = new Vault(vaultAddress.toHexString());
  const vaultContract = VaultABI.bind(vaultAddress);

  const vaultStrategy = loadVaultStrategy(
    vaultContract.try_getStrategy().value
  );

  const tokenXCall = vaultContract.try_getTokenX();
  const tokenYCall = vaultContract.try_getTokenY();
  const tokenX = loadToken(tokenXCall.value);
  const tokenY = loadToken(tokenYCall.value);

  vault.factory = VAULT_FACTORY_ADDRESS.toHexString();
  vault.strategy = vaultStrategy.id;
  vault.lbPair = vaultContract.try_getPair().value.toHexString();
  vault.tokenX = tokenX.id;
  vault.tokenY = tokenY.id;

  vault.totalBalanceX = BIG_DECIMAL_ZERO;
  vault.totalBalanceY = BIG_DECIMAL_ZERO;
  vault.totalValueLockedUSD = BIG_DECIMAL_ZERO;
  vault.totalValueLockedAVAX = BIG_DECIMAL_ZERO;

  vault.txCount = BIG_INT_ZERO;

  vault.save();
  return vault;
}

export function loadVault(id: Address): Vault | null {
  const vault = Vault.load(id.toHexString());
  if (!vault) {
    return createVault(id);
  }
  return vault;
}

export function createVaultDeposit(
  vaultAddress: Address,
  user: Address,
  block: ethereum.Block,
  amountX: BigDecimal,
  amountY: BigDecimal
): void {
  const id = vaultAddress
    .toHexString()
    .concat("-")
    .concat(user.toHexString())
    .concat("-")
    .concat(block.timestamp.toString());

  const vaultDeposit = new VaultDeposit(id);

  vaultDeposit.user = user.toHexString();
  vaultDeposit.vault = vaultAddress.toHexString();
  vaultDeposit.amountDepositedX = amountX;
  vaultDeposit.amountDepositedY = amountY;

  vaultDeposit.timestamp = block.timestamp.toI32();
  vaultDeposit.block = block.number.toI32();
  vaultDeposit.save();
}

export function createVaultWithdraw(
  vaultAddress: Address,
  user: Address,
  block: ethereum.Block,
  amountX: BigDecimal,
  amountY: BigDecimal
): void {
  const id = vaultAddress
    .toHexString()
    .concat("-")
    .concat(user.toHexString())
    .concat("-")
    .concat(block.timestamp.toString());

  const vaultWithdraw = new VaultWithdraw(id);

  vaultWithdraw.user = user.toHexString();
  vaultWithdraw.vault = vaultAddress.toHexString();
  vaultWithdraw.amountWithdrawnX = amountX;
  vaultWithdraw.amountWithdrawnY = amountY;

  vaultWithdraw.timestamp = block.timestamp.toI32();
  vaultWithdraw.block = block.number.toI32();
  vaultWithdraw.save();
}
