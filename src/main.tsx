import React from 'react';
import {createRoot} from 'react-dom/client';
import StudioWorkspace from './StudioWorkspace';
import LiveWorkspace from './LiveWorkspace';
import './liveDark.css';

const element=document.getElementById('root');
if(!element)throw new Error('Cannot find AutoCare360 application root');
const cloud=new URLSearchParams(window.location.search).get('login')==='1';
createRoot(element).render(
 <React.StrictMode>
  {cloud?<LiveWorkspace onBack={()=>window.location.assign('/')}/>:<StudioWorkspace/>}
 </React.StrictMode>
);
