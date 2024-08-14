import React, { useState, useEffect } from 'react';
import _ from 'lodash';

import { Tooltip, Persona, makeStyles, tokens } from '@fluentui/react-components';

import useStore from '../Common/StateStore';
import Logout from './Logout';
import eventBus from '../Common/eventBus';

const usePersonaStyles = makeStyles({
    root: {
        '&:hover': {
            cursor: 'pointer', // Optional: changes the cursor to a pointer to indicate it's clickable
        },
    },
});

const UserAvatar = () => {
    const { user } = useStore();
    const [isUserLogoutCardVisible, setIsUserLogoutCardVisible] = useState(false);
    const styles = usePersonaStyles();

    useEffect(() => {
        const intervalId = setInterval(async () => {
            await eventBus.emit('user-session-check', { message: ':Periodic user session aliveness check' });
        }, 30000);
        return () => clearInterval(intervalId);
    }, []);

    const userName = `${user?.first_name} ${user?.last_name}`;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingRight: '20px',
            }}
        >
            <div className={styles.root}>
                <Tooltip
                    content={`${userName} is logged into the service '${user?.service}'`}
                    relationship='label'
                    withArrow
                    positioning='above-end'
                >
                    <Persona
                        textAlignment='start'
                        name={userName}
                        presence={{ status: 'available' }}
                        secondaryText={user?.email}
                        avatar={{ color: 'colorful' }}
                        onClick={() => {
                            setIsUserLogoutCardVisible(true);
                        }}
                    />
                </Tooltip>
                {isUserLogoutCardVisible && (
                    <Logout
                        isOpen={isUserLogoutCardVisible}
                        onClose={() => {
                            setIsUserLogoutCardVisible(false);
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default UserAvatar;
