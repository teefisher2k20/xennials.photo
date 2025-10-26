/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

export const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

export const UndoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
  </svg>
);

export const RedoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3" />
  </svg>
);

export const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

export const MagicWandIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.475 2.118A2.25 2.25 0 0 1 .879 16.5a3 3 0 0 1 4.242-4.242 3 3 0 0 0 4.242 0 3 3 0 0 0 0-4.242 3 3 0 0 1-4.242-4.242 3 3 0 0 1 4.242 0 3 3 0 0 1 0 4.242 3 3 0 0 0 4.242 4.242 3 3 0 0 0 5.78-1.128 2.25 2.25 0 0 1 2.475-2.118 2.25 2.25 0 0 1 .879 3.5a3 3 0 0 1-4.242 4.242 3 3 0 0 0-4.242 0 3 3 0 0 0 0 4.242Z" />
    </svg>
);

export const PaletteIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-1.007 1.11-1.11a12.001 12.001 0 0 1 5.052 0c.55.103 1.02.568 1.11 1.11a12.001 12.001 0 0 1 0 5.052c-.103.55-.568 1.02-1.11 1.11a12.001 12.001 0 0 1-5.052 0c-.55-.103-1.02-.568-1.11-1.11a12.001 12.001 0 0 1 0-5.052M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

export const SunIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
);

export const BullseyeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a3 3 0 100-6 3 3 0 000 6z" />
    </svg>
);

export const ScissorsIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l-1.26.562M3.25 8.25l4.598.92m0 0l.23-1.037m-2.184 5.093l.363-1.623m-2.184 5.093l.363-1.623m7.34-6.324l.362-1.623m.362-1.623l.23-1.037m-.46 2.66l.363-1.623m-2.184 5.093l.363-1.623m-2.184 5.093l.363-1.623m7.34-6.324l.362-1.623m.362-1.623a.87.87 0 011.036.037l1.011 1.012a.87.87 0 010 1.228l-1.011 1.012a.87.87 0 01-1.229 0l-1.011-1.012a.87.87 0 01-.037-1.036m-2.184 5.093l.363-1.623m-2.184 5.093l.363-1.623m7.34-6.324l.362-1.623m.362-1.623a.87.87 0 011.036.037l1.011 1.012a.87.87 0 010 1.228l-1.011 1.012a.87.87 0 01-1.229 0l-1.011-1.012a.87.87 0 01-.037-1.036m0 0l.23-1.037m-2.184 5.093l.363-1.623m-2.184 5.093l.363-1.623m7.34-6.324l.362-1.623M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

export const PhotoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

export const VideoCameraIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

export const ChatBubbleLeftRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12c0 1.269-.724 2.429-1.895 3.076a4.937 4.937 0 01-1.715 1.087 7.474 7.474 0 01-2.544.241 19.831 19.831 0 01-5.134.43M12 12c-1.269 0-2.429-.724-3.076-1.895A4.937 4.937 0 017.83 8.3c-.347-.09-.68-.2-1.001-.336a19.853 19.853 0 01-2.544-.241 7.474 7.474 0 00-2.544-.241 4.937 4.937 0 00-1.715 1.087C2.724 10.429 2 11.589 2 12m10 0v9.75m0-9.75a7.474 7.474 0 01-2.544-.241M12 12c1.269 0 2.429-.724 3.076-1.895.059-.11.115-.224.167-.34M12 12h7.5c.75 0 1.424.47 1.715 1.087m-7.5-1.087a4.937 4.937 0 00-1.715-1.087A19.832 19.832 0 0112 2.25.75.75 0 0012 2.25V9.75h.375M12 12h-7.5c-.75 0-1.424.47-1.715 1.087m7.5-1.087c.059-.11.115-.224.167-.34m-1.715 1.087c-1.269 0-2.429-.724-3.076-1.895M12 21.75c-1.269 0-2.429-.724-3.076-1.895M12 21.75h.008v.008H12v-.008Z" />
  </svg>
);

export const CommandLineIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25L6.75 12m-3 0V12m3-2.25H18" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-2.25m0-11.25V3M12 12.75V12h.008v.008H12zm0 3.75V12h.008v.008H12zm0 3.75V12h.008v.008H12zM12 2.25c-5.001 0-9 3.6-9 8.058 0 1.867.607 3.55 1.637 4.918 1.03.882 2.302 1.571 3.738 1.944 1.436.373 2.898.373 4.334 0 1.436-.373 2.708-1.062 3.738-1.944A9 9 0 0021 10.308c0-4.458-3.999-8.058-9-8.058z" />
  </svg>
);


export const MegaphoneIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-1.007 1.11-1.11a12.001 12.001 0 015.052 0c.55.103 1.02.568 1.11 1.11a12.001 12.001 0 010 5.052c-.103.55-.568 1.02-1.11 1.11a12.001 12.001 0 01-5.052 0c-.55-.103-1.02-.568-1.11-1.11a12.001 12.001 0 010-5.052zm.343 9.44c.09-.542.56-1.007 1.11-1.11a12.001 12.001 0 015.052 0c.55.103 1.02.568 1.11 1.11a12.001 12.001 0 010 5.052c-.103.55-.568 1.02-1.11 1.11a12.001 12.001 0 01-5.052 0c-.55-.103-1.02-.568-1.11-1.11a12.001 12.001 0 010-5.052zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const RocketLaunchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25H9.75M7.5 10.5h10.5M21 12c0 3.866-3.134 7-7 7H7.5c-2.76 0-5-2.24-5-5s2.24-5 5-5H14c3.866 0 7 3.134 7 7z" />
  </svg>
);

export const PaperClipIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.75c-3.111 0-5.625 2.514-5.625 5.625V20.25a2.25 2.25 0 01-4.5 0v-8.25m8.25-3.0l-4.5-4.5m-4.5 4.5L5.25 5.25m4.5 4.5l-4.5 4.5m4.5-4.5L9.75 5.25" />
  </svg>
);

export const XMarkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const WarningIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.174 3.374 1.98 3.374h14.71c1.806 0 2.852-1.874 1.98-3.374L13.94 3.376c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

// New icons for TextChatPanel
export const GlobeAltIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.75c-2.427 0-4.697-.665-6.666-1.802M12 21.75a8.25 8.25 0 006.666-1.802M12 21.75c1.117 0 2.183-.243 3.16-0.697m-3.16 0A8.25 8.25 0 0012 21.75a8.25 8.25 0 00-3.16.697m-5.405-2.09c-2.327-.923-3.64-3.078-3.64-5.358m-5.405-2.09c2.327-.923 3.64-3.078 3.64-5.358m1.782-2.126C7.545 4.993 9.611 4.5 12 4.5c2.389 0 4.455.493 6.16 1.372m-1.782-2.126c2.146.903 3.513 3.012 3.513 5.176s-1.367 4.273-3.513 5.176M12 4.5c1.117 0 2.183.243 3.16.697m-3.16-.697A8.25 8.25 0 0012 4.5a8.25 8.25 0 00-3.16.697m0 0C6.638 5.617 5.111 7.206 4.25 9.076m0 0c-.867 1.87-1.3 3.864-1.3 5.924s.433 4.054 1.3 5.924M12 4.5V2.25M12 21.75V24M4.5 12H2.25M21.75 12H24" />
  </svg>
);

export const MapPinIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);

// New icons for TTSPanel
export const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.398 2.842-1.636L20.25 12l-13.908 7.983c-1.313.762-2.842-.191-2.842-1.636V5.653z" clipRule="evenodd" />
  </svg>
);

export const StopIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
  </svg>
);

// New icon for FitCheckPanel
export const TShirtIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v2.25c0 .66.36 1.25 1.006 1.554C8.01 7.23 9.07 7.5 10.5 7.5h.75a2.25 2.25 0 012.25 2.25v2.793c0 .59.412 1.036.933 1.091 1.45.148 2.859.351 4.25.645M18.75 6.25c.34-.34.34-.89 0-1.23l-3.25-3.25c-.34-.34-.89-.34-1.23 0l-3.25 3.25c-.34.34-.34.89 0 1.23M6 6.25c-.34-.34-.34-.89 0-1.23l3.25-3.25c.34-.34.89-.34 1.23 0l3.25 3.25c.34.34.34.89 0 1.23M12 10.5h.008v.008H12zM21 21v-2.25c0-.66-.36-1.25-1.006-1.554C18.99 16.77 17.93 16.5 16.5 16.5h-.75a2.25 2.25 0 01-2.25-2.25v-2.793c0-.59-.412-1.036-.933-1.091-1.45-.148-2.859-.351-4.25-.645" />
  </svg>
);