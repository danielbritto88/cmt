"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.skillCountTokens = skillCountTokens;
exports.skillCompressContext = skillCompressContext;
exports.skillRouteModel = skillRouteModel;
exports.skillGuardianCheck = skillGuardianCheck;
const guardian_1 = require("../../agents/guardian");
// ─────────────────────────────────────────────
// SKILLS DO GUARDIÃO
// Funções exportadas para uso pelo Orquestrador
// ─────────────────────────────────────────────
function skillCountTokens(text) {
    return (0, guardian_1.estimateTokens)(text);
}
async function skillCompressContext(context) {
    return (0, guardian_1.compressContext)(context);
}
function skillRouteModel(complexity, agentRole) {
    return (0, guardian_1.routeModel)(complexity, agentRole);
}
function skillGuardianCheck(agentRole, complexity, contextSize) {
    return (0, guardian_1.guardianCheck)(agentRole, complexity, contextSize);
}
