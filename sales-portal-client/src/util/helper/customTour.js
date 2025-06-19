import React, { useState, useEffect, useRef } from 'react';
import './CustomTour.css';

const CustomTour = ({ steps, isOpen, onRequestClose }) => {
  const currentStep = 0;
  const [positions, setPositions] = useState([]);
  const popUpRef = useRef(null);



  useEffect(() => {
    const handleScroll = () => {
      if (positions.length > 0 && popUpRef.current) {
        const { top, left, width } = positions[0];
        popUpRef.current.style.top = `${top - window.scrollY}px`;
        popUpRef.current.style.left = `${left + width + 10 - window.scrollX}px`;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [positions]);

  useEffect(() => {
    if (isOpen && steps[currentStep]) {
      const { selector } = steps[currentStep];
      const elements = document.querySelectorAll(selector);
      const newPositions = [];
      elements.forEach((element) => {
        element.classList.add('highlight');
        const getElementSize = element.getBoundingClientRect();
        newPositions.push({
          top: getElementSize.top + window.scrollY,
          left: getElementSize.left + window.scrollX,
          width: getElementSize.width,
          height: getElementSize.height,
        });
      });
      setPositions(newPositions);

      if (elements.length > 0) {
        elements[0].scrollIntoView({ behavior: 'smooth' });
      }

      return () => {
        elements.forEach((element) => {
          element.classList.remove('highlight');
        });
      };
    }
  }, [isOpen, currentStep, steps]);

  if (!isOpen || !steps[currentStep]) {
    return null;
  }

  const closeTour = () => {
    onRequestClose();
  };

  return (
    <div className="tour-overlay">
      {positions.length > 0 && (
        <div
          className="tour-content"
          style={{
            top: `${positions[0].top}px`,
            left: `${positions[0].left + positions[0].width + 10}px`,
             marginLeft: '10px',
            position: 'absolute',
          }}
          ref={popUpRef}
        >
          <h4>Step 1: Select the required SO number</h4>
          <h4>
            Step 2: Click on Action Icon <button className='action-btn'>?</button> for the
            required line item
          </h4>
          <div >
            <button className="pop-up-btn" onClick={closeTour}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomTour;