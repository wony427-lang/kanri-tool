import { verifyRecoveryTokenAction } from "@/domains/auth/actions";

export async function verifyRecoveryOnLoad(tokenHash: string): Promise<void> {
  const result = await verifyRecoveryTokenAction({ tokenHash });
  if (!result.ok) {
    throw new Error(result.message);
  }
}
