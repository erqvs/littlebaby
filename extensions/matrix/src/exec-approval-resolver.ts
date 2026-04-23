import { resolveApprovalOverGateway } from "littlebaby/plugin-sdk/approval-gateway-runtime";
import type { ExecApprovalReplyDecision } from "littlebaby/plugin-sdk/approval-runtime";
import type { LittleBabyConfig } from "littlebaby/plugin-sdk/config-runtime";
import { isApprovalNotFoundError } from "littlebaby/plugin-sdk/error-runtime";

export { isApprovalNotFoundError };

export async function resolveMatrixApproval(params: {
  cfg: LittleBabyConfig;
  approvalId: string;
  decision: ExecApprovalReplyDecision;
  senderId?: string | null;
  gatewayUrl?: string;
}): Promise<void> {
  await resolveApprovalOverGateway({
    cfg: params.cfg,
    approvalId: params.approvalId,
    decision: params.decision,
    senderId: params.senderId,
    gatewayUrl: params.gatewayUrl,
    clientDisplayName: `Matrix approval (${params.senderId?.trim() || "unknown"})`,
  });
}
