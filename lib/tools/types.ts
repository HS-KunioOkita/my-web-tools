export type ToolStatus = "available" | "coming-soon";

export interface Tool {
  id: string;
  slug: string;
  name: string;
  description: string;
  category?: string;
  order?: number;
  status: ToolStatus;
}
