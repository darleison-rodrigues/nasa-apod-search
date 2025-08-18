import React, { useState, useEffect } from 'react';
import { Chrono } from 'react-chrono';

const Timeline = () => {
  const [apodData, setApodData] = useState([]);
  const [d1Data, setD1Data] = useState([]);

  useEffect(() => {
    const fetchApodData = async () => {
      const today = new Date();
      const endDate = today.toISOString().split('T')[0];
      today.setDate(today.getDate() - 6);
      const startDate = today.toISOString().split('T')[0];

      const response = await fetch(`/api/apod?start_date=${startDate}&end_date=${endDate}`);
      const data = await response.json();
      setApodData(data.map(item => ({ title: item.date, cardTitle: item.title, cardSubtitle: item.explanation, media: { type: 'IMAGE', source: { url: item.url } } })));
    };

    const fetchD1Data = async () => {
      const response = await fetch('/api/d1');
      const data = await response.json();
      setD1Data(data.map(item => ({ title: item.date, cardTitle: item.title, cardSubtitle: item.explanation })));
    };

    fetchApodData();
    fetchD1Data();
  }, []);

  const items = [...apodData, ...d1Data].sort((a, b) => new Date(a.title) - new Date(b.title));

  return (
    <div style={{ width: '100%', height: '95vh' }}>
      <Chrono items={items} mode="VERTICAL_ALTERNATING" />
    </div>
  );
};

export default Timeline;