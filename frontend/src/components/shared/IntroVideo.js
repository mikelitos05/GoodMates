import React, { useState, useRef, useEffect } from 'react';
import './IntroVideo.css';

function IntroVideo({ onFinish }) {
    const [visible, setVisible] = useState(true);
    const [fading, setFading] = useState(false);
    const videoRef = useRef(null);

    const handleEnd = () => {
        setFading(true);
        setTimeout(() => {
            setVisible(false);
            if (onFinish) onFinish();
        }, 600);
    };


    const handleError = () => handleEnd();


    const handleSkip = () => handleEnd();

    useEffect(() => {
        const vid = videoRef.current;
        if (vid) {
            vid.play().catch(() => {

                handleEnd();
            });
        }
    }, []);

    if (!visible) return null;

    return (
        <div className={`intro-overlay ${fading ? 'intro-fade-out' : ''}`} onClick={handleSkip}>
            <video
                ref={videoRef}
                className="intro-video"
                src="/Video_intro.mp4"
                muted
                playsInline
                onEnded={handleEnd}
                onError={handleError}
            />
            <button className="intro-skip">
                Saltar intro ›
            </button>
        </div>
    );
}

export default IntroVideo;
