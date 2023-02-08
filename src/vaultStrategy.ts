import { OperatorSet } from "../generated/VaultFactory/VaultStrategy";
import { loadVaultStrategy } from "./entities/vaultStrategy";

export function handleOperatorSet(event: OperatorSet): void {
  const vaultStrategy = loadVaultStrategy(event.address);
  vaultStrategy.operator = event.params.operator.toHexString();
  vaultStrategy.save();
}
