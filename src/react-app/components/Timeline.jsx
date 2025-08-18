import React, { useState, useEffect } from 'react';
import { Chrono } from 'react-chrono';

const Timeline = ({ items, loading, error }) => {
  

  

  

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