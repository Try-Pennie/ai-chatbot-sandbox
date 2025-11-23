import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FloatButton } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import './DifyChatBubble.css';

// Use the local proxy path
// Original token: KAqf6artL6k9TgtB
// URL: https://udify.app/chat/KAqf6artL6k9TgtB
const DIFY_CHATBOT_URL = "/chat/KAqf6artL6k9TgtB"; 

const MIN_WIDTH = 300;
const MIN_HEIGHT = 400;
const DEFAULT_WIDTH = 384; // 24rem
const DEFAULT_HEIGHT = 600; 
const BUBBLE_SIZE = 56;
const BUBBLE_MARGIN = 20;
const BUBBLE_GAP = 10;

const DifyChatBubble = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });

  const getInitialPosition = useCallback(() => {
    const bubbleRight = BUBBLE_MARGIN;
    const bubbleBottom = BUBBLE_MARGIN;
    return {
      x: window.innerWidth - DEFAULT_WIDTH - bubbleRight,
      y: window.innerHeight - DEFAULT_HEIGHT - bubbleBottom - BUBBLE_SIZE - BUBBLE_GAP,
    };
  }, []);

  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Set initial position on mount
  useEffect(() => {
      setPosition(getInitialPosition());
  }, [getInitialPosition]);

  const chatWindowRef = useRef(null);
  const operation = useRef(null);
  const initialMousePos = useRef({ x: 0, y: 0 });
  const initialWindowInfo = useRef({ width: 0, height: 0, x: 0, y: 0 });
  const bubbleRef = useRef(null);
  const animationFrameId = useRef(null);
  const iframeRef = useRef(null);

  // Style Injection Logic
  useEffect(() => {
    if (!isOpen) return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      try {
        const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
        
        if (iframeDocument) {
          const style = iframeDocument.createElement('style');
          
          // CSS to inject into the iframe
          // We target the header and background
          style.innerHTML = `
            /* Force transparent background on body to let our container show if needed, 
               or set a nice background */
            body {
                background-color: #ffffff !important;
            }

            /* Inject Header Gradient */
            /* Dify usually has a header element or a top div. 
               We will try to target it by common structure or assume Dify classes.
               If Dify classes are stable, we use them. If not, we might need 'header' tag if used.
               Looking at typical Dify embed, it often uses Tailwind.
            */
            
            /* Attempt to target the main header bar */
            /* Common pattern: A div with h-14 or similar at the top */
            div[class*="h-14"], header, .chat-header {
                background: linear-gradient(135deg, #a855f7, #3b82f6) !important;
                color: white !important;
            }
            
            /* Hide default title text if we want to replace it, or style it */
            /* We want 'Migo' text. The user said they will update App Name in Dify Console.
               So we just need to style the text color to white to look good on the gradient. */
            div[class*="text-gray-900"], .text-gray-900 {
                color: white !important;
            }
            
            /* If there is a logo/icon container, we might want to swap it or style it.
               The user mentioned "Insert the Migo Logo... into the header".
               We can use CSS content or background-image on the icon element.
            */
            /* Example: Target the icon container */
            div[class*="w-8"][class*="h-8"] img, 
            div[class*="w-10"][class*="h-10"] img {
                /* Hide original image */
                opacity: 0; 
            }
            div[class*="w-8"][class*="h-8"], 
            div[class*="w-10"][class*="h-10"] {
                background-image: url('/migo-logo.png');
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
            }

            /* Customize User Bubble Color */
            /* Identify user message bubble: typically aligned right, often blue */
            /* Dify classes vary, but often use 'bg-primary-600' or similar. */
            div[class*="bg-blue-600"], div[class*="bg-primary-600"] {
                 background: linear-gradient(135deg, #a855f7, #3b82f6) !important;
            }
          `;
          
          iframeDocument.head.appendChild(style);
          console.log("Injected custom styles into Dify iframe");
        }
      } catch (error) {
        console.error('Could not inject styles:', error);
      }
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [isOpen]);

  // ... Resize logic (copied from example) ...
  const handleMouseUp = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    operation.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseMove = useCallback((e) => {
    if (!operation.current) return;
    e.preventDefault();
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);

    animationFrameId.current = requestAnimationFrame(() => {
      const deltaX = e.clientX - initialMousePos.current.x;
      const deltaY = e.clientY - initialMousePos.current.y;

      if (operation.current === 'resize') {
        let newWidth = initialWindowInfo.current.width - deltaX;
        let newHeight = initialWindowInfo.current.height - deltaY;
        let newX = initialWindowInfo.current.x + deltaX;
        let newY = initialWindowInfo.current.y + deltaY;

        newWidth = Math.max(MIN_WIDTH, newWidth);
        newHeight = Math.max(MIN_HEIGHT, newHeight);

        if (newWidth === MIN_WIDTH) newX = initialWindowInfo.current.x + initialWindowInfo.current.width - MIN_WIDTH;
        if (newHeight === MIN_HEIGHT) newY = initialWindowInfo.current.y + initialWindowInfo.current.height - MIN_HEIGHT;

        newX = Math.max(BUBBLE_MARGIN, Math.min(newX, window.innerWidth - newWidth - BUBBLE_MARGIN));
        newY = Math.max(BUBBLE_MARGIN, Math.min(newY, window.innerHeight - newHeight - BUBBLE_MARGIN));

        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: newX, y: newY });
      }
      animationFrameId.current = null;
    });
  }, []);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    operation.current = 'resize';
    initialMousePos.current = { x: e.clientX, y: e.clientY };
    if (chatWindowRef.current) {
      const rect = chatWindowRef.current.getBoundingClientRect();
      initialWindowInfo.current = { width: rect.width, height: rect.height, x: rect.left, y: rect.top };
    }
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const toggleChat = () => {
    if (!isOpen) {
       // Reset position if needed or keep last
       // setPosition(getInitialPosition()); 
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="chat-bubble-container" ref={bubbleRef}>
      <FloatButton
        icon={isOpen ? <CloseOutlined /> : <img src="/migo-logo.png" alt="Migo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
        type="primary"
        onClick={toggleChat}
        className="migo-custom-button"
        style={{ width: BUBBLE_SIZE, height: BUBBLE_SIZE }}
      />
      {isOpen && (
        <div
          ref={chatWindowRef}
          className="chat-window"
          style={{
            width: `${size.width}px`,
            height: `${size.height}px`,
            transform: `translate(${position.x}px, ${position.y}px)`,
            top: 0,
            left: 0,
          }}
        >
          <div
            className="resize-handle top-left"
            onMouseDown={handleMouseDown}
          />
          <div className="chat-window-header">
             {/* Invisible header for dragging if needed, but resize handle is top-left. 
                 We might want a drag handle too. For now, just resize. */}
          </div>
          <div className="chat-window-content">
            <iframe
              ref={iframeRef}
              id="dify-chatbot-iframe"
              src={DIFY_CHATBOT_URL}
              title="Dify Chatbot"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DifyChatBubble;

