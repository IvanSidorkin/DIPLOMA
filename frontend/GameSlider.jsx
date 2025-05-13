import { useState, useEffect, useRef } from 'react';
import './GameSlider.css';

const GameSlider = ({ scrollImgs = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);
  const thumbsRef = useRef(null);
  const intervalRef = useRef(null);
  
  // Улучшенная функция определения типа медиа
  const getMediaType = (url) => {
    if (!url) return 'unknown';
    
    const cleanUrl = url.split('?')[0]; // Удаляем параметры запроса
    const extension = cleanUrl.split('.').pop().toLowerCase();
    
    if (['mp4', 'webm', 'ogg'].includes(extension)) return 'video';
    if (['jpg', 'jpeg', 'png', 'webp'].includes(extension)) return 'image';
    
    
    return 'unknown';
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === scrollImgs.length - 1 ? 0 : prev + 1));
    setIsPlaying(false);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? scrollImgs.length - 1 : prev - 1));
    setIsPlaying(false);
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
    setIsPlaying(false);
  };

    // Автовоспроизведение при монтировании и смене видео
    useEffect(() => {
      if (videoRef.current && getMediaType(scrollImgs[currentIndex]) === 'video') {
        const playPromise = videoRef.current.play();
        
        // Обработка ошибок воспроизведения
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log('Автовоспроизведение не сработало:', error);
            // Альтернативный вариант - включить звук по клику
            videoRef.current.muted = true;
            videoRef.current.play();
          });
        }
      }
    }, [currentIndex, scrollImgs]);

  useEffect(() => {
    const videoElement = videoRef.current;
    
    const handleVideoEnd = () => {
      goToNext();
    };
  
    if (videoElement && getMediaType(scrollImgs[currentIndex]) === 'video') {
      videoElement.addEventListener('ended', handleVideoEnd);
    }
  
    return () => {
      if (videoElement) {
        videoElement.removeEventListener('ended', handleVideoEnd);
      }
    };
  }, [currentIndex, scrollImgs]);

  useEffect(() => {
    const startInterval = () => {
      intervalRef.current = setInterval(() => {
        if (getMediaType(scrollImgs[currentIndex]) !== 'video' || 
            (videoRef.current && videoRef.current.paused)) {
          goToNext();
        }
      }, 10000); // 10 секунд
    };    startInterval();
    return () => clearInterval(intervalRef.current);
  }, [currentIndex, scrollImgs]);

  useEffect(() => {
    if (thumbsRef.current && scrollImgs.length > 0) {
      const thumbWidth = 150; // Ширина одной миниатюры
      const containerWidth = thumbsRef.current.offsetWidth;
      const scrollPosition = currentIndex * thumbWidth - containerWidth / 2 + thumbWidth / 2;
      
      thumbsRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [currentIndex, scrollImgs]);


  useEffect(() => {
    if (isPlaying && getMediaType(scrollImgs[currentIndex]) === 'image') {
      const timer = setTimeout(goToNext, 10000); 
      return () => clearTimeout(timer);
    }
  }, [currentIndex, isPlaying]);

  if (scrollImgs.length === 0) return null;

  const currentMedia = scrollImgs[currentIndex];
  const mediaType = getMediaType(currentMedia);

  return (
    <div className="game-slider">
      
      <div className="slider-container">
        
        
        <div className="slide">
          {mediaType === 'video' ? (
            <div className="video-container">
              <video 
                key={currentMedia} // Принудительный ререндер при смене видео
                controls 
                ref={videoRef}
                autoPlay
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                muted
              >
                <source src={currentMedia} type={`video/mp4`} />
                Ваш браузер не поддерживает видео.
              </video>
            </div>
          ) : mediaType === 'image' ? (
            <img 
              src={currentMedia} 
              alt={`Скриншот ${currentIndex + 1}`} 
              className="slider-image"
              loading="lazy"
            />
          ) : (
            <div className="unknown-media">
              Неподдерживаемый формат медиа
            </div>
          )}
        </div>
        <button className="slider-arrow left-arrow" onClick={goToPrev}>&#10094;</button>
        <button className="slider-arrow right-arrow" onClick={goToNext}>&#10095;</button>
      </div>
      <div className="thumbnails-container" ref={thumbsRef}>
        {scrollImgs.map((item, index) => (
          <div 
            key={index}
            className={`thumbnail ${index === currentIndex ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
          >
            {getMediaType(item) === 'video' ? (
              <div className="video-thumbnail">
                <video muted>
                  <source src={item} type="video/mp4" />
                </video>
                <div className="play-icon">▶</div>
              </div>
            ) : (
              <img 
                src={item} 
                alt={`Миниатюра ${index + 1}`}
                loading="lazy"
              />
            )}
          </div>
        ))}
      </div>
      <div className="slider-dots">
        {scrollImgs.map((item, index) => (
          <span 
            key={index} 
            className={`dot ${index === currentIndex ? 'active' : ''} ${getMediaType(item)}-dot`}
            onClick={() => goToSlide(index)}
            title={`${getMediaType(item) === 'video' ? 'Видео' : 'Изображение'} ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default GameSlider;