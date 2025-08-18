import React, { useState, useEffect, useRef } from 'react';

const Timeline = () => {
  const [items, setItems] = useState([]);
  const timelineRef = useRef(null);
  const itemRefs = useRef([]);
  const lineRef = useRef(null);

  useEffect(() => {
    const fetchAPODData = async () => {
      const today = new Date();
      const endDate = today.toISOString().split('T')[0];
      today.setDate(today.getDate() - 6);
      const startDate = today.toISOString().split('T')[0];

      try {
        const response = await fetch(`/api/apod?start_date=${startDate}&end_date=${endDate}`);
        const data = await response.json();

        const transformedData = data.map(item => ({
          title: item.date,
          cardTitle: item.title,
          cardSubtitle: item.explanation,
          media: {
            type: 'IMAGE',
            source: {
              url: item.hdurl || item.url,
            },
          },
        }));

        setItems(transformedData.reverse()); // Reverse to show the latest first
      } catch (error) {
        console.error('Error fetching APOD data:', error);
      }
    };

    fetchAPODData();
  }, []);

  // Scroll animation effect
  useEffect(() => {
    if (items.length === 0) return;

    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const windowHeight = window.innerHeight;
      const timelineElement = timelineRef.current;
      
      if (!timelineElement) return;

      const timelineTop = timelineElement.offsetTop;
      const timelineHeight = timelineElement.offsetHeight;
      
      // Calculate progress (0 to 1)
      const progress = Math.max(0, Math.min(1, 
        (scrolled + windowHeight - timelineTop) / (timelineHeight + windowHeight)
      ));

      // Animate timeline line
      if (lineRef.current) {
        lineRef.current.style.transform = `scaleY(${progress})`;
      }

      // Animate timeline items
      itemRefs.current.forEach((item, index) => {
        if (!item) return;
        
        const itemTop = item.offsetTop;
        const itemProgress = Math.max(0, Math.min(1,
          (scrolled + windowHeight - (timelineTop + itemTop)) / windowHeight
        ));
        
        // Fade in and slide animation
        const opacity = itemProgress;
        const translateY = (1 - itemProgress) * 50;
        const scale = 0.8 + (itemProgress * 0.2);
        
        item.style.opacity = opacity;
        item.style.transform = `translateY(${translateY}px) scale(${scale})`;
        
        // Add rotation effect for alternating items
        const rotation = index % 2 === 0 ? translateY * 0.1 : -translateY * 0.1;
        item.style.transform += ` rotate(${rotation}deg)`;
      });
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial call
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [items]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <div className="h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Cosmic Timeline
          </h1>
          <p className="text-xl text-gray-300">Scroll down to explore the universe</p>
          <div className="mt-8 animate-bounce">
            <svg className="w-8 h-8 mx-auto text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div ref={timelineRef} className="relative max-w-6xl mx-auto px-8 py-20">
        {/* Central Line */}
        <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-500 origin-top">
          <div 
            ref={lineRef}
            className="w-full h-full bg-gradient-to-b from-cyan-400 to-pink-400 origin-top transition-transform duration-300"
            style={{ transform: 'scaleY(0)' }}
          />
        </div>

        {/* Timeline Items */}
        {items.map((item, index) => (
          <div
            key={item.title}
            ref={el => itemRefs.current[index] = el}
            className={`relative flex items-center mb-16 ${
              index % 2 === 0 ? 'justify-start' : 'justify-end'
            }`}
            style={{ opacity: 0, transform: 'translateY(50px) scale(0.8)' }}
          >
            {/* Timeline Node */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-6 h-6 bg-gradient-to-r from-cyan-400 to-pink-400 rounded-full border-4 border-white shadow-lg z-10">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-pink-400 rounded-full animate-ping opacity-75" />
            </div>

            {/* Content Card */}
            <div className={`w-5/12 ${index % 2 === 0 ? 'mr-auto pr-8' : 'ml-auto pl-8'}`}>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
                {/* Date */}
                <div className="text-cyan-400 text-sm font-semibold mb-2">
                  {new Date(item.title).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                
                {/* Title */}
                <h3 className="text-xl font-bold text-white mb-3">
                  {item.cardTitle}
                </h3>
                
                {/* Image */}
                {item.media && (
                  <div className="mb-4 rounded-lg overflow-hidden image-card">
                    <img 
                      src={item.media.source.url} 
                      alt={item.cardTitle}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                )}
                
                {/* Description */}
                <p className="text-gray-300 text-sm leading-relaxed">
                  {item.cardSubtitle}
                </p>
                
                {/* Connector Line */}
                <div className={`absolute top-6 ${
                  index % 2 === 0 
                    ? 'right-0 w-8 border-r-2' 
                    : 'left-0 w-8 border-l-2'
                } border-cyan-400 h-0.5`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer spacing */}
      <div className="h-screen" />
    </div>
  );
};

export default Timeline;