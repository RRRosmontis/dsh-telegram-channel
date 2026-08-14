import type { Context } from '@deepseek-ai/cordis';
export interface ModelOption {
    provider: string;
    model: string;
    label: string;
    efforts?: Array<{
        id: string;
        name: string;
    }>;
}
export interface ModelSnapshot {
    current: {
        provider: string;
        model: string;
        reasoningEffort?: string;
    };
    routable: boolean;
    options: ModelOption[];
}
export declare function loadSessionModels(ctx: Context, sessionId: string): Promise<ModelSnapshot>;
export declare function selectSessionModel(ctx: Context, sessionId: string, selection: {
    provider: string;
    model: string;
    reasoningEffort?: string;
}): Promise<{
    provider: string;
    model: string;
    reasoningEffort?: string;
}>;
export declare function formatModel(sel: {
    provider: string;
    model: string;
    reasoningEffort?: string;
}): string;
