export interface APODData {
  date: string;
  title: string;
  explanation: string;
  hdurl?: string;
  url: string;
  media_type: string;
  copyright?: string;
}

export interface ClassificationResult {
  category: string;
  confidence: number;
  imageDescription: string;
  embeddings: number[];
}
