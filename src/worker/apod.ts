import { Hono } from 'hono';

// Define types for better type safety
interface APODResponse {
  date: string;
  explanation: string;
  title: string;
  url: string;
  media_type: 'image' | 'video';
  hdurl?: string;
  copyright?: string;
  service_version?: string;
}

interface Env {
  NASA_API_KEY: string;
}

interface ErrorResponse {
  error: string;
  message?: string;
}

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

app.get('/apod', async (c) => {
  try {
    const { start_date, end_date } = c.req.query();

    // Validate date formats if provided
    if (start_date && !isValidDate(start_date)) {
      return c.json<ErrorResponse>(
        { error: 'Invalid start_date format. Use YYYY-MM-DD.' },
        400
      );
    }

    if (end_date && !isValidDate(end_date)) {
      return c.json<ErrorResponse>(
        { error: 'Invalid end_date format. Use YYYY-MM-DD.' },
        400
      );
    }

    // Validate that dates are not in the future
    if (start_date && !isNotFutureDate(start_date)) {
      return c.json<ErrorResponse>(
        { error: 'start_date cannot be in the future.' },
        400
      );
    }

    if (end_date && !isNotFutureDate(end_date)) {
      return c.json<ErrorResponse>(
        { error: 'end_date cannot be in the future.' },
        400
      );
    }

    // Validate date range
    if (start_date && end_date) {
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      
      if (startDate > endDate) {
        return c.json<ErrorResponse>(
          { error: 'start_date must be before or equal to end_date.' },
          400
        );
      }

      // NASA API has a limit on date ranges (typically 100 days)
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 100) {
        return c.json<ErrorResponse>(
          { error: 'Date range cannot exceed 100 days.' },
          400
        );
      }
    }

    // Check if NASA API key is available
    if (!c.env.NASA_API_KEY) {
      return c.json<ErrorResponse>(
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
        return c.json<ErrorResponse>(
          { error: 'Rate limit exceeded. Please try again later.' },
          429
        );
      }
      
      if (response.status === 403) {
        return c.json<ErrorResponse>(
          { error: 'Invalid API key or access denied.' },
          403
        );
      }

      return c.json<ErrorResponse>(
        { 
          error: 'Failed to fetch data from NASA API.',
          message: `HTTP ${response.status}: ${response.statusText}`
        },
        502
      );
    }

    // Parse JSON response with proper typing
    const data = await response.json() as APODResponse | APODResponse[];

    // Validate response structure
    if (!data) {
      return c.json<ErrorResponse>(
        { error: 'Empty response from NASA API.' },
        502
      );
    }

    // Return typed response
    return c.json(data);

  } catch (error) {
    console.error('APOD endpoint error:', error);
    
    return c.json<ErrorResponse>(
      { error: 'Internal server error occurred while fetching APOD data.' },
      500
    );
  }
});

export default app;
