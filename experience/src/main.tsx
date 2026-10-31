import React from 'react';
import {createRoot} from 'react-dom/client';
import ExperienceShell from './App';
import './styles.css';
import './pages/text-system.css';
import './pages/ui-refinement.css';
import './pages/final-scenes.css';
import './pages/responsive-scenes.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><ExperienceShell/></React.StrictMode>);
