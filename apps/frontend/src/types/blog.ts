// Blog/Essay Types
export interface BlogPost {
    id: number;
    author_id: number;
    title: string;
    slug: string;
    content_md: string;
    status?: string;
    published_at?: string;
    created_at: string;
    updated_at?: string;
}

export interface BlogPostCreate {
    title: string;
    content_md?: string;
    content?: string;
}
