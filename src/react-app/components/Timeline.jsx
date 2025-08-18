import React, { useState, useEffect } from 'react';
import { Chrono } from 'react-chrono';

const Timeline = () => {
  const [apodData, setApodData] = useState([]);
  const [d1Data, setD1Data] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchApodData = async () => {
      try {
        const today = new Date();
        const endDate = today.toISOString().split('T')[0];
        
        // Create a new date object for start date calculation
        const startDateObj = new Date(today);
        startDateObj.setDate(startDateObj.getDate() - 6);
        const startDate = startDateObj.toISOString().split('T')[0];

        const response = await fetch(`/api/apod?start_date=${startDate}&end_date=${endDate}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch APOD data: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle both single object and array responses
        const dataArray = Array.isArray(data) ? data : [data];
        
        const formattedData = dataArray.map(item => ({
          title: item.date,
          cardTitle: item.title,
          cardSubtitle: item.explanation ? item.explanation.substring(0, 200) + '...' : '',
          media: item.url ? {
            type: 'IMAGE',
            source: {
              url: item.hdurl || item.url
            }
          } : undefined
        }));
        
        setApodData(formattedData);
      } catch (err) {
        console.error('Error fetching APOD data:', err);
        setError(prev => prev || 'Failed to fetch APOD data');
      }
    };

    const fetchD1Data = async () => {
      try {
        const response = await fetch('/api/d1');
        
        if (!response.ok) {
          // If D1 endpoint doesn't exist or fails, just log and continue
          console.warn('D1 endpoint not available or failed:', response.status);
          return;
        }
        
        const data = await response.json();
        
        // Handle both single object and array responses
        const dataArray = Array.isArray(data) ? data : [data];
        
        const formattedData = dataArray.map(item => ({
          title: item.date,
          cardTitle: item.title,
          cardSubtitle: item.explanation ? item.explanation.substring(0, 200) + '...' : ''
        }));
        
        setD1Data(formattedData);
      } catch (err) {
        console.warn('D1 data fetch failed (this may be expected):', err);
        // Don't set error for D1 data since it might not be implemented
      }
    };

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        fetchApodData(),
        fetchD1Data()
      ]);
      
      setLoading(false);
    };

    fetchData();
  }, []);

  // Combine and sort items by date
  const items = [...apodData, ...d1Data]
    .filter(item => item.title) // Filter out items without dates
    .sort((a, b) => new Date(b.title) - new Date(a.title)) // Sort newest first
    .map(item => ({
      ...item,
      // Ensure we have valid data
      cardTitle: item.cardTitle || 'Untitled',
      cardSubtitle: item.cardSubtitle || 'No description available'
    }));

  if (loading) {
    return (
      <div style={{ 
        width: '100%', 
        height: '200px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <p>Loading timeline data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        width: '100%', 
        height: '200px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <p style={{ color: 'red' }}>Error: {error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ 
        width: '100%', 
        height: '200px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <p>No timeline data available</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '95vh', padding: '20px' }}>
      <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>
        Recent APOD Timeline
      </h3>
      <Chrono 
        items={items} 
        mode="VERTICAL_ALTERNATING"
        theme={{
          primary: '#4a90e2',
          secondary: '#f5f5f5',
          cardBgColor: '#ffffff',
          cardForeColor: '#333333',
          titleColor: '#333333'
        }}
        cardHeight={200}
        enableOutline
        hideControls
      />
    </div>
  );
};

export default Timeline;