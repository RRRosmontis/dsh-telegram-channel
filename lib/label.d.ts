import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
/** Loose session shape so tests and live Session both work. */
export interface SessionView {
    header?: {
        cwd?: string;
    };
    meta?: {
        cwd?: string;
    };
    events?: ReadonlyArray<{
        type?: string;
        data?: {
            title?: string;
        };
    }>;
}
export interface AgentLabelParts {
    index: number;
    title?: string;
    cwd?: string;
    workspace?: string;
    idTail: string;
    sessionId: string;
}
export declare function readSessionCwd(session: unknown): string | undefined;
export declare function workspaceName(cwd: string | undefined): string | undefined;
export declare function readSessionTitle(ctx: Context | undefined, session: unknown): string | undefined;
export declare function describeAgent(agent: Agent, index: number, ctx?: Context): AgentLabelParts;
/** Compact label for inline keyboard buttons (Telegram ≤64 chars). */
export declare function buttonLabel(parts: AgentLabelParts): string;
/** Multi-line detail block for the picker message body. */
export declare function detailLines(parts: AgentLabelParts): string;
/** Human label stored on bind / status (not length-capped as hard as buttons). */
export declare function displayLabel(parts: AgentLabelParts): string;
