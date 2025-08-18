import { Hono } from 'hono';

const app = new Hono<{ Bindings: Env }>();

app.get('/apod', async (c) => {
  const { start_date, end_date } = c.req.query();
  const url = new URL('https://api.nasa.gov/planetary/apod');
  url.searchParams.set('api_key', c.env.NASA_API_KEY);
  if (start_date) url.searchParams.set('start_date', start_date);
  if (end_date) url.searchParams.set('end_date', end_date);

  const response = await fetch(url.toString());
  const data = await response.json();

  return c.json(data);
});

export default app;
