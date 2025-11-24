import React, { useState, useRef, useCallback, useEffect } from 'react';
import FloatButton from './FloatButton';
import CloseIcon from './CloseIcon';
import './DifyChatBubble.css';

// Use the local proxy path
// Original token: KAqf6artL6k9TgtB
// URL: https://udify.app/chat/KAqf6artL6k9TgtB
// TODO: For production, you MUST pass the Salesforce Lead ID (sfdc_lead_id) 
// as a query parameter to the URL (e.g. ?inputs={"sfdc_lead_id":"123"}).
const DIFY_CHATBOT_URL = "/chat/KAqf6artL6k9TgtB"; 

const MIN_WIDTH = 300;
const MIN_HEIGHT = 400;
const DEFAULT_WIDTH = 384; // 24rem
const DEFAULT_HEIGHT = 600; 
const BUBBLE_SIZE = 56;
const BUBBLE_MARGIN = 20;
const BUBBLE_GAP = 10;

const IFRAME_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;

const DifyChatBubble = () => {
  const [isOpen, setIsOpen] = useState(false);
  // Start preloading immediately on mount
  const [isPreloaded, setIsPreloaded] = useState(true);
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [iframeReady, setIframeReady] = useState(false);
  // Removed preloadedIframeRef since we'll use the main iframeRef for everything
  
  const checkBubbleOverlap = useCallback((windowPos, windowSize) => {
    const bubble = bubbleRef.current?.getBoundingClientRect();
    if (!bubble) return false;

    const windowRect = {
      left: windowPos.x,
      right: windowPos.x + windowSize.width,
      top: windowPos.y,
      bottom: windowPos.y + windowSize.height
    };

    const bubbleRect = {
      left: bubble.left,
      right: bubble.right,
      top: bubble.top,
      bottom: bubble.bottom
    };

    // Check if rectangles overlap
    return !(
      windowRect.right < bubbleRect.left ||
      windowRect.left > bubbleRect.right ||
      windowRect.bottom < bubbleRect.top ||
      windowRect.top > bubbleRect.bottom
    );
  }, []);

  const getInitialPosition = useCallback(() => {
    const bubbleRight = BUBBLE_MARGIN;
    const bubbleBottom = BUBBLE_MARGIN;

    let x = window.innerWidth - DEFAULT_WIDTH - bubbleRight;
    let y = window.innerHeight - DEFAULT_HEIGHT - bubbleBottom - BUBBLE_SIZE - BUBBLE_GAP;

    // If still overlapping, shift left
    if (checkBubbleOverlap({ x, y }, { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })) {
      x = window.innerWidth - DEFAULT_WIDTH - BUBBLE_SIZE - BUBBLE_MARGIN * 2 - BUBBLE_GAP;
    }

    // Ensure still in viewport
    x = Math.max(BUBBLE_MARGIN, Math.min(x, window.innerWidth - DEFAULT_WIDTH - BUBBLE_MARGIN));
    y = Math.max(BUBBLE_MARGIN, Math.min(y, window.innerHeight - DEFAULT_HEIGHT - BUBBLE_MARGIN));

    return { x, y };
  }, [checkBubbleOverlap]);

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

  // Iframe error handling
  const handleIframeError = useCallback(() => {
    console.error('Iframe failed to load');
    setIframeError(true);
    setIframeLoading(false);

    // Auto-retry with exponential backoff
    if (retryCount < MAX_RETRIES) {
      const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      setTimeout(() => {
        console.log(`Retrying iframe load (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        setRetryCount(prev => prev + 1);
        setIframeError(false);
        setIframeLoading(true);
        // Trigger reload
        if (iframeRef.current) {
          const currentSrc = iframeRef.current.src;
          iframeRef.current.src = 'about:blank';
          setTimeout(() => {
            if (iframeRef.current) iframeRef.current.src = currentSrc;
          }, 10);
        }
      }, delay);
    }
  }, [retryCount]);

  // Helper to inject styles
  const injectStyles = useCallback((iframe) => {
    try {
      const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
      
      // Clear title for cleaner UI
      iframeDocument.title = "Migo Chat";

      if (iframeDocument) {
        const style = iframeDocument.createElement('style');

        // Enhanced CSS selectors for better reliability and customization
        style.innerHTML = `
          /* Background */
          * {
            background-image: linear-gradient(to right, rgb(231 233 238 / 0%), rgb(244 245 246 / 0%)) !important;
          }

          body {
            background-color: #ffffff !important;
          }

          /* Header - Multiple fallback selectors for robustness */
          body > div:first-child > div:first-child,
          div[class*="h-14"][class*="flex"],
          header,
          .chat-header,
          div[role="banner"],
          .h-14 {
            background: linear-gradient(135deg, #a855f7, #3b82f6) !important;
            color: white !important;
            height: 2rem !important;
          }

          /* Text in header - ensure white color on gradient */
          body > div:first-child > div:first-child *,
          div[class*="h-14"] *,
          header *,
          div[class*="text-gray-900"],
          div[class*="text-gray"],
          .text-gray-900 {
            color: white !important;
          }

          /* Hide mobile title */
          div.system-md-semibold.truncate {
            font-size: 0px !important;
          }

          /* Hide desktop header info */
          div.flex.shrink-0.items-center.gap-1\\.5.px-2 {
            visibility: hidden !important;
          }

          /* Logo/Icon replacement - ONLY target header logos, not footer */
          /* Only hide logos that are inside the header (h-14 or top div) */
          div[class*="h-14"] img,
          header img,
          body > div:first-child > div:first-child img {
            opacity: 0 !important;
          }

          div[class*="h-14"]:has(img),
          header:has(img),
          body > div:first-child > div:first-child:has(img) {
            background-image: url('/migo-logo.png') !important;
            background-size: contain !important;
            background-repeat: no-repeat !important;
            background-position: center !important;
          }

          /* Restore visibility for "Powered by" section at bottom */
          div[class*="powered"],
          div[class*="footer"],
          a[href*="dify" i],
          [class*="flex"][class*="items-center"][class*="gap-1"] img {
            opacity: 1 !important;
            visibility: visible !important;
          }

          /* User message bubbles - Enhanced targeting */
          div.w-full.rounded-2xl.bg-\\[\\#D1E9FF\\]\\/50.px-4.py-3.text-sm.text-gray-900,
          div[class*="bg-blue-600"],
          div[class*="bg-primary-600"],
          div[class*="ml-auto"][class*="bg-blue"],
          .user-message,
          [data-message-role="user"] {
            background: linear-gradient(135deg, #a855f7, #3b82f6) !important;
            background-color: rgb(145 154 164) !important;
          }

          /* Fallback: target any blue background on right side */
          div[class*="justify-end"] > div[class*="bg-blue"],
          div[class*="items-end"] > div[class*="bg-blue"] {
            background: linear-gradient(135deg, #a855f7, #3b82f6) !important;
          }

          /* Adjust bottom spacing */
          .h-\\[calc\\(100vh_-_60px\\)\\] {
            height: calc(100vh - 20px) !important;
          }
        `;
        
        iframeDocument.head.appendChild(style);
        console.log("Injected custom styles into Dify iframe");
      }
    } catch (error) {
      console.error('Could not inject styles:', error);
    }
  }, []);

  const handleIframeLoad = useCallback((e) => {
    console.log('Iframe loaded successfully');
    setIframeLoading(false);
    setIframeError(false);
    setRetryCount(0);
    setIframeReady(true);
    
    // Inject styles immediately upon load
    if (e.target) {
      injectStyles(e.target);
    }
  }, [injectStyles]);

  // Set loading state when opening chat if not ready
  useEffect(() => {
    if (isOpen && !iframeReady) {
      setIframeLoading(true);
    }
  }, [isOpen, iframeReady]);

  // Timeout protection for iframe loading
  useEffect(() => {
    if (!isOpen || !iframeLoading) return;

    const timeoutId = setTimeout(() => {
      if (iframeLoading) {
        console.warn('Iframe load timeout');
        handleIframeError();
      }
    }, IFRAME_TIMEOUT);

    return () => clearTimeout(timeoutId);
  }, [isOpen, iframeLoading, handleIframeError]);

  // Network connectivity detection
  useEffect(() => {
    const handleOnline = () => {
      console.log('Connection restored');
      if (iframeError) {
        // Auto-retry when connection restored
        setRetryCount(0);
        setIframeError(false);
        setIframeLoading(true);
        if (iframeRef.current) {
          const currentSrc = iframeRef.current.src;
          iframeRef.current.src = 'about:blank';
          setTimeout(() => {
            if (iframeRef.current) iframeRef.current.src = currentSrc;
          }, 10);
        }
      }
    };

    const handleOffline = () => {
      console.warn('Connection lost');
      setIframeError(true);
      setIframeLoading(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [iframeError]);

  // Removed separate Style Injection useEffect - now handled in handleIframeLoad

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

        // Check for bubble overlap and adjust if needed
        if (checkBubbleOverlap({ x: newX, y: newY }, { width: newWidth, height: newHeight })) {
          const bubble = bubbleRef.current?.getBoundingClientRect();
          if (bubble) {
            // Shift window left to avoid bubble
            newX = Math.min(newX, bubble.left - newWidth - BUBBLE_GAP);
            if (newX < BUBBLE_MARGIN) {
              // If can't fit left, try shifting up
              newY = Math.min(newY, bubble.top - newHeight - BUBBLE_GAP);
            }
          }
        }

        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: newX, y: newY });
      }
      animationFrameId.current = null;
    });
  }, [checkBubbleOverlap]);

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

  // Removed the AGGRESSIVE PRELOADING useEffect with setTimeout since we now preload by default

  // Preload on hover as well (in case it hasn't started yet)
  const handleMouseEnter = useCallback(() => {
    if (!isPreloaded && !isOpen) {
      console.log('Starting hover-triggered preload');
      setIsPreloaded(true);
    }
  }, [isPreloaded, isOpen]);

  const handleMouseLeave = useCallback(() => {
    // No-op, we keep the preload going
  }, []);

  const toggleChat = () => {
    const newState = !isOpen;
    if (!newState) {
      // Closing chat
      setIsOpen(false);
      // Return focus to button
      setTimeout(() => {
        bubbleRef.current?.querySelector('button')?.focus();
      }, 100);
    } else {
      // Opening chat
      // If we haven't preloaded yet, this will start it
      if (!isPreloaded) setIsPreloaded(true);
      
      setSize({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
      setPosition(getInitialPosition());
      setIsOpen(true);

      // If iframe is already preloaded and ready, it will show instantly
      if (iframeReady) {
        console.log('Using preloaded iframe - instant open!');
        // No need to setIframeLoading(false) as it's already false
      } else {
        console.log('Iframe still loading, showing loader');
        setIframeLoading(true);
      }

      // Focus iframe after opening
      setTimeout(() => {
        iframeRef.current?.focus();
      }, 200);
    }
  };

  // Keyboard support - ESC to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        toggleChat();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const shouldRenderChatWindow = isPreloaded || isOpen;

  return (
    <div className="chat-bubble-container" ref={bubbleRef}>
      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" className="sr-only">
        {isOpen ? 'Chat opened' : ''}
      </div>

      <FloatButton
        icon={isOpen ? <CloseIcon size={24} color="#a855f7" /> : <img src="/migo-logo-removebg-preview.png" alt="Migo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
        onClick={toggleChat}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="migo-custom-button"
        style={{ width: BUBBLE_SIZE, height: BUBBLE_SIZE }}
        ariaLabel={isOpen ? "Close chat" : "Open chat"}
        ariaExpanded={isOpen}
      />

      {/* 
         Unified Chat Window & Preloader
         We always render the chat window structure if preloading or open.
         We use CSS to hide it when closed, preserving the iframe state.
      */}
      {shouldRenderChatWindow && (
        <div
          id="chat-window"
          role="dialog"
          aria-label="Migo Chat Window"
          aria-modal="false"
          ref={chatWindowRef}
          className="chat-window"
          style={{
            width: `${size.width}px`,
            height: `${size.height}px`,
            transform: `translate(${position.x}px, ${position.y}px)`,
            top: 0,
            left: 0,
            // Visibility toggle to keep iframe alive
            visibility: isOpen ? 'visible' : 'hidden',
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? 'auto' : 'none',
            // If hidden, move offscreen to be safe
            zIndex: isOpen ? 1000 : -1 
          }}
        >
          <div
            className="resize-handle top-left"
            onMouseDown={handleMouseDown}
          />
          <div className="chat-window-header">
             {/* Header content */}
          </div>
          <div className="chat-window-content">
            {/* Show loader only if visible and still loading */}
            {isOpen && iframeLoading && (
              <div className="iframe-loader">
                <div className="spinner"></div>
                <p>Loading chat...</p>
              </div>
            )}

            {iframeError && retryCount >= MAX_RETRIES && (
              <div className="iframe-error">
                <p>Unable to connect to chat service.</p>
                <button onClick={() => {
                  setRetryCount(0);
                  setIframeError(false);
                  setIframeLoading(true);
                  if (iframeRef.current) {
                    const currentSrc = iframeRef.current.src;
                    iframeRef.current.src = 'about:blank';
                    setTimeout(() => {
                      if (iframeRef.current) iframeRef.current.src = currentSrc;
                    }, 10);
                  }
                }}>
                  Try Again
                </button>
              </div>
            )}

            <iframe
              ref={iframeRef}
              id="dify-chatbot-iframe"
              src={DIFY_CHATBOT_URL}
              title="Dify Chatbot"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              // loading="eager" is default, but good to be explicit for preloading
              loading="eager" 
              style={{
                // If loading and not ready, hide the iframe content so we don't see partial renders
                // But if preloading in background, we let it render (it's hidden by parent anyway)
                opacity: (iframeLoading && !iframeReady && isOpen) || iframeError ? 0 : 1,
                transition: 'opacity 0.2s'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DifyChatBubble;

