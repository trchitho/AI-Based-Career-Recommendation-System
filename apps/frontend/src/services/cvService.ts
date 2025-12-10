import api from '../lib/api';
import { CV, CVListItem } from '../types/cv';

export const cvService = {
    // Get all CVs for current user
    async getCVs(): Promise<CVListItem[]> {
        const response = await api.get('/bff/cv/list');
        return response.data;
    },

    // Get CV by ID
    async getCV(id: string): Promise<CV> {
        const response = await api.get(`/bff/cv/${id}`);
        return response.data;
    },

    // Create new CV
    async createCV(cv: Partial<CV>): Promise<CV> {
        const response = await api.post('/bff/cv', cv);
        return response.data;
    },

    // Update CV
    async updateCV(id: string, cv: Partial<CV>): Promise<CV> {
        const response = await api.put(`/bff/cv/${id}`, cv);
        return response.data;
    },

    // Delete CV
    async deleteCV(id: string): Promise<void> {
        await api.delete(`/bff/cv/${id}`);
    },

    // Export CV to PDF
    async exportPDF(id: string): Promise<Blob> {
        const response = await api.get(`/bff/cv/${id}/export`, {
            responseType: 'blob',
        });
        return response.data;
    },

    // Download PDF
    downloadPDF(blob: Blob, filename: string) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    },
};
