import { createAnimatable, utils } from 'animejs';
import { useEffect, useRef, useState, useCallback } from 'react'; // Added useCallback
import './ClockworkTimeline.css';
// Removed: import mockApodData from '../mockApodData';

const PI = Math.PI;
const IMAGES_PER_PAGE = 10; // Define how many images to fetch per page

function ClockworkTimeline() {
  const clock1Ref = useRef(null);
  const clock2Ref = useRef(null);
  const [apodData, setApodData] = useState([]); // State to store fetched APOD data
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipContent, setTooltipContent] = useState(null);
  const scrollTimeoutRef = useRef(null);
  const clock1Animatable = useRef(null);
  const clock2Animatable = useRef(null);
  const [loading, setLoading] = useState(true); // New loading state
  const [error, setError] = useState(null); // New error state
  const [currentPage, setCurrentPage] = useState(1); // New state for current page
  const [hasMore, setHasMore] = useState(true); // New state to check if more data is available

  // Function to fetch APOD data
  const fetchApodData = useCallback(async (page) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/images?page=${page}&limit=${IMAGES_PER_PAGE}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.length === 0) {
        setHasMore(false);
      } else {
        setApodData(prevData => {
          // Filter out duplicates if any, based on 'date'
          const newData = data.filter(newItem => !prevData.some(existingItem => existingItem.date === newItem.date));
          return [...prevData, ...newData];
        });
        setHasMore(data.length === IMAGES_PER_PAGE); // If we got less than limit, no more data
      }
    } catch (e) {
      setError(`Failed to fetch APOD data: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch when component mounts
  useEffect(() => {
    fetchApodData(1);
  }, [fetchApodData]);

  useEffect(() => {
    if (!clock1Animatable.current) {
      clock1Animatable.current = createAnimatable(clock1Ref.current, {
        rotate: { unit: 'rad' },
        modifier: utils.snap(PI / 10),
        duration: 750, // Set animation duration
      });
    }
    if (!clock2Animatable.current) {
      clock2Animatable.current = createAnimatable(clock2Ref.current, {
        rotate: { unit: 'rad' },
        modifier: v => -v,
        duration: 750, // Set animation duration
      });
    }

    const handleWheel = (e) => {
      e.preventDefault();
      if (loading) return; // Prevent scrolling while loading

      const direction = e.deltaY > 0 ? 1 : -1;
      setCurrentDateIndex(prevIndex => {
        let newIndex = prevIndex + direction;

        // Handle wrapping around
        if (newIndex < 0) {
          newIndex = apodData.length - 1;
        } else if (newIndex >= apodData.length) {
          // If we reach the end of current data and there might be more, fetch next page
          if (hasMore) {
            setCurrentPage(prevPage => prevPage + 1);
            // Keep the index at the end of the current data until new data loads
            return prevIndex;
          } else {
            newIndex = 0; // Wrap around if no more data
          }
        }
        return newIndex;
      });
    };

    const clockContainer = clock1Ref.current;
    if (clockContainer) {
      clockContainer.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (clockContainer) {
        clockContainer.removeEventListener('wheel', handleWheel);
      }
    };
  }, [apodData.length, hasMore, loading, fetchApodData]); // Added dependencies

  // Fetch new page when currentPage changes
  useEffect(() => {
    if (currentPage > 1) {
      fetchApodData(currentPage);
    }
  }, [currentPage, fetchApodData]);

  useEffect(() => {
    if (apodData.length === 0) return; // Don't animate if no data

    const totalEntries = apodData.length; // Use fetched data length
    const anglePerEntry = (2 * PI) / totalEntries;
    const targetAngle = currentDateIndex * anglePerEntry;

    const clock1 = clock1Animatable.current;
    const clock2 = clock2Animatable.current;

    if (clock1 && clock2) {
      clock1.rotate(targetAngle, true);
      clock2.rotate(-targetAngle, true);
    }

    const animationDuration = 750; // milliseconds, matches animatable duration

    // Hide tooltip immediately when index changes
    setShowTooltip(false);

    // Clear any existing tooltip timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Show tooltip after animation completes
    scrollTimeoutRef.current = setTimeout(() => {
      const apodEntry = apodData[currentDateIndex]; // Use fetched data
      if (apodEntry) {
        setTooltipContent({
          date: apodEntry.date,
          title: apodEntry.title,
          explanation: apodEntry.explanation,
          url: apodEntry.image_url, // Use image_url from API
          media_type: 'image', // Assuming all are images for now
        });
        setShowTooltip(true);

        // Calculate tooltip position
        const clockContainer = clock1Ref.current;
        if (clockContainer) {
          const { width, height } = clockContainer.getBoundingClientRect();
          const centerX = width / 2;
          const centerY = height / 2;
          const radius = width / 2; // Assuming clock is a circle

          // Angle is measured from the positive x-axis, counter-clockwise
          // Clock hand points upwards (negative y-axis) at 0 index
          // So, we need to adjust the angle by -PI/2 to align with standard polar coordinates
          const adjustedAngle = targetAngle - PI / 2;

          const tooltipDistance = radius + 2; // Distance from center to tooltip (adjust as needed)

          const tooltipX = centerX + tooltipDistance * Math.cos(adjustedAngle);
          const tooltipY = centerY + tooltipDistance * Math.sin(adjustedAngle);

          setTooltipPosition({ left: `${tooltipX}px`, top: `${tooltipY}px` });
        }
      }
    }, animationDuration);

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [currentDateIndex, apodData]); // Added apodData as dependency

  const [tooltipPosition, setTooltipPosition] = useState({ });

  if (loading && apodData.length === 0) {
    return <div className="loading-message">Loading APOD data...</div>;
  }

  if (error) {
    return <div className="error-message">Error: ${error}</div>;
  }

  if (apodData.length === 0) {
    return <div className="no-data-message">No APOD data available.</div>;
  }

  return (
    <div className="clock-timeline-container">
      <div className="clock-container" ref={clock1Ref}>
        <div className="clock-1"></div>
        <div ref={clock2Ref} className="clock-2"></div>
      </div>
      {showTooltip && tooltipContent && (
        <div className="apod-tooltip" style={tooltipPosition}>
          <h3>{tooltipContent.date}</h3>
          <h4>{tooltipContent.title}</h4>
          {tooltipContent.media_type === 'image' && (
            <img src={tooltipContent.url} alt={tooltipContent.title} style={{ maxWidth: '100%', height: 'auto' }} />
          )}
          <p>{tooltipContent.explanation}</p>
        </div>
      )}
    </div>
  );
}

export default ClockworkTimeline;