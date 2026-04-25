import type { GatewayRequestHandlers } from "./types.js";

const DISABLED_MEMORY_DOCTOR_ERROR = "memory doctor APIs are disabled in the minimal build";

const memoryDoctorMethods = [
  "doctor.memory.status",
  "doctor.memory.dreamDiary",
  "doctor.memory.backfillDreamDiary",
  "doctor.memory.resetDreamDiary",
  "doctor.memory.resetGroundedShortTerm",
  "doctor.memory.repairDreamingArtifacts",
  "doctor.memory.dedupeDreamDiary",
] as const;

export const doctorHandlers: GatewayRequestHandlers = Object.fromEntries(
  memoryDoctorMethods.map((method) => [
    method,
    async ({ respond }: Parameters<GatewayRequestHandlers[(typeof memoryDoctorMethods)[number]]>[0]) => {
      respond(false, undefined, DISABLED_MEMORY_DOCTOR_ERROR);
    },
  ]),
) as GatewayRequestHandlers;
