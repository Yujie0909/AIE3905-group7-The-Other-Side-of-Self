import React from 'react';import {createRoot} from 'react-dom/client';import {BackgroundRenderer} from '../src/components/BackgroundRenderer';
const mode=new URLSearchParams(location.search).get('mode');
createRoot(document.getElementById('root')!).render(<BackgroundRenderer page={5} variant={0} reduced={false} playback={0} idealImageUrl={mode==='bad-image'?'/missing-ideal-image.jpg':'/scenes/ideal.jpg'} changeVideoUrl={mode==='bad'?'/missing-video.mp4':mode==='bad-image'?null:'/artifacts/independent/video-fixture.mp4'}/>);
