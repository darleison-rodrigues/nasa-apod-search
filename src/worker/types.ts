export interface APODData {
	date: string;
	title: string;
	explanation: string;
	url: string;
	media_type?: string;
	hdurl?: string;
	copyright?: string;
}

export interface ProcessingMetrics {
	processed: number;
	failed: number;
	skipped: number;
	relevant: number;
	irrelevant: number;
	startTime: number;
	errors: Array<{ date: string; error: string; step: string }>;
}

export interface ClassificationResult {
	category: string;
	confidence: number;
	imageDescription: string;
	embeddings: number[];
	isRelevant: boolean;
}

interface ApodEntry {
    id: string;
    date: string;
    title: string;
    original_desc: string;
    llava_desc?: string;
    uform_caption?: string;
    processed: number;
}

// Defines the payload for the Workflow.
interface ApodWorkflowPayload {
    apodEntry: ApodEntry;
}

// Defines the environment variables available to the Worker and Workflow.
interface Env {
    DB: D1Database;
    AI: Ai;
    APOD_WORKFLOW: Workflow<ApodWorkflowPayload>;
    APOD_SMALL_384D: VectorizeIndex;
    APOD_BASE_768D: VectorizeIndex;
    APOD_LARGE_1024D: VectorizeIndex;
    APOD_M3_MULTI: VectorizeIndex;
}