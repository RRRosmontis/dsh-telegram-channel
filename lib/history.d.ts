import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
export interface LastTurn {
    userText?: string;
    assistantText?: string;
}
type LooseEvent = {
    type?: string;
    data?: {
        source?: {
            kind?: string;
        };
        content?: unknown;
        message?: {
            content?: unknown;
            source?: {
                kind?: string;
            };
        };
        text?: string;
    };
};
/** Extract the latest human Q + assistant A from a session event list. */
export declare function extractLastTurn(events: readonly LooseEvent[]): LastTurn;
export declare function formatLastTurn(turn: LastTurn, maxEach?: number): string;
/** Load last Q/A for a bound session (apiProxy history, else live agent events). */
export declare function loadLastTurn(ctx: Context, sessionId: string, agent?: Agent): Promise<LastTurn>;
export {};
