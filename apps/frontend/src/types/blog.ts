// Blog/Essay Types
export interface BlogPost {
    id: number;
    user_id: number;
    content: string;
    lang?: string;
    prompt_id?: number;
    created_at: string;
    updated_at?: string;
}

export interface BlogPostCreate {
    content: string;
    lang?: string;
    prompt_id?: number;
}
