import './GameCard.css';
import React from 'react';

function GameCard({ imageUrl, title, reviews, releaseDate }) {
  const getReviewColor = (reviewText) => {
    const match = reviewText.match(/^(\d+)%/);
    const percent = match ? parseInt(match[1], 10) : 0;
    
    if (percent >= 75) return '#8e54d1';
    if (percent >= 50) return '#F36223';
    return '#d32f2f';
  };

  return (
    <div className="block">
      <img className='GamePicH' src={imageUrl} alt={title} />
      <div className='cardH'>
        <h2 className='GameName'>{title}</h2>
        <div 
          className='Reviews' 
          style={{ backgroundColor: getReviewColor(reviews) }}
        >
          {reviews}
        </div>
      </div>
      <p className='ReleaseDate'>Дата Выхода: {releaseDate}</p>
    </div>
  );
}

export default GameCard;