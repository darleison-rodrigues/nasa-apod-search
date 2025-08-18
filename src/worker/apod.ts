import { Hono } from 'hono';
import { Database } from './db';
import { APODData, ClassificationResult } from './types';

const app = new Hono<{ Bindings: Env }>();

// Helper function to validate date format (YYYY-MM-DD)
const isValidDate = (dateString: string): boolean => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
};

// Helper function to check if date is not in the future
const isNotFutureDate = (dateString: string): boolean => {
    const inputDate = new Date(dateString);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    return inputDate <= today;
};

// Type guard to check if response has data property (synchronous response)
const hasDataProperty = (response: any): response is { data: number[][] } => {
    return response && typeof response === 'object' && Array.isArray(response.data);
};

// Type guard to check if response is async
const isAsyncResponse = (response: any): response is { request_id: string } => {
    return response && typeof response === 'object' && typeof response.request_id === 'string';
};

app.post('/ingest', async (c) => {
    const db = new Database(c.env.APOD_D1, c.env.APOD_BASE, c.env.APOD_R2);

    const { start_date, end_date } = c.req.query();
    const url = new URL('https://api.nasa.gov/planetary/apod');
    url.searchParams.set('api_key', c.env.NASA_API_KEY);
    if (start_date) url.searchParams.set('start_date', start_date);
    if (end_date) url.searchParams.set('end_date', end_date);

    const response = await fetch(url.toString());
    const apodDataArray: APODData[] = await response.json();

    for (const apodData of apodDataArray) {
        if (await db.isAlreadyProcessed(apodData.date)) {
            console.log(`Skipping ${apodData.date}, already processed.`);
            continue;
        }

        if (apodData.media_type !== 'image') {
            console.log(`Skipping ${apodData.date}, not an image.`);
            continue;
        }

        const imageUrl = apodData.hdurl || apodData.url;
        const imageResponse = await fetch(imageUrl);
        const imageBlob = await imageResponse.blob();
        const imageArrayBuffer = await imageBlob.arrayBuffer();

        const llavaResponse = await c.env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', {
            prompt: "What is in this image?",
            image: [...new Uint8Array(imageArrayBuffer)],
        });

        const llavaDesc = llavaResponse.description;

        const resnetResponse = await c.env.AI.run('@cf/microsoft/resnet-50', {
            image: [...new Uint8Array(imageArrayBuffer)],
        });

        const objects = resnetResponse.map((obj: any) => obj.label);

        const textToEmbed = `${apodData.title}. ${apodData.explanation} ${llavaDesc}`;
        const embeddingsResponse = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', {
            text: [textToEmbed],
        });

        // Handle both sync and async responses
        let embeddings: number[];
        if (hasDataProperty(embeddingsResponse)) {
            // Synchronous response with data
            embeddings = embeddingsResponse.data[0];
        } else if (isAsyncResponse(embeddingsResponse)) {
            // Async response - would need to poll for results
            throw new Error('Async embedding responses not yet supported');
        } else {
            throw new Error('Unexpected embedding response format');
        }

        const classificationResult: ClassificationResult = {
            category: 'space', // placeholder
            confidence: 0.9, // placeholder
            imageDescription: llavaDesc,
            embeddings: embeddings,
        };

        await db.storeAPODData(apodData, classificationResult, imageBlob, llavaDesc, objects);
    }

    return c.json({ success: true, message: 'Ingestion complete.' });
});

app.get('/search', async (c) => {
    const db = new Database(c.env.APOD_D1, c.env.APOD_BASE, c.env.APOD_R2);

    const { query } = c.req.query();

    if (!query) {
        return c.json({ error: 'Query parameter is required.' }, 400);
    }

    const embeddingsResponse = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', {
        text: [query],
    });

    // Handle both sync and async responses
    let vector: number[];
    if (hasDataProperty(embeddingsResponse)) {
        // Synchronous response with data
        vector = embeddingsResponse.data[0];
    } else if (isAsyncResponse(embeddingsResponse)) {
        // Async response - would need to poll for results
        return c.json({ error: 'Async embedding responses not yet supported' }, 500);
    } else {
        return c.json({ error: 'Unexpected embedding response format' }, 500);
    }

    const similarVectors = await c.env.APOD_BASE.query(vector, { topK: 10 });

    const ids = similarVectors.matches.map((match) => match.id);
    const images = await db.getImagesByIds(ids);

    return c.json(images);
});

app.get('/search/keyword', async (c) => {
    const db = new Database(c.env.APOD_D1, c.env.APOD_BASE, c.env.APOD_R2);
    const { query, page, limit } = c.req.query();

    if (!query) {
        return c.json({ error: 'Query parameter is required.' }, 400);
    }

    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);

    const results = await db.searchAPODDataByKeyword(query, pageNum, limitNum);
    return c.json(results);
});

app.get('/apod', async (c) => {
    try {
        const { start_date, end_date } = c.req.query();

        // Validate date formats if provided
        if (start_date && !isValidDate(start_date)) {
            return c.json(
                { error: 'Invalid start_date format. Use YYYY-MM-DD.' },
                400
            );
        }

        if (end_date && !isValidDate(end_date)) {
            return c.json(
                { error: 'Invalid end_date format. Use YYYY-MM-DD.' },
                400
            );
        }

        // Validate that dates are not in the future
        if (start_date && !isNotFutureDate(start_date)) {
            return c.json(
                { error: 'start_date cannot be in the future.' },
                400
            );
        }

        if (end_date && !isNotFutureDate(end_date)) {
            return c.json(
                { error: 'end_date cannot be in the future.' },
                400
            );
        }

        // Validate date range
        if (start_date && end_date) {
            const startDate = new Date(start_date);
            const endDate = new Date(end_date);

            if (startDate > endDate) {
                return c.json(
                    { error: 'start_date must be before or equal to end_date.' },
                    400
                );
            }

            // NASA API has a limit on date ranges (typically 100 days)
            const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff > 100) {
                return c.json(
                    { error: 'Date range cannot exceed 100 days.' },
                    400
                );
            }
        }

        // Check if NASA API key is available
        if (!c.env.NASA_API_KEY) {
            return c.json(
                { error: 'NASA API key not configured.' },
                500
            );
        }

        // Build NASA API URL
        const url = new URL('https://api.nasa.gov/planetary/apod');
        url.searchParams.set('api_key', c.env.NASA_API_KEY);

        if (start_date) url.searchParams.set('start_date', start_date);
        if (end_date) url.searchParams.set('end_date', end_date);

        // Fetch data from NASA API
        const response = await fetch(url.toString());

        if (!response.ok) {
            const errorText = await response.text();
            console.error('NASA API error:', response.status, errorText);

            if (response.status === 429) {
                return c.json(
                    { error: 'Rate limit exceeded. Please try again later.' },
                    429
                );
            }

            if (response.status === 403) {
                return c.json(
                    { error: 'Invalid API key or access denied.' },
                    403
                );
            }

            return c.json(
                {
                    error: 'Failed to fetch data from NASA API.',
                    message: `HTTP ${response.status}: ${response.statusText}`
                },
                502
            );
        }

        // Parse JSON response with proper typing
        const data = await response.json()

        // Validate response structure
        if (!data) {
            return c.json(
                { error: 'Empty response from NASA API.' },
                502
            );
        }

        // Return typed response
        return c.json(data);

    } catch (error) {
        console.error('APOD endpoint error:', error);

        return c.json(
            { error: 'Internal server error occurred while fetching APOD data.' },
            500
        );
    }
});

export default app;