import React, { createContext, useContext, useState } from 'react';

import { Toaster, useToastController } from '@fluentui/react-components';


let idCounter = 0;

export const useId = (prefix = 'id') => {
  const [id] = useState(() => {
    const currentId = idCounter;
    idCounter += 1;
    return `${prefix}-${currentId}`;
  });

  return id;
};

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const toasterId = useId('toaster');
    const { dispatchToast } = useToastController(toasterId);

    const notify = (content, options = { intent: 'success' }) => dispatchToast(content, options);

    return (
        <NotificationContext.Provider value={{ notify }}>
            {children}
            <Toaster toasterId={toasterId} />
        </NotificationContext.Provider>
    );
};

export const useNotify = () => useContext(NotificationContext);
