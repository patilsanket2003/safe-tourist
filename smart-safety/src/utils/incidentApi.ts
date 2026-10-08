import { SERVER_URL } from '../config';

export type IncidentType = 'theft' | 'assault' | 'accident' | 'riot' | 'natural_disaster' | 'other';

export interface IncidentReportData {
    title?: string;
    type?: IncidentType;
    latitude: number;
    longitude: number;
    severity?: number;
}

export interface IncidentReportResponse {
    success: boolean;
    message: string;
    data?: any;
}

/**
 * Report an incident to the backend
 * @param token - User authentication token
 * @param data - Incident data with required lat/lng and optional title, type, severity
 * @returns Promise with the server response
 */
export const reportIncident = async (token: string, data: IncidentReportData): Promise<IncidentReportResponse> => {
    try {
        const response = await fetch(`${SERVER_URL}/api/incidents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });

        const text = await response.text();
        let result: any = null;
        try {
            result = text ? JSON.parse(text) : null;
        } catch (e) {
            result = { message: text };
        }

        if (!response.ok) {
            throw new Error(result?.message || `Server responded with status ${response.status}`);
        }

        return result as IncidentReportResponse;
    } catch (e: any) {
        console.error('API: reportIncident error', { error: e?.message || e });
        throw e;
    }
};
