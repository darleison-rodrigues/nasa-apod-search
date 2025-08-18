import React, { useState, useEffect } from 'react';
import './App.css';
import Timeline from './components/Timeline';


function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [todayApod, setTodayApod] = useState(null);
  const [todayApodLoading, setTodayApodLoading] = useState(true);
  const [todayApodError, setTodayApodError] = useState(null);

  useEffect(() => {
    const fetchTodayApod = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const response = await fetch(`/api/apod?start_date=${today}&end_date=${today}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTodayApod(data[0]); // Assuming the API returns an array for a single date
      } catch (e) {
        setTodayApodError('Failed to fetch todays APOD. Please try again later.');
        console.error('Today APOD fetch error:', e);
      } finally {
        setTodayApodLoading(false);
      }
    };

    fetchTodayApod();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/search/keyword?query=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSearchResults(data);
    } catch (e) {
      setError('Failed to fetch search results. Please try again.');
      console.error('Search error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>APOD Search</h1>
      </header>
      <main className="main-content">
        <div className="search-section">
          <h2>Search APOD Images</h2>
          <form onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search for cosmic wonders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={loading}
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
          {error && <p className="error-message">{error}</p>}
          {searchResults.length > 0 && (
            <div className="search-results">
              <h3>Results for "{searchQuery}"</h3>
              <ul>
                {searchResults.map((item) => (
                  <li key={item.date}>
                    <strong>{item.title}</strong>
                    <p>{item.explanation}</p>
                    {item.image_url && (
                      <img src={item.image_url} alt={item.title} style={{ maxWidth: '100%', height: 'auto' }} />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {searchResults.length === 0 && !loading && !error && searchQuery && (
            <p>No results found for "{searchQuery}".</p>
          )}
        </div>

        {!searchQuery && searchResults.length === 0 && (
          <div className="today-apod-section">
            {todayApodLoading && <p>Loading today's APOD...</p>}
            {todayApodError && <p className="error-message">{todayApodError}</p>}
            {todayApod && (
              <div className="today-apod-card">
                <h3>Today's Astronomy Picture of the Day</h3>
                <h4>{todayApod.title} ({todayApod.date})</h4>
                {todayApod.image_url && (
                  <img src={todayApod.image_url} alt={todayApod.title} style={{ maxWidth: '100%', height: 'auto' }} />
                )}
                <p>{todayApod.explanation}</p>
                {todayApod.copyright && <p>Copyright: {todayApod.copyright}</p>}
              </div>
            )}
          </div>
        )}
      {!searchQuery && searchResults.length === 0 && !todayApodLoading && !todayApodError && todayApod && (
          <Timeline />
        )}
      </main>
    </div>
  );
}

export default App;