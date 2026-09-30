'use client';

import {useState, type ImgHTMLAttributes} from 'react';

export default function TourImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={`image-placeholder ${props.className || ''}`} role="img" aria-label={`${props.alt || '觀光景點'}: 無法載入照片`}><span>旅</span><small>照片暫時無法顯示</small></div>;
  return <img {...props} alt={props.alt || ''} ref={element => {if (element?.complete && element.naturalWidth === 0) setFailed(true);}} onError={() => setFailed(true)}/>;
}
