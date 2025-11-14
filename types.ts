
export enum AppStep {
  CONFIG,
  COVERS,
  WRITING,
}

export interface Chapter {
  title: string;
  content: string;
  status: 'pending' | 'generating' | 'done' | 'error';
}

export interface BookHistoryEntry {
  id: string;
  title: string;
  author: string;
  content: string;
  frontCoverImage: string;
  timestamp: number;
}
