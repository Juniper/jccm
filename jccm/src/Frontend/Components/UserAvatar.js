import React, { useState, useEffect } from 'react';
import _ from 'lodash';

import { Tooltip, Persona, Text, makeStyles, Link, tokens } from '@fluentui/react-components';

import useStore from '../Common/StateStore';
import Logout from './Logout';
import eventBus from '../Common/eventBus';

const { electronAPI } = window;

const usePersonaStyles = makeStyles({
    root: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        '&:hover': {
            cursor: 'pointer',
        },
    },
});

const UserAvatar = () => {
    const { user } = useStore();
    const [isUserLogoutCardVisible, setIsUserLogoutCardVisible] = useState(false);
    const styles = usePersonaStyles();

    useEffect(() => {
        const intervalId = setInterval(async () => {
            await eventBus.emit('user-session-check', {
                message: 'Periodic user session aliveness check',
            });
        }, 30000);
        return () => clearInterval(intervalId);
    }, []);

    const userName = `${user?.first_name} ${user?.last_name}`;

    const handleLinkClick = (e) => {
        e.preventDefault();

        let url = 'https://manage.mist.com';
        const cloudDescription = user.cloudDescription.toLowerCase();

        if (cloudDescription.includes('mist')) {
            url = 'https://manage.mist.com';
        } else if (cloudDescription.includes('support')) {
            url = 'https://jsi.ai.juniper.net';
        } else if (cloudDescription.includes('routing')) {
            url = 'https://routing.ai.juniper.net';
        }

        electronAPI.openExternalLink(url);
    };

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
                    content={
                        <Text size={100}>
                            Logged into the service&nbsp;
                            <Link href='#' inline onClick={handleLinkClick}>
                                {user?.cloudDescription.toLowerCase().includes(user?.regionName.toLowerCase())
                                    ? user?.cloudDescription
                                    : `${user?.cloudDescription} in ${user?.regionName}`}
                            </Link>
                        </Text>
                    }
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
